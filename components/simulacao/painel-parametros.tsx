"use client";
// Painel de parâmetros editáveis inline na coluna do cenário.
// Switch entre modelo ATUAL (campos diretos) e NOVO (5 grupos colapsáveis).
//
// AUTO-SAVE: cada mudança em qualquer input dispara um auto-submit do form
// após 600ms de debounce. Sem botão "Aplicar parâmetros". Indicador
// "Salvando…" aparece inline enquanto a action está em andamento.
import * as React from "react";
import { useState } from "react";
import { Settings2, ChevronDown, HelpCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input, NativeSelect } from "@/components/ui/input";
import { MoneyField } from "@/components/ui/money-input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { useAutoSubmit, StatusSalvamento } from "@/components/ui/use-auto-submit";
import { SumValidator } from "@/components/premissa/sum-validator";
import { MatrizPesosArea } from "@/components/premissa/matriz-pesos-area";
import { PremissaChips } from "@/components/premissa/chips";
import { atualizarOverrideAction } from "@/app/simulacao/acoes";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AreaOption } from "./types";

const TOL = 0.001;

function aproxIgual(soma: number, alvo: number): boolean {
  return Math.abs(soma - alvo) <= TOL;
}

export function PainelParametros({
  cenarioId,
  modelo,
  parametros,
  temOverride,
  editavel,
  areas,
  dirty,
  versao,
  valoresPorEtapa = {},
}: {
  cenarioId: string;
  modelo: "ATUAL" | "NOVO";
  parametros: Record<string, unknown>;
  temOverride: boolean;
  editavel: boolean;
  areas: AreaOption[];
  dirty: boolean;
  /** Versão do cenário — usada como `key` para remontar o form quando override muda
   *  (uncontrolled inputs com `defaultValue` não re-sincronizam de outra forma). */
  versao: number;
  /** Soma do `trace[].valor` por chave de etapa (ex "bloco-A"). Alimenta os chips. */
  valoresPorEtapa?: Record<string, number>;
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

  // Modo editável — Collapsible com forms internos. Modo de quotas é config
  // GLOBAL por ano (/socios), não mais por cenário.
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
          <FormParamsAtual key={`atual-${cenarioId}-${versao}`} cenarioId={cenarioId} parametros={parametros} valoresPorEtapa={valoresPorEtapa} dirty={dirty} />
        ) : (
          <FormParamsNovo key={`novo-${cenarioId}-${versao}`} cenarioId={cenarioId} parametros={parametros} areas={areas} valoresPorEtapa={valoresPorEtapa} dirty={dirty} />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Modelo ATUAL — formulário simples
// ============================================================================

/** Chip que mostra "→ R$ X" para o valor calculado da etapa. */
function ChipValor({
  etapa,
  rotulo,
  valoresPorEtapa,
  dirty,
}: {
  etapa: string;
  rotulo?: string;
  valoresPorEtapa: Record<string, number>;
  dirty: boolean;
}) {
  const v = valoresPorEtapa[etapa];
  if (v === undefined) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] tabular-nums px-1.5 py-0.5 rounded ring-1 ring-inset",
        dirty
          ? "text-neutral-500 bg-neutral-50 ring-neutral-200"
          : "text-peri-800 bg-peri-50 ring-peri-200",
      )}
      title={dirty ? "valor antes do recálculo" : "valor calculado nesta apuração"}
    >
      → {rotulo ? <span className="opacity-70">{rotulo}</span> : null} {brl(v, true)}
    </span>
  );
}

/** Label com tooltip de ajuda. */
function LabelHelp({ children, ajuda }: { children: React.ReactNode; ajuda: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <Tooltip content={ajuda} side="top">
        <HelpCircle className="h-3 w-3 text-neutral-400 hover:text-peri-600 cursor-help" />
      </Tooltip>
    </span>
  );
}

function FormParamsAtual({
  cenarioId,
  parametros,
  valoresPorEtapa,
  dirty,
}: {
  cenarioId: string;
  parametros: Record<string, unknown>;
  valoresPorEtapa: Record<string, number>;
  dirty: boolean;
}) {
  const { formRef, onAnyChange, pending, salvouAt } = useAutoSubmit();
  return (
    <form
      ref={formRef}
      onChange={onAnyChange}
      action={async (fd) => {
        const override = {
          proLaboreMensal: Number(fd.get("proLaboreMensal")),
          unidadeMatriz: String(fd.get("unidadeMatriz")),
          reservaPercentual: Number(fd.get("reservaPercentual")),
          reservaViraPremio: fd.get("reservaViraPremio") === "on",
        };
        const erros: string[] = [];
        if (override.proLaboreMensal < 0) erros.push("Pró-labore não pode ser negativo");
        if (override.reservaPercentual < 0 || override.reservaPercentual > 1) {
          erros.push(`Reserva (%) deve estar entre 0 e 1`);
        }
        if (!override.unidadeMatriz) erros.push("Unidade matriz não pode ser vazia");
        if (erros.length > 0) {
          toast.error(erros.join(" · "), { duration: 6000 });
          return;
        }
        const fd2 = new FormData();
        fd2.set("cenarioId", cenarioId);
        fd2.set("override", JSON.stringify(override));
        await atualizarOverrideAction(fd2);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={
            <LabelHelp ajuda="Valor mensal do pró-labore por sócio elegível. Multiplicado por meses do período × N sócios.">
              Pró-labore mensal (R$)
            </LabelHelp>
          }
          htmlFor={`pl-${cenarioId}`}
        >
          <MoneyField id={`pl-${cenarioId}`} name="proLaboreMensal" initial={Number(parametros.proLaboreMensal ?? 5000)} required />
          <ChipValor etapa="pro-labore" valoresPorEtapa={valoresPorEtapa} dirty={dirty} />
        </Field>
        <Field
          label={
            <LabelHelp ajuda="Percentual do funding residual reservado. Se 'Vira prêmio' estiver marcado, vira distribuição uniforme entre sócios.">
              Reserva (%)
            </LabelHelp>
          }
          htmlFor={`rp-${cenarioId}`}
          hint="0.05 = 5%"
        >
          <Input id={`rp-${cenarioId}`} type="number" name="reservaPercentual" defaultValue={Number(parametros.reservaPercentual ?? 0.05)} step="0.01" required />
          <ChipValor etapa="reserva" valoresPorEtapa={valoresPorEtapa} dirty={dirty} />
        </Field>
      </div>
      <Field label="Unidade matriz (código)" htmlFor={`um-${cenarioId}`}>
        <Input id={`um-${cenarioId}`} name="unidadeMatriz" defaultValue={String(parametros.unidadeMatriz ?? "DSF")} required />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="reservaViraPremio" defaultChecked={Boolean(parametros.reservaViraPremio ?? true)} className="accent-peri-600" />
        <span>Reserva vira prêmio uniforme</span>
      </label>
      <div className="flex justify-end pt-1 min-h-[18px]">
        <StatusSalvamento pending={pending} salvouAt={salvouAt} />
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
  valoresPorEtapa,
  dirty,
}: {
  cenarioId: string;
  parametros: Record<string, unknown>;
  areas: AreaOption[];
  valoresPorEtapa: Record<string, number>;
  dirty: boolean;
}) {
  const distribAtual = String(parametros.distribuicaoBlocoB ?? "UNIFORME");
  const { formRef, onAnyChange, pending, salvouAt } = useAutoSubmit();

  return (
    <form
      ref={formRef}
      onChange={onAnyChange}
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

        const blocoA = Number(fd.get("percentualBlocoA"));
        const blocoB = Number(fd.get("percentualBlocoB"));
        const blocoC = Number(fd.get("percentualBlocoC"));
        const poolSoc = Number(fd.get("poolSociedade"));
        const poolLid = Number(fd.get("poolLider"));
        const poolEq = Number(fd.get("poolEquipeReserva"));
        const chvOrig = Number(fd.get("chaveOriginacao"));
        const chvExec = Number(fd.get("chaveExecucao"));
        const chvGes = Number(fd.get("chaveGestaoCP"));
        const fxOrigMin = Number(fd.get("faixaOrigMin"));
        const fxOrigMax = Number(fd.get("faixaOrigMax"));
        const fxExecMin = Number(fd.get("faixaExecMin"));
        const fxExecMax = Number(fd.get("faixaExecMax"));
        const fxGesMin = Number(fd.get("faixaGestaoMin"));
        const fxGesMax = Number(fd.get("faixaGestaoMax"));

        // Validação client-side: as mesmas regras do schema do servidor.
        // Falhar aqui é melhor UX que ver o flashError genérico depois do
        // submit (que ainda gera form.reset e parece "voltar pro default").
        const erros: string[] = [];
        if (!aproxIgual(blocoA + blocoB + blocoC, 1)) {
          erros.push(`Blocos A+B+C devem somar 1.00 (atual: ${(blocoA + blocoB + blocoC).toFixed(2)})`);
        }
        if (!aproxIgual(poolSoc + poolLid + poolEq, 1)) {
          erros.push(`Pool de unidade deve somar 1.00 (atual: ${(poolSoc + poolLid + poolEq).toFixed(2)})`);
        }
        if (!aproxIgual(chvOrig + chvExec + chvGes, 1)) {
          erros.push(`Chave-padrão interunidades deve somar 1.00 (atual: ${(chvOrig + chvExec + chvGes).toFixed(2)})`);
        }
        if (fxOrigMin > fxOrigMax) erros.push("Faixa originação: min > max");
        if (fxExecMin > fxExecMax) erros.push("Faixa execução: min > max");
        if (fxGesMin > fxGesMax) erros.push("Faixa gestão: min > max");
        if (Object.keys(pesosOrganico).length > 0) {
          if (!aproxIgual(mixOrganico + mixIncremental, 1)) {
            erros.push(`Mix Orgânico + Incremental deve somar 1.00 (atual: ${(mixOrganico + mixIncremental).toFixed(2)})`);
          }
          const sOrg = Object.values(pesosOrganico).reduce((a, v) => a + v, 0);
          const sInc = Object.values(pesosIncremental).reduce((a, v) => a + v, 0);
          if (!aproxIgual(sOrg, 1)) erros.push(`Pesos orgânicos por área devem somar 1.00 (atual: ${sOrg.toFixed(2)})`);
          if (!aproxIgual(sInc, 1)) erros.push(`Pesos incrementais por área devem somar 1.00 (atual: ${sInc.toFixed(2)})`);
        }
        if (erros.length > 0) {
          toast.error(erros.join(" · "), { duration: 6000 });
          return;
        }

        const override: Record<string, unknown> = {
          percentualBlocoA: blocoA,
          percentualBlocoB: blocoB,
          percentualBlocoC: blocoC,
          poolSociedade: poolSoc,
          poolLider: poolLid,
          poolEquipeReserva: poolEq,
          chaveOriginacao: chvOrig,
          chaveExecucao: chvExec,
          chaveGestaoCP: chvGes,
          faixaOrigMin: fxOrigMin,
          faixaOrigMax: fxOrigMax,
          faixaExecMin: fxExecMin,
          faixaExecMax: fxExecMax,
          faixaGestaoMin: fxGesMin,
          faixaGestaoMax: fxGesMax,
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
      <Grupo
        titulo="Blocos do RDA (somam 1.0)"
        ajuda="O RDA (Resultado Distribuível Ajustado) é o LL Matriz menos a remuneração de administração. Os 3 blocos somam 100% e disciplinam como o RDA é alocado: A institucional (capital), B performance, C estratégica."
        defaultOpen
      >
        <div className="grid grid-cols-3 gap-3">
          <NumField name="percentualBlocoA" label="A" defaultValue={Number(parametros.percentualBlocoA ?? 0.45)} step="0.01" />
          <NumField name="percentualBlocoB" label="B" defaultValue={Number(parametros.percentualBlocoB ?? 0.35)} step="0.01" />
          <NumField name="percentualBlocoC" label="C" defaultValue={Number(parametros.percentualBlocoC ?? 0.20)} step="0.01" />
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <SumValidator names={["percentualBlocoA", "percentualBlocoB", "percentualBlocoC"]} alvo={1.0} rotulo="A+B+C" />
          <ChipValor etapa="bloco-A" rotulo="A" valoresPorEtapa={valoresPorEtapa} dirty={dirty} />
          <ChipValor etapa="bloco-B" rotulo="B" valoresPorEtapa={valoresPorEtapa} dirty={dirty} />
          <ChipValor etapa="bloco-C" rotulo="C" valoresPorEtapa={valoresPorEtapa} dirty={dirty} />
        </div>
      </Grupo>

      <Grupo
        titulo="Pool de unidade (somam 1.0)"
        ajuda="Quando uma unidade tem líder, o LL local é dividido em 3: Sociedade (institucional), Líder (incentivo) e Equipe/Reserva. Aplicado APENAS sobre LL_unidade — não confundir com Blocos A/B/C do RDA central."
      >
        <div className="grid grid-cols-3 gap-3">
          <NumField name="poolSociedade" label="Soc." defaultValue={Number(parametros.poolSociedade ?? 0.50)} step="0.01" />
          <NumField name="poolLider" label="Líder" defaultValue={Number(parametros.poolLider ?? 0.30)} step="0.01" />
          <NumField name="poolEquipeReserva" label="Eq./Res." defaultValue={Number(parametros.poolEquipeReserva ?? 0.20)} step="0.01" />
        </div>
        <div className="mt-2">
          <SumValidator names={["poolSociedade", "poolLider", "poolEquipeReserva"]} alvo={1.0} rotulo="Sociedade+Líder+Equipe" />
        </div>
      </Grupo>

      <Grupo
        titulo="Chave-padrão interunidades (somam 1.0)"
        ajuda="Quando um serviço é originado em uma unidade e executado em outra, esta chave decide como o resultado é dividido: Originação (relacionamento), Execução (entrega) e Gestão (coordenação). Defaults da Política: 30/60/10."
      >
        <div className="grid grid-cols-3 gap-3">
          <NumField name="chaveOriginacao" label="Orig." defaultValue={Number(parametros.chaveOriginacao ?? 0.30)} step="0.05" />
          <NumField name="chaveExecucao" label="Exec." defaultValue={Number(parametros.chaveExecucao ?? 0.60)} step="0.05" />
          <NumField name="chaveGestaoCP" label="Gestão" defaultValue={Number(parametros.chaveGestaoCP ?? 0.10)} step="0.05" />
        </div>
        <div className="mt-2">
          <SumValidator names={["chaveOriginacao", "chaveExecucao", "chaveGestaoCP"]} alvo={1.0} rotulo="Orig+Exec+Gestão" />
        </div>
      </Grupo>

      <Grupo
        titulo="Faixas de ajuste (mín / máx)"
        ajuda="Limites para a chave O/E/G poder ser ajustada caso a caso. Política da Política: Originação 20-40%, Execução 50-70%, Gestão 0-15%. Pro-rata mínimo: meses para reconhecer parcela proporcional."
      >
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

      <Grupo
        titulo="Distribuição do Bloco B + Pesos por área"
        ajuda="O Bloco B (35%) pode ser distribuído por: UNIFORME (igual entre elegíveis), PESO_INDIVIDUAL, ORIGINACAO ou POR_AREA (mix orgânico/incremental por área de prática)."
      >
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

      <div className="flex justify-end pt-1 min-h-[18px]">
        <StatusSalvamento pending={pending} salvouAt={salvouAt} />
      </div>
    </form>
  );
}

function Grupo({
  titulo,
  ajuda,
  defaultOpen,
  children,
}: {
  titulo: string;
  ajuda?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between text-left rounded px-2 py-1.5 hover:bg-neutral-50 transition-colors text-xs font-semibold text-navy-900 uppercase tracking-wider">
          <span className="inline-flex items-center gap-1.5">
            {titulo}
            {ajuda && (
              <Tooltip content={ajuda} side="top">
                <HelpCircle className="h-3 w-3 text-neutral-400 hover:text-peri-600" />
              </Tooltip>
            )}
          </span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 text-neutral-400 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      {/* forceMount: mantém os inputs no DOM mesmo quando fechado, para que o
          FormData do submit carregue todos os parâmetros (e não só os do grupo
          aberto). Sem isso, campos colapsados viram 0 e o schema rejeita. */}
      <CollapsibleContent forceMount className="px-2 pt-2 pb-3 data-[state=closed]:hidden">
        {children}
      </CollapsibleContent>
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
