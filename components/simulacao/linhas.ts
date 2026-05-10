// Construção das linhas comparativas (alinhadas por sócio entre A e B).
import { nomeOuIniciais } from "@/lib/format";
import type { CenarioCompleto, LinhaComparativa, TraceItem } from "./types";

export function construirLinhasComparativas(
  a: CenarioCompleto | null,
  b: CenarioCompleto | null,
  modoNome: "completo" | "iniciais",
): LinhaComparativa[] {
  const mapA = new Map(a?.remuneracoes.map((r) => [r.socioId, r]) ?? []);
  const mapB = new Map(b?.remuneracoes.map((r) => [r.socioId, r]) ?? []);
  const ids = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
  const linhas: LinhaComparativa[] = ids.map((sid) => {
    const ra = mapA.get(sid);
    const rb = mapB.get(sid);
    const nomeOriginal = ra?.socio.nome ?? rb?.socio.nome ?? "?";
    const totalA = ra?.total ?? null;
    const totalB = rb?.total ?? null;
    const diff = (totalB ?? 0) - (totalA ?? 0);
    const diffPct = totalA && totalA !== 0 ? diff / totalA : null;
    return {
      socioId: sid,
      nome: nomeOuIniciais(nomeOriginal, modoNome),
      isFundador: ra?.socio.isFundador ?? rb?.socio.isFundador ?? false,
      totalA,
      totalB,
      diff,
      diffPct,
      traceA: (ra?.trace as TraceItem[] | null) ?? [],
      traceB: (rb?.trace as TraceItem[] | null) ?? [],
      alertasA: (ra?.alertas as string[] | null) ?? [],
      alertasB: (rb?.alertas as string[] | null) ?? [],
    };
  });
  // Ordena por |diff| desc para destacar maiores impactos.
  linhas.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
  return linhas;
}
