import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/handler";

export async function GET() {
  return withAuth(async () => {
    return prisma.periodo.findMany({
      orderBy: [{ ano: "desc" }, { trimestre: "asc" }],
      include: { resultados: { include: { unidade: true } } },
      take: 200,
    });
  });
}
