"use client";
// Sheet lateral para sobrescrever a originação anual por sócio dentro do cenário.
// Lê os valores oficiais de OriginacaoPeriodo (somados no ano) e permite
// editá-los apenas no cenário atual, sem alterar os números base de /resultados.
//
// Recursos:
//   - Templates: Otimista (+15%), Pessimista (-15%)
//   - Stress test: -20% / +20% (apenas sobre o valor "em edição")
//   - Reset por sócio + Reset geral
//   - Preview de impacto baseado na taxa de comissão da premissa
import * as React from "react";
import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Coins,
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
import { atualizarOriginacaoOverrideAction } from "@/app/simulacao/acoes";

export interface OriginacaoSocioBase {
  socioId: string;
  nome: string;
  cargo: string;
  publico: string;
  /** Valor anual oficial (somatório de OriginacaoPeriodo do ano). */
  anualDefault: number;
  /** Override atual no cenário (se houver). */
  anualOverride?: number;
}

export function OriginacaoSheet({
  cenarioId,
  cenarioNome,
  ano,
  taxaComissao,
  socios,
  trigger,
}: {
  cenarioId: string;
  cenarioNome: string;
  ano: number;
  /** Taxa de comissão da premissa NOVA (0..1). */
  taxaComissao: number;
  socios: OriginacaoSocioBase[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" title="Editar originação por sócio">
            <Coins className="h-3.5 w-3.5" /> Originação
          </Button>
        )}
      </DialogTrigger>
      {open && (
        <OriginacaoSheetBody
          cenarioId={cenarioId}
          cenarioNome={cenarioNome}
          ano={ano}
          taxaComissao={taxaComissao}
          socios={socios}
          onClose={() => setOpen(false)}
        />
      )}
    </Dialog>
  );
}

interface BodyProps {
  cenarioId: string;
  cenarioNome: string;
  ano: number;
  taxaComissao: number;
  socios: OriginacaoSocioBase[];
  onClose: () => void;
}

function OriginacaoSheetBody({
  cenarioId,
  cenarioNome,
  ano,
  taxaComissao,
  socios,
  onClose,
}: BodyProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  type Estado = Record<string, number>;
  const inicial = useMemo<Estado>(() => {
    const e: Estado = {};
    for (const s of socios) e[s.socioId] = s.anualOverride ?? s.anualDefault;
    return e;
  }, [socios]);
  const [estado, setEstado] = useState<Estado>(inicial);

  function aplicarTemplate(mult: number, label: string) {
    const novo: Estado = {};
    for (const s of socios) novo[s.socioId] = s.anualDefault * mult;
    setEstado(novo);
    toast.info(`Template "${label}" aplicado — clique Aplicar para salvar.`);
  }

  function aplicarStress(mult: number) {
    setEstado((cur) => {
      const novo: Estado = {};
      for (const [id, v] of Object.entries(cur)) novo[id] = v * mult;
      return novo;
    });
  }

  function resetarSocio(socioId: string) {
    const s = socios.find((x) => x.socioId === socioId);
    if (!s) return;
    setEstado((cur) => ({ ...cur, [socioId]: s.anualDefault }));
  }

  function resetarTudo() {
    setEstado(inicial);
    toast.info("Valores restaurados — clique Aplicar para limpar overrides salvos.");
  }

  const totalDefault = socios.reduce((acc, s) => acc + s.anualDefault, 0);
  const totalNovo = socios.reduce((acc, s) => acc + (estado[s.socioId] ?? s.anualDefault), 0);
  const comissaoDefault = totalDefault * taxaComissao;
  const comissaoNova = totalNovo * taxaComissao;
  const deltaComissao = comissaoNova - comissaoDefault;

  const temAlgumOverride = socios.some((s) => {
    const v = estado[s.socioId] ?? s.anualDefault;
    return Math.abs(v - s.anualDefault) > 0.5;
  });

  function aplicar() {
    start(async () => {
      const override: Record<string, number> = {};
      for (const s of socios) {
        const v = estado[s.socioId];
        if (v == null) continue;
        if (Math.abs(v - s.anualDefault) > 0.5) override[s.socioId] = Math.max(0, v);
      }
      const fd = new FormData();
      fd.set("cenarioId", cenarioId);
      fd.set("override", JSON.stringify(Object.keys(override).length > 0 ? override : null));
      await atualizarOriginacaoOverrideAction(fd);
      onClose();
      router.refresh();
    });
  }

  return (
    <DialogContent
      hideClose
      className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-screen w-full max-w-lg rounded-none border-r-0 p-0 flex flex-col"
    >
      <div className="flex items-start justify-between p-4 border-b border-neutral-200">
        <div className="min-w-0">
          <DialogTitle className="inline-flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-600" />
            Comissão de Originação
          </DialogTitle>
          <DialogDescription className="text-xs mt-1 truncate">
            <strong className="font-medium">{cenarioNome}</strong> · ano{" "}
            <strong className="font-medium">{ano}</strong> · taxa{" "}
            <strong className="font-medium">{(taxaComissao * 100).toFixed(1)}%</strong>
          </DialogDescription>
        </div>
        <DialogClose
          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </DialogClose>
      </div>

      {/* Templates + Stress */}
      <div className="p-4 border-b border-neutral-200 space-y-3 bg-neutral-50/40">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1.5 inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Templates
            <Tooltip content="Aplica um multiplicador uniforme ao valor anual oficial de cada sócio.">
              <HelpCircle className="h-3 w-3 text-neutral-400" />
            </Tooltip>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => aplicarTemplate(1.15, "Otimista")}>
              Otimista (+15%)
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => aplicarTemplate(1.0, "Realista")}>
              Realista
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => aplicarTemplate(0.85, "Pessimista")}>
              Pessimista (-15%)
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => aplicarTemplate(0.7, "Crise")}>
              Crise (-30%)
            </Button>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1.5 inline-flex items-center gap-1">
            Stress test
            <Tooltip content="Aplica um ajuste sobre os valores atuais no painel.">
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

      {/* Lista de sócios */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {socios.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-8">
            Nenhum sócio elegível à comissão de originação neste cenário.
          </p>
        ) : (
          socios.map((s) => {
            const v = estado[s.socioId] ?? s.anualDefault;
            const desvio = s.anualDefault > 0 ? (v - s.anualDefault) / s.anualDefault : 0;
            return (
              <div key={s.socioId} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-navy-900 text-sm truncate">{s.nome}</div>
                    <div className="text-[10px] text-neutral-500 truncate">{s.cargo}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetarSocio(s.socioId)}
                    className="text-[10px] text-neutral-500 hover:text-peri-700 inline-flex items-center gap-1"
                    title="Resetar este sócio ao default"
                  >
                    <RotateCcw className="h-2.5 w-2.5" /> reset
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  <label className="text-[11px] font-medium text-navy-900">Originação anual (R$)</label>
                  <Input
                    type="number"
                    step={1000}
                    value={Math.round(v)}
                    onChange={(e) =>
                      setEstado((c) => ({ ...c, [s.socioId]: Number(e.target.value) || 0 }))
                    }
                    className="text-right tabular-nums"
                  />
                  <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
                    <span className="text-neutral-500">
                      default: <span className="tabular-nums">{brl(s.anualDefault, true)}</span>
                      {Math.abs(desvio) > 0.005 && (
                        <span className={cn("ml-1", desvio > 0 ? "text-mint-700" : "text-red-700")}>
                          · {desvio >= 0 ? "+" : ""}{(desvio * 100).toFixed(1)}%
                        </span>
                      )}
                    </span>
                    <Badge variant="info" size="sm" title="Comissão estimada para este sócio">
                      comissão: {brl(v * taxaComissao, true)}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Preview de impacto */}
      {socios.length > 0 && (
        <div className="p-4 border-t border-neutral-200 bg-amber-50/40">
          <div className="text-[10px] uppercase tracking-wider text-amber-800 font-semibold mb-1 inline-flex items-center gap-1">
            Impacto na comissão total
            <Tooltip content="Soma das comissões de todos os sócios = Σ(originação × taxa).">
              <HelpCircle className="h-3 w-3 text-amber-700" />
            </Tooltip>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-neutral-500">Default</div>
              <div className="font-semibold tabular-nums text-navy-900">{brl(comissaoDefault, true)}</div>
            </div>
            <div>
              <div className="text-neutral-500">Cenário</div>
              <div className="font-semibold tabular-nums text-navy-900">{brl(comissaoNova, true)}</div>
            </div>
            <div>
              <div className="text-neutral-500">Δ</div>
              <div
                className={cn(
                  "font-semibold tabular-nums inline-flex items-center gap-1",
                  deltaComissao > 0 ? "text-mint-700" : deltaComissao < 0 ? "text-red-700" : "text-neutral-700",
                )}
              >
                {deltaComissao > 0 ? <TrendingUp className="h-3 w-3" /> : deltaComissao < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                {deltaComissao >= 0 ? "+" : ""}{brl(deltaComissao, true)}
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
