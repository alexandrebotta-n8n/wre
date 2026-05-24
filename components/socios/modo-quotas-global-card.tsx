"use client";
// Card no topo de /socios — toggle GLOBAL do modo de quotas por ano.
//
// Mudar marca todos cenários DRAFT do ano como dirty + sincroniza o
// Cenario.modoQuotas em cada um. APPLIED preservam (snapshot imutável).
//
// Auto-save com debounce curto (200ms) — qualquer click no radio dispara.
import * as React from "react";
import { Scale, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { useAutoSubmit, StatusSalvamento } from "@/components/ui/use-auto-submit";
import { salvarModoQuotasAction } from "@/app/socios/acoes";

export function ModoQuotasGlobalCard({
  ano,
  modo,
  draftsCount,
  editavel,
}: {
  ano: number;
  modo: "ORIGINAL" | "REDISTRIBUIDA";
  draftsCount: number;
  editavel: boolean;
}) {
  const { formRef, onAnyChange, pending, salvouAt } = useAutoSubmit({ delay: 200 });

  if (!editavel) {
    return (
      <Card className="px-4 py-2.5 border-peri-200">
        <div className="flex items-center gap-2 text-sm">
          <Scale className="h-4 w-4 text-peri-700" />
          <span className="font-semibold text-navy-900">Modo de quotas — ano {ano}:</span>
          <span className="text-neutral-700">
            {modo === "REDISTRIBUIDA" ? "Redistribuídas" : "Originais"}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="px-4 py-2.5 border-peri-200">
      <form
        ref={formRef}
        onChange={onAnyChange}
        action={salvarModoQuotasAction}
        className="flex items-center gap-3 flex-wrap"
      >
        <input type="hidden" name="ano" value={ano} />
        <div className="inline-flex items-center gap-1.5 shrink-0">
          <Scale className="h-4 w-4 text-peri-700" />
          <span className="font-semibold text-navy-900 text-sm">
            Modo de quotas — ano {ano}
          </span>
          <Tooltip
            side="top"
            content={
              <>
                Define qual coluna de quotas (<strong>Original</strong> ou{" "}
                <strong>Redistribuída</strong>) os cenários DRAFT vão usar nos cálculos.
                <br /><strong>Original</strong> = cadastro direto.
                <br /><strong>Redistribuída</strong> = zera fundadores e Sócios de Serviços;
                saldo vai pra Sócios de Capital remanescentes proporcionalmente.
                <br />Trocar marca todos os DRAFTs do ano pra recalcular. Cenários
                publicados (APPLIED) ficam intocados.
              </>
            }
          >
            <HelpCircle className="h-3.5 w-3.5 text-neutral-400 cursor-help" />
          </Tooltip>
        </div>
        <div className="flex gap-3 text-sm">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="modoQuotas"
              value="ORIGINAL"
              defaultChecked={modo === "ORIGINAL"}
              className="accent-peri-600"
            />
            <span>Originais</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="modoQuotas"
              value="REDISTRIBUIDA"
              defaultChecked={modo === "REDISTRIBUIDA"}
              className="accent-peri-600"
            />
            <span>
              Redistribuídas{" "}
              <span className="text-neutral-500 text-xs">(zera fundadores + S. Serviços)</span>
            </span>
          </label>
        </div>
        <div className="ml-auto inline-flex items-center gap-3">
          {draftsCount > 0 && (
            <span className="text-[11px] text-amber-700 hidden md:inline">
              ⚠ trocar marcará {draftsCount} DRAFT(s) pra recalcular
            </span>
          )}
          <StatusSalvamento pending={pending} salvouAt={salvouAt} />
        </div>
      </form>
    </Card>
  );
}
