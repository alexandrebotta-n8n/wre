"use client";
// Sheet lateral aberto pelo botão "📊 Insumos" no header do cenário.
// Permite editar LL e Funding Variável por unidade, com:
// - templates pré-salvos (otimista/pessimista/crise)
// - stress-test (-20%/-10%/+10%/+20%)
// - validação contra histórico (chip com média/range)
// - preview de impacto antes de aplicar
// - reset por linha + reset geral
import * as React from "react";
import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart3,
  X,
  RotateCcw,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TEMPLATES_INSUMOS, type TemplateInsumos } from "@/lib/insumos/templates";
import { atualizarInsumosOverrideAction } from "@/app/simulacao/acoes";

export interface InsumosUnidadeBase {
  unidadeId: string;
  unidadeCodigo: string;
  unidadeNome: string;
  isMatriz: boolean;
  /** LL oficial do período (do ResultadoPeriodo). */
  llDefault: number;
  /** Funding oficial. */
  fundingDefault: number | null;
  /** Override atual no cenário (se houver). */
  llOverride?: number;
  fundingOverride?: number;
  /** Histórico para validação. */
  hist: { llMedia: number; llMin: number; llMax: number; amostras: number; ultimoPeriodo: string | null };
}

export function InsumosSheet({
  cenarioId,
  cenarioNome,
  periodoRotulo,
  totalAtual,
  unidades,
  trigger,
}: {
  cenarioId: string;
  cenarioNome: string;
  periodoRotulo: string;
  /** Total dos pacotes na última apuração (para preview de impacto). */
  totalAtual: number;
  unidades: InsumosUnidadeBase[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" title="Editar insumos financeiros do cenário">
            <BarChart3 className="h-3.5 w-3.5" /> Insumos
          </Button>
        )}
      </DialogTrigger>
      {/* Mount conditionally — abrindo, sempre estado fresco. */}
      {open && (
        <InsumosSheetBody
          cenarioId={cenarioId}
          cenarioNome={cenarioNome}
          periodoRotulo={periodoRotulo}
          totalAtual={totalAtual}
          unidades={unidades}
          onClose={() => setOpen(false)}
        />
      )}
    </Dialog>
  );
}

interface InsumosBodyProps {
  cenarioId: string;
  cenarioNome: string;
  periodoRotulo: string;
  totalAtual: number;
  unidades: InsumosUnidadeBase[];
  onClose: () => void;
}

function InsumosSheetBody({
  cenarioId,
  cenarioNome,
  periodoRotulo,
  totalAtual,
  unidades,
  onClose,
}: InsumosBodyProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // Estado local: para cada unidade, o LL e o funding "em edição"
  type Estado = Record<string, { ll: number; fv: number | null }>;
  const inicial = useMemo<Estado>(() => {
    const e: Estado = {};
    for (const u of unidades) {
      e[u.unidadeId] = {
        ll: u.llOverride ?? u.llDefault,
        fv: u.fundingOverride ?? u.fundingDefault,
      };
    }
    return e;
  }, [unidades]);
  const [estado, setEstado] = useState<Estado>(inicial);

  function aplicarTemplate(t: TemplateInsumos) {
    const novo: Estado = {};
    for (const u of unidades) {
      novo[u.unidadeId] = {
        ll: u.llDefault * t.multiplicadorLL,
        fv:
          u.fundingDefault != null
            ? u.fundingDefault * (t.multiplicadorFunding ?? t.multiplicadorLL)
            : null,
      };
    }
    setEstado(novo);
    toast.info(`Template "${t.nome}" aplicado — clique Aplicar para salvar.`);
  }

  function aplicarStress(mult: number) {
    setEstado((cur) => {
      const novo: Estado = {};
      for (const [id, v] of Object.entries(cur)) {
        novo[id] = { ll: v.ll * mult, fv: v.fv != null ? v.fv * mult : null };
      }
      return novo;
    });
  }

  function resetarUnidade(unidadeId: string) {
    const u = unidades.find((x) => x.unidadeId === unidadeId);
    if (!u) return;
    setEstado((cur) => ({ ...cur, [unidadeId]: { ll: u.llDefault, fv: u.fundingDefault } }));
  }

  function resetarTudo() {
    setEstado(inicial);
    // Marca como "sem override" — mas só persiste no salvar
    toast.info("Valores restaurados ao default — clique Aplicar para limpar overrides salvos.");
  }

  // Calcular Δ% médio sobre o LL para preview de impacto.
  // Aproximação: como o total dos pacotes é função quase-linear do LL agregado,
  // estimamos o novo total proporcionalmente ao Δ% médio do LL.
  const llTotalDefault = unidades.reduce((acc, u) => acc + u.llDefault, 0);
  const llTotalNovo = unidades.reduce((acc, u) => acc + (estado[u.unidadeId]?.ll ?? u.llDefault), 0);
  const deltaPct = llTotalDefault > 0 ? (llTotalNovo - llTotalDefault) / llTotalDefault : 0;
  const totalEstimado = totalAtual * (1 + deltaPct);
  const deltaTotal = totalEstimado - totalAtual;

  // Estado tem alguma diferença vs default oficial? Se tudo == default, salvaremos null.
  const temAlgumOverride = unidades.some((u) => {
    const e = estado[u.unidadeId];
    if (!e) return false;
    return (
      Math.abs(e.ll - u.llDefault) > 0.5 ||
      (u.fundingDefault != null && e.fv != null && Math.abs(e.fv - u.fundingDefault) > 0.5) ||
      (u.fundingDefault == null && e.fv != null) ||
      (u.fundingDefault != null && e.fv == null)
    );
  });

  function aplicar() {
    start(async () => {
      // Construir override: incluir só unidades cujo estado difere do default.
      const override: Record<string, { lucroLiquido?: number; fundingVariavel?: number }> = {};
      for (const u of unidades) {
        const e = estado[u.unidadeId];
        if (!e) continue;
        const entry: { lucroLiquido?: number; fundingVariavel?: number } = {};
        if (Math.abs(e.ll - u.llDefault) > 0.5) entry.lucroLiquido = e.ll;
        if (u.fundingDefault == null && e.fv != null) entry.fundingVariavel = e.fv;
        else if (u.fundingDefault != null && e.fv != null && Math.abs(e.fv - u.fundingDefault) > 0.5) {
          entry.fundingVariavel = e.fv;
        }
        if (entry.lucroLiquido != null || entry.fundingVariavel != null) {
          override[u.unidadeId] = entry;
        }
      }
      const fd = new FormData();
      fd.set("cenarioId", cenarioId);
      fd.set("override", JSON.stringify(Object.keys(override).length > 0 ? override : null));
      await atualizarInsumosOverrideAction(fd);
      onClose();
      router.refresh();
    });
  }

  return (
    <DialogContent
      hideClose
      className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-screen w-full max-w-lg rounded-none border-r-0 p-0 flex flex-col"
    >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-neutral-200">
          <div className="min-w-0">
            <DialogTitle className="inline-flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-peri-600" />
              Insumos financeiros
            </DialogTitle>
            <DialogDescription className="text-xs mt-1 truncate">
              <strong className="font-medium">{cenarioNome}</strong> · período{" "}
              <strong className="font-medium">{periodoRotulo}</strong>
            </DialogDescription>
          </div>
          <DialogClose className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100" aria-label="Fechar">
            <X className="h-4 w-4" />
          </DialogClose>
        </div>

        {/* Templates + Stress test */}
        <div className="p-4 border-b border-neutral-200 space-y-3 bg-neutral-50/40">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1.5 inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Templates
              <Tooltip content="Aplica um multiplicador uniforme em todas as unidades a partir dos valores oficiais do período.">
                <HelpCircle className="h-3 w-3 text-neutral-400" />
              </Tooltip>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES_INSUMOS.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => aplicarTemplate(t)}
                  title={t.descricao}
                >
                  {t.nome}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1.5 inline-flex items-center gap-1">
              Stress test
              <Tooltip content="Aplica um ajuste percentual aos valores atualmente no painel (não aos defaults).">
                <HelpCircle className="h-3 w-3 text-neutral-400" />
              </Tooltip>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" variant="outline" size="sm" onClick={() => aplicarStress(0.8)}>
                <TrendingDown className="h-3 w-3" /> -20%
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => aplicarStress(0.9)}>
                <TrendingDown className="h-3 w-3" /> -10%
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => aplicarStress(1.1)}>
                <TrendingUp className="h-3 w-3" /> +10%
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => aplicarStress(1.2)}>
                <TrendingUp className="h-3 w-3" /> +20%
              </Button>
            </div>
          </div>
        </div>

        {/* Lista de unidades */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {unidades.map((u) => {
            const e = estado[u.unidadeId] ?? { ll: u.llDefault, fv: u.fundingDefault };
            return (
              <UnidadeBlock
                key={u.unidadeId}
                unidade={u}
                ll={e.ll}
                fv={e.fv}
                onChangeLL={(v) => setEstado((c) => ({ ...c, [u.unidadeId]: { ...c[u.unidadeId], ll: v } }))}
                onChangeFV={(v) => setEstado((c) => ({ ...c, [u.unidadeId]: { ...c[u.unidadeId], fv: v } }))}
                onReset={() => resetarUnidade(u.unidadeId)}
              />
            );
          })}
          {unidades.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-8">
              Nenhuma unidade com resultado neste período. Cadastre em{" "}
              <a href="/resultados" className="text-peri-700 hover:underline">/resultados</a>.
            </p>
          )}
        </div>

        {/* Preview de impacto */}
        {totalAtual > 0 && (
          <div className="p-4 border-t border-neutral-200 bg-peri-50/40">
            <div className="text-[10px] uppercase tracking-wider text-peri-800 font-semibold mb-1 inline-flex items-center gap-1">
              Preview de impacto
              <Tooltip content="Estimativa proporcional baseada na variação do LL agregado. O impacto real é calculado pelo engine ao recalcular.">
                <HelpCircle className="h-3 w-3 text-peri-700" />
              </Tooltip>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-neutral-500">Total atual</div>
                <div className="font-semibold tabular-nums text-navy-900">{brl(totalAtual, true)}</div>
              </div>
              <div>
                <div className="text-neutral-500">Estimado</div>
                <div className="font-semibold tabular-nums text-navy-900">{brl(totalEstimado, true)}</div>
              </div>
              <div>
                <div className="text-neutral-500">Δ</div>
                <div
                  className={cn(
                    "font-semibold tabular-nums inline-flex items-center gap-1",
                    deltaTotal > 0 ? "text-mint-700" : deltaTotal < 0 ? "text-red-700" : "text-neutral-700",
                  )}
                >
                  {deltaTotal > 0 ? <TrendingUp className="h-3 w-3" /> : deltaTotal < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                  {deltaTotal >= 0 ? "+" : ""}{brl(deltaTotal, true)}
                  <span className="text-[10px] opacity-70">
                    ({deltaPct >= 0 ? "+" : ""}{(deltaPct * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer ações */}
        <div className="p-4 border-t border-neutral-200 flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={resetarTudo}>
            <RotateCcw className="h-3.5 w-3.5" /> Resetar p/ default
          </Button>
          <div className="flex items-center gap-2">
            {!temAlgumOverride && (
              <span className="text-xs text-neutral-500 inline-flex items-center gap-1">
                <Check className="h-3 w-3 text-mint-600" /> sem alterações
              </span>
            )}
            <Button type="button" variant="primary" size="sm" disabled={pending} onClick={aplicar}>
              {pending ? "Salvando…" : "Aplicar e marcar p/ recalcular"}
            </Button>
          </div>
        </div>
      </DialogContent>
  );
}

function UnidadeBlock({
  unidade: u,
  ll,
  fv,
  onChangeLL,
  onChangeFV,
  onReset,
}: {
  unidade: InsumosUnidadeBase;
  ll: number;
  fv: number | null;
  onChangeLL: (v: number) => void;
  onChangeFV: (v: number | null) => void;
  onReset: () => void;
}) {
  const desvio = u.llDefault > 0 ? (ll - u.llDefault) / u.llDefault : 0;
  const foraDoRange =
    u.hist.amostras > 0 && (ll < u.hist.llMin * 0.95 || ll > u.hist.llMax * 1.05);
  const dentroMedia = u.hist.amostras > 0 && Math.abs((ll - u.hist.llMedia) / Math.max(u.hist.llMedia, 1)) < 0.1;

  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <span className="font-semibold text-navy-900 text-sm">{u.unidadeNome}</span>
          {u.isMatriz && <Badge variant="navy" size="sm">matriz</Badge>}
          <span className="text-[10px] text-neutral-500">cód. {u.unidadeCodigo}</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] text-neutral-500 hover:text-peri-700 inline-flex items-center gap-1"
          title="Resetar esta unidade ao default"
        >
          <RotateCcw className="h-2.5 w-2.5" /> reset
        </button>
      </div>

      {/* LL */}
      <div className="mt-3 space-y-1">
        <label className="text-[11px] font-medium text-navy-900 inline-flex items-center gap-1">
          Lucro Líquido
          <Tooltip content="LL após impostos, despesas e custos — antes da remuneração de sócios. Override é apenas para este cenário.">
            <HelpCircle className="h-3 w-3 text-neutral-400" />
          </Tooltip>
        </label>
        <Input
          type="number"
          step={1000}
          value={Math.round(ll)}
          onChange={(e) => onChangeLL(Number(e.target.value) || 0)}
          className="text-right tabular-nums"
        />
        <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
          <span className="text-neutral-500">
            default: <span className="tabular-nums">{brl(u.llDefault, true)}</span>
            {Math.abs(desvio) > 0.005 && (
              <span className={cn("ml-1", desvio > 0 ? "text-mint-700" : "text-red-700")}>
                · {desvio >= 0 ? "+" : ""}{(desvio * 100).toFixed(1)}%
              </span>
            )}
          </span>
          <HistoricoChip
            amostras={u.hist.amostras}
            min={u.hist.llMin}
            max={u.hist.llMax}
            media={u.hist.llMedia}
            ultimoPeriodo={u.hist.ultimoPeriodo}
            severidade={foraDoRange ? "warning" : dentroMedia ? "ok" : "info"}
          />
        </div>
      </div>

      {/* Funding */}
      <div className="mt-3 space-y-1">
        <label className="text-[11px] font-medium text-navy-900 inline-flex items-center gap-1">
          Funding Variável
          <Tooltip content="LL já líquido de pró-labore + remuneração de gestão + remuneração de fundadores. Opcional — se vazio, o engine deduz do LL.">
            <HelpCircle className="h-3 w-3 text-neutral-400" />
          </Tooltip>
        </label>
        <Input
          type="number"
          step={1000}
          value={fv == null ? "" : Math.round(fv)}
          onChange={(e) => onChangeFV(e.target.value === "" ? null : Number(e.target.value) || 0)}
          placeholder={u.fundingDefault == null ? "(vazio · auto)" : ""}
          className="text-right tabular-nums"
        />
        {u.fundingDefault != null && (
          <div className="text-[11px] text-neutral-500">
            default: <span className="tabular-nums">{brl(u.fundingDefault, true)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoricoChip({
  amostras,
  min,
  max,
  media,
  ultimoPeriodo,
  severidade,
}: {
  amostras: number;
  min: number;
  max: number;
  media: number;
  ultimoPeriodo: string | null;
  severidade: "ok" | "info" | "warning";
}) {
  if (amostras === 0) {
    return <span className="text-[10px] text-neutral-400">sem histórico</span>;
  }
  const corMap = {
    ok: "bg-mint-50 text-mint-800 ring-mint-200",
    info: "bg-peri-50 text-peri-800 ring-peri-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200",
  };
  const tooltip = `Últimos ${amostras} períodos (até ${ultimoPeriodo}): mín ${brl(min, true)} · média ${brl(media, true)} · máx ${brl(max, true)}`;
  return (
    <Tooltip content={tooltip}>
      <span
        className={cn(
          "text-[10px] tabular-nums px-1.5 py-0.5 rounded ring-1 ring-inset cursor-help inline-flex items-center gap-0.5",
          corMap[severidade],
        )}
      >
        hist: {brl(media, true)}
      </span>
    </Tooltip>
  );
}
