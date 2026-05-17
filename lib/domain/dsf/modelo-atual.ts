// Engine — Modelo ATUAL (replica a planilha "Sistema ATUAL de Remuneração DSF — 1º trim 2026").
//
// Ver tipos.ts (PremissasModeloAtual) para a especificação completa das regras.
// Resumo do fluxo:
//   1. Pró-labore: 5000 × meses por sócio elegível
//   2. Rem. Gestão: tabela[nivel][faixa] × meses
//   3. Rem. Fundadores: cada fundador recebe `ClassificacaoSocio.valorDiscricionario`
//      (BRL fixo definido por cenário no drawer de classificações). Não há
//      mais um valor anual global rateado por quotas.
//   4. Funding DSF residual = LL_matriz − Σ valorDiscricionário_fundadores
//   5. Reserva = funding_DSF × reservaPct
//   6. Distribuição sócios não-fund = funding_DSF × (1 − reservaPct), rateada
//      por (quota / Σquotas_nãoFund)
//   7. Prêmio de performance (opcional) = reserva / nº elegíveis (uniforme)

import type {
  PremissasModeloAtual,
  ResultadoUnidade,
  SocioInput,
  PeriodoInput,
  PacoteRemuneracao,
  ResultadoSimulacao,
  TraceItem,
  Publico,
} from "./tipos";
import { validarSobreposicao, mensagensDeAlerta } from "./regras-sobreposicao";

export interface InputModeloAtual {
  periodo: PeriodoInput;
  socios: SocioInput[];
  resultados: ResultadoUnidade[];
  premissas: PremissasModeloAtual;
}

const DEFAULT_PUBLICOS_PREMIO: Publico[] = ["SOCIO_CAPITAL", "SOCIO_CAPITAL_GESTOR"];

export function calcularModeloAtual(input: InputModeloAtual): ResultadoSimulacao {
  const { periodo, socios, resultados, premissas } = input;

  const matriz = resultados.find((r) => r.unidadeCodigo === premissas.unidadeMatriz);
  const llMatriz = matriz?.lucroLiquido ?? 0;

  // ---------- Etapa 1: Pró-labore por sócio ----------
  // Override individual (Socio.proLaboreMensal) > premissa.proLaboreMensal.
  const proLaborePorSocio = new Map<string, number>();
  for (const s of socios) {
    if (elegivelProLabore(s)) {
      const mensal = s.proLaboreMensalOverride ?? premissas.proLaboreMensal;
      proLaborePorSocio.set(s.id, mensal * periodo.meses);
    }
  }

  // ---------- Etapa 2: Remuneração de gestão por sócio ----------
  // Override individual (Socio.remuneracaoGestaoMensal) > tabela[nivel][faixa].
  const remGestaoPorSocio = new Map<string, number>();
  for (const s of socios) {
    const mensalOverride = s.remuneracaoGestaoMensalOverride;
    if (mensalOverride != null && mensalOverride > 0) {
      remGestaoPorSocio.set(s.id, mensalOverride * periodo.meses);
    } else if (s.nivelCargo && s.faixaSalarial) {
      const mensal = premissas.tabelaSalarial[s.nivelCargo]?.[s.faixaSalarial] ?? 0;
      remGestaoPorSocio.set(s.id, mensal * periodo.meses);
    }
  }

  // ---------- Etapa 3: Remuneração de fundadores ----------
  // Cada fundador recebe `s.valorDiscricionario` (BRL fixo definido por
  // cenário em ClassificacaoSocio). Sem valor → 0.
  const remFundadorPorSocio = new Map<string, number>();
  let totalFundadores = 0;
  for (const s of socios) {
    if (!s.isFundador) continue;
    const valor = s.valorDiscricionario ?? 0;
    if (valor > 0) {
      remFundadorPorSocio.set(s.id, valor);
      totalFundadores += valor;
    }
  }

  // ---------- Etapa 4: Funding DSF residual ----------
  // Funding = LL_matriz − Σ valorDiscricionário_fundadores. Não desconta
  // pró-labore/gestão pois já são despesas contabilizadas no LL.
  const fundingMatriz = matriz?.fundingVariavel ?? llMatriz - totalFundadores;

  // ---------- Etapa 5: Reserva ----------
  const reserva = fundingMatriz * premissas.reservaPercentual;

  // ---------- Etapa 6: Distribuição entre sócios não-fundadores ----------
  const distribuivel = fundingMatriz * (1 - premissas.reservaPercentual);
  const sociosNaoFund = socios.filter((s) => !s.isFundador && s.percentualQuotas > 0);
  const somaQuotasNaoFund = sociosNaoFund.reduce((acc, s) => acc + s.percentualQuotas, 0);

  const distribuicaoPorSocio = new Map<string, number>();
  if (somaQuotasNaoFund > 0) {
    for (const s of sociosNaoFund) {
      distribuicaoPorSocio.set(s.id, (s.percentualQuotas / somaQuotasNaoFund) * distribuivel);
    }
  }

  // ---------- Etapa 7: Prêmio de performance (opcional) ----------
  const publicosPremio = premissas.publicosElegiveisPremio ?? DEFAULT_PUBLICOS_PREMIO;
  const elegiveisPremio = socios.filter((s) => publicosPremio.includes(s.publico));
  const premioPorElegivel =
    premissas.reservaViraPremio && elegiveisPremio.length > 0
      ? reserva / elegiveisPremio.length
      : 0;

  // ---------- Monta os pacotes ----------
  const pacotes: PacoteRemuneracao[] = [];
  let totalDistribuido = 0;

  for (const s of socios) {
    const trace: TraceItem[] = [];
    const proLabore = proLaborePorSocio.get(s.id) ?? 0;
    const remGestao = remGestaoPorSocio.get(s.id) ?? 0;
    const remFundador = remFundadorPorSocio.get(s.id) ?? 0;
    const distSocio = distribuicaoPorSocio.get(s.id) ?? 0;
    const premio = elegiveisPremio.includes(s) ? premioPorElegivel : 0;

    if (proLabore) trace.push({ etapa: "1.pro-labore", descricao: `${premissas.proLaboreMensal} × ${periodo.meses}m`, valor: proLabore });
    if (remGestao) trace.push({ etapa: "2.gestao", descricao: `${s.nivelCargo}/${s.faixaSalarial}`, valor: remGestao });
    if (remFundador) trace.push({ etapa: "3.fundador", descricao: "discricionário do fundador (BRL por cenário)", valor: remFundador });
    if (distSocio) trace.push({ etapa: "6.distribuicao", descricao: `${(s.percentualQuotas * 100).toFixed(4)}% / Σquotas × funding × ${(1 - premissas.reservaPercentual).toFixed(2)}`, valor: distSocio });
    if (premio) trace.push({ etapa: "7.premio", descricao: "reserva uniforme", valor: premio });

    // No Modelo Atual, "blocoB" representa apenas a distribuição de lucros
    // (a planilha mostra "1º TRIM" = gestão + fundadores + distribuição,
    // SEM o prêmio, que aparece em coluna separada).
    const blocoB = distSocio;
    const total = proLabore + remGestao + remFundador + blocoB + premio;
    totalDistribuido += total;

    const pacote: PacoteRemuneracao = {
      socioId: s.id,
      socioNome: s.nome,
      publico: s.publico,
      proLabore,
      remuneracaoGestao: remGestao,
      remuneracaoFundador: remFundador,
      blocoA: 0,
      blocoB,
      blocoC: 0,
      poolUnidade: 0,
      creditoOriginacao: 0,
      creditoExecucao: 0,
      creditoGestaoCP: 0,
      premio,
      ajustes: 0,
      total,
      alertasNaoSobreposicao: [],
      trace,
    };
    pacote.alertasNaoSobreposicao = mensagensDeAlerta(validarSobreposicao(s.publico, pacote));
    pacotes.push(pacote);
  }

  // No Modelo Atual a reserva, quando vira prêmio, está dentro de totalDistribuido.
  // Quando NÃO vira prêmio, fica como reserva central.
  const reservaCentral = premissas.reservaViraPremio ? 0 : reserva;

  return {
    modelo: "ATUAL",
    periodo,
    pacotes,
    totalDistribuido,
    totalReservaCentral: reservaCentral,
    totalNaoAlocado: llMatriz - totalDistribuido - reservaCentral,
    alertasGlobais: [],
  };
}

function elegivelProLabore(s: SocioInput): boolean {
  // Líderes técnicos não recebem pró-labore no modelo atual.
  return s.publico !== "LIDER_TECNICO";
}
