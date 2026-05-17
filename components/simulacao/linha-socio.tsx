"use client";
// Linha da tabela comparativa — visão ANUAL única (sem drill-down trimestral).
// Mantém apenas as colunas Total/Δ e os totais por sócio.
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TR, TD } from "@/components/ui/data-table";
import { brl, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LinhaComparativa } from "./types";

export function LinhaSocio({
  linha: l,
  podeCompararDiff,
  singleLado,
}: {
  linha: LinhaComparativa;
  podeCompararDiff: boolean;
  singleLado?: "a" | "b" | null;
  colSpan: number;
  nomeA?: string;
  nomeB?: string;
}) {
  const positivo = l.diff > 0;
  const zero = l.diff === 0;
  const Icon = zero ? Minus : positivo ? ArrowUp : ArrowDown;
  const corClasse = zero ? "text-neutral-500" : positivo ? "text-mint-700" : "text-red-700";

  return (
    <TR>
      <TD className="px-4 py-2 font-medium text-navy-900">
        <span className="inline-flex items-center gap-1.5">
          {l.nome}
          {l.isFundador && <Badge variant="success" size="sm">fundador</Badge>}
        </span>
      </TD>
      {singleLado ? (
        <TD className="text-right tabular-nums">
          {(singleLado === "a" ? l.totalA : l.totalB) != null
            ? brl((singleLado === "a" ? l.totalA : l.totalB) as number, true)
            : "—"}
        </TD>
      ) : (
        <>
          <TD className="text-right tabular-nums">{l.totalA != null ? brl(l.totalA, true) : "—"}</TD>
          <TD className="text-right tabular-nums">{l.totalB != null ? brl(l.totalB, true) : "—"}</TD>
        </>
      )}
      {podeCompararDiff && (
        <TD className={cn("text-right tabular-nums font-medium", corClasse)}>
          <span className="inline-flex items-center gap-1 justify-end">
            <Icon className="h-3 w-3" aria-hidden />
            {positivo ? "+" : ""}
            {brl(l.diff, true)}
          </span>
        </TD>
      )}
      {podeCompararDiff && (
        <TD className={cn("text-right tabular-nums text-xs", corClasse)}>
          {l.diffPct === null ? "—" : (positivo ? "+" : "") + pct(l.diffPct)}
        </TD>
      )}
    </TR>
  );
}
