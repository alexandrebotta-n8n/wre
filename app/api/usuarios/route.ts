import { prisma } from "@/lib/prisma";
import { withAuth, parseJson, ApiError } from "@/lib/api/handler";
import { CriarUsuarioSchema } from "@/lib/schemas/usuario";
import { criarUsuarioComSenha } from "@/lib/usuario-service";
import { logAudit } from "@/lib/audit";

export async function GET() {
  return withAuth(async () => {
    return prisma.usuario.findMany({
      orderBy: [{ ativo: "desc" }, { criadoEm: "desc" }],
      include: { socio: { select: { nome: true } } },
      take: 200,
    });
  }, { roles: ["ADMIN"] });
}

export async function POST(req: Request) {
  return withAuth(async (session) => {
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
      recurso: `Usuario:${usuario.id}`,
      meta: { email: usuario.email, roles: usuario.roles },
    });
    // CUIDADO: senha em texto plano está apenas nesta resposta. Admin
    // deve comunicar ao usuário e fechar a tela.
    return Response.json({ usuario, senhaProvisoria: senhaProvisoriaPlano }, { status: 201 });
  }, { roles: ["ADMIN"] });
}
