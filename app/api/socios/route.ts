import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/handler";

export async function GET() {
  return withAuth(async () => {
    const socios = await prisma.socio.findMany({
      where: { ativo: true },
      orderBy: [{ isFundador: "desc" }, { percentualQuotasDefault: "desc" }, { nome: "asc" }],
      take: 200,
    });
    return socios;
  });
}
