// Service — orquestra Prisma ↔ engines puros (lib/domain/dsf/).
// Aqui mora toda a "tradução" entre o DB (modelo Prisma) e os tipos puros.
//
// Sistema ANUAL: cada cálculo gera 1 RemuneracaoCalculada por sócio (Periodo
// com tipo=ANO). Visão trimestral foi removida — toda config global vive em
// ConfiguracaoAno + ResultadoPeriodo ANO + OriginacaoPeriodo ANO.
import { prisma } from "@/lib/prisma";
import {
  calcularModeloAtual,
  calcularModeloNovo,
  type SocioInput,
  type ResultadoUnidade,
  type PeriodoInput,
  type ResultadoSimulacao,
  type TabelaSalarial,
  type PremissasModeloAtual,
  type PremissasModeloNovo,
  type Publico,
  type NivelCargo,
  type FaixaSalarial,
} from "@/lib/domain/dsf";
import type {
  Cenario, ClassificacaoSocio, Socio, Unidade,
} from "@prisma/client";
import { ApiError } from "@/lib/api/handler";
import { ParamsAtualSchema, ParamsNovoSchema } from "@/lib/schemas/premissa";

// Constrói a TabelaSalarial a partir das linhas no DB
export async function carregarTabelaSalarial(): Promise<TabelaSalarial> {
  const linhas = await prisma.tabelaSalario.findMany({ take: 100 });
  const t: TabelaSalarial = {
    A: { INICIAL: 0, PLENO: 0, EXPERT: 0 },
    B: { INICIAL: 0, PLENO: 0, EXPERT: 0 },
    C: { INICIAL: 0, PLENO: 0, EXPERT: 0 },
    D: { INICIAL: 0, PLENO: 0, EXPERT: 0 },
  };
  for (const l of linhas) {
    t[l.nivel as NivelCargo][l.faixa as FaixaSalarial] = l.valor;
  }
  return t;
}

interface ClassificacaoComSocio extends ClassificacaoSocio {
  socio: Socio & { areaPratica?: { codigo: string } | null };
  unidade: Unidade | null;
}

function classificacoesParaSocioInput(
  classificacoes: ClassificacaoComSocio[],
  originacaoLegadaPorSocio: Map<string, number>,
): SocioInput[] {
  return classificacoes.map((c) => {
    // Originação efetiva: prioridade ao novo campo Socio.originacaoAnualPadrao
    // (cadastro em /socios). Fallback: OriginacaoPeriodo legado por ano
    // (para dados antigos não-migrados).
    const origPadrao = c.socio.originacaoAnualPadrao;
    const origEfetiva =
      origPadrao != null && origPadrao > 0
        ? origPadrao
        : originacaoLegadaPorSocio.get(c.socioId) ?? 0;
    return {
      id: c.socioId,
      nome: c.socio.nome,
      cargo: c.socio.cargo,
      publico: c.publico as Publico,
      unidadeCodigo: c.unidade?.codigo,
      percentualQuotas: c.percentualQuotas,
      originacaoEsperadaAnual: c.originacaoEsperada,
      originacaoEfetiva: origEfetiva,
      pesoBlocoB: c.pesoBlocoB ?? undefined,
      areaPraticaCodigo: c.socio.areaPratica?.codigo,
      nivelCargo: (c.nivelCargoOverride ?? c.socio.nivelCargo) as NivelCargo | undefined,
      faixaSalarial: (c.faixaSalarialOverride ?? c.socio.faixaSalarial) as FaixaSalarial | undefined,
      isFundador: c.socio.isFundador,
      // Overrides individuais do cadastro do Sócio (case-a-case).
      proLaboreMensalOverride: c.socio.proLaboreMensal ?? undefined,
      remuneracaoGestaoMensalOverride: c.socio.remuneracaoGestaoMensal ?? undefined,
      fundingFundadorAnual: c.socio.fundingFundadorAnual ?? undefined,
      blocoBNumSalariosAlvo: c.socio.blocoBNumSalariosAlvo ?? undefined,
      blocoCValorManualAno: c.socio.blocoCValorManualAno ?? undefined,
    };
  });
}

/**
 * Carrega ResultadoPeriodo ANO por unidade. Se não houver linha ANO, faz
 * fallback agregando os 4 trimestres do ano (compatibilidade com dados
 * antigos que ainda não foram migrados).
 */
async function carregarResultadosAno(ano: number): Promise<ResultadoUnidade[]> {
  // 1. Tenta ler direto a linha ANO
  const periodoAno = await prisma.periodo.findFirst({
    where: { tipo: "ANO", ano },
    select: { id: true },
  });
  if (periodoAno) {
    const direto = await prisma.resultadoPeriodo.findMany({
      where: { periodoId: periodoAno.id },
      include: { unidade: true },
      take: 50,
    });
    if (direto.length > 0) {
      return direto.map((r) => ({
        unidadeCodigo: r.unidade.codigo,
        isMatriz: r.unidade.isMatriz,
        lucroLiquido: r.lucroLiquido,
        fundingVariavel: r.fundingVariavel ?? undefined,
      }));
    }
  }

  // 2. Fallback: agrega trimestres do ano
  const trimestres = await prisma.periodo.findMany({
    where: { tipo: "TRIMESTRE", ano },
    take: 4,
  });
  if (trimestres.length === 0) return [];
  const trimRes = await prisma.resultadoPeriodo.findMany({
    where: { periodoId: { in: trimestres.map((p) => p.id) } },
    include: { unidade: true },
    take: 200,
  });
  if (trimRes.length === 0) return [];
  const porUnidade = new Map<
    string,
    { unidadeCodigo: string; isMatriz: boolean; lucroLiquido: number; fundingVariavel: number | undefined }
  >();
  for (const r of trimRes) {
    const k = r.unidade.codigo;
    const cur = porUnidade.get(k) ?? {
      unidadeCodigo: k,
      isMatriz: r.unidade.isMatriz,
      lucroLiquido: 0,
      fundingVariavel: undefined as number | undefined,
    };
    cur.lucroLiquido += r.lucroLiquido;
    if (r.fundingVariavel != null) {
      cur.fundingVariavel = (cur.fundingVariavel ?? 0) + r.fundingVariavel;
    }
    porUnidade.set(k, cur);
  }
  return Array.from(porUnidade.values());
}

/**
 * Carrega originação efetiva por sócio para o ano. Lê direto da linha ANO
 * em OriginacaoPeriodo; fallback agrega trimestres se necessário.
 */
async function carregarOriginacaoEfetivaAno(ano: number): Promise<Map<string, number>> {
  const porSocio = new Map<string, number>();
  const periodoAno = await prisma.periodo.findFirst({
    where: { tipo: "ANO", ano },
    select: { id: true },
  });
  if (periodoAno) {
    const linhas = await prisma.originacaoPeriodo.findMany({
      where: { periodoId: periodoAno.id },
      take: 500,
    });
    if (linhas.length > 0) {
      for (const l of linhas) porSocio.set(l.socioId, l.valor);
      return porSocio;
    }
  }
  // Fallback: soma trimestres do ano
  const trimestres = await prisma.periodo.findMany({
    where: { tipo: "TRIMESTRE", ano },
    take: 4,
  });
  if (trimestres.length === 0) return porSocio;
  const linhasTrim = await prisma.originacaoPeriodo.findMany({
    where: { periodoId: { in: trimestres.map((t) => t.id) } },
    take: 1000,
  });
  for (const l of linhasTrim) {
    porSocio.set(l.socioId, (porSocio.get(l.socioId) ?? 0) + l.valor);
  }
  return porSocio;
}

/**
 * Garante que existe Periodo ANO para o ano dado. Cria se necessário.
 * Usado pelo `calcularCenario` para garantir destino do upsert.
 */
async function garantirPeriodoAno(ano: number): Promise<{ id: string; rotulo: string }> {
  const existente = await prisma.periodo.findFirst({
    where: { tipo: "ANO", ano },
    select: { id: true, rotulo: true },
  });
  if (existente) return existente;
  return prisma.periodo.create({
    data: { tipo: "ANO", ano, rotulo: String(ano) },
    select: { id: true, rotulo: true },
  });
}

function periodoToInput(rotulo: string): PeriodoInput {
  return { rotulo, tipo: "ANO", meses: 12 };
}

// ============================================================================
// Calcular cenário (anual) e persistir RemuneracaoCalculada
// ============================================================================

/**
 * Calcula 1 cenário em base anual. Substitui o antigo `calcularCenarioAnual`
 * que iterava trimestres. Persiste 1 RemuneracaoCalculada por sócio no
 * Periodo ANO do ano do cenário.
 */
export async function calcularCenario(args: { cenarioId: string }): Promise<ResultadoSimulacao> {
  // Logs de tempo em dev — ajudam a validar otimizações sem ferramentas externas.
  // Use `setup`, `engine` e `persist` para identificar onde está o gargalo.
  const debug = process.env.NODE_ENV === "development";
  const t0 = debug ? performance.now() : 0;
  const cenario = await prisma.cenario.findUnique({
    where: { id: args.cenarioId },
    include: {
      premissa: true,
      classificacoes: {
        // Filtra classificações de sócios inativos — eles não devem aparecer
        // no cálculo (ex: ex-Líder Técnico desativado pelo script de migração).
        where: { socio: { ativo: true } },
        include: {
          socio: { include: { areaPratica: { select: { codigo: true } } } },
          unidade: true,
        },
      },
    },
  });
  if (!cenario) throw new ApiError("Cenário não encontrado", 404);
  if (cenario.status !== "DRAFT") {
    throw new ApiError(
      `Apenas cenários em rascunho podem ser calculados (status atual: ${cenario.status}).`,
      409,
    );
  }

  // Paralelizar setup: 4 queries independentes em vez de cascata sequencial.
  const [periodoAno, tabelaSalarial, resultados, originacaoEfetiva] = await Promise.all([
    garantirPeriodoAno(cenario.ano),
    carregarTabelaSalarial(),
    carregarResultadosAno(cenario.ano),
    carregarOriginacaoEfetivaAno(cenario.ano),
  ]);
  if (resultados.length === 0) {
    throw new ApiError(`Nenhum ResultadoPeriodo cadastrado para ${cenario.ano}`, 400);
  }
  // Originação efetiva: novo padrão lê Socio.originacaoAnualPadrao (em
  // classificacoesParaSocioInput). O fallback `originacaoEfetiva` busca
  // OriginacaoPeriodo ANO legado para sócios sem o novo campo preenchido.
  //
  // Quotas: sempre ORIGINAIS (cadastro direto). Não há redistribuição — a
  // política NOVA reserva as quotas de fundadores + Sócios de Serviço em
  // tesouraria (ver modelo-novo.ts: Bloco A retém essa fatia).
  const socios = classificacoesParaSocioInput(
    cenario.classificacoes,
    originacaoEfetiva,
  );
  // Funding fundadores agora é per-sócio (Socio.fundingFundadorAnual), já
  // propagado em cada SocioInput. O parâmetro global foi mantido em 0 por
  // compatibilidade com a interface do engine, mas não tem mais efeito.
  const fundingFundadoresAno = 0;
  const tSetup = debug ? performance.now() : 0;

  // Override de parâmetros (Blocos %, pool, chave, etc.) ainda existe — é
  // só sobre os parâmetros da Premissa, não sobre os insumos globais.
  const paramsBase = cenario.premissa.parametros as Record<string, unknown>;
  const paramsOverride = (cenario.parametrosOverride ?? null) as Record<string, unknown> | null;
  const paramsEfetivos = paramsOverride ?? paramsBase;

  let resultado: ResultadoSimulacao;
  if (cenario.modelo === "ATUAL") {
    const params = paramsEfetivos;
    const premissas: PremissasModeloAtual = {
      proLaboreMensal: Number(params.proLaboreMensal ?? 5000),
      unidadeMatriz: String(params.unidadeMatriz ?? "DSF"),
      reservaPercentual: Number(params.reservaPercentual ?? 0.05),
      reservaViraPremio: Boolean(params.reservaViraPremio ?? true),
      publicosElegiveisPremio: params.publicosElegiveisPremio as Publico[] | undefined,
      fundingFundadoresAno,
      tabelaSalarial,
      mesesAnualLiderTecnicoCLT:
        params.mesesAnualLiderTecnicoCLT != null ? Number(params.mesesAnualLiderTecnicoCLT) : undefined,
    };
    resultado = calcularModeloAtual({
      periodo: periodoToInput(periodoAno.rotulo),
      socios,
      resultados,
      premissas,
    });
  } else {
    const params = paramsEfetivos;
    const premissas: PremissasModeloNovo = {
      percentualBlocoA: Number(params.percentualBlocoA ?? 0.45),
      percentualBlocoB: Number(params.percentualBlocoB ?? 0.35),
      percentualBlocoC: Number(params.percentualBlocoC ?? 0.20),
      poolSociedade: Number(params.poolSociedade ?? 0.50),
      poolLider: Number(params.poolLider ?? 0.30),
      poolEquipeReserva: Number(params.poolEquipeReserva ?? 0.20),
      chaveOriginacao: Number(params.chaveOriginacao ?? 0.30),
      chaveExecucao: Number(params.chaveExecucao ?? 0.60),
      chaveGestaoCP: Number(params.chaveGestaoCP ?? 0.10),
      faixaOrigMin: Number(params.faixaOrigMin ?? 0.20),
      faixaOrigMax: Number(params.faixaOrigMax ?? 0.40),
      faixaExecMin: Number(params.faixaExecMin ?? 0.50),
      faixaExecMax: Number(params.faixaExecMax ?? 0.70),
      faixaGestaoMin: Number(params.faixaGestaoMin ?? 0.00),
      faixaGestaoMax: Number(params.faixaGestaoMax ?? 0.15),
      // distribuicaoBlocoB / pesosPorArea / pesoCategoria / proRataMinMeses
      // foram removidos — Bloco B usa regra única (nº salários × base).
      proLaboreMensal: Number(params.proLaboreMensal ?? 5000),
      taxaComissaoOriginacao: params.taxaComissaoOriginacao != null ? Number(params.taxaComissaoOriginacao) : undefined,
      mesesAnualLiderTecnicoCLT:
        params.mesesAnualLiderTecnicoCLT != null ? Number(params.mesesAnualLiderTecnicoCLT) : undefined,
      fundingFundadoresAno,
      tabelaSalarial,
    };
    resultado = calcularModeloNovo({
      periodo: periodoToInput(periodoAno.rotulo),
      socios,
      resultados,
      premissas,
    });
  }

  const tEngine = debug ? performance.now() : 0;
  // Persiste 1 RemuneracaoCalculada por sócio (Periodo ANO).
  // Refatorado: em vez de N upserts serializados (1 query por sócio dentro
  // de $transaction), fazemos deleteMany + createMany na mesma transação.
  // Para 22 sócios: 22 round-trips → 3. Atomicidade garantida pela transação.
  const dadosRemuneracoes = resultado.pacotes.map((p) => ({
    cenarioId: args.cenarioId,
    socioId: p.socioId,
    periodoId: periodoAno.id,
    proLabore: p.proLabore,
    remuneracaoGestao: p.remuneracaoGestao,
    remuneracaoFundador: p.remuneracaoFundador,
    blocoA: p.blocoA,
    blocoB: p.blocoB,
    blocoC: p.blocoC,
    poolUnidade: p.poolUnidade,
    creditoOriginacao: p.creditoOriginacao,
    creditoExecucao: p.creditoExecucao,
    creditoGestaoCP: p.creditoGestaoCP,
    premio: p.premio,
    ajustes: p.ajustes,
    total: p.total,
    alertas: p.alertasNaoSobreposicao as never,
    trace: p.trace as never,
  }));
  await prisma.$transaction([
    prisma.cenario.update({
      where: { id: args.cenarioId },
      // Cache dos agregados do resultado (Bloco C não distribuído + tesouraria
      // de quotas reservadas). UI lê direto sem recalcular — usado em
      // /simulacao para mostrar "Reserva 20% (NOVO)" e "Tesouraria — quotas
      // reservadas" abaixo do diff total.
      data: {
        parametrosDirty: false,
        totalReservaCentral: resultado.totalReservaCentral,
        tesourariaQuotasReservadas: resultado.quotasReservadasTesouraria,
        tesourariaValorBlocoA: resultado.tesourariaBlocoA,
      },
    }),
    prisma.remuneracaoCalculada.deleteMany({
      where: { cenarioId: args.cenarioId, periodoId: periodoAno.id },
    }),
    prisma.remuneracaoCalculada.createMany({ data: dadosRemuneracoes }),
  ]);

  if (debug) {
    const tPersist = performance.now();
    console.log(
      `[calcularCenario:${args.cenarioId}] setup=${(tSetup - t0).toFixed(0)}ms engine=${(tEngine - tSetup).toFixed(0)}ms persist=${(tPersist - tEngine).toFixed(0)}ms total=${(tPersist - t0).toFixed(0)}ms (${resultado.pacotes.length} pacotes)`,
    );
  }

  return resultado;
}

// ============================================================================
// Criar cenário com classificações default
// ============================================================================

export async function criarCenarioComDefaults(args: {
  nome: string;
  descricao?: string;
  ano: number;
  modelo: "ATUAL" | "NOVO";
  premissaId: string;
  criadoPorId?: string;
}): Promise<Cenario> {
  const sociosAtivos = await prisma.socio.findMany({
    where: { ativo: true },
    take: 200,
  });
  const unidadeMatriz = await prisma.unidade.findFirst({ where: { isMatriz: true } });

  const PUBLICOS_LIDER_NOVO: Publico[] = ["SOCIO_CAPITAL_LIDER_UNIDADE", "LIDER_UNIDADE_NON_EQUITY"];

  const cenario = await prisma.cenario.create({
    data: {
      nome: args.nome,
      descricao: args.descricao,
      ano: args.ano,
      modelo: args.modelo,
      premissaId: args.premissaId,
      criadoPorId: args.criadoPorId,
      classificacoes: {
        create: sociosAtivos.map((s) => {
          // ATUAL: prioridade ao publicoAtual cadastrado (override explícito);
          // fallback pra heurística defaultPublico baseada em cargo.
          // NOVO: usa publicoDefault direto.
          const publico =
            args.modelo === "NOVO"
              ? (s.publicoDefault as Publico)
              : ((s.publicoAtual as Publico | null) ?? defaultPublico(s, args.modelo));
          const unidadeId =
            args.modelo === "NOVO" && PUBLICOS_LIDER_NOVO.includes(publico) && s.unidadeLideradaId
              ? s.unidadeLideradaId
              : unidadeMatriz?.id;
          return {
            socioId: s.id,
            publico,
            unidadeId,
            percentualQuotas: s.percentualQuotasDefault,
            originacaoEsperada: 0,
          };
        }),
      },
    },
  });
  return cenario;
}

/**
 * Clona um cenário existente em um novo DRAFT. NÃO copia mais
 * resultadosOverride/originacaoOverride (deprecated — engine ignora).
 */
export async function clonarCenarioComoRascunho(args: {
  cenarioId: string;
  novoNome?: string;
  criadoPorId?: string;
}): Promise<{ id: string }> {
  const src = await prisma.cenario.findUnique({
    where: { id: args.cenarioId },
    include: { classificacoes: true },
  });
  if (!src) throw new ApiError("Cenário não encontrado", 404);

  const nome = (args.novoNome ?? `${src.nome} (cópia)`).slice(0, 120);

  const novo = await prisma.cenario.create({
    data: {
      nome,
      descricao: src.descricao,
      ano: src.ano,
      modelo: src.modelo,
      premissaId: src.premissaId,
      parametrosOverride: (src.parametrosOverride ?? undefined) as never,
      status: "DRAFT",
      parametrosDirty: false,
      versao: 1,
      criadoPorId: args.criadoPorId,
      classificacoes: {
        create: src.classificacoes.map((c) => ({
          socioId: c.socioId,
          publico: c.publico,
          unidadeId: c.unidadeId,
          percentualQuotas: c.percentualQuotas,
          originacaoEsperada: c.originacaoEsperada,
          pesoBlocoB: c.pesoBlocoB,
          nivelCargoOverride: c.nivelCargoOverride,
          faixaSalarialOverride: c.faixaSalarialOverride,
          observacoes: c.observacoes,
        })),
      },
    },
    select: { id: true },
  });
  return novo;
}

// ============================================================================
// Override de parâmetros — edição inline na simulação
// ============================================================================

/**
 * Persiste o override de parâmetros do cenário sem recalcular.
 * Marca como dirty. Valida pelo schema do modelo correspondente.
 */
export async function atualizarParametrosOverride(args: {
  cenarioId: string;
  parametrosOverride: Record<string, unknown> | null;
}): Promise<void> {
  const cenario = await prisma.cenario.findUnique({
    where: { id: args.cenarioId },
    select: { status: true, modelo: true },
  });
  if (!cenario) throw new ApiError("Cenário não encontrado", 404);
  if (cenario.status !== "DRAFT") {
    throw new ApiError("Apenas cenários em rascunho podem ser editados", 409);
  }
  if (args.parametrosOverride !== null) {
    const schema = cenario.modelo === "ATUAL" ? ParamsAtualSchema : ParamsNovoSchema;
    schema.parse(args.parametrosOverride);
  }
  await prisma.cenario.update({
    where: { id: args.cenarioId },
    data: {
      parametrosOverride: (args.parametrosOverride ?? null) as never,
      parametrosDirty: true,
      versao: { increment: 1 },
    },
  });
}


// ============================================================================
// Variáveis globais — afetam TODOS os cenários do ano
// ============================================================================

/**
 * Salva LL de uma unidade no ano (ResultadoPeriodo tipo=ANO).
 * Marca todos os DRAFTs do ano como dirty para sinalizar recálculo.
 * Campo fundingVariavel é preservado se existia (não toca).
 */
export async function salvarLLUnidadeAno(args: {
  ano: number;
  unidadeId: string;
  lucroLiquido: number;
  fonte?: string | null;
}): Promise<void> {
  const periodoAno = await garantirPeriodoAno(args.ano);
  await prisma.resultadoPeriodo.upsert({
    where: { unidadeId_periodoId: { unidadeId: args.unidadeId, periodoId: periodoAno.id } },
    create: {
      unidadeId: args.unidadeId,
      periodoId: periodoAno.id,
      lucroLiquido: args.lucroLiquido,
      ehReal: true,
      fonte: args.fonte ?? "manual /simulacao",
    },
    update: {
      lucroLiquido: args.lucroLiquido,
      fonte: args.fonte ?? "manual /simulacao",
    },
  });
  await marcarDraftsDoAnoComoDirty(args.ano);
}

/**
 * Marca todos os cenários DRAFT do ano como dirty — sinaliza que precisam
 * ser recalculados depois de mudança em variável global.
 */
async function marcarDraftsDoAnoComoDirty(ano: number): Promise<void> {
  await prisma.cenario.updateMany({
    where: { ano, status: "DRAFT" },
    data: { parametrosDirty: true },
  });
}

/**
 * Marca TODOS os cenários DRAFT (qualquer ano) como dirty. Usado pela action
 * de Sócios: mudança em base do sócio (publico, nível, faixa, quotas,
 * overrides de remuneração, originação, funding fundador) afeta o cálculo
 * de qualquer cenário que o use — não dá pra filtrar por ano específico.
 *
 * Retorna a contagem de cenários marcados, pra UI mostrar feedback.
 */
export async function marcarTodosDraftsComoDirty(): Promise<number> {
  const result = await prisma.cenario.updateMany({
    where: { status: "DRAFT" },
    data: { parametrosDirty: true },
  });
  return result.count;
}

/**
 * Batch helper: salva LL de várias unidades de uma vez no ano.
 * Elimina o N+1 que existia ao chamar `salvarLLUnidadeAno` em loop —
 * `garantirPeriodoAno` roda 1× (em vez de N) e `marcarDraftsDoAnoComoDirty`
 * roda 1× no fim (em vez de N).
 */
export async function salvarLLUnidadesAno(args: {
  ano: number;
  unidades: Array<{
    unidadeId: string;
    lucroLiquido: number;
    fonte?: string | null;
  }>;
}): Promise<void> {
  if (args.unidades.length === 0) return;
  const periodoAno = await garantirPeriodoAno(args.ano);
  await prisma.$transaction(
    args.unidades.map((u) =>
      prisma.resultadoPeriodo.upsert({
        where: { unidadeId_periodoId: { unidadeId: u.unidadeId, periodoId: periodoAno.id } },
        create: {
          unidadeId: u.unidadeId,
          periodoId: periodoAno.id,
          lucroLiquido: u.lucroLiquido,
          ehReal: true,
          fonte: u.fonte ?? "manual /simulacao",
        },
        update: {
          lucroLiquido: u.lucroLiquido,
          fonte: u.fonte ?? "manual /simulacao",
        },
      }),
    ),
  );
  await marcarDraftsDoAnoComoDirty(args.ano);
}

function defaultPublico(s: { isFundador: boolean; cargo: string }, modelo: "ATUAL" | "NOVO"): Publico {
  if (modelo === "ATUAL") {
    if (s.isFundador) return "FUNDADOR";
    if (/Líder Técnico/i.test(s.cargo)) return "LIDER_TECNICO";
    if (/Líder de Unidade/i.test(s.cargo)) return "LIDER_UNIDADE_NON_EQUITY";
    return "SOCIO_CAPITAL_GESTOR";
  }
  // Modelo NOVO — segue planilha "Reclassificação de Sócios para Simulação":
  if (s.isFundador && /Décio/i.test((s as { nome?: string }).nome ?? "")) return "SOCIO_SERVICOS";
  if (s.isFundador) return "SOCIO_CAPITAL";
  if (/Líder Técnico/i.test(s.cargo)) return "SOCIO_SERVICOS";
  if (/Líder de Unidade/i.test(s.cargo)) return "LIDER_UNIDADE_NON_EQUITY";
  return "SOCIO_CAPITAL";
}
