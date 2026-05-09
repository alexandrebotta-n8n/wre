import { prisma } from "@/lib/prisma";
import { withAuth, ApiError } from "@/lib/api/handler";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await ctx.params;
    const cenario = await prisma.cenario.findUnique({
      where: { id },
      include: {
        premissa: true,
        classificacoes: {
          include: { socio: true, unidade: true },
          orderBy: [{ socio: { isFundador: "desc" } }, { socio: { percentualQuotasDefault: "desc" } }],
        },
        remuneracoes: {
          include: { socio: { select: { nome: true } }, periodo: true },
          orderBy: [{ periodo: { ano: "asc" } }, { periodo: { trimestre: "asc" } }, { total: "desc" }],
        },
      },
    });
    if (!cenario) throw new ApiError("Cenário não encontrado", 404);
    return cenario;
  });
}
