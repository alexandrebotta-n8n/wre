import { withAuth, parseJson } from "@/lib/api/handler";
import { CalcularCenarioSchema } from "@/lib/schemas/cenario";
import { calcularCenario } from "@/lib/cenario-service";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(
    async (session) => {
      const { id: cenarioId } = await ctx.params;
      const input = await parseJson(req, CalcularCenarioSchema);
      const resultado = await calcularCenario({ cenarioId, periodoId: input.periodoId });
      await logAudit({
        usuarioId: session.id,
        acao: "cenario.calcular",
        recurso: `Cenario:${cenarioId}`,
        meta: { periodoId: input.periodoId, modelo: resultado.modelo, totalDistribuido: resultado.totalDistribuido },
      });
      return resultado;
    },
    { roles: ["ADMIN", "CONSULTOR"] },
  );
}
