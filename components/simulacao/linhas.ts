// Construção das linhas comparativas alinhadas por sócio entre A e B.
// Visão ANUAL única — agrega todas as linhas de RemuneracaoCalculada do
// cenário (1 por sócio no novo sistema; pode ter até 4 em APPLIED antigos).
import { nomeOuIniciais } from "@/lib/format";
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
  modoNome: "completo" | "iniciais",
): LinhaComparativa[] {
  const mapA = agregar(a?.remuneracoes);
  const mapB = agregar(b?.remuneracoes);
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
      nome: nomeOuIniciais(nomeOriginal, modoNome),
      isFundador: ra?.isFundador ?? rb?.isFundador ?? false,
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
    linhas.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
  }
  return linhas;
}
