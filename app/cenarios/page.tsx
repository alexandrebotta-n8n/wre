import Link from "next/link";
import { redirect } from "next/navigation";
import { Folders } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { dataHora } from "@/lib/format";
import { criarCenarioComDefaults } from "@/lib/cenario-service";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import { ModeloBadge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Toolbar, SearchInput } from "@/components/ui/toolbar";
import { NativeSelect } from "@/components/ui/input";
import { TableShell, THead, TBody, TH, TR, TD } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { NovoCenarioDialog } from "@/components/cenario/novo-dialog";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import type { ModeloRegra, CenarioStatus } from "@prisma/client";

async function criar(formData: FormData) {
  "use server";
  const session = await auth();
  const nome = String(formData.get("nome") ?? "").trim();
  const ano = Number(formData.get("ano") ?? new Date().getFullYear());
  const modelo = String(formData.get("modelo") ?? "ATUAL") as "ATUAL" | "NOVO";
  const premissaId = String(formData.get("premissaId") ?? "");
  if (!nome || !premissaId) return;
  const c = await criarCenarioComDefaults({
    nome,
    ano,
    modelo,
    premissaId,
    criadoPorId: session?.user?.id,
  });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "cenario.criar",
    recurso: `Cenario:${c.id}`,
    meta: { nome, ano, modelo },
  });
  await flashSuccess(`Cenário "${nome}" criado em rascunho.`);
  redirect(`/cenarios/${c.id}`);
}

export default async function CenariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; modelo?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);

  const where: Record<string, unknown> = {};
  if (escopo.ehSocioRestrito) where.status = "APPLIED";
  if (sp.modelo === "ATUAL" || sp.modelo === "NOVO") where.modelo = sp.modelo as ModeloRegra;
  if (sp.status === "DRAFT" || sp.status === "APPLIED" || sp.status === "ARCHIVED")
    where.status = sp.status as CenarioStatus;
  if (sp.q) where.nome = { contains: sp.q, mode: "insensitive" };

  const [cenarios, premissas, totalSemFiltro] = await Promise.all([
    prisma.cenario.findMany({
      where,
      orderBy: [{ criadoEm: "desc" }],
      include: { premissa: { select: { nome: true } } },
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
    prisma.cenario.count({ where: escopo.ehSocioRestrito ? { status: "APPLIED" } : {} }),
  ]);

  const semFiltros = !sp.q && !sp.modelo && !sp.status;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <PageHeader
        title="Cenários"
        description={`${totalSemFiltro} cenário(s) cadastrado(s) — modele e compare configurações de remuneração`}
        actions={
          escopo.podeMutar && (
            <NovoCenarioDialog
              premissas={premissas as Array<{ id: string; nome: string; modelo: "ATUAL" | "NOVO" }>}
              action={criar}
            />
          )
        }
      />

      <Card className="overflow-hidden">
        <Toolbar>
          <form method="get" className="flex flex-wrap items-center gap-2 flex-1">
            <SearchInput name="q" defaultValue={sp.q ?? ""} placeholder="Buscar por nome…" />
            <NativeSelect
              name="modelo"
              defaultValue={sp.modelo ?? ""}
              className="h-9 w-auto min-w-[140px]"
              aria-label="Filtrar por modelo"
            >
              <option value="">Todos modelos</option>
              <option value="ATUAL">Atual</option>
              <option value="NOVO">Novo</option>
            </NativeSelect>
            <NativeSelect
              name="status"
              defaultValue={sp.status ?? ""}
              className="h-9 w-auto min-w-[140px]"
              aria-label="Filtrar por status"
            >
              <option value="">Todos status</option>
              <option value="DRAFT">Rascunho</option>
              <option value="APPLIED">Publicado</option>
              <option value="ARCHIVED">Arquivado</option>
            </NativeSelect>
            <Button type="submit" variant="secondary" size="sm">
              Filtrar
            </Button>
            {!semFiltros && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/cenarios">Limpar</Link>
              </Button>
            )}
          </form>
        </Toolbar>

        {cenarios.length === 0 ? (
          <div className="p-8">
            {semFiltros ? (
              <EmptyState
                icon={<Folders className="h-5 w-5" />}
                title="Nenhum cenário ainda"
                description="Crie seu primeiro cenário para começar a simular pacotes de remuneração."
                action={
                  escopo.podeMutar && (
                    <NovoCenarioDialog
                      premissas={premissas as Array<{ id: string; nome: string; modelo: "ATUAL" | "NOVO" }>}
                      action={criar}
                    />
                  )
                }
              />
            ) : (
              <EmptyState
                title="Sem resultados para os filtros aplicados"
                description="Ajuste a busca ou os filtros acima."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href="/cenarios">Limpar filtros</Link>
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <TableShell caption="Lista de cenários cadastrados">
            <THead>
              <tr>
                <TH className="px-4">Nome</TH>
                <TH>Modelo</TH>
                <TH>Status</TH>
                <TH className="text-right">Ano</TH>
                <TH>Premissa</TH>
                <TH>Criado em</TH>
              </tr>
            </THead>
            <TBody>
              {cenarios.map((c) => (
                <TR key={c.id}>
                  <TD className="px-4 py-2.5">
                    <Link
                      href={`/cenarios/${c.id}`}
                      className="text-peri-700 hover:text-peri-900 font-medium hover:underline"
                    >
                      {c.nome}
                    </Link>
                  </TD>
                  <TD>
                    <ModeloBadge modelo={c.modelo} />
                  </TD>
                  <TD>
                    <StatusBadge status={c.status} />
                  </TD>
                  <TD className="text-right tabular-nums">{c.ano}</TD>
                  <TD className="text-neutral-600 truncate max-w-[200px]">{c.premissa.nome}</TD>
                  <TD className="text-neutral-500 text-xs">{dataHora(c.criadoEm)}</TD>
                </TR>
              ))}
            </TBody>
          </TableShell>
        )}
      </Card>
    </main>
  );
}
