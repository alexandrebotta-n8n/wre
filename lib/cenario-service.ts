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
  originacaoEfetivaPorSocio: Map<string, number>,
): SocioInput[] {
  return classificacoes.map((c) => ({
    id: c.socioId,
    nome: c.socio.nome,
    cargo: c.socio.cargo,
    publico: c.publico as Publico,
    unidadeCodigo: c.unidade?.codigo,
    percentualQuotas: c.percentualQuotas,
    originacaoEsperadaAnual: c.originacaoEsperada,
    originacaoEfetiva: originacaoEfetivaPorSocio.get(c.socioId) ?? 0,
    pesoBlocoB: c.pesoBlocoB ?? undefined,
    areaPraticaCodigo: c.socio.areaPratica?.codigo,
    nivelCargo: (c.nivelCargoOverride ?? c.socio.nivelCargo) as NivelCargo | undefined,
    faixaSalarial: (c.faixaSalarialOverride ?? c.socio.faixaSalarial) as FaixaSalarial | undefined,
    isFundador: c.socio.isFundador,
    // Overrides individuais do cadastro do Sócio (case-a-case).
    proLaboreMensalOverride: c.socio.proLaboreMensal ?? undefined,
    remuneracaoGestaoMensalOverride: c.socio.remuneracaoGestaoMensal ?? undefined,
    valorDiscricionario: c.valorDiscricionario ?? undefined,
  }));
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
  const cenario = await prisma.cenario.findUnique({
    where: { id: args.cenarioId },
    include: {
      premissa: true,
      classificacoes: {
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

  const periodoAno = await garantirPeriodoAno(cenario.ano);
  const tabelaSalarial = await carregarTabelaSalarial();
  const resultados = await carregarResultadosAno(cenario.ano);
  if (resultados.length === 0) {
    throw new ApiError(`Nenhum ResultadoPeriodo cadastrado para ${cenario.ano}`, 400);
  }
  const originacaoEfetiva = await carregarOriginacaoEfetivaAno(cenario.ano);
  const socios = classificacoesParaSocioInput(cenario.classificacoes, originacaoEfetiva);

  // Configuração global anual (funding fundadores arbitrário)
  const configAno = await prisma.configuracaoAno.findUnique({
    where: { ano: cenario.ano },
    select: { fundingFundadoresAno: true },
  });
  const fundingFundadoresAno = configAno?.fundingFundadoresAno ?? 0;

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
      proRataMinMeses: Number(params.proRataMinMeses ?? 3),
      distribuicaoBlocoB: (params.distribuicaoBlocoB as PremissasModeloNovo["distribuicaoBlocoB"]) ?? "UNIFORME",
      pesosPorArea: params.pesosPorArea as PremissasModeloNovo["pesosPorArea"],
      proLaboreMensal: params.proLaboreMensal != null ? Number(params.proLaboreMensal) : undefined,
      taxaComissaoOriginacao: params.taxaComissaoOriginacao != null ? Number(params.taxaComissaoOriginacao) : undefined,
      pesoCategoria: params.pesoCategoria as PremissasModeloNovo["pesoCategoria"],
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

  // Persiste 1 RemuneracaoCalculada por sócio (Periodo ANO).
  await prisma.cenario.update({
    where: { id: args.cenarioId },
    data: { parametrosDirty: false },
  });
  await prisma.$transaction(
    resultado.pacotes.map((p) =>
      prisma.remuneracaoCalculada.upsert({
        where: {
          cenarioId_socioId_periodoId: {
            cenarioId: args.cenarioId,
            socioId: p.socioId,
            periodoId: periodoAno.id,
          },
        },
        create: {
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
        },
        update: {
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
        },
      }),
    ),
  );

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
          const publico =
            args.modelo === "NOVO"
              ? (s.publicoDefault as Publico)
              : defaultPublico(s, args.modelo);
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

/**
 * Salva override atual como Premissa nova e vincula ao cenário.
 */
export async function salvarOverrideComoPremissa(args: {
  cenarioId: string;
  nome: string;
  descricao?: string;
}): Promise<{ premissaId: string }> {
  const cenario = await prisma.cenario.findUnique({
    where: { id: args.cenarioId },
    select: { modelo: true, parametrosOverride: true, premissaId: true },
  });
  if (!cenario) throw new ApiError("Cenário não encontrado", 404);
  if (!cenario.parametrosOverride) {
    throw new ApiError("Cenário não tem parâmetros customizados — nada para salvar", 400);
  }

  const novaPremissa = await prisma.$transaction(async (tx) => {
    const p = await tx.premissa.create({
      data: {
        nome: args.nome,
        descricao: args.descricao,
        modelo: cenario.modelo,
        parametros: cenario.parametrosOverride as never,
      },
    });
    await tx.cenario.update({
      where: { id: args.cenarioId },
      data: {
        premissaId: p.id,
        parametrosOverride: null as never,
      },
    });
    return p;
  });

  return { premissaId: novaPremissa.id };
}

// ============================================================================
// Variáveis globais — afetam TODOS os cenários do ano
// ============================================================================

/**
 * Salva LL de uma unidade no ano (ResultadoPeriodo tipo=ANO).
 * Marca todos os DRAFTs do ano como dirty para sinalizar recálculo.
 */
export async function salvarLLUnidadeAno(args: {
  ano: number;
  unidadeId: string;
  lucroLiquido: number;
  fundingVariavel?: number | null;
  fonte?: string | null;
}): Promise<void> {
  const periodoAno = await garantirPeriodoAno(args.ano);
  await prisma.resultadoPeriodo.upsert({
    where: { unidadeId_periodoId: { unidadeId: args.unidadeId, periodoId: periodoAno.id } },
    create: {
      unidadeId: args.unidadeId,
      periodoId: periodoAno.id,
      lucroLiquido: args.lucroLiquido,
      fundingVariavel: args.fundingVariavel ?? undefined,
      ehReal: true,
      fonte: args.fonte ?? "manual /simulacao",
    },
    update: {
      lucroLiquido: args.lucroLiquido,
      fundingVariavel: args.fundingVariavel ?? null,
      fonte: args.fonte ?? "manual /simulacao",
    },
  });
  await marcarDraftsDoAnoComoDirty(args.ano);
}

/**
 * Salva o funding arbitrário dos fundadores na ConfiguracaoAno.
 * Marca DRAFTs do ano como dirty.
 */
export async function salvarFundingFundadoresAno(args: {
  ano: number;
  valor: number;
  atualizadoPorId?: string;
}): Promise<void> {
  await prisma.configuracaoAno.upsert({
    where: { ano: args.ano },
    create: {
      ano: args.ano,
      fundingFundadoresAno: Math.max(0, args.valor),
      atualizadoPorId: args.atualizadoPorId,
    },
    update: {
      fundingFundadoresAno: Math.max(0, args.valor),
      atualizadoPorId: args.atualizadoPorId,
    },
  });
  await marcarDraftsDoAnoComoDirty(args.ano);
}

/**
 * Salva originação anual de um sócio (OriginacaoPeriodo tipo=ANO).
 */
export async function salvarOriginacaoAnoPorSocio(args: {
  ano: number;
  socioId: string;
  valor: number;
  fonte?: string | null;
}): Promise<void> {
  const periodoAno = await garantirPeriodoAno(args.ano);
  await prisma.originacaoPeriodo.upsert({
    where: { socioId_periodoId: { socioId: args.socioId, periodoId: periodoAno.id } },
    create: {
      socioId: args.socioId,
      periodoId: periodoAno.id,
      valor: Math.max(0, args.valor),
      ehReal: true,
      fonte: args.fonte ?? "manual /simulacao",
    },
    update: {
      valor: Math.max(0, args.valor),
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
