// Construção das linhas comparativas alinhadas por sócio entre A e B.
// Visão ANUAL única — agrega todas as linhas de RemuneracaoCalculada do
// cenário (1 por sócio no novo sistema; pode ter até 4 em APPLIED antigos).
import type { CenarioCompleto, LinhaComparativa, TraceItem } from "./types";

type RemuneracaoRow = NonNullable<CenarioCompleto>["remuneracoes"][number];

interface AggSocio {
  socioId: string;
  nome: string;
  isFundador: boolean;
  total: number;
  trace: TraceItem[];
  alertas: string[];
}

function agregar(rows: RemuneracaoRow[] | undefined): Map<string, AggSocio> {
  const map = new Map<string, AggSocio>();
  if (!rows) return map;
  for (const r of rows) {
    let agg = map.get(r.socioId);
    if (!agg) {
      agg = {
        socioId: r.socioId,
        nome: r.socio.nome,
        isFundador: r.socio.isFundador,
        total: 0,
        trace: [],
        alertas: [],
      };
      map.set(r.socioId, agg);
    }
    agg.total += r.total;
    const tr = (r.trace as TraceItem[] | null) ?? [];
    agg.trace.push(...tr);
    const al = (r.alertas as string[] | null) ?? [];
    agg.alertas.push(...al);
  }
  return map;
}

export function construirLinhasComparativas(
  a: CenarioCompleto | null,
  b: CenarioCompleto | null,
  _modoNome: "completo" | "iniciais",
): LinhaComparativa[] {
  // Nome completo sempre na tabela de pacotes — facilita identificação e
  // o waterfall já mostra detalhes. modoNome continua afetando outras telas.
  void _modoNome;
  const mapA = agregar(a?.remuneracoes);
  const mapB = agregar(b?.remuneracoes);
  // Classificações por sócio — preferir o cenário B (NOVO), fallback A.
  // Também coletamos quotas para ordenação por equity.
  const publicoPorSocio = new Map<string, string>();
  const quotaPorSocio = new Map<string, number>();
  for (const c of a?.classificacoes ?? []) {
    publicoPorSocio.set(c.socioId, c.publico);
    quotaPorSocio.set(c.socioId, c.percentualQuotas ?? 0);
  }
  for (const c of b?.classificacoes ?? []) {
    publicoPorSocio.set(c.socioId, c.publico);
    quotaPorSocio.set(c.socioId, c.percentualQuotas ?? 0);
  }
  const ids = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
  const linhas: LinhaComparativa[] = ids.map((sid) => {
    const ra = mapA.get(sid);
    const rb = mapB.get(sid);
    const nomeOriginal = ra?.nome ?? rb?.nome ?? "?";
    const totalA = ra?.total ?? null;
    const totalB = rb?.total ?? null;
    const diff = (totalB ?? 0) - (totalA ?? 0);
    const diffPct = totalA && totalA !== 0 ? diff / totalA : null;
    return {
      socioId: sid,
      nome: nomeOriginal,
      publico: publicoPorSocio.get(sid) ?? "—",
      isFundador: ra?.isFundador ?? rb?.isFundador ?? false,
      quota: quotaPorSocio.get(sid) ?? 0,
      totalA,
      totalB,
      diff,
      diffPct,
      traceA: ra?.trace ?? [],
      traceB: rb?.trace ?? [],
      alertasA: ra?.alertas ?? [],
      alertasB: rb?.alertas ?? [],
    };
  });
  const single = !a || !b;
  if (single) {
    linhas.sort((x, y) => Math.max(y.totalA ?? 0, y.totalB ?? 0) - Math.max(x.totalA ?? 0, x.totalB ?? 0));
  } else {
    // Ordenação hierárquica (modo comparativo):
    //   1. Fundadores no topo (entre si: por quota desc).
    //   2. Sócios de Capital (SOCIO_CAPITAL, SOCIO_CAPITAL_GESTOR,
    //      SOCIO_CAPITAL_LIDER_UNIDADE) por quota desc.
    //   3. Demais (SOCIO_SERVICOS, SOCIO_SERVICOS_ESTRATEGICO,
    //      LIDER_UNIDADE_NON_EQUITY, LIDER_TECNICO, etc.) por nome alfabético (pt-BR).
    linhas.sort((x, y) => {
      const cx = categoriaOrdem(x.publico, x.isFundador);
      const cy = categoriaOrdem(y.publico, y.isFundador);
      if (cx !== cy) return cx - cy;
      // Mesma categoria: capital usa quota desc; serviços/líderes usam nome asc.
      if (cx <= 1) {
        if (y.quota !== x.quota) return y.quota - x.quota;
        return x.nome.localeCompare(y.nome, "pt-BR");
      }
      return x.nome.localeCompare(y.nome, "pt-BR");
    });
  }
  return linhas;
}

// 0 = fundadores · 1 = sócios de capital · 2 = serviços/líderes/outros.
function categoriaOrdem(publico: string, isFundador: boolean): 0 | 1 | 2 {
  if (isFundador) return 0;
  if (
    publico === "SOCIO_CAPITAL" ||
    publico === "SOCIO_CAPITAL_GESTOR" ||
    publico === "SOCIO_CAPITAL_LIDER_UNIDADE"
  ) return 1;
  return 2;
}
