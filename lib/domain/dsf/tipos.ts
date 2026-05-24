// Tipos puros do domínio DSF — usados pelos engines de cálculo (ATUAL e NOVO).
// Nenhum import de Prisma aqui. Os engines recebem dados serializados como
// objetos simples e devolvem objetos simples.

export type Publico =
  | "SOCIO_CAPITAL"
  | "SOCIO_CAPITAL_GESTOR"
  | "SOCIO_CAPITAL_LIDER_UNIDADE"
  | "SOCIO_SERVICOS"
  | "SOCIO_SERVICOS_ESTRATEGICO"
  | "LIDER_UNIDADE_NON_EQUITY"
  | "LIDER_TECNICO"
  | "FUNDADOR";

export type NivelCargo = "A" | "B" | "C" | "D";
export type FaixaSalarial = "INICIAL" | "PLENO" | "EXPERT";
export type ModeloRegra = "ATUAL" | "NOVO";

export interface SocioInput {
  id: string;
  nome: string;
  cargo: string;
  publico: Publico;
  unidadeCodigo?: string; // "DSF" | "BG" | ...
  percentualQuotas: number; // 0..1
  originacaoEsperadaAnual: number; // BRL
  // Originação efetiva no período (somatório de OriginacaoPeriodo no ano,
  // já com override do cenário aplicado quando houver). Usado pelo engine
  // NOVO para calcular a Comissão de Originação.
  originacaoEfetiva?: number;
  // Peso individual no Bloco B (default 1.0). Usado quando a premissa está
  // configurada como distribuicaoBlocoB="PESO_INDIVIDUAL".
  pesoBlocoB?: number;
  // Código da área de prática (Cível, Trabalhista, etc.). Usado quando a
  // premissa está em distribuicaoBlocoB="POR_AREA".
  areaPraticaCodigo?: string;
  nivelCargo?: NivelCargo;
  faixaSalarial?: FaixaSalarial;
  isFundador: boolean;
  // Overrides individuais de remuneração — vêm do cadastro do Sócio em /socios.
  // Quando setados, sobrescrevem a regra global da Premissa (proLaboreMensal)
  // e o lookup da TabelaSalario (rem. gestão) APENAS para este sócio.
  // Permite definição case-a-case sem afetar a premissa.
  proLaboreMensalOverride?: number;
  remuneracaoGestaoMensalOverride?: number;
  // Valor anual arbitrário (R$) — só fundadores. Engine soma estes valores
  // de todos isFundador=true e deduz do LL antes do RDA/distribuição residual.
  // Cada fundador recebe esse valor direto (sem rateio por quotas).
  // NOTA: usado apenas pelo engine ATUAL. Engine NOVO ignora (fundadores
  // não recebem remuneração na nova política).
  fundingFundadorAnual?: number;
  // Alvo de Bloco B em nº de salários (engine NOVO modo ALVO_NUM_SALARIOS).
  // Ex: CEO=20, Diretores=15, Sócios de Serviço/Líderes Técnicos=10.
  // null/0 = não participa.
  blocoBNumSalariosAlvo?: number;
}

export interface ResultadoUnidade {
  unidadeCodigo: string;
  isMatriz: boolean;
  lucroLiquido: number;       // BRL no período
  fundingVariavel?: number;   // BRL — opcional override
}

export interface PeriodoInput {
  rotulo: string;             // "1T2026", "2026"
  tipo: "TRIMESTRE" | "ANO";
  // Quantos meses o período cobre (3 ou 12) — usado para anualizar.
  meses: number;
}

// Tabela salarial (mensal em BRL) por nível × faixa.
export type TabelaSalarial = Record<NivelCargo, Record<FaixaSalarial, number>>;

// ============================================================================
// Premissas — Modelo ATUAL (replica planilha 1T2026)
//
// Regras codificadas (extraídas da planilha "Sistema ATUAL de Remuneração DSF"):
//
// 1. PRÓ-LABORE: R$ proLaboreMensal × meses, por sócio elegível.
// 2. REM. GESTÃO: tabelaSalarial[nivel][faixa] × meses, para sócios com cargo.
// 3. REM. FUNDADORES: cada fundador recebe `quota × fundingUnidadeFundadores`,
//    onde fundingUnidadeFundadores = ResultadoPeriodo.fundingVariavel da unidade
//    `unidadeFundadores` (ex: "BG"). NÃO há normalização — o total dos fundadores
//    sai naturalmente como `Σquotas_fund × funding_BG`.
// 4. FUNDING DSF (residual) = LL_matriz − Σ(rem.fundadores).
//    Pró-labore e rem.gestão NÃO são deduzidos novamente — já são despesas
//    contabilizadas no LL.
// 5. RESERVA = fundingDSF × reservaPercentual (5%). Pode opcionalmente virar
//    pool de prêmio uniforme (configurável via reservaViraPremio).
// 6. DISTRIBUIÇÃO SÓCIOS NÃO-FUND = fundingDSF × (1 − reservaPercentual),
//    rateada por (quota / Σquotas_nãoFund) entre sócios não-fundadores ativos.
// ============================================================================

export interface PremissasModeloAtual {
  proLaboreMensal: number;
  // Código da unidade matriz consolidada (planilha: "DSF")
  unidadeMatriz: string;
  // Percentual da reserva sobre o funding residual da matriz (planilha: 0.05)
  reservaPercentual: number;
  // Se true, a reserva é distribuída uniformemente entre sócios elegíveis
  // como prêmio de performance (compatível com a coluna "Prêmio" da planilha,
  // que é exatamente reserva / nº elegíveis).
  reservaViraPremio: boolean;
  // Públicos elegíveis ao prêmio de performance (default: capital + capital_gestor)
  publicosElegiveisPremio?: Publico[];
  // Valor anual arbitrário (BRL) distribuído entre fundadores (isFundador=true).
  // Substitui o cálculo antigo "Σquotas_fund × fundingVariavel_BG".
  // Vem da ConfiguracaoAno do ano do cenário. Default 0 → fundadores não recebem.
  fundingFundadoresAno: number;
  // Tabela de remuneração de gestão (mensal por nível × faixa)
  tabelaSalarial: TabelaSalarial;
  // Fator de anualização CLT para sócios LIDER_TECNICO (legado).
  // Default 14,4 = 12 + 13º + ⅓ férias + FGTS médio (~0,96 mês/ano).
  // Use 13,33 se não quiser FGTS. Aplicado em vez de meses no engine ATUAL.
  // Outros públicos sempre usam periodo.meses (12 anual). Proporcional ao
  // período: trimestral = mesesAnualLiderTecnicoCLT × (periodo.meses / 12).
  mesesAnualLiderTecnicoCLT?: number;
}

// ============================================================================
// Premissas — Modelo NOVO (Política DSF v1)
// ============================================================================

// Como o Bloco B é distribuído entre os elegíveis:
//   - UNIFORME: cada elegível recebe (totalBlocoB / nº elegíveis)
//   - PESO_INDIVIDUAL: proporcional a SocioInput.pesoBlocoB (default 1.0)
//   - ORIGINACAO: proporcional a SocioInput.originacaoEsperadaAnual
//                 (sócios sem originação não recebem Bloco B)
//   - POR_AREA: combina mistura organico/incremental + pesos por área.
//               Cada sócio com areaPraticaCodigo recebe peso proporcional a
//               (mixOrganico × pesoOrganico[area]) + (mixIncremental × pesoIncremental[area]).
//               Sócios sem área recebem 0.
// ALVO_NUM_SALARIOS: cada elegível recebe (rem.gestão_mensal + pró-labore_mensal)
// × `blocoBNumSalariosAlvo`. Se Σ alvos > Bloco B disponível, faz pro-rata.
// Se Σ alvos ≤ Bloco B, cada um recebe seu alvo exato (sobra vira reserva).
export type DistribuicaoBlocoB =
  | "UNIFORME"
  | "PESO_INDIVIDUAL"
  | "ORIGINACAO"
  | "POR_AREA"
  | "ALVO_NUM_SALARIOS";

// Configuração de pesos por área (planilha 1T2026).
//   mixOrganico/mixIncremental: 0.76 / 0.24
//   pesosOrganico: { civel: 0.20, trabalhista: 0.20, ... }
//   pesosIncremental: { civel: 0.10, societario: 0.20, ... }
export interface PesosPorArea {
  mixOrganico: number;       // ex: 0.76
  mixIncremental: number;    // ex: 0.24
  pesosOrganico: Record<string, number>;     // codigo área → peso (somam 1)
  pesosIncremental: Record<string, number>;  // codigo área → peso (somam 1)
}

export interface PremissasModeloNovo {
  // Blocos do RDA central
  percentualBlocoA: number;  // 0.45
  percentualBlocoB: number;  // 0.35
  percentualBlocoC: number;  // 0.20

  // Pool da unidade — divisão do Resultado Líquido da Unidade
  poolSociedade: number;     // 0.50
  poolLider: number;         // 0.30
  poolEquipeReserva: number; // 0.20

  // Chave-padrão de alocação interunidades (originação/execução/gestão)
  chaveOriginacao: number;   // 0.30 (faixa 0.20-0.40)
  chaveExecucao: number;     // 0.60 (faixa 0.50-0.70)
  chaveGestaoCP: number;     // 0.10 (faixa 0.00-0.15)

  // Faixas de ajuste excepcional
  faixaOrigMin: number; faixaOrigMax: number;
  faixaExecMin: number; faixaExecMax: number;
  faixaGestaoMin: number; faixaGestaoMax: number;

  // Pro-rata mínimo (meses) para elegibilidade no Bloco B
  proRataMinMeses: number;   // ex: 3

  // Como o Bloco B é distribuído entre os elegíveis (default: UNIFORME)
  distribuicaoBlocoB?: DistribuicaoBlocoB;

  // Pesos por área (apenas usado quando distribuicaoBlocoB="POR_AREA")
  pesosPorArea?: PesosPorArea;

  // Pró-labore mensal (BRL). Recebido por todas as 6 categorias da Política DSF v1
  // (proporcional ao período). Default 0 → engine não calcula pró-labore.
  proLaboreMensal?: number;

  // Taxa de comissão sobre originação. Multiplicada pelo valor originado
  // de cada sócio no período. Default 0 → engine não calcula comissão.
  taxaComissaoOriginacao?: number;

  // Pesos por categoria no Bloco B. Multiplicador aplicado ao peso-base de cada
  // sócio elegível. Default = 1 para todas. Permite favorecer/desfavorecer
  // categorias específicas (ex: SOCIO_SERVICOS_ESTRATEGICO = 1.2).
  pesoCategoria?: Partial<Record<Publico, number>>;

  // Valor anual arbitrário (BRL) distribuído entre fundadores (isFundador=true).
  // Deduzido do LL da matriz ANTES de formar o RDA central. Vem da ConfiguracaoAno
  // do ano do cenário. Default 0 → fundadores não recebem e o RDA é preservado.
  fundingFundadoresAno?: number;

  // Tabela salarial de gestão
  tabelaSalarial: TabelaSalarial;
}

// ============================================================================
// Saída do cálculo — pacote por sócio × período
// ============================================================================

export interface PacoteRemuneracao {
  socioId: string;
  socioNome: string;
  publico: Publico;

  // Componentes em BRL no período
  proLabore: number;
  remuneracaoGestao: number;
  remuneracaoFundador: number;
  blocoA: number;
  blocoB: number;             // Modelo NOVO: parcela do RDA. Modelo ATUAL: distribuição de lucros.
  blocoC: number;
  poolUnidade: number;
  creditoOriginacao: number;
  creditoExecucao: number;
  creditoGestaoCP: number;
  premio: number;             // Prêmio de performance uniforme (modelo atual) ou prêmios discretos.
  ajustes: number;
  total: number;

  // Diagnóstico
  alertasNaoSobreposicao: string[];
  trace: TraceItem[];
}

export interface TraceItem {
  etapa: string;       // ex: "1.receita", "8.bloco-A"
  descricao: string;
  valor?: number;
}

export interface ResultadoSimulacao {
  modelo: ModeloRegra;
  periodo: PeriodoInput;
  pacotes: PacoteRemuneracao[];
  // Totais agregados pra batimento contra o LL
  totalDistribuido: number;
  totalReservaCentral: number;
  totalNaoAlocado: number;
  alertasGlobais: string[];
}
