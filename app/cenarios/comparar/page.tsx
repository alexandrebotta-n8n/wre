import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp, Minus, Eye, GitCompare, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { brl, pct, nomeOuIniciais } from "@/lib/format";
import { auth } from "@/auth";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { getModoNome } from "@/lib/preferencias";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ModeloBadge, StatusBadge, Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableShell, THead, TBody, TH, TR, TD } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

async function selecionarAction(formData: FormData) {
  "use server";
  const a = String(formData.get("a") ?? "");
  const b = String(formData.get("b") ?? "");
  const periodoId = String(formData.get("periodoId") ?? "");
  if (a && b && periodoId) {
    redirect(`/cenarios/comparar?a=${a}&b=${b}&periodoId=${periodoId}`);
  }
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; periodoId?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const modoNome = await getModoNome();
  const [cenarios, periodos] = await Promise.all([
    prisma.cenario.findMany({
      where: escopo.ehSocioRestrito ? { status: "APPLIED" } : {},
      orderBy: [{ criadoEm: "desc" }],
      include: { premissa: { select: { nome: true } } },
      take: 100,
    }),
    prisma.periodo.findMany({
      orderBy: [{ ano: "desc" }, { trimestre: "asc" }],
      take: 50,
    }),
  ]);

  let comparacao: ReturnType<typeof construirComparacao> | null = null;
  let aviso: string | null = null;
  if (sp.a && sp.b && sp.periodoId) {
    if (sp.a === sp.b) {
      aviso = "Você selecionou o mesmo cenário em A e B. Escolha cenários diferentes para ver o diff.";
    } else {
      comparacao = await carregarComparacao(sp.a, sp.b, sp.periodoId, escopo.socioIdEscopo);
      if (comparacao && comparacao.cenarioA.modelo === comparacao.cenarioB.modelo) {
        aviso = "Os dois cenários usam o mesmo modelo. A comparação clássica é Atual × Novo.";
      }
    }
  }

  const renderSelect = (name: string, defaultV: string, label: string) => (
    <NativeSelect name={name} defaultValue={defaultV} required aria-label={label}>
      <option value="" disabled>
        Escolha um cenário…
      </option>
      <optgroup label="Modelo Novo">
        {cenarios
          .filter((c) => c.modelo === "NOVO")
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} ({c.status})
            </option>
          ))}
      </optgroup>
      <optgroup label="Modelo Atual">
        {cenarios
          .filter((c) => c.modelo === "ATUAL")
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} ({c.status})
            </option>
          ))}
      </optgroup>
    </NativeSelect>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <PageHeader
        breadcrumb={[{ label: "Cenários", href: "/cenarios" }, { label: "Comparar" }]}
        title="Comparar cenários"
        description="Diff por sócio entre dois cenários — idealmente Atual × Novo no mesmo período."
      />

      <Card>
        <form
          action={selecionarAction}
          className="p-5 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-navy-900 mb-1">Cenário A</label>
            {renderSelect("a", sp.a ?? "", "Cenário A")}
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-900 mb-1">Cenário B</label>
            {renderSelect("b", sp.b ?? "", "Cenário B")}
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-900 mb-1">Período</label>
            <NativeSelect name="periodoId" defaultValue={sp.periodoId ?? ""} required aria-label="Período">
              <option value="" disabled>
                Período…
              </option>
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.rotulo}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" variant="secondary">
            <GitCompare className="h-4 w-4" />
            Comparar
          </Button>
        </form>
      </Card>

      {aviso && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {aviso}
        </div>
      )}

      {!comparacao && !aviso && (
        <EmptyState
          icon={<GitCompare className="h-5 w-5" />}
          title="Selecione dois cenários e um período"
          description="Recomendamos comparar um cenário Atual com um Novo no mesmo período para ver o impacto do modelo."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/cenarios">Ir para Cenários</Link>
            </Button>
          }
        />
      )}

      {comparacao && (
        <>
          {/* Cards lado-a-lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ResumoCenario lado="A" data={comparacao.cenarioA} total={comparacao.totalA} />
            <ResumoCenario lado="B" data={comparacao.cenarioB} total={comparacao.totalB} />
          </div>

          {/* Diff total destacado */}
          <Card className="bg-navy-900 text-white border-navy-700">
            <div className="p-6 text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-peri-200">Diff total (B − A)</p>
              <p
                className={cn(
                  "mt-2 text-4xl font-bold tabular-nums",
                  comparacao.totalB - comparacao.totalA >= 0 ? "text-mint-400" : "text-red-300",
                )}
              >
                {comparacao.totalB - comparacao.totalA >= 0 ? "+" : ""}
                {brl(comparacao.totalB - comparacao.totalA)}
              </p>
              {comparacao.totalA > 0 && (
                <p className="text-sm text-peri-100 mt-1">
                  {pct((comparacao.totalB - comparacao.totalA) / comparacao.totalA)} sobre A
                </p>
              )}
              <div className="mt-4">
                <Button asChild variant="subtle" size="sm">
                  <Link href={`/apresentacao?a=${sp.a}&b=${sp.b}&periodoId=${sp.periodoId}`}>
                    <Eye className="h-3.5 w-3.5" /> Apresentar este comparativo
                  </Link>
                </Button>
              </div>
            </div>
          </Card>

          {/* Tabela de diff */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle>Diff por sócio</CardTitle>
                <CardDescription>Ordenado por |Δ| decrescente</CardDescription>
              </div>
            </CardHeader>
            <TableShell caption="Diferença de remuneração por sócio entre os dois cenários">
              <THead>
                <tr>
                  <TH className="px-4">Sócio</TH>
                  <TH className="text-right">Total A</TH>
                  <TH className="text-right">Total B</TH>
                  <TH className="text-right">Δ R$</TH>
                  <TH className="text-right">Δ %</TH>
                </tr>
              </THead>
              <TBody>
                {comparacao.linhas.map((l) => {
                  const positivo = l.diff > 0;
                  const zero = l.diff === 0;
                  const Icon = zero ? Minus : positivo ? ArrowUp : ArrowDown;
                  const corClasse = zero ? "text-neutral-500" : positivo ? "text-mint-700" : "text-red-700";
                  return (
                    <TR key={l.socioId}>
                      <TD
                        className="px-4 py-2.5 font-medium text-navy-900"
                        title={modoNome === "iniciais" ? l.nome : undefined}
                      >
                        {nomeOuIniciais(l.nome, modoNome)}
                      </TD>
                      <TD className="text-right tabular-nums">{l.totalA ? brl(l.totalA, true) : "—"}</TD>
                      <TD className="text-right tabular-nums">{l.totalB ? brl(l.totalB, true) : "—"}</TD>
                      <TD className={cn("text-right tabular-nums font-medium", corClasse)}>
                        <span className="inline-flex items-center gap-1 justify-end">
                          <Icon className="h-3 w-3" aria-hidden />
                          {positivo ? "+" : ""}
                          {brl(l.diff, true)}
                        </span>
                      </TD>
                      <TD className={cn("text-right tabular-nums text-xs", corClasse)}>
                        {l.diffPct === null ? "—" : (positivo ? "+" : "") + pct(l.diffPct)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </TableShell>
          </Card>
        </>
      )}
    </main>
  );
}

function ResumoCenario({
  lado,
  data,
  total,
}: {
  lado: "A" | "B";
  data: { id: string; nome: string; modelo: "ATUAL" | "NOVO"; status: "DRAFT" | "APPLIED" | "ARCHIVED" };
  total: number;
}) {
  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <Badge variant={lado === "A" ? "navy" : "info"} size="md">
            Cenário {lado}
          </Badge>
          <div className="flex items-center gap-1.5">
            <ModeloBadge modelo={data.modelo} />
            <StatusBadge status={data.status} />
          </div>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-navy-900 truncate">
          <Link href={`/cenarios/${data.id}`} className="hover:text-peri-700">
            {data.nome}
          </Link>
        </h3>
        <p className="mt-3 text-xs uppercase tracking-wider text-neutral-500">Total distribuído</p>
        <p className="text-2xl font-bold tabular-nums text-navy-900 mt-0.5">{brl(total)}</p>
      </div>
    </Card>
  );
}

async function carregarComparacao(
  aId: string,
  bId: string,
  periodoId: string,
  socioIdEscopo: string | null,
) {
  const remuneracoesWhere = socioIdEscopo
    ? { periodoId, socioId: socioIdEscopo }
    : { periodoId };
  const [a, b, periodo] = await Promise.all([
    prisma.cenario.findUnique({
      where: { id: aId },
      include: {
        remuneracoes: {
          where: remuneracoesWhere,
          include: { socio: { select: { nome: true } } },
        },
      },
    }),
    prisma.cenario.findUnique({
      where: { id: bId },
      include: {
        remuneracoes: {
          where: remuneracoesWhere,
          include: { socio: { select: { nome: true } } },
        },
      },
    }),
    prisma.periodo.findUnique({ where: { id: periodoId } }),
  ]);
  if (!a || !b || !periodo) return null;
  if (socioIdEscopo && (a.status !== "APPLIED" || b.status !== "APPLIED")) return null;
  return construirComparacao(a, b, periodo);
}

function construirComparacao(
  a: {
    id: string;
    nome: string;
    modelo: "ATUAL" | "NOVO";
    status: "DRAFT" | "APPLIED" | "ARCHIVED";
    remuneracoes: Array<{ socioId: string; total: number; socio: { nome: string } }>;
  },
  b: {
    id: string;
    nome: string;
    modelo: "ATUAL" | "NOVO";
    status: "DRAFT" | "APPLIED" | "ARCHIVED";
    remuneracoes: Array<{ socioId: string; total: number; socio: { nome: string } }>;
  },
  periodo: { rotulo: string },
) {
  const mapA = new Map(a.remuneracoes.map((r) => [r.socioId, r]));
  const mapB = new Map(b.remuneracoes.map((r) => [r.socioId, r]));
  const ids = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
  const linhas = ids.map((sid) => {
    const ra = mapA.get(sid);
    const rb = mapB.get(sid);
    const totalA = ra?.total ?? 0;
    const totalB = rb?.total ?? 0;
    return {
      socioId: sid,
      nome: ra?.socio.nome ?? rb?.socio.nome ?? "?",
      totalA,
      totalB,
      diff: totalB - totalA,
      diffPct: totalA > 0 ? (totalB - totalA) / totalA : null,
    };
  });
  linhas.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
  return {
    cenarioA: { id: a.id, nome: a.nome, modelo: a.modelo, status: a.status },
    cenarioB: { id: b.id, nome: b.nome, modelo: b.modelo, status: b.status },
    periodo: { rotulo: periodo.rotulo },
    totalA: linhas.reduce((acc, l) => acc + l.totalA, 0),
    totalB: linhas.reduce((acc, l) => acc + l.totalB, 0),
    linhas,
  };
}
