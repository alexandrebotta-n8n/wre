"use client";
// Sticky header compacto da ColunaCenario. Aparece quando o header full
// sai da viewport (IntersectionObserver), some quando ele volta.
//
// Como ColunaCenario é Server Component, observamos o header full via
// document.getElementById em vez de ref (evita criar wrapper client).
//
// Conteúdo enxuto: badge slot + nome trunc + Total + Badge Alertas +
// RecalcularButton (quando editável). Z-index 20 para passar sobre conteúdo
// da Card sem brigar com Radix overlays (z-50).
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { RecalcularButton } from "./recalcular-button";

export interface StickyHeaderColunaProps {
  /** ID do header full a ser observado. */
  targetId: string;
  slot: "a" | "b";
  nome: string;
  totalLabel: string;
  alertasLabel: string;
  alertasCor: "red" | "amber" | "green";
  cenarioId: string;
  dirty: boolean;
  jaCalculou: boolean;
  editavel: boolean;
}

export function StickyHeaderColuna(props: StickyHeaderColunaProps) {
  const [visivel, setVisivel] = React.useState(false);

  React.useEffect(() => {
    const el = document.getElementById(props.targetId);
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisivel(!entry.isIntersecting),
      { rootMargin: "0px 0px -100% 0px", threshold: 0 },
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
      <span className="text-xs tabular-nums font-semibold text-navy-900 whitespace-nowrap hidden sm:inline">
        {props.totalLabel}
      </span>
      <span
        className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded border ${corClasse} whitespace-nowrap`}
        title="Alertas"
      >
        {props.alertasLabel}
      </span>
      {props.editavel && (
        <RecalcularButton
          cenarioId={props.cenarioId}
          dirty={props.dirty}
          jaCalculou={props.jaCalculou}
        />
      )}
    </div>
  );
}
