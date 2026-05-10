// Página única de simulação — substitui /cenarios + /cenarios/comparar.
// Layout 2 colunas (A | B), drawer lateral, painéis editáveis inline.
// Visão anual: cada cenário carrega remunerações de todos os trimestres
// do seu ano; UI agrega no anual com drill-down por trimestre.
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
  searchParams: Promise<{ a?: string; b?: string; drawer?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const modoNome = await getModoNome();

  const [todosCenarios, premissas, areas] = await Promise.all([
    prisma.cenario.findMany({
      where: escopo.ehSocioRestrito ? { status: "APPLIED" } : {},
      orderBy: [{ criadoEm: "desc" }],
      // select enxuto: drawer só precisa destes campos. Evita carregar
      // parametrosOverride (jsonb pesado) para 100 cenários da lista lateral.
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

  // Defaults inteligentes quando nada selecionado:
  // A = ATUAL (baseline — sistema de remuneração vigente)
  // B = NOVO  (proposta — Política DSF v1)
  const aId = sp.a ?? defaultPara(todosCenarios, "ATUAL");
  const bId = sp.b ?? defaultPara(todosCenarios, "NOVO");

  const filtroSocio = escopo.ehSocioRestrito
    ? { socioId: escopo.socioIdEscopo ?? "__nada__" }
    : {};

  const [cenarioA, cenarioB] = await Promise.all([
    aId ? carregarCenarioCompleto(aId, filtroSocio) : null,
    bId ? carregarCenarioCompleto(bId, filtroSocio) : null,
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
      areas={areas.map((a) => ({ codigo: a.codigo, nome: a.nome }))}
      cenarioA={cenarioA}
      cenarioB={cenarioB}
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
  filtroSocio: Record<string, unknown>,
) {
  // Carrega remunerações de TODOS os trimestres do ano do cenário —
  // a UI agrega no anual e permite drill-down por trimestre.
  const meta = await prisma.cenario.findUnique({
    where: { id: cenarioId },
    select: { ano: true },
  });
  if (!meta) return null;
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
        where: {
          ...filtroSocio,
          periodo: { tipo: "TRIMESTRE", ano: meta.ano },
        },
        include: {
          socio: { select: { id: true, nome: true, isFundador: true } },
          periodo: true,
        },
        orderBy: [{ periodo: { trimestre: "asc" } }, { total: "desc" }],
      },
    },
  });
  return c;
}
