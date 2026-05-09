// Formatadores BR — moeda, percentual, data.

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const fmtBRLCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const fmtPct = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
});

export function brl(v: number, compact = false): string {
  return (compact ? fmtBRLCompact : fmtBRL).format(v);
}

export function pct(v: number): string {
  return fmtPct.format(v);
}

export function dataHora(d: Date | string): string {
  return fmtData.format(typeof d === "string" ? new Date(d) : d);
}
