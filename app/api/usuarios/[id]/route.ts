import { prisma } from "@/lib/prisma";
import { withAuth, parseJson, ApiError } from "@/lib/api/handler";
import { AtualizarUsuarioSchema } from "@/lib/schemas/usuario";
import { logAudit } from "@/lib/audit";

const USUARIO_SELECT = {
  id: true,
  email: true,
  nome: true,
  roles: true,
  ativo: true,
  socioId: true,
  senhaProvisoria: true,
  ultimoLogin: true,
  criadoEm: true,
  socio: { select: { nome: true, cargo: true } },
} as const;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await ctx.params;
    const u = await prisma.usuario.findUnique({
      where: { id },
      select: USUARIO_SELECT,
    });
    if (!u) throw new ApiError("Usuário não encontrado", 404);
    return u;
  }, { roles: ["ADMIN"] });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    const { id } = await ctx.params;
    // Schema é .strict() — campos extras (senhaHash, email, ...) viram 422.
    const input = await parseJson(req, AtualizarUsuarioSchema);

    // Defesa extra contra auto-revogação: ADMIN não pode tirar a própria role
    // ADMIN nem se desativar (evita lock-out e auto-DoS administrativo).
    if (id === session.id) {
      if (input.roles !== undefined && !input.roles.includes("ADMIN")) {
        throw new ApiError("Você não pode remover seu próprio acesso ADMIN", 400);
      }
      if (input.ativo === false) {
        throw new ApiError("Você não pode se desativar", 400);
      }
    }

    const data: Record<string, unknown> = {};
    if (input.nome !== undefined) data.nome = input.nome;
    if (input.roles !== undefined) data.roles = input.roles;
    if (input.socioId !== undefined) data.socioId = input.socioId;
    if (input.ativo !== undefined) data.ativo = input.ativo;
    const u = await prisma.usuario.update({
      where: { id },
      data,
      select: USUARIO_SELECT,
    });
    await logAudit({
      usuarioId: session.id,
      acao: "usuario.atualizar",
      recurso: `Usuario:${id}`,
      meta: { campos: Object.keys(data) },
    });
    return u;
  }, { roles: ["ADMIN"], req });
}
