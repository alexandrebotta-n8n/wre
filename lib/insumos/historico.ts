// Calcula resumos históricos do LL/funding por unidade — alimenta o
// chip de validação no painel de insumos do cenário.
import { prisma } from "@/lib/prisma";

export interface HistoricoUnidade {
  unidadeId: string;
  unidadeCodigo: string;
  unidadeNome: string;
  isMatriz: boolean;
  /** Média do LL nos últimos N períodos (excluindo o período-corrente). */
  llMedia: number;
  llMin: number;
  llMax: number;
  fundingMedia: number | null;
  amostras: number;
  /** Período mais recente considerado (rótulo). */
  ultimoPeriodo: string | null;
}

/**
 * Histórico por unidade considerando os últimos N resultados (exceto o
 * período corrente, se passado). Usado para validar overrides ("R$ X está
 * 30% abaixo da média histórica").
 */
export async function carregarHistoricoUnidades(args: {
  excluirPeriodoId?: string;
  limite?: number;
}): Promise<HistoricoUnidade[]> {
  const limite = args.limite ?? 8;

  const unidades = await prisma.unidade.findMany({
    where: { ativa: true },
    orderBy: [{ isMatriz: "desc" }, { codigo: "asc" }],
    take: 50,
  });

  const out: HistoricoUnidade[] = [];
  for (const u of unidades) {
    const resultados = await prisma.resultadoPeriodo.findMany({
      where: {
        unidadeId: u.id,
        ...(args.excluirPeriodoId ? { NOT: { periodoId: args.excluirPeriodoId } } : {}),
      },
      include: { periodo: { select: { rotulo: true, ano: true, trimestre: true } } },
      orderBy: [{ periodo: { ano: "desc" } }, { periodo: { trimestre: "desc" } }],
      take: limite,
    });
    if (resultados.length === 0) {
      out.push({
        unidadeId: u.id,
        unidadeCodigo: u.codigo,
        unidadeNome: u.nome,
        isMatriz: u.isMatriz,
        llMedia: 0,
        llMin: 0,
        llMax: 0,
        fundingMedia: null,
        amostras: 0,
        ultimoPeriodo: null,
      });
      continue;
    }
    const lls = resultados.map((r) => r.lucroLiquido);
    const fundings = resultados.map((r) => r.fundingVariavel).filter((v): v is number => v != null);
    out.push({
      unidadeId: u.id,
      unidadeCodigo: u.codigo,
      unidadeNome: u.nome,
      isMatriz: u.isMatriz,
      llMedia: lls.reduce((a, b) => a + b, 0) / lls.length,
      llMin: Math.min(...lls),
      llMax: Math.max(...lls),
      fundingMedia: fundings.length > 0 ? fundings.reduce((a, b) => a + b, 0) / fundings.length : null,
      amostras: lls.length,
      ultimoPeriodo: resultados[0]?.periodo.rotulo ?? null,
    });
  }
  return out;
}

/** Calcula desvio percentual e severidade do valor digitado vs média histórica. */
export function avaliarDesvio(
  valorDigitado: number,
  medias: { llMedia: number; llMin: number; llMax: number; amostras: number },
): { pct: number; severidade: "ok" | "info" | "warning"; mensagem: string } {
  if (medias.amostras === 0) {
    return { pct: 0, severidade: "info", mensagem: "Sem histórico para comparar" };
  }
  const pct = (valorDigitado - medias.llMedia) / Math.max(medias.llMedia, 1);
  const fora = valorDigitado < medias.llMin || valorDigitado > medias.llMax;
  if (Math.abs(pct) < 0.1) {
    return { pct, severidade: "ok", mensagem: "Dentro da média histórica" };
  }
  if (fora) {
    const direcao = valorDigitado > medias.llMax ? "acima" : "abaixo";
    return {
      pct,
      severidade: "warning",
      mensagem: `${(Math.abs(pct) * 100).toFixed(0)}% ${direcao} da média (fora do range histórico)`,
    };
  }
  const direcao = pct > 0 ? "acima" : "abaixo";
  return {
    pct,
    severidade: "info",
    mensagem: `${(Math.abs(pct) * 100).toFixed(0)}% ${direcao} da média histórica`,
  };
}
