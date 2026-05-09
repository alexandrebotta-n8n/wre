import { prisma } from "@/lib/prisma";
import { withAuth, ApiError } from "@/lib/api/handler";
import { escopoDe } from "@/lib/auth/escopo";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    const { id } = await ctx.params;
    const escopo = escopoDe(session);
    const filtroSocio = escopo.ehSocioRestrito
      ? { socioId: escopo.socioIdEscopo ?? "__nada__" }
      : {};

    const cenario = await prisma.cenario.findUnique({
      where: { id },
      include: {
        premissa: true,
        classificacoes: {
          where: filtroSocio,
          include: { socio: true, unidade: true },
          orderBy: [{ socio: { isFundador: "desc" } }, { socio: { percentualQuotasDefault: "desc" } }],
        },
        remuneracoes: {
          where: filtroSocio,
          include: { socio: { select: { nome: true } }, periodo: true },
          orderBy: [{ periodo: { ano: "asc" } }, { periodo: { trimestre: "asc" } }, { total: "desc" }],
          take: 1000,
        },
      },
    });
    if (!cenario) throw new ApiError("Cenário não encontrado", 404);
    // SOCIO só pode ver cenários publicados.
    if (escopo.ehSocioRestrito && cenario.status !== "APPLIED") {
      throw new ApiError("Cenário não disponível", 404);
    }
    return cenario;
  });
}
