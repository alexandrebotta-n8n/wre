// Engine genérico de multiplicador por KPI.
//
// Curva piecewise-linear configurável. Cada regra define 3 breakpoints
// (min/esp/exc) e 3 multiplicadores correspondentes. Abaixo do min => 0.
// Acima do exc => clamp em multExc (sem extrapolação).
//
// `inverso=true` inverte a comparação (menor é melhor): o valor é refletido
// em torno dos breakpoints.

export interface CurvaKpi {
  metaMin: number;
  metaEsp: number;
  metaExc: number;
  multMin: number; // tipicamente 0.5
  multEsp: number; // tipicamente 1.0
  multExc: number; // tipicamente 1.5
  inverso?: boolean;
}

export function multiplicadorKpi(valor: number, c: CurvaKpi): number {
  if (c.inverso) {
    // Para "menor é melhor", invertemos: se valor <= metaExc → multExc, etc.
    if (valor > c.metaMin) return 0;
    if (valor >= c.metaEsp) return interp(valor, c.metaMin, c.metaEsp, c.multMin, c.multEsp);
    if (valor >= c.metaExc) return interp(valor, c.metaEsp, c.metaExc, c.multEsp, c.multExc);
    return c.multExc;
  }
  if (valor < c.metaMin) return 0;
  if (valor < c.metaEsp) return interp(valor, c.metaMin, c.metaEsp, c.multMin, c.multEsp);
  if (valor < c.metaExc) return interp(valor, c.metaEsp, c.metaExc, c.multEsp, c.multExc);
  return c.multExc;
}

function interp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0;
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

export interface RegraComputada {
  chave: string;
  peso: number;
  multiplicador: number;
}

// Multiplicador composto = soma ponderada dos multiplicadores de cada regra.
// Pesos devem somar 1.0 (validado em borda).
export function multiplicadorComposto(regras: RegraComputada[]): number {
  return regras.reduce((acc, r) => acc + r.peso * r.multiplicador, 0);
}

// Pro-rata gate: colaboradores com menos de `proRataMinMeses` no ano são
// inelegíveis. Acima do mínimo, fração proporcional.
export function proRata(mesesAtivos: number, proRataMinMeses: number): number {
  if (mesesAtivos < proRataMinMeses) return 0;
  return Math.min(mesesAtivos, 12) / 12;
}
