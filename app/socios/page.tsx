// /socios — lista compacta com edição inline expandível (Notion-style).
//
// Substituiu o EditarSocioDialog (modal) por LinhaSocio (client component que
// expande a linha embaixo com todos os 11 campos + auto-save com debounce).
//
// Tabela enxuta: chevron + sócio + cargo + quotas% + classificação + badges.
// Outros campos (área, nível/faixa, overrides, originação, funding) entram
// na expansão organizada em 4 grupos.
import Link from "next/link";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { getModoNome } from "@/lib/preferencias";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Toolbar, SearchInput } from "@/components/ui/toolbar";
import { NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableShell, THead, TBody, TH } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LinhaSocio } from "@/components/socios/linha-socio";
import { ModoQuotasGlobalCard } from "@/components/socios/modo-quotas-global-card";
import { redistribuirQuotas } from "@/lib/domain/dsf/quotas";
import type { Publico } from "@/lib/domain/dsf";

// Labels da classificação política DSF v1 — exibidos no filtro.
const PUBLICOS_LABEL: Record<string, string> = {
  SOCIO_CAPITAL: "Sócio de Capital",
  SOCIO_CAPITAL_GESTOR: "Sócio de Capital — Gestor",
  SOCIO_CAPITAL_LIDER_UNIDADE: "Sócio de Capital — Líder Un.",
  SOCIO_SERVICOS: "Sócio de Serviços",
  SOCIO_SERVICOS_ESTRATEGICO: "Sócio de Serviços Estratégico",
  LIDER_UNIDADE_NON_EQUITY: "Líder de Un. Non-Equity",
  LIDER_TECNICO: "Líder Técnico (legado)",
  FUNDADOR: "Fundador",
};

// Número de colunas na tabela (chevron + 6 colunas visíveis: sócio, cargo,
// quota original, quota redistribuída, classificação, status). Usado pelo
// colSpan da linha expandida (linha-socio.tsx).
const TABLE_COLS = 7;

export default async function SociosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string; tipo?: string; publico?: string; ano?: string }>;
}) {
  const sp = await searchParams;
  // Ano de referência pro toggle global de modo de quotas. Pega da query
  // string OU usa o ano corrente (compat: hoje só existe 2026 em uso).
  const anoRef = sp.ano ? Number(sp.ano) : new Date().getFullYear();
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const modoNome = await getModoNome();

  const where: Record<string, unknown> = { ativo: true };
  if (escopo.ehSocioRestrito) where.id = escopo.socioIdEscopo ?? "__nada__";
  if (sp.q) where.nome = { contains: sp.q, mode: "insensitive" };
  if (sp.area === "sem") where.areaPraticaId = null;
  else if (sp.area && sp.area !== "todas") where.areaPraticaId = sp.area;
  if (sp.tipo === "fundadores") where.isFundador = true;
  if (sp.tipo === "nao-fundadores") where.isFundador = false;
  if (sp.publico && sp.publico !== "todas") where.publicoDefault = sp.publico;

  const [socios, areas, unidades, cenariosDraftCount] = await Promise.all([
    prisma.socio.findMany({
      where,
      include: {
        areaPratica: { select: { nome: true } },
        unidadeLiderada: { select: { id: true, codigo: true, nome: true } },
      },
      orderBy: [
        { isFundador: "desc" },
        { percentualQuotasDefault: "desc" },
        { nome: "asc" },
      ],
      take: 200,
    }),
    escopo.podeMutar
      ? prisma.areaPratica.findMany({
          where: { ativa: true },
          orderBy: [{ ordem: "asc" }],
          take: 50,
          select: { id: true, nome: true },
        })
      : Promise.resolve([]),
    escopo.podeMutar
      ? prisma.unidade.findMany({
          where: { ativa: true, isMatriz: false },
          orderBy: [{ codigo: "asc" }],
          take: 50,
          select: { id: true, codigo: true, nome: true },
        })
      : Promise.resolve([]),
    // Contagem usada pelo banner de impacto na linha expandida do sócio.
    // SOCIO restrito não vê esse banner — mas a query é leve, sempre roda.
    prisma.cenario.count({ where: { status: "DRAFT" } }),
  ]);

  // Modo de quotas global do ano + contagem de DRAFTs DO ano (usados pelo
  // toggle no topo de /socios). Default ORIGINAL se ano ainda não tem config.
  const [configAno, draftsDoAnoCount] = escopo.podeMutar
    ? await Promise.all([
        prisma.configuracaoAno.findUnique({ where: { ano: anoRef }, select: { modoQuotas: true } }),
        prisma.cenario.count({ where: { status: "DRAFT", ano: anoRef } }),
      ])
    : [null, 0];
  const modoQuotasGlobal: "ORIGINAL" | "REDISTRIBUIDA" =
    (configAno?.modoQuotas as "ORIGINAL" | "REDISTRIBUIDA") ?? "ORIGINAL";

  // Quotas redistribuídas — chip read-only ao lado do input de cada sócio.
  // Cálculo é determinístico sobre o conjunto de sócios ativos (independe de
  // cenário): zera fundadores + SOCIO_SERVICOS, capital remanescente absorve
  // proporcional. Cenários decidem se USAM via Cenario.modoQuotas.
  // Calculamos sobre TODOS os sócios (sem filtros) pra preservar a base global
  // mesmo quando o filtro deixa só um subset visível.
  const todosSociosAtivos = escopo.ehSocioRestrito
    ? socios // SOCIO restrito só vê própria linha — redistribuir só com 1 sócio é meaningless
    : await prisma.socio.findMany({
        where: { ativo: true },
        select: { id: true, publicoDefault: true, isFundador: true, percentualQuotasDefault: true },
        take: 200,
      });
  const quotasRedistribuidasMap = redistribuirQuotas(
    todosSociosAtivos.map((s) => ({
      id: s.id,
      publico: s.publicoDefault as Publico,
      isFundador: s.isFundador,
      percentualQuotas: s.percentualQuotasDefault,
    })),
  );

  const semFiltros = !sp.q && !sp.area && !sp.tipo && !sp.publico;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <PageHeader
        title="Sócios e Líderes"
        description={`${socios.length} pessoa(s) — clique na linha pra editar inline. Auto-save ao mudar.`}
      />

      {escopo.podeMutar && (
        <ModoQuotasGlobalCard
          ano={anoRef}
          modo={modoQuotasGlobal}
          draftsCount={draftsDoAnoCount}
          editavel={escopo.podeMutar}
        />
      )}

      <Card className="overflow-hidden">
        {escopo.podeMutar && (
          <Toolbar>
            <form method="get" className="flex flex-wrap items-center gap-2 flex-1">
              <SearchInput name="q" defaultValue={sp.q ?? ""} placeholder="Buscar por nome…" />
              <NativeSelect
                name="area"
                defaultValue={sp.area ?? ""}
                className="h-9 w-auto min-w-[170px]"
                aria-label="Filtrar por área"
              >
                <option value="">Todas as áreas</option>
                <option value="sem">— sem área —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </NativeSelect>
              <NativeSelect
                name="publico"
                defaultValue={sp.publico ?? ""}
                className="h-9 w-auto min-w-[200px]"
                aria-label="Filtrar por classificação"
              >
                <option value="">Todas as classificações</option>
                {Object.entries(PUBLICOS_LABEL).map(([id, nome]) => (
                  <option key={id} value={id}>{nome}</option>
                ))}
              </NativeSelect>
              <NativeSelect
                name="tipo"
                defaultValue={sp.tipo ?? ""}
                className="h-9 w-auto min-w-[150px]"
                aria-label="Filtrar por tipo"
              >
                <option value="">Todos</option>
                <option value="fundadores">Só fundadores</option>
                <option value="nao-fundadores">Sem fundadores</option>
              </NativeSelect>
              <Button type="submit" variant="secondary" size="sm">
                Filtrar
              </Button>
              {!semFiltros && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/socios">Limpar</Link>
                </Button>
              )}
            </form>
          </Toolbar>
        )}

        {socios.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="Nenhum sócio encontrado"
              description="Ajuste a busca ou os filtros para ver mais resultados."
            />
          </div>
        ) : (
          <TableShell caption="Lista de sócios e líderes ativos">
            <THead>
              <tr>
                <TH className="px-4 w-8" aria-label="Expandir" />
                <TH className="px-2">Sócio</TH>
                <TH>Cargo</TH>
                <TH className={"text-right " + (modoQuotasGlobal === "ORIGINAL" ? "bg-peri-50/70" : "")}>
                  <span className="inline-flex items-center gap-1.5">
                    Quota Original
                    {modoQuotasGlobal === "ORIGINAL" && (
                      <span className="text-[9px] uppercase tracking-wider font-medium px-1 py-0.5 rounded bg-peri-700 text-white">em uso</span>
                    )}
                  </span>
                </TH>
                <TH className={"text-right " + (modoQuotasGlobal === "REDISTRIBUIDA" ? "bg-peri-50/70" : "")}>
                  <span className="inline-flex items-center gap-1.5">
                    Quota Redistribuída
                    {modoQuotasGlobal === "REDISTRIBUIDA" && (
                      <span className="text-[9px] uppercase tracking-wider font-medium px-1 py-0.5 rounded bg-peri-700 text-white">em uso</span>
                    )}
                  </span>
                </TH>
                <TH>Classificação (DSF v1)</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {socios.map((s) => (
                <LinhaSocio
                  key={s.id}
                  socio={{
                    id: s.id,
                    nome: s.nome,
                    cargo: s.cargo,
                    isFundador: s.isFundador,
                    areaPraticaId: s.areaPraticaId,
                    areaPraticaNome: s.areaPratica?.nome ?? null,
                    publicoDefault: s.publicoDefault,
                    publicoAtual: s.publicoAtual,
                    unidadeLideradaId: s.unidadeLideradaId,
                    unidadeLideradaCodigo: s.unidadeLiderada?.codigo ?? null,
                    nivelCargo: s.nivelCargo,
                    faixaSalarial: s.faixaSalarial,
                    percentualQuotasDefault: s.percentualQuotasDefault,
                    proLaboreMensal: s.proLaboreMensal,
                    remuneracaoGestaoMensal: s.remuneracaoGestaoMensal,
                    originacaoAnualPadrao: s.originacaoAnualPadrao,
                    fundingFundadorAnual: s.fundingFundadorAnual,
                    observacoes: s.observacoes,
                  }}
                  areas={areas}
                  unidades={unidades}
                  editavel={escopo.podeMutar}
                  modoNome={modoNome}
                  colSpan={TABLE_COLS}
                  cenariosDraftCount={cenariosDraftCount}
                  quotaRedistribuida={quotasRedistribuidasMap.get(s.id) ?? s.percentualQuotasDefault}
                  modoQuotasGlobal={modoQuotasGlobal}
                />
              ))}
            </TBody>
          </TableShell>
        )}
      </Card>
    </main>
  );
}
