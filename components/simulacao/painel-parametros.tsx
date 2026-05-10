"use client";
// Painel de parâmetros editáveis inline na coluna do cenário.
// Switch entre modelo ATUAL (campos diretos) e NOVO (5 grupos colapsáveis).
import * as React from "react";
import { useState } from "react";
import { Settings2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SumValidator } from "@/components/premissa/sum-validator";
import { MatrizPesosArea } from "@/components/premissa/matriz-pesos-area";
import { PremissaChips } from "@/components/premissa/chips";
import { atualizarOverrideAction } from "@/app/simulacao/acoes";
import { cn } from "@/lib/utils";
import type { AreaOption } from "./types";

export function PainelParametros({
  cenarioId,
  modelo,
  parametros,
  temOverride,
  editavel,
  areas,
  dirty,
}: {
  cenarioId: string;
  modelo: "ATUAL" | "NOVO";
  parametros: Record<string, unknown>;
  temOverride: boolean;
  editavel: boolean;
  areas: AreaOption[];
  dirty: boolean;
}) {
  const [aberto, setAberto] = useState(editavel);

  // Modo read-only: mostra chips compactos (mesma exibição usada na lista)
  if (!editavel) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <Settings2 className="h-3.5 w-3.5" />
          <span>Parâmetros em uso{temOverride ? " (customizados)" : ""}</span>
        </div>
        <PremissaChips modelo={modelo} parametros={parametros} />
      </div>
    );
  }

  // Modo editável
  return (
    <Collapsible open={aberto} onOpenChange={setAberto}>
      <CollapsibleTrigger asChild>
        <button
          className="w-full flex items-center justify-between text-left rounded hover:bg-neutral-50 px-1 py-1 transition-colors"
          aria-expanded={aberto}
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-navy-900">
            <Settings2 className="h-4 w-4 text-peri-600" />
            Parâmetros editáveis
            {temOverride && <Badge variant="info" size="sm">customizado</Badge>}
            {dirty && <Badge variant="warning" size="sm">recalcular pendente</Badge>}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 text-neutral-400 transition-transform", aberto && "rotate-180")}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        {modelo === "ATUAL" ? (
          <FormParamsAtual cenarioId={cenarioId} parametros={parametros} />
        ) : (
          <FormParamsNovo cenarioId={cenarioId} parametros={parametros} areas={areas} />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Modelo ATUAL — formulário simples
// ============================================================================

function FormParamsAtual({
  cenarioId,
  parametros,
}: {
  cenarioId: string;
  parametros: Record<string, unknown>;
}) {
  return (
    <form
      action={async (fd) => {
        // Recompõe override a partir do form e envia como JSON.
        const override = {
          proLaboreMensal: Number(fd.get("proLaboreMensal")),
          unidadeFundadores: String(fd.get("unidadeFundadores")),
          unidadeMatriz: String(fd.get("unidadeMatriz")),
          reservaPercentual: Number(fd.get("reservaPercentual")),
          reservaViraPremio: fd.get("reservaViraPremio") === "on",
        };
        const fd2 = new FormData();
        fd2.set("cenarioId", cenarioId);
        fd2.set("override", JSON.stringify(override));
        await atualizarOverrideAction(fd2);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pró-labore mensal (R$)" htmlFor={`pl-${cenarioId}`}>
          <Input id={`pl-${cenarioId}`} type="number" name="proLaboreMensal" defaultValue={Number(parametros.proLaboreMensal ?? 5000)} step="100" required />
        </Field>
        <Field label="Reserva (%)" htmlFor={`rp-${cenarioId}`} hint="0.05 = 5%">
          <Input id={`rp-${cenarioId}`} type="number" name="reservaPercentual" defaultValue={Number(parametros.reservaPercentual ?? 0.05)} step="0.01" required />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Un. fundadores" htmlFor={`uf-${cenarioId}`}>
          <Input id={`uf-${cenarioId}`} name="unidadeFundadores" defaultValue={String(parametros.unidadeFundadores ?? "BG")} required />
        </Field>
        <Field label="Un. matriz" htmlFor={`um-${cenarioId}`}>
          <Input id={`um-${cenarioId}`} name="unidadeMatriz" defaultValue={String(parametros.unidadeMatriz ?? "DSF")} required />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="reservaViraPremio" defaultChecked={Boolean(parametros.reservaViraPremio ?? true)} className="accent-peri-600" />
        <span>Reserva vira prêmio uniforme</span>
      </label>
      <div className="flex justify-end pt-1">
        <Button type="submit" variant="subtle" size="sm">Aplicar parâmetros</Button>
      </div>
    </form>
  );
}

// ============================================================================
// Modelo NOVO — 5 grupos colapsáveis
// ============================================================================

function FormParamsNovo({
  cenarioId,
  parametros,
  areas,
}: {
  cenarioId: string;
  parametros: Record<string, unknown>;
  areas: AreaOption[];
}) {
  const distribAtual = String(parametros.distribuicaoBlocoB ?? "UNIFORME");

  return (
    <form
      action={async (fd) => {
        // Recompõe pesosPorArea a partir dos campos pesoOrg-X / pesoInc-X
        const pesosOrganico: Record<string, number> = {};
        const pesosIncremental: Record<string, number> = {};
        for (const [k, v] of fd.entries()) {
          if (k.startsWith("pesoOrg-")) pesosOrganico[k.slice(8)] = Number(v) || 0;
          else if (k.startsWith("pesoInc-")) pesosIncremental[k.slice(8)] = Number(v) || 0;
        }
        const mixOrganico = Number(fd.get("mixOrganico") ?? 0);
        const mixIncremental = Number(fd.get("mixIncremental") ?? 0);
        const distribuicao = String(fd.get("distribuicaoBlocoB") ?? "UNIFORME");

        const override: Record<string, unknown> = {
          percentualBlocoA: Number(fd.get("percentualBlocoA")),
          percentualBlocoB: Number(fd.get("percentualBlocoB")),
          percentualBlocoC: Number(fd.get("percentualBlocoC")),
          poolSociedade: Number(fd.get("poolSociedade")),
          poolLider: Number(fd.get("poolLider")),
          poolEquipeReserva: Number(fd.get("poolEquipeReserva")),
          chaveOriginacao: Number(fd.get("chaveOriginacao")),
          chaveExecucao: Number(fd.get("chaveExecucao")),
          chaveGestaoCP: Number(fd.get("chaveGestaoCP")),
          faixaOrigMin: Number(fd.get("faixaOrigMin")),
          faixaOrigMax: Number(fd.get("faixaOrigMax")),
          faixaExecMin: Number(fd.get("faixaExecMin")),
          faixaExecMax: Number(fd.get("faixaExecMax")),
          faixaGestaoMin: Number(fd.get("faixaGestaoMin")),
          faixaGestaoMax: Number(fd.get("faixaGestaoMax")),
          proRataMinMeses: Number(fd.get("proRataMinMeses")),
          distribuicaoBlocoB: distribuicao,
        };
        if (Object.keys(pesosOrganico).length > 0) {
          override.pesosPorArea = { mixOrganico, mixIncremental, pesosOrganico, pesosIncremental };
        }
        const fd2 = new FormData();
        fd2.set("cenarioId", cenarioId);
        fd2.set("override", JSON.stringify(override));
        await atualizarOverrideAction(fd2);
      }}
      className="space-y-3"
    >
      <Grupo titulo="Blocos do RDA (somam 1.0)" defaultOpen>
        <div className="grid grid-cols-3 gap-3">
          <NumField name="percentualBlocoA" label="A" defaultValue={Number(parametros.percentualBlocoA ?? 0.45)} step="0.01" />
          <NumField name="percentualBlocoB" label="B" defaultValue={Number(parametros.percentualBlocoB ?? 0.35)} step="0.01" />
          <NumField name="percentualBlocoC" label="C" defaultValue={Number(parametros.percentualBlocoC ?? 0.20)} step="0.01" />
        </div>
        <div className="mt-2">
          <SumValidator names={["percentualBlocoA", "percentualBlocoB", "percentualBlocoC"]} alvo={1.0} rotulo="A+B+C" />
        </div>
      </Grupo>

      <Grupo titulo="Pool de unidade (somam 1.0)">
        <div className="grid grid-cols-3 gap-3">
          <NumField name="poolSociedade" label="Soc." defaultValue={Number(parametros.poolSociedade ?? 0.50)} step="0.01" />
          <NumField name="poolLider" label="Líder" defaultValue={Number(parametros.poolLider ?? 0.30)} step="0.01" />
          <NumField name="poolEquipeReserva" label="Eq./Res." defaultValue={Number(parametros.poolEquipeReserva ?? 0.20)} step="0.01" />
        </div>
        <div className="mt-2">
          <SumValidator names={["poolSociedade", "poolLider", "poolEquipeReserva"]} alvo={1.0} rotulo="Sociedade+Líder+Equipe" />
        </div>
      </Grupo>

      <Grupo titulo="Chave-padrão interunidades (somam 1.0)">
        <div className="grid grid-cols-3 gap-3">
          <NumField name="chaveOriginacao" label="Orig." defaultValue={Number(parametros.chaveOriginacao ?? 0.30)} step="0.05" />
          <NumField name="chaveExecucao" label="Exec." defaultValue={Number(parametros.chaveExecucao ?? 0.60)} step="0.05" />
          <NumField name="chaveGestaoCP" label="Gestão" defaultValue={Number(parametros.chaveGestaoCP ?? 0.10)} step="0.05" />
        </div>
        <div className="mt-2">
          <SumValidator names={["chaveOriginacao", "chaveExecucao", "chaveGestaoCP"]} alvo={1.0} rotulo="Orig+Exec+Gestão" />
        </div>
      </Grupo>

      <Grupo titulo="Faixas de ajuste (mín / máx)">
        <div className="grid grid-cols-2 gap-3">
          <NumField name="faixaOrigMin" label="Orig min" defaultValue={Number(parametros.faixaOrigMin ?? 0.20)} step="0.05" />
          <NumField name="faixaOrigMax" label="Orig max" defaultValue={Number(parametros.faixaOrigMax ?? 0.40)} step="0.05" />
          <NumField name="faixaExecMin" label="Exec min" defaultValue={Number(parametros.faixaExecMin ?? 0.50)} step="0.05" />
          <NumField name="faixaExecMax" label="Exec max" defaultValue={Number(parametros.faixaExecMax ?? 0.70)} step="0.05" />
          <NumField name="faixaGestaoMin" label="Gestão min" defaultValue={Number(parametros.faixaGestaoMin ?? 0.00)} step="0.05" />
          <NumField name="faixaGestaoMax" label="Gestão max" defaultValue={Number(parametros.faixaGestaoMax ?? 0.15)} step="0.05" />
        </div>
        <div className="mt-2">
          <NumField name="proRataMinMeses" label="Pro-rata mín. (meses)" defaultValue={Number(parametros.proRataMinMeses ?? 3)} step="1" min="0" max="12" />
        </div>
      </Grupo>

      <Grupo titulo="Distribuição do Bloco B + Pesos por área">
        <Field label="Distribuição" htmlFor={`db-${cenarioId}`}>
          <NativeSelect id={`db-${cenarioId}`} name="distribuicaoBlocoB" defaultValue={distribAtual}>
            <option value="UNIFORME">Uniforme</option>
            <option value="PESO_INDIVIDUAL">Por peso individual</option>
            <option value="ORIGINACAO">Por originação</option>
            <option value="POR_AREA">Por área de prática</option>
          </NativeSelect>
        </Field>
        {areas.length > 0 && (
          <div className="mt-3">
            <MatrizPesosArea
              areas={areas}
              defaults={parametros.pesosPorArea as {
                mixOrganico: number;
                mixIncremental: number;
                pesosOrganico: Record<string, number>;
                pesosIncremental: Record<string, number>;
              } | undefined}
            />
          </div>
        )}
      </Grupo>

      <div className="flex justify-end pt-1">
        <Button type="submit" variant="subtle" size="sm">Aplicar parâmetros</Button>
      </div>
    </form>
  );
}

function Grupo({
  titulo,
  defaultOpen,
  children,
}: {
  titulo: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between text-left rounded px-2 py-1.5 hover:bg-neutral-50 transition-colors text-xs font-semibold text-navy-900 uppercase tracking-wider">
          <span>{titulo}</span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 text-neutral-400 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pt-2 pb-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function NumField({
  name,
  label,
  defaultValue,
  step = "0.01",
  min,
  max,
}: {
  name: string;
  label: string;
  defaultValue: number;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <Field label={label} htmlFor={name}>
      <Input
        id={name}
        type="number"
        name={name}
        defaultValue={defaultValue}
        step={step}
        min={min}
        max={max}
        required
        className="text-right tabular-nums"
      />
    </Field>
  );
}
