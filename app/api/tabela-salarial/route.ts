import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/handler";

export async function GET() {
  return withAuth(async () => {
    return prisma.tabelaSalario.findMany({
      orderBy: [{ nivel: "asc" }, { faixa: "asc" }],
      take: 100,
    });
  });
}
