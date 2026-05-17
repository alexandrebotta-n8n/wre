"use client";
// KPI clicável que abre AlertasDialog. Usado em ColunaCenario para o KPI "Alertas".
// Quando não há alerta, vira um KPI estático normal (não-clicável).
// Inclui ícone "?" ao lado do label "Alertas" com tooltip explicando o significado
// (✓ ok / ✗ ERROR bloqueia / ⚠ WARNING informativo).
import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { AlertasDialog } from "./alertas-dialog";

export function KpiAlertasButton({
  valor,
  cor = "navy",
  cenarioNome,
  alertasPorSocio,
  totalCount,
}: {
  valor: string;
  cor?: "navy" | "red" | "amber" | "green";
  cenarioNome: string;
  alertasPorSocio: Array<{ socioNome: string; alertas: string[] }>;
  totalCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const interativo = totalCount > 0;
  const corClass =
    cor === "red"
      ? "text-red-700"
      : cor === "amber"
      ? "text-amber-700"
      : cor === "green"
      ? "text-mint-700"
      : "text-navy-900";

  const label = (
    <div className="text-[10px] uppercase tracking-wider text-neutral-500 inline-flex items-center gap-1">
      Alertas
      <Tooltip
        side="top"
        content={
          <>
            <strong>Alertas</strong>: verificações automáticas do cálculo.
            <br />✓ = tudo ok.
            <br />✗ = ERROR (bloqueia salvar versão).
            <br />⚠ = WARNING (informativo, não bloqueia).
            {interativo && (
              <>
                <br />
                <em>Clique no número para ver a lista detalhada.</em>
              </>
            )}
          </>
        }
      >
        <HelpCircle className="h-3 w-3 text-neutral-400 cursor-help" />
      </Tooltip>
    </div>
  );

  const inner = (
    <>
      {label}
      <div className={`text-base font-semibold tabular-nums ${corClass}`}>{valor}</div>
    </>
  );

  return (
    <>
      {interativo ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-left rounded -m-1 p-1 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400"
          title="Ver alertas detalhados"
        >
          {inner}
        </button>
      ) : (
        <div>{inner}</div>
      )}
      {interativo && (
        <AlertasDialog
          open={open}
          onOpenChange={setOpen}
          cenarioNome={cenarioNome}
          alertasPorSocio={alertasPorSocio}
        />
      )}
    </>
  );
}
