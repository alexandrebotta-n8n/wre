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

// Número de colunas na tabela (chevron + 5 colunas visíveis). Usado pelo
// colSpan da linha expandida (linha-socio.tsx).
const TABLE_COLS = 6;

export default async function SociosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string; tipo?: string; publico?: string }>;
}) {
  const sp = await searchParams;
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

  const [socios, areas, unidades] = await Promise.all([
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
  ]);

  const semFiltros = !sp.q && !sp.area && !sp.tipo && !sp.publico;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <PageHeader
        title="Sócios e Líderes"
        description={`${socios.length} pessoa(s) — clique na linha pra editar inline. Auto-save ao mudar.`}
      />

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
                <TH className="text-right">Quotas</TH>
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
                />
              ))}
            </TBody>
          </TableShell>
        )}
      </Card>
    </main>
  );
}
