"use client";
// Sticky header compacto da ColunaCenario. Aparece quando o header full sai
// da viewport (passa por baixo do nav do app), some quando volta.
//
// **Sem ações** — só contexto: badge slot + nome + total + alertas badge.
// O botão Recalcular vive APENAS no header full (action area) — evitar
// duplicação foi pedido explícito do usuário (round 4.x).
//
// IntersectionObserver com `rootMargin: "-56px 0px 0px 0px"`: encolhe o topo
// do root em 56px (altura do nav app `h-14`). Sticky vira visível quando o
// header full passa pra cima dessa linha — i.e. quando rola e some sob o nav.
//
// Como ColunaCenario é Server Component, observamos o header full via
// document.getElementById (evita criar wrapper client). Z-index 20 — Radix
// overlays ficam acima (z-50).
import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";

export interface StickyHeaderColunaProps {
  /** ID do header full a ser observado. */
  targetId: string;
  slot: "a" | "b";
  nome: string;
  totalLabel: string;
  alertasLabel: string;
  alertasCor: "red" | "amber" | "green";
}

export function StickyHeaderColuna(props: StickyHeaderColunaProps) {
  const [visivel, setVisivel] = React.useState(false);

  React.useEffect(() => {
    const el = document.getElementById(props.targetId);
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisivel(!entry.isIntersecting),
      // Encolhe o topo do root 56px (altura do nav app). Sticky aparece quando
      // o header full sai por cima desse limite — i.e. rolou pra baixo.
      { rootMargin: "-56px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [props.targetId]);

  const corClasse =
    props.alertasCor === "red"
      ? "bg-red-50 text-red-700 border-red-200"
      : props.alertasCor === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-mint-50 text-mint-700 border-mint-200";

  return (
    <div
      className={
        "sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-neutral-200 px-4 py-2 " +
        "flex items-center gap-3 min-w-0 transition-opacity " +
        (visivel ? "opacity-100" : "opacity-0 pointer-events-none h-0 py-0 border-0 overflow-hidden")
      }
    >
      <Badge variant={props.slot === "a" ? "navy" : "info"} size="sm">
        {props.slot.toUpperCase()}
      </Badge>
      <span className="font-semibold text-navy-900 text-sm truncate min-w-0 flex-1">
        {props.nome}
      </span>

      {/* Total anual com tooltip explicando o que representa */}
      <Tooltip
        side="bottom"
        content={
          <>
            <strong>Total anual</strong> = soma de toda a remuneração paga aos sócios no ano:
            pró-labore, remuneração de gestão, blocos A/B/C (Modelo NOVO) ou distribuição de
            lucros (Modelo ATUAL), créditos interunidades, comissão de originação, funding
            fundadores e prêmios. Não inclui despesas operacionais da firma.
          </>
        }
      >
        <span className="text-xs tabular-nums font-semibold text-navy-900 whitespace-nowrap hidden sm:inline-flex items-center gap-1 cursor-help">
          {props.totalLabel}
          <HelpCircle className="h-3 w-3 text-neutral-400" />
        </span>
      </Tooltip>

      {/* Alertas + help */}
      <Tooltip
        side="bottom"
        content={
          <>
            <strong>Alertas</strong>: verificações automáticas do cálculo.
            <br />✓ = tudo ok.
            <br />✗ = ERROR (bloqueia salvar versão).
            <br />⚠ = WARNING (informativo).
          </>
        }
      >
        <span
          className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded border ${corClasse} whitespace-nowrap inline-flex items-center gap-1 cursor-help`}
        >
          {props.alertasLabel}
          <HelpCircle className="h-2.5 w-2.5 opacity-60" />
        </span>
      </Tooltip>
    </div>
  );
}
