"use client";
import { useRouter } from "next/navigation";
import { Calendar, AlertTriangle } from "lucide-react";
import { NativeSelect } from "@/components/ui/input";
import type { PeriodoOption } from "./types";

export function SeletorPeriodo({
  periodos,
  selecionado,
  aId,
  bId,
}: {
  periodos: PeriodoOption[];
  selecionado: string;
  aId: string;
  bId: string;
}) {
  const router = useRouter();
  const sel = periodos.find((p) => p.id === selecionado);

  function trocar(novoPeriodoId: string) {
    const params = new URLSearchParams();
    if (aId) params.set("a", aId);
    if (bId) params.set("b", bId);
    params.set("periodoId", novoPeriodoId);
    router.push(`/simulacao?${params.toString()}`);
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Calendar className="h-4 w-4 text-peri-600" />
      <label htmlFor="periodo" className="text-sm font-medium text-navy-900">
        Período
      </label>
      <NativeSelect
        id="periodo"
        value={selecionado}
        onChange={(e) => trocar(e.target.value)}
        className="h-9 w-auto min-w-[200px]"
        aria-label="Período de cálculo"
      >
        {periodos.map((p) => (
          <option key={p.id} value={p.id} disabled={!p.temDados}>
            {p.temDados ? "✓" : "—"} {p.rotulo}
            {!p.temDados ? " (sem dados)" : ""}
          </option>
        ))}
      </NativeSelect>
      {sel && !sel.temDados && (
        <span className="text-xs text-amber-700 inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Sem ResultadoPeriodo cadastrado.
        </span>
      )}
    </div>
  );
}
