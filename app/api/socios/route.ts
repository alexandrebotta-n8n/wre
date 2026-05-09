import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/handler";
import { escopoDe } from "@/lib/auth/escopo";

export async function GET() {
  return withAuth(async (session) => {
    const escopo = escopoDe(session);
    // SOCIO restrito só vê o próprio sócio.
    const where = escopo.ehSocioRestrito
      ? { ativo: true, id: escopo.socioIdEscopo ?? "__nada__" }
      : { ativo: true };
    return prisma.socio.findMany({
      where,
      orderBy: [{ isFundador: "desc" }, { percentualQuotasDefault: "desc" }, { nome: "asc" }],
      take: 200,
    });
  });
}
