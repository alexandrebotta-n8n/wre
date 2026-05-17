import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { withAuth, ApiError } from "@/lib/api/handler";
import { resetarSenha } from "@/lib/usuario-service";
import { logAudit } from "@/lib/audit";

// Janela de rate-limit (mesmo padrão de login: 5–30min, conservador).
const JANELA_MS = 30 * 60 * 1000;
const MAX_POR_ALVO = 3; // 3 resets por usuário-alvo a cada 30min
const MAX_POR_ADMIN = 10; // 10 resets por admin executor a cada 30min

async function rateLimitOk(targetId: string, adminId: string): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const desde = new Date(Date.now() - JANELA_MS);
  try {
    const [porAlvo, porAdmin] = await Promise.all([
      prisma.auditLog.count({
        where: {
          acao: "usuario.resetar-senha",
          recurso: `Usuario:${targetId}`,
          ocorridoEm: { gte: desde },
        },
      }),
      prisma.auditLog.count({
        where: {
          acao: "usuario.resetar-senha",
          usuarioId: adminId,
          ocorridoEm: { gte: desde },
        },
      }),
    ]);
    if (porAlvo >= MAX_POR_ALVO) return { ok: false, motivo: "limite-por-alvo" };
    if (porAdmin >= MAX_POR_ADMIN) return { ok: false, motivo: "limite-por-admin" };
    return { ok: true };
  } catch {
    // Fail-closed: se o DB falha ao consultar contador, recusamos o reset
    // para não permitir bypass. Reset não é caminho crítico — admin pode
    // tentar de novo quando a infra voltar.
    return { ok: false, motivo: "erro-rate-limit" };
  }
}

function getClientHeaders(): { ip?: string; userAgent?: string } {
  // Best-effort — em alguns ambientes (edge, proxy) o IP real só vem em
  // x-forwarded-for. Captura para auditoria, não para decisão de segurança.
  return {
    ip: undefined, // será preenchido pelo handler abaixo
    userAgent: undefined,
  };
}
void getClientHeaders;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    const { id } = await ctx.params;

    const limit = await rateLimitOk(id, session.id);
    if (!limit.ok) {
      throw new ApiError(
        limit.motivo === "limite-por-alvo"
          ? "Muitos resets para este usuário recentemente. Aguarde 30 minutos."
          : limit.motivo === "limite-por-admin"
            ? "Você atingiu o limite de resets por janela. Aguarde 30 minutos."
            : "Não foi possível validar limite — tente novamente em instantes.",
        429,
      );
    }

    const senhaProvisoria = await resetarSenha(id);

    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
    const userAgent = h.get("user-agent") || undefined;
    await logAudit({
      usuarioId: session.id,
      acao: "usuario.resetar-senha",
      recurso: `Usuario:${id}`,
      ip,
      userAgent,
    });
    return { senhaProvisoria };
  }, { roles: ["ADMIN"], noStore: true, req });
}
