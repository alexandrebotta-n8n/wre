// Construção das linhas comparativas alinhadas por sócio entre A e B.
// Cada `cenario.remuneracoes` agora carrega 4 linhas por sócio (uma por
// trimestre); aqui agregamos no anual e mantemos o breakdown por trimestre
// para o drill-down.
import { nomeOuIniciais } from "@/lib/format";
import type {
  CenarioCompleto,
  LinhaComparativa,
  TraceItem,
  Trimestre,
  DetalheTrimestre,
} from "./types";

type RemuneracaoRow = NonNullable<CenarioCompleto>["remuneracoes"][number];

interface AggSocio {
  socioId: string;
  nome: string;
  isFundador: boolean;
  total: number;
  porTrimestre: Partial<Record<Trimestre, DetalheTrimestre>>;
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
        porTrimestre: {},
      };
      map.set(r.socioId, agg);
    }
    agg.total += r.total;
    const t = r.periodo.trimestre as Trimestre | null;
    if (t && t >= 1 && t <= 4) {
      agg.porTrimestre[t] = {
        total: r.total,
        trace: (r.trace as TraceItem[] | null) ?? [],
        alertas: (r.alertas as string[] | null) ?? [],
      };
    }
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
      porTrimestreA: ra?.porTrimestre ?? {},
      porTrimestreB: rb?.porTrimestre ?? {},
    };
  });
  // Ordena por |diff| desc quando há 2 cenários; por valor único desc quando só um.
  const single = !a || !b;
  if (single) {
    linhas.sort((x, y) => Math.max(y.totalA ?? 0, y.totalB ?? 0) - Math.max(x.totalA ?? 0, x.totalB ?? 0));
  } else {
    linhas.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
  }
  return linhas;
}
