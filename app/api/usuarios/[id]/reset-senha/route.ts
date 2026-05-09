import { withAuth } from "@/lib/api/handler";
import { resetarSenha } from "@/lib/usuario-service";
import { logAudit } from "@/lib/audit";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    const { id } = await ctx.params;
    const senhaProvisoria = await resetarSenha(id);
    await logAudit({
      usuarioId: session.id,
      acao: "usuario.resetar-senha",
      recurso: `Usuario:${id}`,
    });
    return { senhaProvisoria };
  }, { roles: ["ADMIN"] });
}
