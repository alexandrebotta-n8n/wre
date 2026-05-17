// Server component: header da coluna + KPIs + painel de parâmetros + ações.
// Sem botão "Trocar" (drawer 📋 Cenários é o único caminho de swap).
// Sem Stepper de 4 etapas (sinais consolidados em: empty-state quando não
// calculou, badge "● alterado", KPI Alertas, RecalcularButton smart).
// Visão ANUAL única.
import { FileCheck2, ListTree, Calculator, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, ModeloBadge, StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { brl } from "@/lib/format";
import { publicarAction } from "@/app/simulacao/acoes";
import { PainelParametros } from "./painel-parametros";
import { MenuCenario, type CenarioStatus as CenarioStatusType } from "./menu-cenario";
import { ExplicacaoDialog } from "./explicacao-dialog";
import { KpiAlertasButton } from "./kpi-alertas-button";
import { RecalcularButton } from "./recalcular-button";
import { StickyHeaderColuna } from "./sticky-header-coluna";
import { gerarNarrativa } from "@/lib/explicacao/narrativa";
import type { CenarioCompleto, AreaOption } from "./types";

export function ColunaCenario({
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
  void modoNome;
  const isDraft = cenario.status === "DRAFT";
  const isApplied = cenario.status === "APPLIED";
  const editavel = podeMutar && isDraft;

  // Consolidado: total anual + contagens de alertas + alertas por sócio + valoresPorEtapa
  let totalPacote = 0;
  let errosCount = 0;
  let warnsCount = 0;
  const valoresPorEtapa: Record<string, number> = {};
  const sociosUnicos = new Set<string>();
  const alertasMap = new Map<string, { socioNome: string; alertas: string[] }>();
  for (const r of cenario.remuneracoes) {
    totalPacote += r.total;
    sociosUnicos.add(r.socioId);
    const alertas = (r.alertas as string[] | null) ?? [];
    for (const a of alertas) {
      if (a.includes("[ERROR]")) errosCount++;
      else if (a.includes("[WARNING]")) warnsCount++;
    }
    if (alertas.length > 0) {
      const cur = alertasMap.get(r.socioId) ?? { socioNome: r.socio.nome, alertas: [] };
      cur.alertas.push(...alertas);
      alertasMap.set(r.socioId, cur);
    }
    const trace = ((r as unknown as { trace?: Array<{ etapa: string; valor?: number }> }).trace) ?? [];
    for (const item of trace) {
      if (typeof item.valor !== "number") continue;
      const m = /^\d+\.(.+)$/.exec(item.etapa);
      const key = m ? m[1] : item.etapa;
      valoresPorEtapa[key] = (valoresPorEtapa[key] ?? 0) + item.valor;
    }
  }
  const alertasPorSocio = Array.from(alertasMap.values());
  const totalAlertas = errosCount + warnsCount;
  const kpiValorAlertas =
    totalAlertas === 0
      ? "✓"
      : `${errosCount > 0 ? errosCount + "✗" : ""} ${warnsCount > 0 ? warnsCount + "⚠" : ""}`.trim();
  const kpiCorAlertas: "red" | "amber" | "green" =
    errosCount > 0 ? "red" : warnsCount > 0 ? "amber" : "green";
  const jaCalculou = cenario.remuneracoes.length > 0;
  const podePublicar = editavel && errosCount === 0;
  const dirty = cenario.parametrosDirty;

  const paramsEfetivos =
    (cenario.parametrosOverride as Record<string, unknown> | null) ??
    (cenario.premissa.parametros as Record<string, unknown>);

  const headerId = `coluna-header-${slot}-${cenario.id}`;
  const totalLabel = jaCalculou ? brl(totalPacote, true) : "—";

  // Banner APPLIED — formata data localizada PT-BR.
  const aplicadoEmStr = (() => {
    const d = cenario.aplicadoEm;
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString("pt-BR");
    } catch {
      return null;
    }
  })();

  return (
    <Card className="flex flex-col">
      {/* Sticky compacto — aparece quando header full sai da viewport */}
      <StickyHeaderColuna
        targetId={headerId}
        slot={slot}
        nome={cenario.nome}
        totalLabel={totalLabel}
        alertasLabel={kpiValorAlertas}
        alertasCor={kpiCorAlertas}
        cenarioId={cenario.id}
        dirty={dirty}
        jaCalculou={jaCalculou}
        editavel={editavel}
      />

      {/* Banner APPLIED — substitui visualmente o stepper "tudo done" */}
      {isApplied && aplicadoEmStr && (
        <div className="px-5 py-2 bg-mint-50 border-b border-mint-200 inline-flex items-center gap-2 text-xs text-mint-800">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>
            Versão final salva em <strong>{aplicadoEmStr}</strong> · v{cenario.versao}
          </span>
        </div>
      )}

      {/* Header full */}
      <CardHeader id={headerId} className="flex-col items-stretch gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={slot === "a" ? "navy" : "info"} size="sm">
                Coluna {slot.toUpperCase()}
              </Badge>
              <ModeloBadge modelo={cenario.modelo} />
              <StatusBadge status={cenario.status} />
              {dirty && (
                <Badge variant="warning" size="sm" title="Parâmetros ou variáveis globais alterados — recalcule">
                  ● alterado
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
            {jaCalculou && (
              <ExplicacaoDialog
                cenarioNome={cenario.nome}
                paragrafos={gerarNarrativa({
                  nome: cenario.nome,
                  modelo: cenario.modelo as "ATUAL" | "NOVO",
                  ano: cenario.ano,
                  periodoRotulo: `Anual ${cenario.ano}`,
                  premissaNome: cenario.premissa.nome,
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

        {/* KPIs OU empty-state quando ainda não calculou */}
        {jaCalculou ? (
          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-neutral-100">
            <Kpi label="Total anual" valor={brl(totalPacote, true)} />
            <Kpi label="Sócios" valor={String(sociosUnicos.size)} />
            <KpiAlertasButton
              valor={kpiValorAlertas}
              cor={kpiCorAlertas}
              cenarioNome={cenario.nome}
              alertasPorSocio={alertasPorSocio}
              totalCount={totalAlertas}
            />
          </div>
        ) : editavel ? (
          <div className="mt-2 pt-3 border-t border-neutral-100 flex flex-col items-center gap-2 text-center py-2">
            <Calculator className="h-5 w-5 text-peri-600" />
            <p className="text-xs text-neutral-600 max-w-xs">
              Cenário recém-criado — clique em <strong>Calcular</strong> para gerar a remuneração anual.
            </p>
            <RecalcularButton cenarioId={cenario.id} dirty={dirty} jaCalculou={jaCalculou} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-neutral-100">
            <Kpi label="Total anual" valor="—" />
            <Kpi label="Sócios" valor={String(cenario.classificacoes.length)} />
            <Kpi label="Alertas" valor="—" />
          </div>
        )}
      </CardHeader>

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

      {/* Ações — Recalcular + Salvar versão (somente DRAFT já calculado) */}
      <div className="px-5 py-3 flex items-center gap-2 flex-wrap mt-auto">
        {editavel && jaCalculou && (
          <RecalcularButton
            cenarioId={cenario.id}
            dirty={dirty}
            jaCalculou={jaCalculou}
          />
        )}
        {editavel && jaCalculou && (
          <ConfirmDialog
            trigger={
              <Tooltip
                side="top"
                content={
                  errosCount > 0
                    ? `Resolva os ${errosCount} alerta(s) ERROR antes de salvar.`
                    : "Salva uma versão final do cenário (snapshot imutável). Outras versões finais do mesmo modelo+ano são arquivadas automaticamente."
                }
              >
                <Button variant="primary" size="sm" disabled={!podePublicar}>
                  <FileCheck2 className="h-3.5 w-3.5" />
                  Salvar versão
                </Button>
              </Tooltip>
            }
            title="Salvar versão final deste cenário?"
            description={
              errosCount > 0
                ? `Há ${errosCount} alerta(s) ERROR. Resolva antes de salvar.`
                : "O cálculo será congelado como versão final (snapshot imutável). Outras versões finais deste modelo/ano serão arquivadas."
            }
            action={publicarAction}
            hiddenFields={{ cenarioId: cenario.id }}
            confirmLabel="Salvar versão"
            disabled={!podePublicar}
          />
        )}
        {!editavel && jaCalculou && !isApplied && (
          <span className="text-xs text-neutral-500 inline-flex items-center gap-1.5">
            <ListTree className="h-3 w-3" /> Somente leitura.
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
