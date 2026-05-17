import { withAuth } from "@/lib/api/handler";
import { calcularCenario } from "@/lib/cenario-service";
import { logAudit } from "@/lib/audit";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(
    async (session) => {
      const { id: cenarioId } = await ctx.params;
      // Sistema agora é ANUAL — não recebe mais periodoId; calcula 1 vez para o ano do cenário.
      const resultado = await calcularCenario({ cenarioId });
      await logAudit({
        usuarioId: session.id,
        acao: "cenario.calcular",
        recurso: `Cenario:${cenarioId}`,
        // Não logamos `totalDistribuido` — valor de remuneração é confidencial (cláusula 17.4).
        meta: { modelo: resultado.modelo, qtdPacotes: resultado.pacotes.length },
      });
      return resultado;
    },
    { roles: ["ADMIN", "CONSULTOR"] },
  );
}
