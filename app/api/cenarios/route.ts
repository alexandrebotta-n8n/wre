import { prisma } from "@/lib/prisma";
import { withAuth, parseJson } from "@/lib/api/handler";
import { CriarCenarioSchema } from "@/lib/schemas/cenario";
import { criarCenarioComDefaults } from "@/lib/cenario-service";
import { logAudit } from "@/lib/audit";

export async function GET() {
  return withAuth(async () => {
    return prisma.cenario.findMany({
      orderBy: [{ criadoEm: "desc" }],
      include: { premissa: { select: { nome: true, modelo: true } } },
      take: 200,
    });
  });
}

export async function POST(req: Request) {
  return withAuth(
    async (session) => {
      const input = await parseJson(req, CriarCenarioSchema);
      const cenario = await criarCenarioComDefaults({
        nome: input.nome,
        descricao: input.descricao,
        ano: input.ano,
        modelo: input.modelo,
        premissaId: input.premissaId,
        criadoPorId: session.id,
      });
      await logAudit({
        usuarioId: session.id,
        acao: "cenario.criar",
        recurso: `Cenario:${cenario.id}`,
        meta: { nome: input.nome, modelo: input.modelo, ano: input.ano },
      });
      return Response.json(cenario, { status: 201 });
    },
    { roles: ["ADMIN", "CONSULTOR"] },
  );
}
