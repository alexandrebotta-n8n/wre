// Server component: header da coluna + KPIs + stepper + painel de parâmetros
// + ações (calcular, salvar versão). Sem botões de classificações ou salvar
// como premissa — config vem 100% de /socios e /premissas.
// Visão ANUAL única.
import Link from "next/link";
import { Replace, FileCheck2, ListTree } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, ModeloBadge, StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { Stepper, type Step } from "@/components/cenario/stepper";
import { publicarAction } from "@/app/simulacao/acoes";
import { PainelParametros } from "./painel-parametros";
import { MenuCenario, type CenarioStatus as CenarioStatusType } from "./menu-cenario";
import { ExplicacaoDialog } from "./explicacao-dialog";
import { KpiAlertasButton } from "./kpi-alertas-button";
import { RecalcularButton } from "./recalcular-button";
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
  const editavel = podeMutar && isDraft;

  // Consolidado: total anual + contagens de alertas + alertas por sócio + valoresPorEtapa
  // (a partir do trace, agrupando por etapa sem o prefixo numérico).
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

  const calcDescricao = dirty
    ? "params alterados"
    : !jaCalculou
    ? "pendente"
    : "ok";
  const steps: Step[] = [
    {
      label: "Classificar",
      description: `${cenario.classificacoes.length} sócios`,
      state: "done",
      tooltip:
        "Define cada sócio: público (categoria), % de quotas, peso no Bloco B e originação esperada. Base do cálculo.",
    },
    {
      label: "Calcular",
      description: calcDescricao,
      state: jaCalculou && !dirty ? "done" : "current",
      tooltip:
        "Roda o engine DSF em base anual com os parâmetros atuais (override ou premissa) + variáveis globais do ano.",
    },
    {
      label: "Revisar",
      description: errosCount > 0 ? `${errosCount} erro(s)` : "alertas ok",
      state: jaCalculou ? (errosCount > 0 ? "current" : "done") : "pending",
      tooltip: "Confere alertas e valores. Erros [ERROR] bloqueiam Publicar.",
    },
    {
      label: "Salvar versão",
      description: cenario.status === "APPLIED" ? "salvo" : "versão final",
      state:
        cenario.status === "APPLIED"
          ? "done"
          : jaCalculou && errosCount === 0
          ? "current"
          : "pending",
      tooltip:
        "Salva uma versão final do cenário (snapshot imutável). Versões anteriores deste modelo+ano são arquivadas.",
    },
  ];

  const trocarHref = (() => {
    const sp = new URLSearchParams();
    if (outroCenarioId) sp.set(slot === "a" ? "b" : "a", outroCenarioId);
    sp.set("drawer", "1");
    return `/simulacao?${sp.toString()}`;
  })();

  const paramsEfetivos =
    (cenario.parametrosOverride as Record<string, unknown> | null) ??
    (cenario.premissa.parametros as Record<string, unknown>);

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
                  // Agrega por sócio (1 entrada por sócio com total + trace + alertas).
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
          <KpiAlertasButton
            valor={kpiValorAlertas}
            cor={kpiCorAlertas}
            cenarioNome={cenario.nome}
            alertasPorSocio={alertasPorSocio}
            totalCount={totalAlertas}
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
        {!editavel && jaCalculou && (
          <span className="text-xs text-neutral-500 inline-flex items-center gap-1.5">
            <ListTree className="h-3 w-3" /> Versão salva — somente leitura.
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
