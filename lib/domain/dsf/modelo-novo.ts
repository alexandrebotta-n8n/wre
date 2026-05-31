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
} from "./tipos";
import { validarSobreposicao, mensagensDeAlerta } from "./regras-sobreposicao";

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
// Pró-labore: APENAS Sócios de Capital (3 categorias). Sócios de Serviço/
// Líderes Técnicos não recebem pró-labore na Política DSF v1 (planilha
// "Dados Sócios para Simulador.xlsx" — coluna P.Lab. dos E é zero).
const PUBLICOS_PRO_LABORE: Publico[] = [...PUBLICOS_CAPITAL];
// "Rem. de Gestão" (antes "Rem. de Administração") — UNIFICADA com o
// modelo ATUAL: qualquer sócio com nivelCargo+faixaSalarial (ou override
// individual) recebe. Antes existia constante PUBLICOS_REM_ADMIN restrita
// a 4 categorias; foi removida para padronizar o cálculo entre os 2
// modelos e evitar confusão na UI. Veja modelo-atual.ts:67–85.

export function calcularModeloNovo(input: InputModeloNovo): ResultadoSimulacao {
  const { periodo, socios, resultados, premissas } = input;
  const matriz = resultados.find((r) => r.isMatriz);
  const unidades = resultados.filter((r) => !r.isMatriz);
  const llMatriz = matriz?.lucroLiquido ?? 0;

  // Etapa 3 — Rem. de Gestão (custo). Regra UNIFICADA com o modelo ATUAL:
  //   - Elegível: todos com nivelCargo+faixaSalarial (ou override individual).
  //     Inclui fundadores com cargo. Não filtra por publico.
  //   - Override individual (Socio.remuneracaoGestaoMensal) > tabela[nivel][faixa].
  //   - Fator: LIDER_TECNICO usa mesesAnualLiderTecnicoCLT (default 14,4)
  //     proporcional ao período; demais usam periodo.meses.
  //   - NÃO é deduzido do RDA — admin é custo já refletido no LL líquido.
  const fatorCLTAnual = premissas.mesesAnualLiderTecnicoCLT ?? 14.4;
  const fatorLiderCLTPeriodo = fatorCLTAnual * (periodo.meses / 12);
  let totalAdmin = 0;
  const adminPorSocio = new Map<string, number>();
  for (const s of socios) {
    const fator = s.publico === "LIDER_TECNICO" ? fatorLiderCLTPeriodo : periodo.meses;
    let valor = 0;
    if (s.remuneracaoGestaoMensalOverride != null && s.remuneracaoGestaoMensalOverride > 0) {
      valor = s.remuneracaoGestaoMensalOverride * fator;
    } else if (s.nivelCargo && s.faixaSalarial) {
      const mensal = premissas.tabelaSalarial[s.nivelCargo]?.[s.faixaSalarial] ?? 0;
      valor = mensal * fator;
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

  // Etapa 3.5 — Funding fundadores: REMOVIDO da política NOVA.
  // Fundadores não recebem na Política DSF v1 (conforme planilha "Dados Sócios
  // para Simulador.xlsx" — coluna "Nova Política" = Não considerar). O campo
  // Socio.fundingFundadorAnual continua existindo no DB mas só alimenta o
  // engine ATUAL. RDA central preserva esse valor (não deduz).
  const remFundadorPorSocio = new Map<string, number>();

  // Etapa 7 — RDA central
  // RDA = LL_matriz direto. Admin é despesa contábil já refletida no LL
  // líquido (planilha de/para confirma: LL 8.001.970 já é "líquido após
  // despesas"). Não dedupla aqui.
  const rda = Math.max(0, llMatriz);
  void totalAdmin; // mantido como métrica auxiliar p/ inspeção futura

  // Etapa 8 — Blocos A/B/C
  const totalBlocoA = rda * premissas.percentualBlocoA;
  const totalBlocoB = rda * premissas.percentualBlocoB;
  const totalBlocoC = rda * premissas.percentualBlocoC;

  // Distribuição Bloco A — proporcional a quotas entre Sócios de Capital
  // NÃO-fundadores. Fundadores recebem só o funding individual (etapa 3.5);
  // incluí-los no Bloco A seria duplo benefício.
  const elegiveisA = socios.filter(
    (s) => PUBLICOS_CAPITAL.includes(s.publico) && !s.isFundador,
  );
  const somaQuotasA = elegiveisA.reduce((acc, s) => acc + s.percentualQuotas, 0);

  // Distribuição Bloco B — regra ÚNICA da Política DSF v1: cada sócio
  // elegível recebe um valor direto em R$ igual a:
  //   ValorBlocoB = blocoBNumSalariosAlvo × (proLaboreMensal + remGestaoMensal)
  // Antes existiam 5 modos (UNIFORME / PESO_INDIVIDUAL / ORIGINACAO /
  // POR_AREA / ALVO_NUM_SALARIOS) configuráveis na Premissa. Foram removidos
  // — a regra "nº salários" é a única acordada com DSF. Mais simples + sem
  // dropdown na UI. Pro-rata é aplicado quando Σ alvos > totalBlocoB.
  // Bloco B: exclui fundadores (Política DSF v1 — "Não considerar").
  const elegiveisB = socios.filter((s) => !s.isFundador && PUBLICOS_BLOCO_B.includes(s.publico));
  // Pró-labore base — aplicado às 6 categorias elegíveis (proporcional ao período).
  const proLaboreMensal = premissas.proLaboreMensal ?? 0;

  // Salário-base mensal por sócio = rem.gestão + pró-labore (com overrides
  // individuais). Pró-labore só conta para Sócios de Capital (Política DSF v1).
  const baseMensalPorSocio = new Map<string, number>();
  for (const s of elegiveisB) {
    const n = s.blocoBNumSalariosAlvo ?? 0;
    if (n <= 0) continue;
    const remGestaoMensal =
      s.remuneracaoGestaoMensalOverride ??
      (s.nivelCargo && s.faixaSalarial
        ? premissas.tabelaSalarial[s.nivelCargo]?.[s.faixaSalarial] ?? 0
        : 0);
    const proLaboreMensalSocio = PUBLICOS_PRO_LABORE.includes(s.publico)
      ? (s.proLaboreMensalOverride ?? proLaboreMensal)
      : 0;
    baseMensalPorSocio.set(s.id, remGestaoMensal + proLaboreMensalSocio);
  }

  // Distribui o Bloco B pelos alvos individuais, com pro-rata.
  // Bloco C NÃO entra aqui — é diferido e só sai para o sócio quando há
  // valor manual em Socio.blocoCValorManualAno (registrado por deliberação
  // estratégica, item 3.3.4 da Política DSF v1). Tudo que não for alocado
  // manualmente fica em `totalReservaCentral`.
  const valorBlocoBAbsoluto = new Map<string, number>();
  for (const s of elegiveisB) {
    const n = s.blocoBNumSalariosAlvo ?? 0;
    const base = baseMensalPorSocio.get(s.id) ?? 0;
    if (n <= 0 || base <= 0) continue;
    valorBlocoBAbsoluto.set(s.id, base * n);
  }
  const somaB = Array.from(valorBlocoBAbsoluto.values()).reduce((a, v) => a + v, 0);
  const fatorB = somaB > totalBlocoB && somaB > 0 ? totalBlocoB / somaB : 1;
  if (fatorB !== 1) {
    for (const [id, alvo] of valorBlocoBAbsoluto) {
      valorBlocoBAbsoluto.set(id, alvo * fatorB);
    }
  }

  const taxaComissao = premissas.taxaComissaoOriginacao ?? 0;

  const pacotes: PacoteRemuneracao[] = [];
  let totalDistribuido = 0;

  for (const s of socios) {
    const trace: TraceItem[] = [];
    // Pró-labore — aplicado às 5 categorias elegíveis da Política DSF v1.
    // Override individual (Socio.proLaboreMensal) > global da Premissa.
    // Fundadores são excluídos (Política DSF v1 — "Não considerar").
    const mensalEfetivo = s.proLaboreMensalOverride ?? proLaboreMensal;
    const proLabore = !s.isFundador && PUBLICOS_PRO_LABORE.includes(s.publico)
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
    if (remGestao > 0) {
      const ehLiderCLT = s.publico === "LIDER_TECNICO";
      const base = s.remuneracaoGestaoMensalOverride
        ?? (s.nivelCargo && s.faixaSalarial ? premissas.tabelaSalarial[s.nivelCargo]?.[s.faixaSalarial] ?? 0 : 0);
      const fatorDesc = ehLiderCLT
        ? `CLT × ${fatorCLTAnual.toFixed(2)}${periodo.meses !== 12 ? ` × (${periodo.meses}/12)` : ""}`
        : `× ${periodo.meses} meses`;
      const tabelaDesc = !s.remuneracaoGestaoMensalOverride && s.nivelCargo && s.faixaSalarial
        ? ` (${s.nivelCargo}/${s.faixaSalarial})`
        : "";
      trace.push({
        etapa: "3.rem-gestao",
        descricao: `R$ ${base.toLocaleString("pt-BR")}${tabelaDesc} ${fatorDesc}`,
        valor: remGestao,
      });
    }

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

    // Bloco B — valor absoluto direto: nº salários × (pró-labore + rem.gestão).
    // Já pro-ratado pelo cálculo acima quando Σ alvos > totalBlocoB.
    const blocoB = valorBlocoBAbsoluto.get(s.id) ?? 0;
    if (blocoB > 0) {
      const n = s.blocoBNumSalariosAlvo ?? 0;
      trace.push({
        etapa: "8.bloco-B",
        descricao: `${n} salários × base (pró-labore + rem. gestão)`,
        valor: blocoB,
      });
    }

    // Bloco C — DIFERIDO. Default = 0 para todos. Só recebe quando há
    // deliberação estratégica registrada em Socio.blocoCValorManualAno
    // (Política DSF v1, item 3.3.4). O que não é alocado vira reserva
    // central. Pro-rata pelo período (× meses/12).
    let blocoC = 0;
    const manualAno = s.blocoCValorManualAno;
    if (manualAno != null && manualAno > 0) {
      blocoC = manualAno * (periodo.meses / 12);
      trace.push({
        etapa: "9.bloco-C",
        descricao: `valor manual: R$ ${manualAno.toLocaleString("pt-BR")}/ano${periodo.meses !== 12 ? ` × (${periodo.meses}/12)` : ""}`,
        valor: blocoC,
      });
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
    if (!s.isFundador && taxaComissao > 0 && (s.originacaoEfetiva ?? 0) > 0) {
      creditoOriginacao = (s.originacaoEfetiva ?? 0) * taxaComissao;
      trace.push({
        etapa: "5.comissao-orig",
        descricao: `${(taxaComissao * 100).toFixed(1)}% × R$ ${(s.originacaoEfetiva ?? 0).toLocaleString("pt-BR")} originado`,
        valor: creditoOriginacao,
      });
    }

    const total = proLabore + remGestao + remFundador + blocoA + blocoB + blocoC + poolUnidade + creditoOriginacao;
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
      // Bloco C: distribuído via mesma fórmula do Bloco B quando modo é
      // ALVO_NUM_SALARIOS (Política DSF v1). Outros modos: retido (0).
      blocoC,
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

  // Reserva central = Bloco C que NÃO foi distribuído. Como o Bloco C agora
  // só sai por deliberação estratégica (valor manual por sócio), a reserva
  // tipicamente absorve a maior parte dos 20%×RDA. Se a soma dos manuais
  // excede totalBlocoC: cada sócio recebe seu valor integral mesmo assim
  // (decisão estratégica vincula); reserva fica clamped em 0 e emitimos
  // alerta global pra o usuário revisar.
  const blocoCDistribuido = pacotes.reduce((a, p) => a + p.blocoC, 0);
  if (blocoCDistribuido > totalBlocoC + 0.01) {
    alertasGlobais.push(
      `Σ Bloco C manual (R$ ${blocoCDistribuido.toLocaleString("pt-BR")}) excede o disponível ` +
      `(R$ ${totalBlocoC.toLocaleString("pt-BR")} = 20% × RDA). Revisar deliberações estratégicas em /socios.`,
    );
  }
  const reservaCentral = Math.max(0, totalBlocoC - blocoCDistribuido);
  return {
    modelo: "NOVO",
    periodo,
    pacotes,
    totalDistribuido,
    totalReservaCentral: reservaCentral,
    totalNaoAlocado: llMatriz - totalDistribuido - reservaCentral,
    alertasGlobais,
  };
}
