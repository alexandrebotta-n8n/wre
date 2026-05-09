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
  const rs = await prisma.resultadoPeriodo.findMany({
    where: { periodoId },
    include: { unidade: true },
    take: 50,
  });
  return rs.map((r) => ({
    unidadeCodigo: r.unidade.codigo,
    isMatriz: r.unidade.isMatriz,
    lucroLiquido: r.lucroLiquido,
    fundingVariavel: r.fundingVariavel ?? undefined,
  }));
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
  if (cenario.status === "ARCHIVED") {
    throw new ApiError("Cenário arquivado não pode ser recalculado", 409);
  }

  const periodo = await prisma.periodo.findUnique({ where: { id: args.periodoId } });
  if (!periodo) throw new ApiError("Período não encontrado", 404);

  const tabelaSalarial = await carregarTabelaSalarial();
  const resultados = await carregarResultados(args.periodoId);
  if (resultados.length === 0) {
    throw new ApiError(`Nenhum ResultadoPeriodo para período ${periodo.rotulo}`, 400);
  }
  const socios = classificacoesParaSocioInput(cenario.classificacoes);

  let resultado: ResultadoSimulacao;
  if (cenario.modelo === "ATUAL") {
    const params = cenario.premissa.parametros as Record<string, unknown>;
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
    const params = cenario.premissa.parametros as Record<string, unknown>;
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
