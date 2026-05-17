// Engine — Modelo NOVO (Política DSF v1: Blocos A/B/C + Pool + Créditos).
//
// Implementa a Ordem Oficial de Apuração (Mapa Econômico, §3 do Relatório Etapa 1):
//   1. Receita / resultado bruto                    (input: lucroLiquido por unidade)
//   2. Deduções obrigatórias                        (assumido já líquido no input)
//   3. Remuneração de Administração                 (custo, antes da distribuição)
//   4. Resultado Líquido por Unidade                (input)
//   5. Alocação interunidades (orig/exec/gestão)    (futuro: requer registro de projetos)
//   6. Pools locais (50/30/20)                      (sobre LL_unidade após admin)
//   7. RDA central                                  (LL_DSF − admin − parcela cedida a unidades)
//   8. Blocos A/B/C (45/35/20)                      (sobre RDA)
//   9. Ajustes finais                               (buy-in, retenções)
//
// STATUS: STUB funcional. Etapas 5 (alocação interunidades) ainda não modeladas
// porque requerem cadastro de projetos/clientes — fora do MVP.

import type {
  PremissasModeloNovo,
  ResultadoUnidade,
  SocioInput,
  PeriodoInput,
  PacoteRemuneracao,
  ResultadoSimulacao,
  TraceItem,
  Publico,
  PesosPorArea,
} from "./tipos";
import { validarSobreposicao, mensagensDeAlerta } from "./regras-sobreposicao";

// Peso efetivo de um sócio quando o modo é POR_AREA.
// Sócios sem área (fundadores, líderes técnicos) → peso 0 (não recebem Bloco B).
function pesoPorArea(areaCodigo: string | undefined, p?: PesosPorArea): number {
  if (!areaCodigo || !p) return 0;
  const wOrg = p.pesosOrganico[areaCodigo] ?? 0;
  const wInc = p.pesosIncremental[areaCodigo] ?? 0;
  return p.mixOrganico * wOrg + p.mixIncremental * wInc;
}

export interface InputModeloNovo {
  periodo: PeriodoInput;
  socios: SocioInput[];
  resultados: ResultadoUnidade[];
  premissas: PremissasModeloNovo;
}

// Elegibilidade conforme matriz oficial Política DSF v1 (mecanismo × categoria):
//
//                       SCap  SCapGes SCapLid SServ SServEstr LiderNE
//   Pró-labore            D     D       D       D     D         N/A
//   Bloco A               D     D       D       N/A   N/A       N/A
//   Bloco B               D     D       D       D     D         N/A
//   Bloco C               Excepcional p/ todas
//   Rem. Administração    N/A   D       Cond    D     Cond      N/A
//   Pool Unidade (30%)    N/A   N/A     D       N/A   N/A       D
//   Créditos O/E/G        Cumulativo p/ todas
//
// (D = Default, Cond = Condicionado, N/A = Não aplicável)
// "Condicionado" é codificado como "tem nivelCargo+faixaSalarial cadastrados".
const PUBLICOS_CAPITAL: Publico[] = [
  "SOCIO_CAPITAL",
  "SOCIO_CAPITAL_GESTOR",
  "SOCIO_CAPITAL_LIDER_UNIDADE",
];
// Bloco B: 5 categorias (todas exceto Líder Non-Equity).
const PUBLICOS_BLOCO_B: Publico[] = [
  ...PUBLICOS_CAPITAL,
  "SOCIO_SERVICOS",
  "SOCIO_SERVICOS_ESTRATEGICO",
];
// Pró-labore: mesmas 5 categorias. Líder Non-Equity NÃO recebe.
const PUBLICOS_PRO_LABORE: Publico[] = [...PUBLICOS_BLOCO_B];
// Remuneração de Administração: 4 categorias.
//   Default: SOCIO_CAPITAL_GESTOR, SOCIO_SERVICOS
//   Condicionado: SOCIO_CAPITAL_LIDER_UNIDADE, SOCIO_SERVICOS_ESTRATEGICO
// O engine aplica em qualquer um dos 4 desde que tenha nivelCargo+faixaSalarial
// cadastrados — para os 2 "Default", o cadastro espera-se sempre presente;
// para os 2 "Condicionado", só vem preenchido quando há cargo formal de admin.
const PUBLICOS_REM_ADMIN: Publico[] = [
  "SOCIO_CAPITAL_GESTOR",
  "SOCIO_CAPITAL_LIDER_UNIDADE",
  "SOCIO_SERVICOS",
  "SOCIO_SERVICOS_ESTRATEGICO",
];

export function calcularModeloNovo(input: InputModeloNovo): ResultadoSimulacao {
  const { periodo, socios, resultados, premissas } = input;
  const matriz = resultados.find((r) => r.isMatriz);
  const unidades = resultados.filter((r) => !r.isMatriz);
  const llMatriz = matriz?.lucroLiquido ?? 0;

  // Etapa 3 — Remuneração de Administração (calculada antes; é custo).
  // Aplica às 4 categorias da matriz oficial (Default + Condicionado).
  // Default vs Condicionado fica codificado pela presença de nivelCargo+faixaSalarial
  // OU de remuneracaoGestaoMensalOverride no cadastro do sócio.
  // Override individual (Socio.remuneracaoGestaoMensal) > tabela[nivel][faixa].
  let totalAdmin = 0;
  const adminPorSocio = new Map<string, number>();
  for (const s of socios) {
    if (!PUBLICOS_REM_ADMIN.includes(s.publico)) continue;
    let valor = 0;
    if (s.remuneracaoGestaoMensalOverride != null && s.remuneracaoGestaoMensalOverride > 0) {
      valor = s.remuneracaoGestaoMensalOverride * periodo.meses;
    } else if (s.nivelCargo && s.faixaSalarial) {
      const mensal = premissas.tabelaSalarial[s.nivelCargo]?.[s.faixaSalarial] ?? 0;
      valor = mensal * periodo.meses;
    }
    if (valor > 0) {
      adminPorSocio.set(s.id, valor);
      totalAdmin += valor;
    }
  }

  // Etapa 6 — Pool de cada unidade não-matriz (50/30/20 sobre LL_unidade)
  // Líder recebe 30%; equipe/reserva 20% (não-distribuído por enquanto);
  // 50% volta para a sociedade (entra no RDA central).
  const poolLiderPorUnidade = new Map<string, number>();
  for (const u of unidades) {
    poolLiderPorUnidade.set(u.unidadeCodigo, u.lucroLiquido * premissas.poolLider);
    // poolSociedade (50%) volta ao RDA central; poolEquipeReserva (20%) retido localmente.
    // Implementação completa do retorno ao RDA fica para iteração futura.
  }

  // Etapa 3.5 — Funding fundadores (discricionário, cadastrado por sócio
  // em /socios via Socio.fundingFundadorAnual). Cada fundador recebe seu
  // valor próprio (não rateio por quotas). Deduzido do LL antes do RDA.
  const fundadores = socios.filter((s) => s.isFundador);
  const remFundadorPorSocio = new Map<string, number>();
  let totalFundadores = 0;
  for (const s of fundadores) {
    const v = Math.max(0, s.fundingFundadorAnual ?? 0);
    if (v > 0) {
      remFundadorPorSocio.set(s.id, v);
      totalFundadores += v;
    }
  }

  // Etapa 7 — RDA central
  // RDA = LL_matriz − admin − fundadores (admin e fundadores já são deduções).
  // Simplificação MVP: matriz já é consolidada.
  const rda = Math.max(0, llMatriz - totalAdmin - totalFundadores);

  // Etapa 8 — Blocos A/B/C
  const totalBlocoA = rda * premissas.percentualBlocoA;
  const totalBlocoB = rda * premissas.percentualBlocoB;
  // const totalBlocoC = rda * premissas.percentualBlocoC; // mantido como reserva estratégica

  // Distribuição Bloco A — proporcional a quotas entre Sócios de Capital
  // NÃO-fundadores. Fundadores recebem só o funding individual (etapa 3.5);
  // incluí-los no Bloco A seria duplo benefício.
  const elegiveisA = socios.filter(
    (s) => PUBLICOS_CAPITAL.includes(s.publico) && !s.isFundador,
  );
  const somaQuotasA = elegiveisA.reduce((acc, s) => acc + s.percentualQuotas, 0);

  // Distribuição Bloco B — modo configurável (default: UNIFORME)
  const distribuicaoB = premissas.distribuicaoBlocoB ?? "UNIFORME";
  const elegiveisB = socios.filter((s) => PUBLICOS_BLOCO_B.includes(s.publico));
  // Pesos por categoria (multiplicador aplicado ao peso-base). Default 1.
  const pesoCat = premissas.pesoCategoria ?? {};
  // Mapa peso efetivo por sócio elegível, conforme modo:
  //   UNIFORME: peso = 1
  //   PESO_INDIVIDUAL: peso = pesoBlocoB ?? 1
  //   ORIGINACAO: peso = originacaoEsperadaAnual (zero exclui)
  //   POR_AREA: peso = (mixOrg × pesoOrgArea) + (mixInc × pesoIncArea); sem área → 0
  // Em todos os modos, o peso final é multiplicado por pesoCategoria[publico] ?? 1.
  const pesosBlocoB = new Map<string, number>();
  for (const s of elegiveisB) {
    let peso = 1;
    if (distribuicaoB === "PESO_INDIVIDUAL") peso = s.pesoBlocoB ?? 1;
    else if (distribuicaoB === "ORIGINACAO") peso = s.originacaoEsperadaAnual ?? 0;
    else if (distribuicaoB === "POR_AREA") peso = pesoPorArea(s.areaPraticaCodigo, premissas.pesosPorArea);
    peso *= pesoCat[s.publico] ?? 1;
    pesosBlocoB.set(s.id, peso);
  }
  const somaPesosB = Array.from(pesosBlocoB.values()).reduce((acc, v) => acc + v, 0);

  // Pró-labore: aplicado a todas as 6 categorias da Política DSF v1, proporcional
  // ao período (3 meses para trimestre, 12 para ano).
  const proLaboreMensal = premissas.proLaboreMensal ?? 0;
  const taxaComissao = premissas.taxaComissaoOriginacao ?? 0;

  const pacotes: PacoteRemuneracao[] = [];
  let totalDistribuido = 0;

  for (const s of socios) {
    const trace: TraceItem[] = [];
    // Pró-labore — aplicado às 5 categorias elegíveis da Política DSF v1.
    // Override individual (Socio.proLaboreMensal) > global da Premissa.
    const mensalEfetivo = s.proLaboreMensalOverride ?? proLaboreMensal;
    const proLabore = PUBLICOS_PRO_LABORE.includes(s.publico)
      ? mensalEfetivo * periodo.meses
      : 0;
    if (proLabore > 0) {
      trace.push({
        etapa: "3.pro-labore",
        descricao: `R$ ${mensalEfetivo.toLocaleString("pt-BR")} × ${periodo.meses} meses${s.proLaboreMensalOverride != null ? " (override individual)" : ""}`,
        valor: proLabore,
      });
    }
    const remGestao = adminPorSocio.get(s.id) ?? 0;
    if (remGestao > 0) trace.push({ etapa: "3.admin", descricao: "rem. de administração", valor: remGestao });

    // Funding fundador individual (cadastrado em /socios)
    const remFundador = remFundadorPorSocio.get(s.id) ?? 0;
    if (remFundador > 0) {
      trace.push({
        etapa: "3.fundador",
        descricao: "funding fundador individual (cadastro /socios)",
        valor: remFundador,
      });
    }

    // Bloco A — exclui fundadores (recebem só funding individual, etapa 3.5).
    let blocoA = 0;
    if (PUBLICOS_CAPITAL.includes(s.publico) && !s.isFundador && somaQuotasA > 0) {
      blocoA = (s.percentualQuotas / somaQuotasA) * totalBlocoA;
      trace.push({
        etapa: "8.bloco-A",
        descricao: `${((s.percentualQuotas / somaQuotasA) * 100).toFixed(2)}% × Bloco A (${(premissas.percentualBlocoA * 100).toFixed(0)}% RDA)`,
        valor: blocoA,
      });
    }

    // Bloco B — distribuído pelo peso do sócio (modo configurável)
    let blocoB = 0;
    if (PUBLICOS_BLOCO_B.includes(s.publico) && somaPesosB > 0) {
      const meuPeso = pesosBlocoB.get(s.id) ?? 0;
      blocoB = (meuPeso / somaPesosB) * totalBlocoB;
      if (blocoB > 0) {
        trace.push({
          etapa: "8.bloco-B",
          descricao: `${distribuicaoB.toLowerCase()} (peso ${meuPeso.toFixed(2)} / Σ ${somaPesosB.toFixed(2)})`,
          valor: blocoB,
        });
      }
    }

    // Pool de unidade — apenas líderes
    let poolUnidade = 0;
    const ehLider =
      s.publico === "SOCIO_CAPITAL_LIDER_UNIDADE" ||
      s.publico === "LIDER_UNIDADE_NON_EQUITY";
    if (ehLider && s.unidadeCodigo) {
      poolUnidade = poolLiderPorUnidade.get(s.unidadeCodigo) ?? 0;
      trace.push({
        etapa: "6.pool-unidade",
        descricao: `${(premissas.poolLider * 100).toFixed(0)}% × LL ${s.unidadeCodigo}`,
        valor: poolUnidade,
      });
    }

    // Comissão de Originação — taxa × valor originado (anual). O proporcional
    // por trimestre é deixado a cargo do dado de origem (originacaoEfetiva é
    // somada para o período relevante antes de chegar aqui).
    let creditoOriginacao = 0;
    if (taxaComissao > 0 && (s.originacaoEfetiva ?? 0) > 0) {
      creditoOriginacao = (s.originacaoEfetiva ?? 0) * taxaComissao;
      trace.push({
        etapa: "5.comissao-orig",
        descricao: `${(taxaComissao * 100).toFixed(1)}% × R$ ${(s.originacaoEfetiva ?? 0).toLocaleString("pt-BR")} originado`,
        valor: creditoOriginacao,
      });
    }

    const total = proLabore + remGestao + remFundador + blocoA + blocoB + poolUnidade + creditoOriginacao;
    totalDistribuido += total;

    const pacote: PacoteRemuneracao = {
      socioId: s.id,
      socioNome: s.nome,
      publico: s.publico,
      proLabore,
      remuneracaoGestao: remGestao,
      remuneracaoFundador: remFundador,
      blocoA,
      blocoB,
      blocoC: 0, // Bloco C retido como reserva estratégica — sem distribuição individual no MVP
      poolUnidade,
      creditoOriginacao,
      creditoExecucao: 0,
      creditoGestaoCP: 0,
      premio: 0,
      ajustes: 0,
      total,
      alertasNaoSobreposicao: [],
      trace,
    };
    pacote.alertasNaoSobreposicao = mensagensDeAlerta(validarSobreposicao(s.publico, pacote));
    pacotes.push(pacote);
  }

  const alertasGlobais: string[] = [];
  if (Math.abs(premissas.percentualBlocoA + premissas.percentualBlocoB + premissas.percentualBlocoC - 1) > 0.001) {
    alertasGlobais.push("Soma dos Blocos A+B+C não é 100%.");
  }
  if (Math.abs(premissas.poolSociedade + premissas.poolLider + premissas.poolEquipeReserva - 1) > 0.001) {
    alertasGlobais.push("Soma do Pool (sociedade+líder+equipe) não é 100%.");
  }

  return {
    modelo: "NOVO",
    periodo,
    pacotes,
    totalDistribuido,
    totalReservaCentral: rda * premissas.percentualBlocoC, // Bloco C retido como reserva estratégica no MVP
    totalNaoAlocado: llMatriz - totalDistribuido - rda * premissas.percentualBlocoC,
    alertasGlobais,
  };
}
