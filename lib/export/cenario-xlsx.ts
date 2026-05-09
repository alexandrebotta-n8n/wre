// Exporta um cenário como workbook XLSX (4 abas).
// Pure: recebe dados + retorna Buffer. Nenhum acesso a Prisma/Next aqui.
import * as XLSX from "@e965/xlsx";

export interface CenarioParaExport {
  nome: string;
  modelo: "ATUAL" | "NOVO";
  ano: number;
  status: string;
  versao: number;
  premissaNome: string;
  premissaParametros: Record<string, unknown>;
  criadoEm: Date | string;
  aplicadoEm?: Date | string | null;

  classificacoes: Array<{
    socioNome: string;
    cargo: string;
    publico: string;
    unidadeCodigo?: string | null;
    percentualQuotas: number;
    pesoBlocoB?: number | null;
    originacaoEsperada: number;
    isFundador: boolean;
  }>;

  remuneracoes: Array<{
    socioNome: string;
    periodoRotulo: string;
    proLabore: number;
    remuneracaoGestao: number;
    remuneracaoFundador: number;
    blocoA: number;
    blocoB: number;
    blocoC: number;
    poolUnidade: number;
    creditoOriginacao: number;
    creditoExecucao: number;
    creditoGestaoCP: number;
    premio: number;
    ajustes: number;
    total: number;
    alertas: string[];
  }>;
}

export function gerarXlsxCenario(c: CenarioParaExport): Buffer {
  const wb = XLSX.utils.book_new();

  // -------- Aba "Resumo" --------
  const totalDistribuido = c.remuneracoes.reduce((acc, r) => acc + r.total, 0);
  const resumo: Array<[string, string | number | Date]> = [
    ["WRE Simulador — DSF", ""],
    ["", ""],
    ["Cenário", c.nome],
    ["Modelo", c.modelo],
    ["Ano-base", c.ano],
    ["Status", c.status],
    ["Versão", c.versao],
    ["Premissa", c.premissaNome],
    ["Criado em", toDate(c.criadoEm)],
    ["Aplicado em", c.aplicadoEm ? toDate(c.aplicadoEm) : ""],
    ["", ""],
    ["Total distribuído (todos os períodos)", totalDistribuido],
    ["Sócios/líderes na simulação", c.classificacoes.length],
    ["Pacotes calculados", c.remuneracoes.length],
    ["", ""],
    ["— Parâmetros da premissa —", ""],
    ...Object.entries(c.premissaParametros).map(([k, v]) => [k, formatVal(v)] as [string, string | number]),
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  setColWidths(wsResumo, [38, 24]);
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // -------- Aba "Pacotes" --------
  const headerPacotes = [
    "Sócio", "Período",
    "Pró-labore", "Rem. Gestão", "Rem. Fundador",
    "Bloco A", "Bloco B", "Bloco C",
    "Pool Unidade", "Créd. Originação", "Créd. Execução", "Créd. Gestão CP",
    "Prêmio", "Ajustes",
    "TOTAL", "Alertas",
  ];
  const linhasPacotes = c.remuneracoes.map((r) => [
    r.socioNome, r.periodoRotulo,
    r.proLabore, r.remuneracaoGestao, r.remuneracaoFundador,
    r.blocoA, r.blocoB, r.blocoC,
    r.poolUnidade, r.creditoOriginacao, r.creditoExecucao, r.creditoGestaoCP,
    r.premio, r.ajustes,
    r.total, r.alertas.join(" | "),
  ]);
  const wsPacotes = XLSX.utils.aoa_to_sheet([headerPacotes, ...linhasPacotes]);
  setColWidths(wsPacotes, [28, 12, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 16, 60]);
  XLSX.utils.book_append_sheet(wb, wsPacotes, "Pacotes");

  // -------- Aba "Classificações" --------
  const headerClass = [
    "Sócio", "Cargo", "Público", "Unidade",
    "Quota %", "Peso Bloco B", "Originação esperada R$/ano", "Fundador",
  ];
  const linhasClass = c.classificacoes.map((cs) => [
    cs.socioNome, cs.cargo, cs.publico, cs.unidadeCodigo ?? "",
    cs.percentualQuotas, cs.pesoBlocoB ?? "", cs.originacaoEsperada,
    cs.isFundador ? "sim" : "",
  ]);
  const wsClass = XLSX.utils.aoa_to_sheet([headerClass, ...linhasClass]);
  setColWidths(wsClass, [28, 36, 28, 10, 14, 14, 24, 10]);
  XLSX.utils.book_append_sheet(wb, wsClass, "Classificações");

  // -------- Aba "Alertas" --------
  const headerAlertas = ["Sócio", "Período", "Alerta"];
  const linhasAlertas = c.remuneracoes.flatMap((r) =>
    r.alertas.map((a) => [r.socioNome, r.periodoRotulo, a]),
  );
  const wsAlertas = XLSX.utils.aoa_to_sheet([
    headerAlertas,
    ...(linhasAlertas.length === 0 ? [["—", "—", "Nenhum alerta de não-sobreposição."]] : linhasAlertas),
  ]);
  setColWidths(wsAlertas, [28, 12, 80]);
  XLSX.utils.book_append_sheet(wb, wsAlertas, "Alertas");

  // Buffer XLSX
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return out as Buffer;
}

function toDate(v: Date | string): Date {
  return typeof v === "string" ? new Date(v) : v;
}

function formatVal(v: unknown): string | number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v === null || v === undefined) return "";
  return JSON.stringify(v);
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]): void {
  ws["!cols"] = widths.map((wch) => ({ wch }));
}
