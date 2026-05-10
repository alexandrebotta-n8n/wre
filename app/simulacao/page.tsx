// Página única de simulação — substitui /cenarios + /cenarios/comparar.
// Layout 2 colunas (A | B), drawer lateral, painéis editáveis inline.
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { getModoNome } from "@/lib/preferencias";
import { SimulacaoShell } from "@/components/simulacao/shell";
import type { CenarioModelo, CenarioStatus } from "@/components/simulacao/types";

export default async function SimulacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; periodoId?: string; drawer?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const modoNome = await getModoNome();

  // Lista lateral / filtros
  const [todosCenarios, premissas, periodosRaw, areas] = await Promise.all([
    prisma.cenario.findMany({
      where: escopo.ehSocioRestrito ? { status: "APPLIED" } : {},
      orderBy: [{ criadoEm: "desc" }],
      include: { premissa: { select: { nome: true, modelo: true } } },
      take: 100,
    }),
    escopo.podeMutar
      ? prisma.premissa.findMany({
          where: { ativa: true },
          orderBy: [{ atualizadoEm: "desc" }],
          take: 50,
          select: { id: true, nome: true, modelo: true },
        })
      : Promise.resolve([]),
    prisma.periodo.findMany({
      orderBy: [{ ano: "desc" }, { tipo: "asc" }, { trimestre: "asc" }],
      include: { _count: { select: { resultados: true } } },
      take: 50,
    }),
    escopo.podeMutar
      ? prisma.areaPratica.findMany({ where: { ativa: true }, orderBy: [{ ordem: "asc" }], take: 50 })
      : Promise.resolve([]),
  ]);

  // Anos que têm pelo menos um trimestre com dados — usado para marcar
  // o período ANUAL como "calculável" (cenario-service deriva o anual
  // somando os trimestres disponíveis automaticamente).
  const anosComTriDados = new Set(
    periodosRaw
      .filter((p) => p.tipo === "TRIMESTRE" && p._count.resultados > 0)
      .map((p) => p.ano),
  );

  const periodos = periodosRaw.map((p) => ({
    id: p.id,
    rotulo: p.rotulo,
    tipo: p.tipo as "TRIMESTRE" | "ANO",
    // ANO sem Resultado próprio mas com trimestres do mesmo ano = calculável.
    temDados:
      p._count.resultados > 0 ||
      (p.tipo === "ANO" && anosComTriDados.has(p.ano)),
  }));

  // Defaults inteligentes quando nada selecionado:
  // A = última APPLIED NOVO (fallback DRAFT NOVO)
  // B = última APPLIED ATUAL (fallback DRAFT ATUAL)
  const aId = sp.a ?? defaultPara(todosCenarios, "NOVO");
  const bId = sp.b ?? defaultPara(todosCenarios, "ATUAL");
  // Default de período: prioriza ANUAL com dados (visão consolidada que
  // os sócios deliberam). Fallback: 1º período qualquer com dados.
  const periodoId =
    sp.periodoId ??
    periodos.find((p) => p.tipo === "ANO" && p.temDados)?.id ??
    periodos.find((p) => p.temDados)?.id ??
    periodos[0]?.id ??
    "";

  const filtroSocio = escopo.ehSocioRestrito
    ? { socioId: escopo.socioIdEscopo ?? "__nada__" }
    : {};

  const [cenarioA, cenarioB] = await Promise.all([
    aId ? carregarCenarioCompleto(aId, periodoId, filtroSocio) : null,
    bId ? carregarCenarioCompleto(bId, periodoId, filtroSocio) : null,
  ]);

  return (
    <SimulacaoShell
      cenarios={todosCenarios.map((c) => ({
        id: c.id,
        nome: c.nome,
        modelo: c.modelo as CenarioModelo,
        status: c.status as CenarioStatus,
        ano: c.ano,
        premissaNome: c.premissa.nome,
      }))}
      premissas={premissas.map((p) => ({
        id: p.id,
        nome: p.nome,
        modelo: p.modelo as CenarioModelo,
      }))}
      periodos={periodos}
      areas={areas.map((a) => ({ codigo: a.codigo, nome: a.nome }))}
      cenarioA={cenarioA}
      cenarioB={cenarioB}
      periodoIdSelecionado={periodoId}
      podeMutar={escopo.podeMutar}
      ehSocioRestrito={escopo.ehSocioRestrito}
      modoNome={modoNome}
      drawerAberto={sp.drawer === "1"}
    />
  );
}

function defaultPara(
  lista: Array<{ id: string; modelo: string; status: string }>,
  modelo: "ATUAL" | "NOVO",
): string | undefined {
  return (
    lista.find((c) => c.modelo === modelo && c.status === "APPLIED")?.id ??
    lista.find((c) => c.modelo === modelo && c.status === "DRAFT")?.id ??
    lista.find((c) => c.modelo === modelo)?.id
  );
}

async function carregarCenarioCompleto(
  cenarioId: string,
  periodoId: string,
  filtroSocio: Record<string, unknown>,
) {
  const c = await prisma.cenario.findUnique({
    where: { id: cenarioId },
    include: {
      premissa: true,
      classificacoes: {
        where: filtroSocio,
        include: {
          socio: { include: { areaPratica: true } },
          unidade: { select: { codigo: true, nome: true } },
        },
        orderBy: [
          { socio: { isFundador: "desc" } },
          { socio: { percentualQuotasDefault: "desc" } },
        ],
      },
      remuneracoes: {
        where: { ...filtroSocio, periodoId },
        include: { socio: { select: { id: true, nome: true, isFundador: true } }, periodo: true },
        orderBy: [{ total: "desc" }],
      },
    },
  });
  return c;
}
