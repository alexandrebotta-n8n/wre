// Server component: header da coluna + KPIs + stepper + painel de parâmetros
// + ações (calcular, publicar, editar classificações).
import Link from "next/link";
import { Replace, RotateCcw, FileCheck2, ListTree } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, ModeloBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { brl } from "@/lib/format";
import { Stepper, type Step } from "@/components/cenario/stepper";
import { calcularAction, publicarAction } from "@/app/simulacao/acoes";
import { PainelParametros } from "./painel-parametros";
import { DrawerClassificacoes } from "./drawer-classificacoes";
import { SalvarPremissaDialog } from "./salvar-premissa-dialog";
import type { CenarioCompleto, AreaOption } from "./types";

export function ColunaCenario({
  slot,
  cenario,
  outroCenarioId,
  periodoId,
  areas,
  podeMutar,
  modoNome,
}: {
  slot: "a" | "b";
  cenario: CenarioCompleto;
  outroCenarioId: string;
  periodoId: string;
  areas: AreaOption[];
  podeMutar: boolean;
  modoNome: "completo" | "iniciais";
}) {
  void modoNome; // pode ser usado em futuras adições
  const isDraft = cenario.status === "DRAFT";
  const editavel = podeMutar && isDraft;
  const totalPacote = cenario.remuneracoes.reduce((acc, r) => acc + r.total, 0);
  const errosCount = cenario.remuneracoes.reduce(
    (acc, r) => acc + ((r.alertas as string[] | null) ?? []).filter((a) => a.includes("[ERROR]")).length,
    0,
  );
  const warnsCount = cenario.remuneracoes.reduce(
    (acc, r) => acc + ((r.alertas as string[] | null) ?? []).filter((a) => a.includes("[WARNING]")).length,
    0,
  );
  const jaCalculou = cenario.remuneracoes.length > 0;
  const podePublicar = editavel && jaCalculou && errosCount === 0;
  const dirty = cenario.parametrosDirty;

  // Stepper
  const steps: Step[] = [
    { label: "Classificar", description: `${cenario.classificacoes.length} sócios`, state: "done" },
    {
      label: "Calcular",
      description: dirty ? "params alterados" : jaCalculou ? "ok" : "pendente",
      state: jaCalculou && !dirty ? "done" : "current",
    },
    {
      label: "Revisar",
      description: errosCount > 0 ? `${errosCount} erro(s)` : "alertas ok",
      state: jaCalculou ? (errosCount > 0 ? "current" : "done") : "pending",
    },
    {
      label: "Publicar",
      description: cenario.status === "APPLIED" ? "publicado" : "snapshot final",
      state:
        cenario.status === "APPLIED"
          ? "done"
          : jaCalculou && errosCount === 0
          ? "current"
          : "pending",
    },
  ];

  // URL pra trocar essa coluna por outro cenário (abre drawer)
  const trocarHref = (() => {
    const sp = new URLSearchParams();
    if (outroCenarioId) sp.set(slot === "a" ? "b" : "a", outroCenarioId);
    if (periodoId) sp.set("periodoId", periodoId);
    sp.set("drawer", "1");
    return `/simulacao?${sp.toString()}`;
  })();

  // Parâmetros efetivos = override OU premissa (vamos exibir o que está em uso)
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
                <Badge variant="warning" size="sm" title="Parâmetros alterados — recalcule">
                  ● alterado
                </Badge>
              )}
            </div>
            <CardTitle className="mt-2 text-base truncate">{cenario.nome}</CardTitle>
            <CardDescription>
              baseada em <strong>{cenario.premissa.nome}</strong> · ano {cenario.ano} · v{cenario.versao}
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={trocarHref}>
              <Replace className="h-3.5 w-3.5" /> Trocar
            </Link>
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-neutral-100">
          <Kpi label="Total" valor={jaCalculou ? brl(totalPacote, true) : "—"} />
          <Kpi label="Pacotes" valor={String(cenario.remuneracoes.length)} />
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
        />
      </div>

      {/* Ações */}
      <div className="px-5 py-3 flex items-center gap-2 flex-wrap mt-auto">
        {editavel && (
          <>
            <form action={calcularAction}>
              <input type="hidden" name="cenarioId" value={cenario.id} />
              <input type="hidden" name="periodoId" value={periodoId} />
              <Button
                type="submit"
                variant={dirty ? "primary" : "secondary"}
                size="sm"
                disabled={!periodoId}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {jaCalculou ? "Recalcular" : "Calcular"}
              </Button>
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
              <Button variant="primary" size="sm" disabled={!podePublicar}>
                <FileCheck2 className="h-3.5 w-3.5" /> Publicar
              </Button>
            }
            title="Publicar este cenário?"
            description={
              errosCount > 0
                ? `Há ${errosCount} alerta(s) ERROR. Resolva antes de publicar.`
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
