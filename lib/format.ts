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

// ============================================================================
// Anonimização — converte nome em iniciais para preservar confidencialidade.
//
// "Jose Décio Dupont"        → "J.D.D."
// "Bárbara Ravanello"        → "B.R."
// "Líder Técnico 1"          → "L.T.1."
// "Jose Claudio Fadanelli"   → "J.C.F."
//
// Conexões/preposições curtas (de, da, do, e) são ignoradas. Números são
// mantidos como sufixo (preservando "Líder Técnico 1" vs "Líder Técnico 2").
// ============================================================================
export function iniciais(nome: string): string {
  const partes = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (combining diacritics U+0300-U+036F)
    .split(/\s+/)
    .filter((p) => p.length > 0);
  const tokens: string[] = [];
  for (const p of partes) {
    if (/^\d+$/.test(p)) tokens.push(p);            // número inteiro: mantém
    else if (p.length >= 2) tokens.push(p[0].toUpperCase()); // ignora "de", "da", "e"
  }
  return tokens.length === 0 ? "?" : tokens.join(".") + ".";
}

// Helper conveniente: dado o nome e um modo, decide o que exibir.
export function nomeOuIniciais(nome: string, modo: "completo" | "iniciais"): string {
  return modo === "iniciais" ? iniciais(nome) : nome;
}
