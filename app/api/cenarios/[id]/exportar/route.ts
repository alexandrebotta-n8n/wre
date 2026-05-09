// Exporta cenário como XLSX. SOCIO restrito recebe arquivo só com seu pacote.
import { prisma } from "@/lib/prisma";
import { withAuth, ApiError } from "@/lib/api/handler";
import { gerarXlsxCenario } from "@/lib/export/cenario-xlsx";
import { escopoDe } from "@/lib/auth/escopo";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    const { id } = await ctx.params;
    const escopo = escopoDe(session);

    const cenario = await prisma.cenario.findUnique({
      where: { id },
      include: {
        premissa: true,
        classificacoes: {
          where: escopo.ehSocioRestrito ? { socioId: escopo.socioIdEscopo ?? "__nada__" } : {},
          include: { socio: true, unidade: true },
        },
        remuneracoes: {
          where: escopo.ehSocioRestrito ? { socioId: escopo.socioIdEscopo ?? "__nada__" } : {},
          include: { socio: true, periodo: true },
          orderBy: [{ periodo: { ano: "asc" } }, { periodo: { trimestre: "asc" } }, { total: "desc" }],
        },
      },
    });
    if (!cenario) throw new ApiError("Cenário não encontrado", 404);
    if (escopo.ehSocioRestrito && cenario.status !== "APPLIED") {
      throw new ApiError("Cenário não disponível para exportação", 403);
    }

    const buffer = gerarXlsxCenario({
      nome: cenario.nome,
      modelo: cenario.modelo,
      ano: cenario.ano,
      status: cenario.status,
      versao: cenario.versao,
      premissaNome: cenario.premissa.nome,
      premissaParametros: cenario.premissa.parametros as Record<string, unknown>,
      criadoEm: cenario.criadoEm,
      aplicadoEm: cenario.aplicadoEm,
      classificacoes: cenario.classificacoes.map((c) => ({
        socioNome: c.socio.nome,
        cargo: c.socio.cargo,
        publico: c.publico,
        unidadeCodigo: c.unidade?.codigo,
        percentualQuotas: c.percentualQuotas,
        pesoBlocoB: c.pesoBlocoB,
        originacaoEsperada: c.originacaoEsperada,
        isFundador: c.socio.isFundador,
      })),
      remuneracoes: cenario.remuneracoes.map((r) => ({
        socioNome: r.socio.nome,
        periodoRotulo: r.periodo.rotulo,
        proLabore: r.proLabore,
        remuneracaoGestao: r.remuneracaoGestao,
        remuneracaoFundador: r.remuneracaoFundador,
        blocoA: r.blocoA, blocoB: r.blocoB, blocoC: r.blocoC,
        poolUnidade: r.poolUnidade,
        creditoOriginacao: r.creditoOriginacao,
        creditoExecucao: r.creditoExecucao,
        creditoGestaoCP: r.creditoGestaoCP,
        premio: r.premio,
        ajustes: r.ajustes,
        total: r.total,
        alertas: ((r.alertas as string[] | null) ?? []),
      })),
    });

    await logAudit({
      usuarioId: session.id,
      acao: "cenario.exportar.xlsx",
      recurso: `Cenario:${id}`,
      meta: { socioFiltro: escopo.ehSocioRestrito ? escopo.socioIdEscopo : null },
    });

    const filename = `cenario-${slug(cenario.nome)}-${cenario.modelo}-${cenario.ano}.xlsx`;
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}

function slug(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "cenario";
}
