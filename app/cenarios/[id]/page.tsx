import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Eye, Download, FileCheck2, Calculator, AlertTriangle, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TraceRow } from "@/components/cenario/trace";
import { Stepper, type Step } from "@/components/cenario/stepper";
import { StickyActions } from "@/components/cenario/sticky-actions";
import { brl, dataHora, nomeOuIniciais } from "@/lib/format";
import { getModoNome } from "@/lib/preferencias";
import { calcularCenario } from "@/lib/cenario-service";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { flashError, flashSuccess } from "@/lib/flash";
import type { Publico } from "@/lib/domain/dsf";
import { ModeloBadge, StatusBadge, Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { NativeSelect, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { TableShell, THead, TBody, TH, TR, TD } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";

const PUBLICOS: Publico[] = [
  "SOCIO_CAPITAL",
  "SOCIO_CAPITAL_GESTOR",
  "SOCIO_CAPITAL_LIDER_UNIDADE",
  "SOCIO_SERVICOS",
  "SOCIO_SERVICOS_ESTRATEGICO",
  "LIDER_UNIDADE_NON_EQUITY",
  "LIDER_TECNICO",
  "FUNDADOR",
];

const PUBLICOS_LABEL: Record<Publico, string> = {
  SOCIO_CAPITAL: "Sócio de Capital",
  SOCIO_CAPITAL_GESTOR: "Sócio de Capital — Gestor",
  SOCIO_CAPITAL_LIDER_UNIDADE: "Sócio de Capital — Líder Unidade",
  SOCIO_SERVICOS: "Sócio de Serviços",
  SOCIO_SERVICOS_ESTRATEGICO: "Sócio de Serviços Estratégico",
  LIDER_UNIDADE_NON_EQUITY: "Líder de Unidade Non-Equity",
  LIDER_TECNICO: "Líder Técnico",
  FUNDADOR: "Fundador",
};

async function calcularAction(formData: FormData) {
  "use server";
  const session = await auth();
  const cenarioId = String(formData.get("cenarioId"));
  const periodoId = String(formData.get("periodoId"));
  try {
    await calcularCenario({ cenarioId, periodoId });
    await logAudit({
      usuarioId: session?.user?.id,
      acao: "cenario.calcular",
      recurso: `Cenario:${cenarioId}`,
      meta: { periodoId },
    });
    await flashSuccess("Pacotes calculados com sucesso.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao calcular";
    await logAudit({
      usuarioId: session?.user?.id,
      acao: "cenario.calcular.falhou",
      recurso: `Cenario:${cenarioId}`,
      meta: { periodoId, erro: msg },
    });
    await flashError(`Falha ao calcular: ${msg}`);
  }
  revalidatePath(`/cenarios/${cenarioId}`);
}

async function atualizarClassificacaoAction(formData: FormData) {
  "use server";
  const session = await auth();
  const cenarioId = String(formData.get("cenarioId"));
  const classificacaoId = String(formData.get("classificacaoId"));
  const publico = String(formData.get("publico")) as Publico;
  const pesoBlocoBRaw = String(formData.get("pesoBlocoB") ?? "").trim();
  const originacaoRaw = String(formData.get("originacaoEsperada") ?? "").trim();
  const quotasRaw = String(formData.get("percentualQuotas") ?? "").trim();

  const data: {
    publico: Publico;
    pesoBlocoB: number | null;
    originacaoEsperada?: number;
    percentualQuotas?: number;
  } = {
    publico,
    pesoBlocoB: pesoBlocoBRaw ? Number(pesoBlocoBRaw) : null,
  };
  if (originacaoRaw) data.originacaoEsperada = Number(originacaoRaw);
  if (quotasRaw) data.percentualQuotas = Number(quotasRaw) / 100;

  try {
    await prisma.classificacaoSocio.update({
      where: { id: classificacaoId },
      data,
    });
    await prisma.cenario.update({
      where: { id: cenarioId },
      data: { versao: { increment: 1 } },
    });
    await logAudit({
      usuarioId: session?.user?.id,
      acao: "cenario.classificacao.editar",
      recurso: `Cenario:${cenarioId}`,
      meta: { classificacaoId, publico, peso: data.pesoBlocoB, originacao: data.originacaoEsperada },
    });
    await flashSuccess("Classificação atualizada.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao salvar";
    await flashError(`Não foi possível salvar: ${msg}`);
  }
  revalidatePath(`/cenarios/${cenarioId}`);
}

async function aplicarAction(formData: FormData) {
  "use server";
  const session = await auth();
  const cenarioId = String(formData.get("cenarioId"));
  const cenario = await prisma.cenario.findUnique({
    where: { id: cenarioId },
    include: { classificacoes: true, remuneracoes: true, premissa: true },
  });
  if (!cenario || cenario.status !== "DRAFT") return;

  const erros = cenario.remuneracoes.flatMap((r) =>
    ((r.alertas as string[] | null) ?? []).filter((a) => a.includes("[ERROR]")),
  );
  if (erros.length > 0) {
    await flashError(
      `${erros.length} alerta(s) ERROR impedem a publicação. Corrija antes.`,
    );
    redirect(`/cenarios/${cenarioId}`);
  }
  await prisma.cenario.updateMany({
    where: { modelo: cenario.modelo, ano: cenario.ano, status: "APPLIED" },
    data: { status: "ARCHIVED" },
  });
  await prisma.cenario.update({
    where: { id: cenarioId },
    data: {
      status: "APPLIED",
      aplicadoEm: new Date(),
      snapshot: {
        cenario: { id: cenario.id, nome: cenario.nome, modelo: cenario.modelo, ano: cenario.ano },
        premissa: { id: cenario.premissa.id, nome: cenario.premissa.nome, parametros: cenario.premissa.parametros },
        classificacoes: cenario.classificacoes,
        remuneracoes: cenario.remuneracoes,
      } as never,
    },
  });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "cenario.aplicar",
    recurso: `Cenario:${cenarioId}`,
    meta: { modelo: cenario.modelo, ano: cenario.ano },
  });
  await flashSuccess("Cenário publicado — cálculo congelado e versão anterior arquivada.");
  revalidatePath(`/cenarios/${cenarioId}`);
}

export default async function CenarioDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const modoNome = await getModoNome();
  const dn = (n: string) => nomeOuIniciais(n, modoNome);

  const cenario = await prisma.cenario.findUnique({
    where: { id },
    include: {
      premissa: true,
      classificacoes: {
        where: escopo.ehSocioRestrito
          ? { socioId: escopo.socioIdEscopo ?? "__nada__" }
          : {},
        include: { socio: { include: { areaPratica: true } }, unidade: true },
        orderBy: [{ socio: { isFundador: "desc" } }, { socio: { percentualQuotasDefault: "desc" } }],
      },
      remuneracoes: {
        where: escopo.ehSocioRestrito
          ? { socioId: escopo.socioIdEscopo ?? "__nada__" }
          : {},
        include: { socio: true, periodo: true },
        orderBy: [{ total: "desc" }],
      },
    },
  });
  if (!cenario) notFound();
  if (escopo.ehSocioRestrito && cenario.status !== "APPLIED") notFound();

  // Lista períodos + flag se tem ResultadoPeriodo (pra UI mostrar disponibilidade
  // e selecionar default sensato). Trimestres ordenados antes do ANO para o
  // primeiro item do <select> ser o mais provável de ter dados.
  const periodosRaw = escopo.podeMutar
    ? await prisma.periodo.findMany({
        orderBy: [{ ano: "desc" }, { tipo: "asc" }, { trimestre: "asc" }],
        include: { _count: { select: { resultados: true } } },
        take: 50,
      })
    : [];
  const periodos = periodosRaw.map((p) => ({
    id: p.id,
    rotulo: p.rotulo,
    tipo: p.tipo,
    temDados: p._count.resultados > 0,
  }));
  // Default = primeiro período com dados (ou primeiro da lista).
  const periodoDefault = periodos.find((p) => p.temDados)?.id ?? periodos[0]?.id ?? "";

  const totalPacote = cenario.remuneracoes.reduce((acc, r) => acc + r.total, 0);
  const isReadOnly = !escopo.podeMutar || cenario.status !== "DRAFT";
  const errosCount = cenario.remuneracoes.reduce(
    (acc, r) => acc + ((r.alertas as string[] | null) ?? []).filter((a) => a.includes("[ERROR]")).length,
    0,
  );
  const warnsCount = cenario.remuneracoes.reduce(
    (acc, r) => acc + ((r.alertas as string[] | null) ?? []).filter((a) => a.includes("[WARNING]")).length,
    0,
  );
  const podeAplicar = escopo.podeMutar && !isReadOnly && cenario.remuneracoes.length > 0 && errosCount === 0;
  const jaCalculou = cenario.remuneracoes.length > 0;

  // Stepper state
  const stepClassificar: Step["state"] = "done";
  const stepCalcular: Step["state"] = jaCalculou ? "done" : "current";
  const stepRevisar: Step["state"] = jaCalculou
    ? errosCount > 0
      ? "current"
      : "done"
    : "pending";
  const stepPublicar: Step["state"] =
    cenario.status === "APPLIED"
      ? "done"
      : jaCalculou && errosCount === 0
      ? "current"
      : "pending";

  const steps: Step[] = [
    { label: "Classificar", description: `${cenario.classificacoes.length} sócios`, state: stepClassificar },
    { label: "Calcular", description: "engine roda 9 etapas", state: stepCalcular },
    { label: "Revisar", description: errosCount > 0 ? `${errosCount} erro(s)` : "alertas ok", state: stepRevisar },
    { label: "Publicar", description: cenario.status === "APPLIED" ? "publicado" : "snapshot final", state: stepPublicar },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 pb-4 space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Cenários", href: "/cenarios" },
          { label: cenario.nome },
        ]}
        title={cenario.nome}
        meta={
          <>
            <ModeloBadge modelo={cenario.modelo} />
            <StatusBadge status={cenario.status} />
            <span>·</span>
            <span>Ano {cenario.ano}</span>
            <span>·</span>
            <span className="truncate">{cenario.premissa.nome}</span>
            <span>·</span>
            <Tooltip content={`Versão ${cenario.versao} — incrementa a cada edição`}>
              <span>v{cenario.versao}</span>
            </Tooltip>
            <span>·</span>
            <span>{dataHora(cenario.criadoEm)}</span>
          </>
        }
      />

      {/* Stepper do fluxo */}
      <Card>
        <div className="p-5">
          <Stepper steps={steps} />
        </div>
      </Card>

      {/* Resumo de alertas (destacado quando há erros) */}
      {(errosCount > 0 || warnsCount > 0) && (
        <Card className={errosCount > 0 ? "border-red-300 bg-red-50/40" : "border-amber-300 bg-amber-50/40"}>
          <div className="p-4 flex items-start gap-3">
            <AlertTriangle
              className={errosCount > 0 ? "h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" : "h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5"}
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <h3 className={errosCount > 0 ? "text-sm font-semibold text-red-900" : "text-sm font-semibold text-amber-900"}>
                {errosCount > 0
                  ? `${errosCount} erro(s) impedem a publicação`
                  : `${warnsCount} aviso(s) detectado(s)`}
              </h3>
              <p className="text-xs text-neutral-700 mt-0.5">
                Expanda o trace de cada sócio (clique no nome) para ver detalhes e correções.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {errosCount > 0 && <Badge variant="error">{errosCount} ERROR</Badge>}
              {warnsCount > 0 && <Badge variant="warning">{warnsCount} WARNING</Badge>}
            </div>
          </div>
        </Card>
      )}

      {/* Calcular — apenas para perfis que podem mutar */}
      {escopo.podeMutar && cenario.status === "DRAFT" && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-peri-600" />
                Calcular pacotes
              </CardTitle>
              <CardDescription>
                Escolha o período (trimestre ou ano) e rode o engine. Pode recalcular quantas vezes quiser antes de publicar.
              </CardDescription>
            </div>
          </CardHeader>
          <form action={calcularAction} className="p-5 flex items-end gap-3 flex-wrap">
            <input type="hidden" name="cenarioId" value={cenario.id} />
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-navy-900 mb-1">
                Período <span className="text-neutral-500 font-normal">— ✓ tem resultado financeiro cadastrado</span>
              </label>
              <NativeSelect name="periodoId" required defaultValue={periodoDefault}>
                {periodos.map((p) => (
                  <option key={p.id} value={p.id} disabled={!p.temDados}>
                    {p.temDados ? "✓" : "—"} {p.rotulo} {!p.temDados ? "(sem dados — cadastre Resultado primeiro)" : ""}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <SubmitButton variant="secondary">
              <Calculator className="h-4 w-4" />
              {jaCalculou ? "Recalcular" : "Calcular agora"}
            </SubmitButton>
          </form>
        </Card>
      )}

      {/* Classificações editáveis */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Classificações ({cenario.classificacoes.length})</CardTitle>
            <CardDescription>
              Edite público, quota %, peso (Bloco B) e originação esperada. Recalcule depois para ver o efeito.
            </CardDescription>
          </div>
        </CardHeader>
        <TableShell caption="Classificações dos sócios neste cenário">
          <THead>
            <tr>
              <TH className="px-4">Sócio</TH>
              <TH>Público</TH>
              <TH className="text-right">Quota %</TH>
              <TH className="text-right">Peso B</TH>
              <TH className="text-right">Originação (R$/ano)</TH>
              <TH></TH>
            </tr>
          </THead>
          <TBody>
            {cenario.classificacoes.map((c) => (
              <TR key={c.id}>
                <TD className="px-4 py-2.5">
                  <div className="font-medium text-navy-900" title={modoNome === "iniciais" ? c.socio.nome : undefined}>
                    {dn(c.socio.nome)}
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span>{c.socio.cargo}</span>
                    {c.socio.isFundador && <Badge variant="success" size="sm">fundador</Badge>}
                    {c.socio.areaPratica && (
                      <Badge variant="info" size="sm">{c.socio.areaPratica.nome}</Badge>
                    )}
                  </div>
                </TD>
                {isReadOnly ? (
                  <>
                    <TD>{PUBLICOS_LABEL[c.publico as Publico]}</TD>
                    <TD className="text-right tabular-nums">
                      {(c.percentualQuotas * 100).toFixed(4)}%
                    </TD>
                    <TD className="text-right tabular-nums">{c.pesoBlocoB ?? "—"}</TD>
                    <TD className="text-right tabular-nums">
                      {c.originacaoEsperada ? c.originacaoEsperada.toLocaleString("pt-BR") : "—"}
                    </TD>
                    <TD></TD>
                  </>
                ) : (
                  <td className="px-2 py-2" colSpan={5}>
                    <form
                      action={atualizarClassificacaoAction}
                      className="grid grid-cols-[1fr_90px_70px_140px_auto] gap-2 items-center"
                    >
                      <input type="hidden" name="cenarioId" value={cenario.id} />
                      <input type="hidden" name="classificacaoId" value={c.id} />
                      <NativeSelect name="publico" defaultValue={c.publico} className="h-8 text-xs">
                        {PUBLICOS.map((p) => (
                          <option key={p} value={p}>
                            {PUBLICOS_LABEL[p]}
                          </option>
                        ))}
                      </NativeSelect>
                      <Input
                        name="percentualQuotas"
                        type="number"
                        step="0.0001"
                        defaultValue={(c.percentualQuotas * 100).toFixed(4)}
                        className="h-8 text-right tabular-nums text-xs"
                        aria-label="quota percentual"
                      />
                      <Input
                        name="pesoBlocoB"
                        type="number"
                        step="0.5"
                        min="0"
                        defaultValue={c.pesoBlocoB ?? ""}
                        placeholder="1.0"
                        className="h-8 text-right tabular-nums text-xs"
                        aria-label="peso bloco B"
                      />
                      <Input
                        name="originacaoEsperada"
                        type="number"
                        step="10000"
                        min="0"
                        defaultValue={c.originacaoEsperada || ""}
                        placeholder="0"
                        className="h-8 text-right tabular-nums text-xs"
                        aria-label="originação esperada anual em reais"
                      />
                      <SubmitButton size="sm" variant="subtle">
                        Salvar
                      </SubmitButton>
                    </form>
                  </td>
                )}
              </TR>
            ))}
          </TBody>
        </TableShell>
      </Card>

      {/* Pacotes calculados */}
      {cenario.remuneracoes.length > 0 ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>Pacotes calculados — {cenario.remuneracoes[0].periodo.rotulo}</CardTitle>
              <CardDescription>
                Clique no nome de um sócio para ver o passo-a-passo do cálculo (trace).
              </CardDescription>
            </div>
            <span className="text-sm text-neutral-700">
              Total: <strong className="tabular-nums text-navy-900">{brl(totalPacote)}</strong>
            </span>
          </CardHeader>
          <TableShell caption="Pacotes calculados por sócio neste período">
            <THead>
              <tr>
                <TH className="px-3 sticky left-0 bg-neutral-50/80 z-10">Sócio</TH>
                <TH colSpan={3} className="text-center border-l border-neutral-200">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Remunerações fixas
                  </span>
                </TH>
                <TH colSpan={4} className="text-center border-l border-neutral-200">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Variáveis
                  </span>
                </TH>
                <TH className="text-right border-l border-neutral-200">Total</TH>
                <TH>Status</TH>
              </tr>
              <tr className="border-t border-neutral-100">
                <TH className="sticky left-0 bg-neutral-50/80 z-10"></TH>
                <TH className="text-right border-l border-neutral-200">Pró-labore</TH>
                <TH className="text-right">Gestão</TH>
                <TH className="text-right">Fundador</TH>
                <TH className="text-right border-l border-neutral-200">Bloco A</TH>
                <TH className="text-right">Bloco B</TH>
                <TH className="text-right">Pool</TH>
                <TH className="text-right">Prêmio</TH>
                <TH className="border-l border-neutral-200"></TH>
                <TH></TH>
              </tr>
            </THead>
            <TBody>
              {cenario.remuneracoes.map((r) => {
                const alertas = (r.alertas as string[] | null) ?? [];
                const trace = (r.trace as Array<{ etapa: string; descricao: string; valor?: number }> | null) ?? [];
                return (
                  <TraceRow
                    key={r.id}
                    id={`trace-${r.id}`}
                    nome={dn(r.socio.nome)}
                    trace={trace}
                    alertas={alertas}
                    colSpan={10}
                    rowContent={
                      <>
                        <TD className="text-right tabular-nums border-l border-neutral-100">
                          {r.proLabore ? brl(r.proLabore, true) : "—"}
                        </TD>
                        <TD className="text-right tabular-nums">
                          {r.remuneracaoGestao ? brl(r.remuneracaoGestao, true) : "—"}
                        </TD>
                        <TD className="text-right tabular-nums">
                          {r.remuneracaoFundador ? brl(r.remuneracaoFundador, true) : "—"}
                        </TD>
                        <TD className="text-right tabular-nums border-l border-neutral-100">
                          {r.blocoA ? brl(r.blocoA, true) : "—"}
                        </TD>
                        <TD className="text-right tabular-nums">{r.blocoB ? brl(r.blocoB, true) : "—"}</TD>
                        <TD className="text-right tabular-nums">{r.poolUnidade ? brl(r.poolUnidade, true) : "—"}</TD>
                        <TD className="text-right tabular-nums">{r.premio ? brl(r.premio, true) : "—"}</TD>
                        <TD className="text-right tabular-nums font-semibold text-navy-900 border-l border-neutral-100">
                          {brl(r.total, true)}
                        </TD>
                        <TD className="text-xs">
                          {alertas.length === 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-mint-600" aria-label="sem alertas" />
                          ) : (
                            <Badge
                              variant={alertas.some((a) => a.includes("[ERROR]")) ? "error" : "warning"}
                              size="sm"
                            >
                              {alertas.length}
                            </Badge>
                          )}
                        </TD>
                      </>
                    }
                  />
                );
              })}
              <tr className="bg-neutral-50 font-semibold">
                <td className="px-3 py-2.5 sticky left-0 bg-neutral-50">Total geral</td>
                <td colSpan={7}></td>
                <td className="px-3 py-2.5 text-right tabular-nums text-navy-900 border-l border-neutral-100">
                  {brl(totalPacote)}
                </td>
                <td></td>
              </tr>
            </TBody>
          </TableShell>
        </Card>
      ) : (
        escopo.podeMutar && (
          <EmptyState
            icon={<Calculator className="h-5 w-5" />}
            title="Ainda não há cálculo"
            description="Selecione um período acima e clique em 'Calcular agora' para gerar os pacotes."
          />
        )
      )}

      {/* Sticky action bar — apenas se há ações */}
      {(jaCalculou || (escopo.podeMutar && !isReadOnly)) && (
        <StickyActions variant={errosCount > 0 ? "danger" : "default"}>
          {errosCount > 0 && (
            <span className="text-xs text-red-800 font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {errosCount} erro(s) bloqueando a publicação
            </span>
          )}
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {jaCalculou && (
              <>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/cenarios/${cenario.id}/exportar`}>
                    <Download className="h-3.5 w-3.5" /> XLSX
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/apresentacao?a=${cenario.id}&periodoId=${cenario.remuneracoes[0].periodoId}`}
                  >
                    <Eye className="h-3.5 w-3.5" /> Apresentar
                  </Link>
                </Button>
              </>
            )}
            {escopo.podeMutar && !isReadOnly && jaCalculou && (
              <ConfirmDialog
                trigger={
                  <Button variant="primary" size="sm" disabled={!podeAplicar}>
                    <FileCheck2 className="h-3.5 w-3.5" /> Publicar cenário
                  </Button>
                }
                title="Publicar este cenário?"
                description={
                  <>
                    O cálculo será <strong>congelado</strong> (snapshot imutável). Qualquer cenário
                    APPLIED anterior do mesmo modelo/ano será arquivado automaticamente.
                  </>
                }
                action={aplicarAction}
                hiddenFields={{ cenarioId: cenario.id }}
                confirmLabel="Publicar"
                disabled={!podeAplicar}
              />
            )}
          </div>
        </StickyActions>
      )}
    </main>
  );
}
