// Gera uma narrativa textual em PT-BR explicando o cenário calculado.
// Função pura — recebe dados do cenário + remunerações e devolve parágrafos
// Markdown-flavored simples (linhas com **negrito**).
//
// Útil para apresentar ao Conselho/Comitê sem precisar olhar a tabela.

import { brl, pct } from "@/lib/format";

export interface NarrativaInput {
  nome: string;
  modelo: "ATUAL" | "NOVO";
  ano: number;
  periodoRotulo: string;
  premissaNome: string;
  remuneracoes: Array<{
    socio: { nome: string; isFundador: boolean };
    total: number;
    trace: unknown;
    alertas: unknown;
  }>;
}

interface TraceItem {
  etapa: string;
  descricao: string;
  valor?: number;
}

function somaPorChave(remuneracoes: NarrativaInput["remuneracoes"]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of remuneracoes) {
    const trace = (r.trace as TraceItem[] | null) ?? [];
    for (const t of trace) {
      if (typeof t.valor !== "number") continue;
      const m = /^\d+\.(.+)$/.exec(t.etapa);
      const k = m ? m[1] : t.etapa;
      out[k] = (out[k] ?? 0) + t.valor;
    }
  }
  return out;
}

export function gerarNarrativa(input: NarrativaInput): string[] {
  const { nome, modelo, ano, periodoRotulo, premissaNome, remuneracoes } = input;
  const total = remuneracoes.reduce((acc, r) => acc + r.total, 0);
  const n = remuneracoes.length;
  const somas = somaPorChave(remuneracoes);

  const paragrafos: string[] = [];

  // Abertura
  paragrafos.push(
    `Cenário **"${nome}"** — modelo ${modelo}, baseado na premissa **"${premissaNome}"**, apurado para **${periodoRotulo}** (ano ${ano}). ` +
      `Total distribuído: **${brl(total, true)}**, em ${n} pacote(s).`,
  );

  if (modelo === "NOVO") {
    const blocoA = somas["bloco-A"] ?? 0;
    const blocoB = somas["bloco-B"] ?? 0;
    const blocoC = somas["bloco-C"] ?? 0;
    const remFundador = somas["fundador"] ?? 0;
    const admin = (somas["pro-labore"] ?? 0) + (somas["admin"] ?? 0);
    const rda = blocoA + blocoB + blocoC;
    const nFundadoresPagos = remuneracoes.filter(
      (r) => r.socio.isFundador && r.total > 0,
    ).length;
    if (rda > 0) {
      const partes: string[] = [];
      const detalheAdmin =
        remFundador > 0
          ? `administração **${brl(admin)}** (pró-labore + gestão) e remuneração aos fundadores **${brl(remFundador)}** (funding anual + discricionário, abatidos do LL antes do RDA)`
          : `**${brl(admin)}** para administração (pró-labore + gestão)`;
      partes.push(`Após reservar ${detalheAdmin}, o RDA disponível foi de **${brl(rda)}**.`);
      partes.push(
        `Distribuição: **Bloco A (${pct(blocoA / rda)})** — ${brl(blocoA)} entre Sócios de Capital **não-fundadores**, proporcional às quotas; ` +
          `**Bloco B (${pct(blocoB / rda)})** — ${brl(blocoB)} por desempenho; ` +
          `**Bloco C (${pct(blocoC / rda)})** — ${brl(blocoC)} retido como reserva estratégica.`,
      );
      if (nFundadoresPagos > 0) {
        partes.push(
          `${nFundadoresPagos} fundador(es) receberam a remuneração de fundador (funding anual e/ou discricionário) em etapa separada e ficaram fora do Bloco A.`,
        );
      }
      paragrafos.push(partes.join(" "));
    }
  } else {
    const proLabore = somas["pro-labore"] ?? 0;
    const gestao = somas["gestao"] ?? 0;
    const fundador = somas["fundador"] ?? 0;
    const distribuicao = somas["distribuicao"] ?? 0;
    const premio = somas["premio"] ?? 0;
    paragrafos.push(
      `Composição (modelo ATUAL): pró-labore **${brl(proLabore)}**, gestão **${brl(gestao)}**, ` +
        `funding fundadores **${brl(fundador)}**, distribuição por quotas **${brl(distribuicao)}**` +
        (premio > 0 ? `, prêmio uniforme **${brl(premio)}**` : "") +
        `.`,
    );
  }

  // Maior e menor pacote
  const ordenados = [...remuneracoes].sort((a, b) => b.total - a.total);
  if (ordenados.length > 0) {
    const maior = ordenados[0];
    const menor = ordenados[ordenados.length - 1];
    if (maior !== menor) {
      paragrafos.push(
        `Maior pacote: **${maior.socio.nome}** com ${brl(maior.total, true)}` +
          (maior.socio.isFundador ? " (fundador)" : "") +
          `. Menor: **${menor.socio.nome}** com ${brl(menor.total, true)}.` +
          ` Razão maior/menor: ${(maior.total / Math.max(menor.total, 1)).toFixed(1)}×.`,
      );
    }
  }

  // Alertas
  const todosAlertas = remuneracoes.flatMap((r) => (r.alertas as string[] | null) ?? []);
  const erros = todosAlertas.filter((a) => a.includes("[ERROR]")).length;
  const warns = todosAlertas.filter((a) => a.includes("[WARNING]")).length;
  if (erros + warns === 0) {
    paragrafos.push(`Sem alertas — ordem de apuração e regras de não-sobreposição respeitadas.`);
  } else {
    paragrafos.push(
      `Atenção: ${erros > 0 ? `**${erros} erro(s)**` : ""}${erros > 0 && warns > 0 ? " e " : ""}${
        warns > 0 ? `**${warns} aviso(s)**` : ""
      } no cálculo. Veja o detalhamento na tabela por sócio.`,
    );
  }

  return paragrafos;
}
