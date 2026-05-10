// Server component: header da coluna + KPIs + stepper + painel de parâmetros
// + ações (calcular, publicar, editar classificações).
import Link from "next/link";
import { Replace, RotateCcw, FileCheck2, ListTree } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, ModeloBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { brl } from "@/lib/format";
import { Stepper, type Step } from "@/components/cenario/stepper";
import { calcularAction, publicarAction } from "@/app/simulacao/acoes";
import { PainelParametros } from "./painel-parametros";
import { DrawerClassificacoes } from "./drawer-classificacoes";
import { SalvarPremissaDialog } from "./salvar-premissa-dialog";
import { MenuCenario, type CenarioStatus as CenarioStatusType } from "./menu-cenario";
import { ExplicacaoDialog } from "./explicacao-dialog";
import { gerarNarrativa } from "@/lib/explicacao/narrativa";
import { InsumosSheet, type InsumosUnidadeBase } from "@/components/insumos/insumos-sheet";
import { prisma } from "@/lib/prisma";
import { carregarHistoricoUnidades } from "@/lib/insumos/historico";
import type { CenarioCompleto, AreaOption } from "./types";

export async function ColunaCenario({
  slot,
  cenario,
  outroCenarioId,
  areas,
  podeMutar,
  modoNome,
}: {
  slot: "a" | "b";
  cenario: CenarioCompleto;
  outroCenarioId: string;
  areas: AreaOption[];
  podeMutar: boolean;
  modoNome: "completo" | "iniciais";
}) {
  void modoNome; // pode ser usado em futuras adições
  const isDraft = cenario.status === "DRAFT";
  const editavel = podeMutar && isDraft;
  // Consolidado: 1 loop para somar total anual (Σ trimestres), contar
  // erros/warns e agregar valoresPorEtapa.
  let totalPacote = 0;
  let errosCount = 0;
  let warnsCount = 0;
  const valoresPorEtapa: Record<string, number> = {};
  const sociosUnicos = new Set<string>();
  const trimsCalculados = new Set<number>();
  for (const r of cenario.remuneracoes) {
    totalPacote += r.total;
    sociosUnicos.add(r.socioId);
    if (r.periodo.trimestre) trimsCalculados.add(r.periodo.trimestre);
    const alertas = (r.alertas as string[] | null) ?? [];
    for (const a of alertas) {
      if (a.includes("[ERROR]")) errosCount++;
      else if (a.includes("[WARNING]")) warnsCount++;
    }
    const trace = ((r as unknown as { trace?: Array<{ etapa: string; valor?: number }> }).trace) ?? [];
    for (const item of trace) {
      if (typeof item.valor !== "number") continue;
      const m = /^\d+\.(.+)$/.exec(item.etapa);
      const key = m ? m[1] : item.etapa;
      valoresPorEtapa[key] = (valoresPorEtapa[key] ?? 0) + item.valor;
    }
  }
  const jaCalculou = cenario.remuneracoes.length > 0;
  const cobertura4Trims = trimsCalculados.size === 4;
  // Publicar é permitido mesmo sem cobertura 4/4 — a publicarAction faz
  // auto-cálculo dos 4 trimestres antes de congelar o snapshot.
  const podePublicar = editavel && errosCount === 0;
  const dirty = cenario.parametrosDirty;

  // Stepper
  const calcDescricao = dirty
    ? "params alterados"
    : !jaCalculou
    ? "pendente"
    : cobertura4Trims
    ? "4 trimestres ok"
    : `${trimsCalculados.size}/4 trimestres`;
  const steps: Step[] = [
    {
      label: "Classificar",
      description: `${cenario.classificacoes.length} sócios`,
      state: "done",
      tooltip:
        "Define cada sócio: público (SC, SServiço, Líder), % de quotas, peso no Bloco B e originação esperada. Base do cálculo.",
    },
    {
      label: "Calcular",
      description: calcDescricao,
      state: cobertura4Trims && !dirty ? "done" : "current",
      tooltip:
        "Roda o engine DSF nos 4 trimestres do ano com os parâmetros atuais (override ou premissa) e gera o pacote de cada sócio.",
    },
    {
      label: "Revisar",
      description: errosCount > 0 ? `${errosCount} erro(s)` : "alertas ok",
      state: cobertura4Trims ? (errosCount > 0 ? "current" : "done") : "pending",
      tooltip:
        "Confere alertas e valores. Erros [ERROR] bloqueiam Publicar; warnings só avisam.",
    },
    {
      label: "Publicar",
      description: cenario.status === "APPLIED" ? "publicado" : "snapshot final",
      state:
        cenario.status === "APPLIED"
          ? "done"
          : cobertura4Trims && errosCount === 0
          ? "current"
          : "pending",
      tooltip:
        "Congela o cenário como snapshot imutável (APPLIED). Outros APPLIED do mesmo modelo+ano são arquivados automaticamente.",
    },
  ];

  // URL pra trocar essa coluna por outro cenário (abre drawer)
  const trocarHref = (() => {
    const sp = new URLSearchParams();
    if (outroCenarioId) sp.set(slot === "a" ? "b" : "a", outroCenarioId);
    sp.set("drawer", "1");
    return `/simulacao?${sp.toString()}`;
  })();

  // Parâmetros efetivos = override OU premissa (vamos exibir o que está em uso)
  const paramsEfetivos =
    (cenario.parametrosOverride as Record<string, unknown> | null) ??
    (cenario.premissa.parametros as Record<string, unknown>);

  // Insumos override do cenário (LL/funding por unidade)
  const resOverride = (cenario.resultadosOverride ?? null) as
    | Record<string, { lucroLiquido?: number; fundingVariavel?: number }>
    | null;
  const temInsumoOverride = !!resOverride && Object.keys(resOverride).length > 0;

  // Carrega LL/funding default + histórico — só se for editável (ADMIN/CONSULTOR
  // em cenário DRAFT). Soma trimestres do ano para visão anual única.
  const unidadesParaSheet: InsumosUnidadeBase[] = editavel
    ? await carregarInsumosDoAno(cenario.ano, resOverride)
    : [];
  const periodoRotulo = `${cenario.ano} (anual)`;

  return (
    <Card className="flex flex-col">
      {/* Header */}
      <CardHeader className="flex-col items-stretch gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={slot === "a" ? "navy" : "info"} size="sm">
                Coluna {slot.toUpperCase()}
              </Badge>
              <ModeloBadge modelo={cenario.modelo} />
              <StatusBadge status={cenario.status} />
              {dirty && (
                <Badge variant="warning" size="sm" title="Parâmetros ou insumos alterados — recalcule">
                  ● alterado
                </Badge>
              )}
              {temInsumoOverride && (
                <Badge variant="info" size="sm" title="Cenário usa insumos customizados">
                  insumos custom
                </Badge>
              )}
            </div>
            <CardTitle className="mt-2 text-base truncate">{cenario.nome}</CardTitle>
            <CardDescription>
              baseada em{" "}
              <Link
                href={`/premissas/${cenario.premissa.id}`}
                className="font-medium text-peri-700 hover:text-peri-900 hover:underline"
                title="Abrir editor da premissa-template"
              >
                {cenario.premissa.nome}
              </Link>{" "}
              · ano {cenario.ano} · v{cenario.versao}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {editavel && unidadesParaSheet.length > 0 && (
              <InsumosSheet
                cenarioId={cenario.id}
                cenarioNome={cenario.nome}
                periodoRotulo={periodoRotulo}
                totalAtual={totalPacote}
                unidades={unidadesParaSheet}
              />
            )}
            {jaCalculou && (
              <ExplicacaoDialog
                cenarioNome={cenario.nome}
                paragrafos={gerarNarrativa({
                  nome: cenario.nome,
                  modelo: cenario.modelo as "ATUAL" | "NOVO",
                  ano: cenario.ano,
                  periodoRotulo: `Anual ${cenario.ano}`,
                  premissaNome: cenario.premissa.nome,
                  // Agrega 4 trimestres por sócio para a narrativa: 1 entrada por sócio
                  // com total anual, trace concatenado e alertas unificados.
                  remuneracoes: (() => {
                    const agg = new Map<
                      string,
                      { socio: { nome: string; isFundador: boolean }; total: number; trace: unknown[]; alertas: string[] }
                    >();
                    for (const r of cenario.remuneracoes) {
                      let cur = agg.get(r.socioId);
                      if (!cur) {
                        cur = {
                          socio: { nome: r.socio.nome, isFundador: r.socio.isFundador },
                          total: 0,
                          trace: [],
                          alertas: [],
                        };
                        agg.set(r.socioId, cur);
                      }
                      cur.total += r.total;
                      const tr = (r.trace as unknown[] | null) ?? [];
                      cur.trace.push(...tr);
                      const al = (r.alertas as string[] | null) ?? [];
                      cur.alertas.push(...al);
                    }
                    return [...agg.values()];
                  })(),
                })}
              />
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href={trocarHref}>
                <Replace className="h-3.5 w-3.5" /> Trocar
              </Link>
            </Button>
            {podeMutar && (
              <MenuCenario
                cenarioId={cenario.id}
                cenarioNome={cenario.nome}
                status={cenario.status as CenarioStatusType}
                slot={slot}
                outroCenarioId={outroCenarioId}
              />
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-neutral-100">
          <Kpi label="Total anual" valor={jaCalculou ? brl(totalPacote, true) : "—"} />
          <Kpi label="Sócios" valor={String(sociosUnicos.size)} />
          <Kpi
            label="Alertas"
            valor={
              errosCount === 0 && warnsCount === 0
                ? "✓"
                : `${errosCount > 0 ? errosCount + "✗" : ""} ${warnsCount > 0 ? warnsCount + "⚠" : ""}`.trim()
            }
            cor={errosCount > 0 ? "red" : warnsCount > 0 ? "amber" : "green"}
          />
        </div>
      </CardHeader>

      {/* Stepper (apenas DRAFT) */}
      {editavel && (
        <div className="px-5 py-3 border-b border-neutral-100">
          <Stepper steps={steps} />
        </div>
      )}

      {/* Painel de parâmetros */}
      <div className="px-5 py-3 border-b border-neutral-100">
        <PainelParametros
          cenarioId={cenario.id}
          modelo={cenario.modelo as "ATUAL" | "NOVO"}
          parametros={paramsEfetivos}
          temOverride={cenario.parametrosOverride !== null}
          editavel={editavel}
          areas={areas}
          dirty={dirty}
          versao={cenario.versao}
          valoresPorEtapa={valoresPorEtapa}
        />
      </div>

      {/* Ações */}
      <div className="px-5 py-3 flex items-center gap-2 flex-wrap mt-auto">
        {editavel && (
          <>
            <form action={calcularAction}>
              <input type="hidden" name="cenarioId" value={cenario.id} />
              <Tooltip
                side="top"
                content={
                  jaCalculou
                    ? "Roda o engine DSF nos 4 trimestres do ano com os parâmetros atuais (override ou premissa) e regrava os pacotes por sócio."
                    : "Calcula os 4 trimestres do ano em sequência usando os parâmetros do cenário. Trimestres sem dados de DRE são ignorados."
                }
              >
                <Button
                  type="submit"
                  variant={dirty ? "primary" : "secondary"}
                  size="sm"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {jaCalculou ? "Recalcular" : "Calcular"}
                </Button>
              </Tooltip>
            </form>
            <DrawerClassificacoes
              cenarioId={cenario.id}
              classificacoes={cenario.classificacoes.map((c) => ({
                id: c.id,
                nome: c.socio.nome,
                cargo: c.socio.cargo,
                publico: c.publico,
                percentualQuotas: c.percentualQuotas,
                pesoBlocoB: c.pesoBlocoB,
                originacaoEsperada: c.originacaoEsperada,
              }))}
            />
            {cenario.parametrosOverride && (
              <SalvarPremissaDialog cenarioId={cenario.id} cenarioNome={cenario.nome} />
            )}
          </>
        )}
        {editavel && jaCalculou && (
          <ConfirmDialog
            trigger={
              <Tooltip
                side="top"
                content={
                  errosCount > 0
                    ? `Resolva os ${errosCount} alerta(s) ERROR antes de publicar.`
                    : !cobertura4Trims
                    ? `Vou calcular os 4 trimestres antes de publicar (atual: ${trimsCalculados.size}/4) e congelar o snapshot.`
                    : "Congela o cenário como snapshot imutável (status APPLIED). Outros cenários publicados do mesmo modelo+ano serão arquivados automaticamente."
                }
              >
                <Button variant="primary" size="sm" disabled={!podePublicar}>
                  <FileCheck2 className="h-3.5 w-3.5" />
                  {!cobertura4Trims ? "Calcular & Publicar" : "Publicar"}
                </Button>
              </Tooltip>
            }
            title="Publicar este cenário?"
            description={
              errosCount > 0
                ? `Há ${errosCount} alerta(s) ERROR. Resolva antes de publicar.`
                : !cobertura4Trims
                ? `Vou calcular os 4 trimestres do ano antes de congelar o snapshot (atual: ${trimsCalculados.size}/4). Cenários APPLIED anteriores deste modelo/ano serão arquivados.`
                : "O cálculo será congelado (snapshot imutável). Cenários APPLIED anteriores deste modelo/ano serão arquivados."
            }
            action={publicarAction}
            hiddenFields={{ cenarioId: cenario.id }}
            confirmLabel="Publicar"
            disabled={!podePublicar}
          />
        )}
        {!editavel && jaCalculou && (
          <span className="text-xs text-neutral-500 inline-flex items-center gap-1.5">
            <ListTree className="h-3 w-3" /> Cenário publicado — somente leitura.
          </span>
        )}
      </div>
    </Card>
  );
}

function Kpi({
  label,
  valor,
  cor = "navy",
}: {
  label: string;
  valor: string;
  cor?: "navy" | "red" | "amber" | "green";
}) {
  const corClass =
    cor === "red"
      ? "text-red-700"
      : cor === "amber"
      ? "text-amber-700"
      : cor === "green"
      ? "text-mint-700"
      : "text-navy-900";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${corClass}`}>{valor}</div>
    </div>
  );
}

// ============================================================================
// Insumos do ano (LL/funding agregados dos 4 trimestres)
// ============================================================================

async function carregarInsumosDoAno(
  ano: number,
  override: Record<string, { lucroLiquido?: number; fundingVariavel?: number }> | null,
): Promise<InsumosUnidadeBase[]> {
  const trimestres = await prisma.periodo.findMany({
    where: { tipo: "TRIMESTRE", ano },
    take: 4,
  });
  const trimIds = trimestres.map((t) => t.id);
  const [unidades, resultados, historico] = await Promise.all([
    prisma.unidade.findMany({
      where: { ativa: true },
      orderBy: [{ isMatriz: "desc" }, { codigo: "asc" }],
      take: 50,
    }),
    trimIds.length > 0
      ? prisma.resultadoPeriodo.findMany({
          where: { periodoId: { in: trimIds } },
          take: 200,
        })
      : Promise.resolve([]),
    carregarHistoricoUnidades({ limite: 8 }),
  ]);

  // Agrega LL/funding dos 4 trimestres por unidade (visão anual)
  const llPorUn = new Map<string, number>();
  const fvPorUn = new Map<string, number | null>();
  for (const r of resultados) {
    llPorUn.set(r.unidadeId, (llPorUn.get(r.unidadeId) ?? 0) + r.lucroLiquido);
    if (r.fundingVariavel != null) {
      fvPorUn.set(r.unidadeId, (fvPorUn.get(r.unidadeId) ?? 0) + r.fundingVariavel);
    }
  }
  const histPorUn = new Map(historico.map((h) => [h.unidadeId, h] as const));

  return unidades.map((u) => {
    const h = histPorUn.get(u.id);
    return {
      unidadeId: u.id,
      unidadeCodigo: u.codigo,
      unidadeNome: u.nome,
      isMatriz: u.isMatriz,
      llDefault: llPorUn.get(u.id) ?? 0,
      fundingDefault: fvPorUn.get(u.id) ?? null,
      llOverride: override?.[u.id]?.lucroLiquido,
      fundingOverride: override?.[u.id]?.fundingVariavel,
      hist: {
        llMedia: h?.llMedia ?? 0,
        llMin: h?.llMin ?? 0,
        llMax: h?.llMax ?? 0,
        amostras: h?.amostras ?? 0,
        ultimoPeriodo: h?.ultimoPeriodo ?? null,
      },
    };
  });
}

