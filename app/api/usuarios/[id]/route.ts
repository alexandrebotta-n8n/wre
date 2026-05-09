import { prisma } from "@/lib/prisma";
import { withAuth, parseJson, ApiError } from "@/lib/api/handler";
import { AtualizarUsuarioSchema } from "@/lib/schemas/usuario";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await ctx.params;
    const u = await prisma.usuario.findUnique({
      where: { id },
      include: { socio: { select: { nome: true, cargo: true } } },
    });
    if (!u) throw new ApiError("Usuário não encontrado", 404);
    return u;
  }, { roles: ["ADMIN"] });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    const { id } = await ctx.params;
    const input = await parseJson(req, AtualizarUsuarioSchema);
    const data: Record<string, unknown> = {};
    if (input.nome !== undefined) data.nome = input.nome;
    if (input.roles !== undefined) data.roles = input.roles;
    if (input.socioId !== undefined) data.socioId = input.socioId;
    if (input.ativo !== undefined) data.ativo = input.ativo;
    const u = await prisma.usuario.update({ where: { id }, data });
    await logAudit({
      usuarioId: session.id,
      acao: "usuario.atualizar",
      recurso: `Usuario:${id}`,
      meta: { campos: Object.keys(data) },
    });
    return u;
  }, { roles: ["ADMIN"] });
}
