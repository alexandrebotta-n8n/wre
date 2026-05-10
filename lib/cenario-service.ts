// Service — orquestra Prisma ↔ engines puros (lib/domain/dsf/).
// Aqui mora toda a "tradução" entre o DB (modelo Prisma) e os tipos puros.
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
): SocioInput[] {
  return classificacoes.map((c) => ({
    id: c.socioId,
    nome: c.socio.nome,
    cargo: c.socio.cargo,
    publico: c.publico as Publico,
    unidadeCodigo: c.unidade?.codigo,
    percentualQuotas: c.percentualQuotas,
    originacaoEsperadaAnual: c.originacaoEsperada,
    pesoBlocoB: c.pesoBlocoB ?? undefined,
    areaPraticaCodigo: c.socio.areaPratica?.codigo,
    nivelCargo: (c.nivelCargoOverride ?? c.socio.nivelCargo) as NivelCargo | undefined,
    faixaSalarial: (c.faixaSalarialOverride ?? c.socio.faixaSalarial) as FaixaSalarial | undefined,
    isFundador: c.socio.isFundador,
  }));
}

async function carregarResultados(periodoId: string): Promise<ResultadoUnidade[]> {
  // 1. Tenta carregar Resultado direto do período pedido.
  const direto = await prisma.resultadoPeriodo.findMany({
    where: { periodoId },
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

  // 2. Se for período ANUAL sem Resultado próprio, derivar somando os
  //    trimestres do mesmo ano (se houver). Assim, cadastrar 4 trimestres
  //    automaticamente habilita o cálculo anual sem intervenção manual.
  const periodo = await prisma.periodo.findUnique({ where: { id: periodoId } });
  if (!periodo || periodo.tipo !== "ANO") return [];

  const trimestres = await prisma.periodo.findMany({
    where: { tipo: "TRIMESTRE", ano: periodo.ano },
    take: 4,
  });
  if (trimestres.length === 0) return [];

  const trimestresResultados = await prisma.resultadoPeriodo.findMany({
    where: { periodoId: { in: trimestres.map((p) => p.id) } },
    include: { unidade: true },
    take: 200,
  });
  if (trimestresResultados.length === 0) return [];

  // Agrega por unidade: lucroLiquido somado, fundingVariavel somado (se existir).
  const porUnidade = new Map<
    string,
    { unidadeCodigo: string; isMatriz: boolean; lucroLiquido: number; fundingVariavel: number | undefined }
  >();
  for (const r of trimestresResultados) {
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

function periodoToInput(p: { tipo: string; trimestre: number | null; rotulo: string }): PeriodoInput {
  return {
    rotulo: p.rotulo,
    tipo: p.tipo as "TRIMESTRE" | "ANO",
    meses: p.tipo === "ANO" ? 12 : 3,
  };
}

// ============================================================================
// Calcular cenário e persistir RemuneracaoCalculada
// ============================================================================

export async function calcularCenario(args: {
  cenarioId: string;
  periodoId: string;
}): Promise<ResultadoSimulacao> {
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
  // Cenário PUBLICADO (APPLIED) tem snapshot imutável — recalcular descaracterizaria
  // o que foi formalmente publicado. Cenário ARQUIVADO idem. Apenas DRAFT é editável.
  if (cenario.status !== "DRAFT") {
    throw new ApiError(
      `Apenas cenários em rascunho podem ser calculados (status atual: ${cenario.status}).`,
      409,
    );
  }

  const periodo = await prisma.periodo.findUnique({ where: { id: args.periodoId } });
  if (!periodo) throw new ApiError("Período não encontrado", 404);

  const tabelaSalarial = await carregarTabelaSalarial();
  const resultados = await carregarResultados(args.periodoId);
  if (resultados.length === 0) {
    throw new ApiError(`Nenhum ResultadoPeriodo para período ${periodo.rotulo}`, 400);
  }
  const socios = classificacoesParaSocioInput(cenario.classificacoes);

  // Override de parâmetros do cenário tem prioridade sobre os da Premissa.
  // Permite editar Blocos/Pool/Chave/etc inline na simulação sem afetar
  // outros cenários que compartilham a mesma Premissa-template.
  const paramsBase = cenario.premissa.parametros as Record<string, unknown>;
  const paramsOverride = (cenario.parametrosOverride ?? null) as Record<string, unknown> | null;
  const paramsEfetivos = paramsOverride ?? paramsBase;

  let resultado: ResultadoSimulacao;
  if (cenario.modelo === "ATUAL") {
    const params = paramsEfetivos;
    const premissas: PremissasModeloAtual = {
      proLaboreMensal: Number(params.proLaboreMensal ?? 5000),
      unidadeFundadores: String(params.unidadeFundadores ?? "BG"),
      unidadeMatriz: String(params.unidadeMatriz ?? "DSF"),
      reservaPercentual: Number(params.reservaPercentual ?? 0.05),
      reservaViraPremio: Boolean(params.reservaViraPremio ?? true),
      publicosElegiveisPremio: params.publicosElegiveisPremio as Publico[] | undefined,
      tabelaSalarial,
    };
    resultado = calcularModeloAtual({
      periodo: periodoToInput(periodo),
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
      tabelaSalarial,
    };
    resultado = calcularModeloNovo({
      periodo: periodoToInput(periodo),
      socios,
      resultados,
      premissas,
    });
  }

  // Persiste RemuneracaoCalculada (upsert por cenário+sócio+período)
  // + reset do dirty flag (override está sincronizado com o cálculo).
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
            periodoId: args.periodoId,
          },
        },
        create: {
          cenarioId: args.cenarioId,
          socioId: p.socioId,
          periodoId: args.periodoId,
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

/**
 * Calcula o cenário para todos os 4 trimestres do seu ano em sequência.
 * Loop sobre `Periodo.tipo=TRIMESTRE` ordenado por trimestre.
 * Trimestres sem `ResultadoPeriodo` são silenciosamente ignorados (engine
 * lança ApiError 400 que capturamos para não bloquear os demais).
 */
export async function calcularCenarioAnual(args: { cenarioId: string }): Promise<{
  trimestresOk: number[];
  trimestresSemDados: number[];
}> {
  const cenario = await prisma.cenario.findUnique({
    where: { id: args.cenarioId },
    select: { ano: true, status: true },
  });
  if (!cenario) throw new ApiError("Cenário não encontrado", 404);
  if (cenario.status !== "DRAFT") {
    throw new ApiError(
      `Apenas cenários em rascunho podem ser calculados (status atual: ${cenario.status}).`,
      409,
    );
  }
  // eslint-disable-next-line no-restricted-syntax -- max 4 trimestres por ano (limite natural)
  const trims = await prisma.periodo.findMany({
    where: { ano: cenario.ano, tipo: "TRIMESTRE" },
    orderBy: { trimestre: "asc" },
    select: { id: true, trimestre: true },
  });
  const trimestresOk: number[] = [];
  const trimestresSemDados: number[] = [];
  for (const t of trims) {
    try {
      await calcularCenario({ cenarioId: args.cenarioId, periodoId: t.id });
      trimestresOk.push(t.trimestre ?? 0);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        trimestresSemDados.push(t.trimestre ?? 0);
      } else {
        throw e;
      }
    }
  }
  return { trimestresOk, trimestresSemDados };
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

  const cenario = await prisma.cenario.create({
    data: {
      nome: args.nome,
      descricao: args.descricao,
      ano: args.ano,
      modelo: args.modelo,
      premissaId: args.premissaId,
      criadoPorId: args.criadoPorId,
      classificacoes: {
        create: sociosAtivos.map((s) => ({
          socioId: s.id,
          publico: defaultPublico(s, args.modelo),
          unidadeId: unidadeMatriz?.id,
          percentualQuotas: s.percentualQuotasDefault,
          originacaoEsperada: 0,
        })),
      },
    },
  });
  return cenario;
}

/**
 * Clona um cenário existente (qualquer status) em um novo DRAFT.
 * Copia: nome (com sufixo "(cópia)"), premissa, ano, modelo, override
 * e todas as classificações. Não copia RemuneracaoCalculada — usuário
 * recalcula no novo cenário.
 *
 * Uso principal: "Reabrir como rascunho" para iterar em cima de um
 * APPLIED/ARCHIVED sem mexer no original (que fica como registro).
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
 * Marca como dirty (UI mostra ponto vermelho + botão Recalcular destacado).
 * Valida o JSON pelo schema do modelo correspondente.
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

  // Valida override pelo schema do modelo (rejeita Blocos que não somam 1, etc).
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
 * Salva o override atual como uma nova Premissa no catálogo, vincula o
 * cenário a ela e limpa o override. Útil quando o usuário gosta dos
 * parâmetros e quer reutilizar em outros cenários.
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
        // Não marca dirty — premissa.parametros == override antigo,
        // engine produzirá mesmo resultado.
      },
    });
    return p;
  });

  return { premissaId: novaPremissa.id };
}

function defaultPublico(s: { isFundador: boolean; cargo: string }, modelo: "ATUAL" | "NOVO"): Publico {
  if (modelo === "ATUAL") {
    if (s.isFundador) return "FUNDADOR";
    if (/Líder Técnico/i.test(s.cargo)) return "LIDER_TECNICO";
    if (/Líder de Unidade/i.test(s.cargo)) return "LIDER_UNIDADE_NON_EQUITY";
    return "SOCIO_CAPITAL_GESTOR";
  }
  // Modelo NOVO — segue planilha "Reclassificação de Sócios para Simulação":
  // Décio → Sócio de Serviços, Gilberto → Sócio de Capital, demais sócios → Sócio de Capital
  if (s.isFundador && /Décio/i.test((s as { nome?: string }).nome ?? "")) return "SOCIO_SERVICOS";
  if (s.isFundador) return "SOCIO_CAPITAL";
  if (/Líder Técnico/i.test(s.cargo)) return "SOCIO_SERVICOS";
  if (/Líder de Unidade/i.test(s.cargo)) return "LIDER_UNIDADE_NON_EQUITY";
  return "SOCIO_CAPITAL";
}
