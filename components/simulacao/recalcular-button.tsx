"use client";
// RecalcularButton — botão inteligente para recalcular um cenário.
//
// Comportamento:
//   - Se cenário NÃO foi calculado: botão "Calcular" primary (sempre habilitado).
//   - Se cenário JÁ calculado mas não-dirty: botão "Recalcular" desabilitado +
//     texto sutil "sem mudanças pendentes".
//   - Se cenário JÁ calculado e dirty: botão "Recalcular" primary + badge
//     pulsante "● recalcule".
//   - Durante o cálculo: spinner + texto "Calculando…" + botão disabled.
import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { calcularAction } from "@/app/simulacao/acoes";

export function RecalcularButton({
  cenarioId,
  dirty,
  jaCalculou,
}: {
  cenarioId: string;
  dirty: boolean;
  jaCalculou: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const precisaRecalc = !jaCalculou || dirty;

  function recalcular() {
    start(async () => {
      const fd = new FormData();
      fd.set("cenarioId", cenarioId);
      await calcularAction(fd);
      router.refresh();
    });
  }

  const tooltipText = pending
    ? "Calculando…"
    : !jaCalculou
    ? "Calcula o cenário em base anual com as variáveis globais + parâmetros atuais."
    : dirty
    ? "Parâmetros ou variáveis globais mudaram — clique para refletir nos valores."
    : "Cenário já está atualizado. Mude algum parâmetro ou variável global para habilitar.";

  return (
    <div className="inline-flex items-center gap-2">
      <Tooltip side="top" content={tooltipText}>
        <Button
          type="button"
          variant={precisaRecalc ? "primary" : "secondary"}
          size="sm"
          onClick={recalcular}
          disabled={pending || (!precisaRecalc)}
          aria-busy={pending}
        >
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Calculando…
            </>
          ) : (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              {jaCalculou ? "Recalcular" : "Calcular"}
            </>
          )}
        </Button>
      </Tooltip>
      {dirty && jaCalculou && !pending && (
        <Badge variant="warning" size="sm" className="animate-pulse">
          ● recalcule
        </Badge>
      )}
      {!precisaRecalc && !pending && (
        <span className="text-[11px] text-neutral-500">sem mudanças pendentes</span>
      )}
    </div>
  );
}
