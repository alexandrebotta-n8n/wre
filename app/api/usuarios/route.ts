import { prisma } from "@/lib/prisma";
import { withAuth, parseJson, ApiError } from "@/lib/api/handler";
import { CriarUsuarioSchema } from "@/lib/schemas/usuario";
import { criarUsuarioComSenha } from "@/lib/usuario-service";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/api/rate-limit";

// Rate limit conservador: até 10 criações de usuário por ADMIN a cada 30min
// (provisioning de equipe é raro — mesmo onboarding de 1 sócio/semana cabe).
const USUARIO_CRIAR_LIMITE = { max: 10, janelaMs: 30 * 60 * 1000 };

// Campos seguros para retornar — nunca inclui senhaHash. Usado em GET/POST.
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
  socio: { select: { nome: true } },
} as const;

export async function GET(req: Request) {
  return withAuth(async () => {
    const url = new URL(req.url);
    const take = Math.min(Number(url.searchParams.get("take") ?? 50), 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const usuarios = await prisma.usuario.findMany({
      orderBy: [{ ativo: "desc" }, { criadoEm: "desc" }],
      select: USUARIO_SELECT,
      take: take + 1, // pega 1 a mais para detectar próxima página
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = usuarios.length > take;
    const items = hasMore ? usuarios.slice(0, take) : usuarios;
    return { items, nextCursor: hasMore ? items[items.length - 1]?.id : null };
  }, { roles: ["ADMIN"] });
}

export async function POST(req: Request) {
  return withAuth(async (session) => {
    const rl = await checkRateLimit({
      acao: "usuario.criar",
      usuarioId: session.id,
      maxPorUsuario: USUARIO_CRIAR_LIMITE.max,
      janelaMs: USUARIO_CRIAR_LIMITE.janelaMs,
    });
    if (!rl.ok) throw new ApiError(rl.motivo ?? "Rate limit", 429);

    const input = await parseJson(req, CriarUsuarioSchema);
    const existing = await prisma.usuario.findUnique({ where: { email: input.email } });
    if (existing) throw new ApiError("E-mail já cadastrado", 409);
    const { usuario, senhaProvisoriaPlano } = await criarUsuarioComSenha({
      email: input.email,
      nome: input.nome,
      roles: input.roles,
      socioId: input.socioId ?? null,
      senhaTextoPlano: input.senha,
    });
    await logAudit({
      usuarioId: session.id,
      acao: "usuario.criar",
      // Sem email/PII no audit meta — só id + roles (email já está em recurso
      // implícito via id; se precisar, busca-se via JOIN). Reduz exposição
      // se logs vazarem.
      recurso: `Usuario:${usuario.id}`,
      meta: { roles: usuario.roles },
    });
    // CUIDADO: senha em texto plano está apenas nesta resposta.
    // - Header `no-store`: impede cache em proxy/CDN/WAF e no histórico.
    // - Senha NUNCA entra em audit nem em log do servidor.
    // - UI deve exibir 1x em modal e auto-clear ao fechar (já implementado
    //   via `setSenhaGerada` cookie + SenhaGeradaDialog quando o fluxo é
    //   pela página; via API direta, cliente é responsável por descartar).
    return Response.json({ usuario, senhaProvisoria: senhaProvisoriaPlano }, { status: 201 });
  }, { roles: ["ADMIN"], noStore: true, req });
}
