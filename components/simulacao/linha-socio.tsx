"use client";
// Linha expansível da tabela comparativa — abre drill-down por trimestre + waterfall.
import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, Minus, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TR, TD } from "@/components/ui/data-table";
import { brl, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SocioWaterfall } from "./socio-waterfall";
import type { LinhaComparativa, TraceItem, Trimestre } from "./types";

const TRIMESTRES: Trimestre[] = [1, 2, 3, 4];

export function LinhaSocio({
  linha: l,
  podeCompararDiff,
  singleLado,
  colSpan,
  nomeA,
  nomeB,
}: {
  linha: LinhaComparativa;
  podeCompararDiff: boolean;
  singleLado?: "a" | "b" | null;
  colSpan: number;
  nomeA?: string;
  nomeB?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [foco, setFoco] = useState<"anual" | Trimestre>("anual");
  const positivo = l.diff > 0;
  const zero = l.diff === 0;
  const Icon = zero ? Minus : positivo ? ArrowUp : ArrowDown;
  const corClasse = zero ? "text-neutral-500" : positivo ? "text-mint-700" : "text-red-700";

  // Concatena traces/alertas dos 4 trimestres para a visão "anual" do waterfall.
  const traceAnualA = useMemo(
    () => Object.values(l.porTrimestreA).flatMap((d) => d?.trace ?? []) as TraceItem[],
    [l.porTrimestreA],
  );
  const traceAnualB = useMemo(
    () => Object.values(l.porTrimestreB).flatMap((d) => d?.trace ?? []) as TraceItem[],
    [l.porTrimestreB],
  );
  const alertasAnualA = useMemo(
    () => Object.values(l.porTrimestreA).flatMap((d) => d?.alertas ?? []) as string[],
    [l.porTrimestreA],
  );
  const alertasAnualB = useMemo(
    () => Object.values(l.porTrimestreB).flatMap((d) => d?.alertas ?? []) as string[],
    [l.porTrimestreB],
  );

  const temAlgumTrace = traceAnualA.length > 0 || traceAnualB.length > 0;

  // Dados do trimestre/anual focado para o waterfall.
  const focoData = (() => {
    if (foco === "anual") {
      return {
        totalA: l.totalA,
        totalB: l.totalB,
        traceA: traceAnualA,
        traceB: traceAnualB,
        alertasA: alertasAnualA,
        alertasB: alertasAnualB,
      };
    }
    const dA = l.porTrimestreA[foco];
    const dB = l.porTrimestreB[foco];
    return {
      totalA: dA?.total ?? null,
      totalB: dB?.total ?? null,
      traceA: dA?.trace ?? [],
      traceB: dB?.trace ?? [],
      alertasA: dA?.alertas ?? [],
      alertasB: dB?.alertas ?? [],
    };
  })();

  return (
    <>
      <TR className={cn(aberto && "bg-peri-50/30")}>
        <TD className="px-4 py-2 font-medium text-navy-900">
          {temAlgumTrace ? (
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              aria-expanded={aberto}
              className="inline-flex items-center gap-1.5 text-left rounded hover:text-peri-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400"
              title="Ver composição do pacote por trimestre"
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform text-neutral-400",
                  aberto && "rotate-90 text-peri-700",
                )}
                aria-hidden
              />
              {l.nome}
              {l.isFundador && <Badge variant="success" size="sm">fundador</Badge>}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 pl-5">
              {l.nome}
              {l.isFundador && <Badge variant="success" size="sm">fundador</Badge>}
            </span>
          )}
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
      {aberto && temAlgumTrace && (
        <tr>
          <td colSpan={colSpan} className="p-0">
            <DrillDownTrimestre
              linha={l}
              foco={foco}
              setFoco={setFoco}
              singleLado={singleLado ?? null}
            />
            <SocioWaterfall
              nome={l.nome}
              nomeA={nomeA}
              nomeB={nomeB}
              totalA={focoData.totalA}
              totalB={focoData.totalB}
              traceA={focoData.traceA}
              traceB={focoData.traceB}
              alertasA={focoData.alertasA}
              alertasB={focoData.alertasB}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function BotaoFoco({
  label,
  ativo,
  onClick,
}: {
  label: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 text-xs font-medium rounded ring-1 transition-colors",
        ativo
          ? "bg-peri-600 text-white ring-peri-600"
          : "bg-white text-neutral-700 ring-neutral-300 hover:ring-peri-400 hover:text-peri-700",
      )}
    >
      {label}
    </button>
  );
}

function DrillDownTrimestre({
  linha: l,
  foco,
  setFoco,
  singleLado,
}: {
  linha: LinhaComparativa;
  foco: "anual" | Trimestre;
  setFoco: (f: "anual" | Trimestre) => void;
  singleLado: "a" | "b" | null;
}) {
  const mostrarA = singleLado !== "b";
  const mostrarB = singleLado !== "a";

  return (
    <div className="bg-neutral-50/40 border-t border-neutral-200 px-6 py-3 space-y-3">
      <div className="flex items-center gap-2 text-xs text-neutral-600">
        <span className="font-medium">Por trimestre:</span>
        <div className="flex items-center gap-1.5">
          <BotaoFoco label="Anual" ativo={foco === "anual"} onClick={() => setFoco("anual")} />
          {TRIMESTRES.map((t) => (
            <BotaoFoco key={t} label={`${t}T`} ativo={foco === t} onClick={() => setFoco(t)} />
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs tabular-nums">
          <thead>
            <tr className="text-neutral-500">
              <th className="text-left font-medium pr-3 pb-1">&nbsp;</th>
              {TRIMESTRES.map((t) => (
                <th key={t} className="text-right font-medium px-2 pb-1">{t}T</th>
              ))}
              <th className="text-right font-medium pl-2 pb-1 border-l border-neutral-200">Anual</th>
            </tr>
          </thead>
          <tbody>
            {mostrarA && (
              <tr>
                <td className="pr-3 py-0.5 text-neutral-600">A</td>
                {TRIMESTRES.map((t) => {
                  const v = l.porTrimestreA[t]?.total;
                  return (
                    <td key={t} className="text-right px-2 py-0.5">
                      {v != null ? brl(v, true) : <span className="text-neutral-300">—</span>}
                    </td>
                  );
                })}
                <td className="text-right pl-2 py-0.5 font-semibold border-l border-neutral-200">
                  {l.totalA != null ? brl(l.totalA, true) : "—"}
                </td>
              </tr>
            )}
            {mostrarB && (
              <tr>
                <td className="pr-3 py-0.5 text-neutral-600">B</td>
                {TRIMESTRES.map((t) => {
                  const v = l.porTrimestreB[t]?.total;
                  return (
                    <td key={t} className="text-right px-2 py-0.5">
                      {v != null ? brl(v, true) : <span className="text-neutral-300">—</span>}
                    </td>
                  );
                })}
                <td className="text-right pl-2 py-0.5 font-semibold border-l border-neutral-200">
                  {l.totalB != null ? brl(l.totalB, true) : "—"}
                </td>
              </tr>
            )}
            {mostrarA && mostrarB && (
              <tr className="text-mint-700">
                <td className="pr-3 py-0.5">Δ</td>
                {TRIMESTRES.map((t) => {
                  const a = l.porTrimestreA[t]?.total ?? 0;
                  const b = l.porTrimestreB[t]?.total ?? 0;
                  const d = b - a;
                  if (l.porTrimestreA[t] === undefined && l.porTrimestreB[t] === undefined) {
                    return (
                      <td key={t} className="text-right px-2 py-0.5 text-neutral-300">—</td>
                    );
                  }
                  return (
                    <td
                      key={t}
                      className={cn("text-right px-2 py-0.5", d >= 0 ? "text-mint-700" : "text-red-700")}
                    >
                      {d >= 0 ? "+" : ""}
                      {brl(d, true)}
                    </td>
                  );
                })}
                <td
                  className={cn(
                    "text-right pl-2 py-0.5 font-semibold border-l border-neutral-200",
                    l.diff >= 0 ? "text-mint-700" : "text-red-700",
                  )}
                >
                  {l.diff >= 0 ? "+" : ""}
                  {brl(l.diff, true)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
