import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/handler";

export async function GET() {
  return withAuth(async () => {
    return prisma.unidade.findMany({
      where: { ativa: true },
      orderBy: [{ isMatriz: "desc" }, { codigo: "asc" }],
      take: 50,
    });
  });
}
