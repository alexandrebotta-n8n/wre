// Página única de simulação — substitui /cenarios + /cenarios/comparar.
// Layout: painéis globais no topo + 2 colunas (A | B) + drawer lateral.
// Visão ANUAL única (cálculo trimestral foi removido).
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { getModoNome, getTourVisto } from "@/lib/preferencias";
import { SimulacaoShell } from "@/components/simulacao/shell";
import type { CenarioModelo, CenarioStatus } from "@/components/simulacao/types";
import type { UnidadeGlobal } from "@/components/simulacao/painel-globais";

export default async function SimulacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; drawer?: string; ano?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const modoNome = await getModoNome();
  const tourVisto = await getTourVisto();

  const [todosCenarios, premissas, areas] = await Promise.all([
    prisma.cenario.findMany({
      where: escopo.ehSocioRestrito ? { status: "APPLIED" } : {},
      orderBy: [{ criadoEm: "desc" }],
      select: {
        id: true,
        nome: true,
        modelo: true,
        status: true,
        ano: true,
        premissa: { select: { nome: true, modelo: true } },
      },
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
    escopo.podeMutar
      ? prisma.areaPratica.findMany({ where: { ativa: true }, orderBy: [{ ordem: "asc" }], take: 50 })
      : Promise.resolve([]),
  ]);

  const aId = sp.a ?? defaultPara(todosCenarios, "ATUAL");
  const bId = sp.b ?? defaultPara(todosCenarios, "NOVO");

  const filtroSocio = escopo.ehSocioRestrito
    ? { socioId: escopo.socioIdEscopo ?? "__nada__" }
    : {};

  const [cenarioA, cenarioB] = await Promise.all([
    aId ? carregarCenarioCompleto(aId, filtroSocio) : null,
    bId ? carregarCenarioCompleto(bId, filtroSocio) : null,
  ]);

  // Ano de referência: do cenário ativo (A > B > query param > ano atual).
  // Number(sp.ano) pode ser NaN (param ausente/inválido) e NaN NÃO é nullish,
  // então `?? ano atual` não o trataria — sem cenário carregado isso vazaria
  // NaN para as queries Prisma (campo Int) e quebraria a página. Guard explícito.
  const anoParam = sp.ano ? Number(sp.ano) : NaN;
  const anoRef =
    cenarioA?.ano ??
    cenarioB?.ano ??
    (Number.isFinite(anoParam) ? anoParam : new Date().getFullYear());

  // Painel global — só carrega se for editor.
  const [unidadesGlobais, draftsDoAno] = escopo.podeMutar
    ? await Promise.all([
        carregarUnidadesGlobais(anoRef),
        prisma.cenario.count({ where: { ano: anoRef, status: "DRAFT" } }),
      ])
    : [[] as UnidadeGlobal[], 0];

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
      areas={areas.map((a) => ({ codigo: a.codigo, nome: a.nome }))}
      cenarioA={cenarioA}
      cenarioB={cenarioB}
      podeMutar={escopo.podeMutar}
      ehSocioRestrito={escopo.ehSocioRestrito}
      modoNome={modoNome}
      drawerAberto={sp.drawer === "1"}
      mostrarTour={!tourVisto}
      ano={anoRef}
      unidadesGlobais={unidadesGlobais}
      cenariosDraftDoAno={draftsDoAno}
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
  filtroSocio: Record<string, unknown>,
) {
  // Carrega o cenário completo com classificações e remunerações em UMA query.
  // Antes eram 2 findUnique (primeiro só pra pegar `ano`, depois o pesado);
  // agora consultamos todas as remunerações do cenário e filtramos pelo ano
  // em memória — para um cenário típico isso traz 1 entrada ANO (+ no máximo
  // 4 trimestres legacy de APPLIED antigos), custo desprezível.
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
        where: filtroSocio,
        include: {
          socio: { select: { id: true, nome: true, isFundador: true } },
          periodo: true,
        },
        orderBy: [{ total: "desc" }],
      },
    },
  });
  if (!c) return null;
  // Filtra remunerações pelo ano do cenário (defensivo contra dados legacy).
  c.remuneracoes = c.remuneracoes.filter((r) => r.periodo.ano === c.ano);
  return c;
}

// ============================================================================
// Carregamento dos insumos globais para os painéis
// ============================================================================

async function carregarUnidadesGlobais(ano: number): Promise<UnidadeGlobal[]> {
  const [unidades, periodoAno] = await Promise.all([
    prisma.unidade.findMany({
      where: { ativa: true },
      orderBy: [{ isMatriz: "desc" }, { codigo: "asc" }],
      take: 50,
    }),
    prisma.periodo.findFirst({ where: { tipo: "ANO", ano }, select: { id: true } }),
  ]);
  const resultados = periodoAno
    ? await prisma.resultadoPeriodo.findMany({
        where: { periodoId: periodoAno.id },
        take: 50,
      })
    : [];
  const porUnId = new Map(resultados.map((r) => [r.unidadeId, r] as const));
  return unidades.map((u) => {
    const r = porUnId.get(u.id);
    return {
      unidadeId: u.id,
      codigo: u.codigo,
      nome: u.nome,
      isMatriz: u.isMatriz,
      llAtual: r?.lucroLiquido ?? 0,
    };
  });
}
