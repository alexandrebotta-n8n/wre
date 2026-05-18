"use client";
// Linha da tabela /socios — substituiu o modal de edição.
//
// Comportamento Notion/Airtable:
//   - Linha de resumo (slim): chevron + avatar + nome + cargo + quotas%
//     + classificação badge + badges (área/líder/fundador) + status incompleto.
//   - Click na linha (ou no chevron) → expande inline com grid editável de
//     todos os 11 campos editáveis em 4 grupos.
//   - Auto-save com debounce 600ms (useAutoSubmit do components/ui).
//   - Sem botão "Salvar". Indicador "Salvando… / Salvo ✓" no canto.
//
// FEEDBACK DE IMPACTO:
//   - Banner no topo da expansão avisa quantos cenários DRAFT serão marcados
//     pra recalcular ao salvar mudança de cálculo.
//   - Cada fieldset tem badge "afeta cálculo" / "override" / "não afeta".
//   - Inputs R$ usam MoneyInput (máscara BRL on blur, número on focus).
//
// SOCIO restrito: ainda renderiza, mas inputs ficam disabled + hint visual
// "Somente leitura" (defesa: action já recusa via requireRole; UI evita
// frustração).
import * as React from "react";
import { useState } from "react";
import { ChevronRight, AlertCircle, Lock, Info } from "lucide-react";
import { TR, TD } from "@/components/ui/data-table";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { MoneyField } from "@/components/ui/money-input";
import { useAutoSubmit, StatusSalvamento } from "@/components/ui/use-auto-submit";
import { atualizarSocioAction } from "@/app/socios/acoes";
import { nomeOuIniciais } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AreaOption {
  id: string;
  nome: string;
}
export interface UnidadeOption {
  id: string;
  codigo: string;
  nome: string;
}
export interface SocioRow {
  id: string;
  nome: string;
  cargo: string;
  isFundador: boolean;
  areaPraticaId: string | null;
  areaPraticaNome: string | null;
  publicoDefault: string;
  unidadeLideradaId: string | null;
  unidadeLideradaCodigo: string | null;
  nivelCargo: "A" | "B" | "C" | "D" | null;
  faixaSalarial: "INICIAL" | "PLENO" | "EXPERT" | null;
  percentualQuotasDefault: number;
  proLaboreMensal: number | null;
  remuneracaoGestaoMensal: number | null;
  originacaoAnualPadrao: number | null;
  fundingFundadorAnual: number | null;
  observacoes: string | null;
}

const PUBLICOS: Array<{ id: string; nome: string }> = [
  { id: "SOCIO_CAPITAL", nome: "Sócio de Capital" },
  { id: "SOCIO_CAPITAL_GESTOR", nome: "Sócio de Capital — Gestor" },
  { id: "SOCIO_CAPITAL_LIDER_UNIDADE", nome: "Sócio de Capital — Líder de Unidade" },
  { id: "SOCIO_SERVICOS", nome: "Sócio de Serviços" },
  { id: "SOCIO_SERVICOS_ESTRATEGICO", nome: "Sócio de Serviços Estratégico" },
  { id: "LIDER_UNIDADE_NON_EQUITY", nome: "Líder de Unidade Non-Equity" },
];
const PUBLICOS_LABEL: Record<string, string> = Object.fromEntries(
  PUBLICOS.map((p) => [p.id, p.nome]),
);
// Inclui FUNDADOR e LIDER_TECNICO no label map só pra exibir no resumo
// (mesmo que não sejam selecionáveis no form).
PUBLICOS_LABEL.FUNDADOR = "Fundador";
PUBLICOS_LABEL.LIDER_TECNICO = "Líder Técnico (legado)";

const PUBLICOS_LIDER = new Set(["SOCIO_CAPITAL_LIDER_UNIDADE", "LIDER_UNIDADE_NON_EQUITY"]);
// Públicos que esperam nível+faixa cadastrados (alimentam rem. de gestão).
// Quando faltarem, mostramos badge âmbar de "configuração incompleta".
const PUBLICOS_EXIGEM_NIVEL = new Set([
  "SOCIO_CAPITAL_GESTOR",
  "SOCIO_CAPITAL_LIDER_UNIDADE",
  "SOCIO_SERVICOS",
  "SOCIO_SERVICOS_ESTRATEGICO",
]);

const NIVEIS = ["A", "B", "C", "D"] as const;
const FAIXAS = ["INICIAL", "PLENO", "EXPERT"] as const;

export function LinhaSocio({
  socio,
  areas,
  unidades,
  editavel,
  modoNome,
  colSpan,
  cenariosDraftCount,
}: {
  socio: SocioRow;
  areas: AreaOption[];
  unidades: UnidadeOption[];
  editavel: boolean;
  modoNome: "completo" | "iniciais";
  /** Número de colunas na tabela — usado pelo colSpan da linha expandida. */
  colSpan: number;
  /** Quantos cenários DRAFT existem hoje. Banner de impacto usa essa contagem. */
  cenariosDraftCount: number;
}) {
  const [aberto, setAberto] = useState(false);

  // Sinal visual quando faltam campos chave pra rem. de gestão funcionar.
  const incompleto =
    PUBLICOS_EXIGEM_NIVEL.has(socio.publicoDefault) &&
    (!socio.nivelCargo || !socio.faixaSalarial);

  const quotasFmt =
    socio.percentualQuotasDefault > 0
      ? (socio.percentualQuotasDefault * 100).toFixed(4) + "%"
      : "—";

  return (
    <>
      {/* === Linha de resumo (sempre visível) === */}
      <TR
        className={cn(
          "cursor-pointer hover:bg-peri-50/40 transition-colors",
          aberto && "bg-peri-50/40",
        )}
        onClick={() => setAberto((v) => !v)}
        role="button"
        aria-expanded={aberto}
        aria-controls={`socio-detalhe-${socio.id}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAberto((v) => !v);
          }
        }}
      >
        <TD className="px-4 py-2.5 w-8">
          <ChevronRight
            className={cn(
              "h-4 w-4 text-neutral-400 transition-transform",
              aberto && "rotate-90 text-peri-700",
            )}
            aria-hidden
          />
        </TD>
        <TD className="px-2 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar nome={socio.nome} seed={socio.id} size="sm" />
            <div className="min-w-0">
              <div className="font-medium text-navy-900 truncate inline-flex items-center gap-1.5">
                {nomeOuIniciais(socio.nome, modoNome)}
                {incompleto && (
                  <Tooltip
                    side="top"
                    content="Configuração incompleta: este sócio é elegível a Rem. de Gestão mas falta Nível e/ou Faixa salarial. Expanda a linha pra completar."
                  >
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 cursor-help" />
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </TD>
        <TD className="text-neutral-600 truncate max-w-[240px]" title={socio.cargo}>
          {socio.cargo}
        </TD>
        <TD className="text-right tabular-nums text-neutral-700">{quotasFmt}</TD>
        <TD>
          <Badge variant="info" size="sm">
            {PUBLICOS_LABEL[socio.publicoDefault] ?? socio.publicoDefault}
          </Badge>
        </TD>
        <TD>
          <div className="flex items-center gap-1 flex-wrap">
            {socio.isFundador && (
              <Badge variant="success" size="sm">fundador</Badge>
            )}
            {socio.unidadeLideradaCodigo && (
              <Badge variant="warning" size="sm">líder {socio.unidadeLideradaCodigo}</Badge>
            )}
            {socio.areaPraticaNome && (
              <span className="text-[11px] text-neutral-500">{socio.areaPraticaNome}</span>
            )}
          </div>
        </TD>
      </TR>

      {/* === Linha expandida (form inline) === */}
      {aberto && (
        <tr id={`socio-detalhe-${socio.id}`}>
          <td colSpan={colSpan} className="bg-peri-50/30 border-l-2 border-peri-300 p-0">
            <FormSocio
              socio={socio}
              areas={areas}
              unidades={unidades}
              editavel={editavel}
              cenariosDraftCount={cenariosDraftCount}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/** Form interno com auto-save. Mantém todos os 11 campos editáveis em grid. */
function FormSocio({
  socio,
  areas,
  unidades,
  editavel,
  cenariosDraftCount,
}: {
  socio: SocioRow;
  areas: AreaOption[];
  unidades: UnidadeOption[];
  editavel: boolean;
  cenariosDraftCount: number;
}) {
  const { formRef, onAnyChange, pending, salvouAt } = useAutoSubmit();

  // Estado local mínimo: mostra/esconde Unidade liderada conforme classificação.
  const [publicoSelecionado, setPublicoSelecionado] = useState(socio.publicoDefault);
  const [prevPublicoProp, setPrevPublicoProp] = useState(socio.publicoDefault);
  if (prevPublicoProp !== socio.publicoDefault) {
    setPrevPublicoProp(socio.publicoDefault);
    setPublicoSelecionado(socio.publicoDefault);
  }
  const ehLider = PUBLICOS_LIDER.has(publicoSelecionado);

  // Validação client-side leve antes do submit: bloqueia números absurdos.
  // Erros de schema continuam capturados pelo Zod no server.
  async function safeAction(formData: FormData) {
    const quotas = Number(formData.get("percentualQuotasDefault") ?? "0");
    if (!Number.isFinite(quotas) || quotas < 0 || quotas > 100) {
      toast.error("Quotas (%) deve estar entre 0 e 100.");
      return;
    }
    const negativos = [
      "proLaboreMensal",
      "remuneracaoGestaoMensal",
      "originacaoAnualPadrao",
      "fundingFundadorAnual",
    ];
    for (const k of negativos) {
      const v = String(formData.get(k) ?? "").trim();
      if (v !== "" && Number(v) < 0) {
        toast.error("Valores monetários não podem ser negativos.");
        return;
      }
    }
    await atualizarSocioAction(formData);
  }

  return (
    <form
      ref={formRef}
      action={safeAction}
      onChange={editavel ? onAnyChange : undefined}
      className="p-4 space-y-4"
    >
      <input type="hidden" name="id" value={socio.id} />

      {/* Banner: impacto da edição nos cenários DRAFT */}
      {editavel && cenariosDraftCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 inline-flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Mudanças nos campos marcados como <strong>afeta cálculo</strong> abaixo
            sinalizam <strong>{cenariosDraftCount} cenário(s) DRAFT</strong> pra
            recalcular. Cenários publicados (APPLIED) não são tocados (snapshot imutável).
          </span>
        </div>
      )}

      {!editavel && (
        <div className="text-xs text-neutral-600 inline-flex items-center gap-1.5 bg-neutral-100 rounded px-2 py-1">
          <Lock className="h-3 w-3" /> Somente leitura — sem permissão de edição.
        </div>
      )}

      {/* Grupo 1: Classificação */}
      <fieldset
        className="border border-neutral-200 rounded-md bg-white p-3 space-y-2"
        disabled={!editavel}
      >
        <GroupLegend titulo="Classificação" impacto="afeta-calculo" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Área de prática" htmlFor={`area-${socio.id}`}>
            <NativeSelect
              id={`area-${socio.id}`}
              name="areaPraticaId"
              defaultValue={socio.areaPraticaId ?? ""}
              key={`area-${socio.id}-${socio.areaPraticaId ?? "x"}`}
            >
              <option value="">— sem área —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Classificação (DSF v1)" htmlFor={`pub-${socio.id}`}>
            <NativeSelect
              id={`pub-${socio.id}`}
              name="publicoDefault"
              value={publicoSelecionado}
              onChange={(e) => setPublicoSelecionado(e.target.value)}
            >
              {PUBLICOS.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </NativeSelect>
          </Field>

          {ehLider ? (
            <Field label="Unidade liderada" htmlFor={`un-${socio.id}`} required>
              <NativeSelect
                id={`un-${socio.id}`}
                name="unidadeLideradaId"
                defaultValue={socio.unidadeLideradaId ?? ""}
                key={`un-${socio.id}-${socio.unidadeLideradaId ?? "x"}`}
                required
              >
                <option value="">— escolher —</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>{u.codigo} — {u.nome}</option>
                ))}
              </NativeSelect>
            </Field>
          ) : (
            // Mantém hidden pra zerar caso classificação mude pra não-líder.
            <input type="hidden" name="unidadeLideradaId" value="" />
          )}
        </div>
      </fieldset>

      {/* Grupo 2: Cargo */}
      <fieldset
        className="border border-neutral-200 rounded-md bg-white p-3 space-y-2"
        disabled={!editavel}
      >
        <GroupLegend titulo="Cargo" impacto="afeta-calculo" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Nível de cargo" htmlFor={`nv-${socio.id}`}>
            <NativeSelect
              id={`nv-${socio.id}`}
              name="nivelCargo"
              defaultValue={socio.nivelCargo ?? ""}
              key={`nv-${socio.id}-${socio.nivelCargo ?? "x"}`}
            >
              <option value="">— sem nível —</option>
              {NIVEIS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Faixa salarial" htmlFor={`fx-${socio.id}`}>
            <NativeSelect
              id={`fx-${socio.id}`}
              name="faixaSalarial"
              defaultValue={socio.faixaSalarial ?? ""}
              key={`fx-${socio.id}-${socio.faixaSalarial ?? "x"}`}
            >
              <option value="">— sem faixa —</option>
              {FAIXAS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Quotas default (%)"
            htmlFor={`q-${socio.id}`}
            hint="Participação base; cenário pode sobrescrever."
          >
            <Input
              id={`q-${socio.id}`}
              name="percentualQuotasDefault"
              type="number"
              step="0.0001"
              min="0"
              max="100"
              defaultValue={(socio.percentualQuotasDefault * 100).toFixed(4)}
              key={`q-${socio.id}-${socio.percentualQuotasDefault}`}
              className="tabular-nums"
            />
          </Field>
        </div>
      </fieldset>

      {/* Grupo 3: Remuneração — override individual */}
      <fieldset
        className="rounded-md border border-neutral-200 bg-white p-3 space-y-2"
        disabled={!editavel}
      >
        <GroupLegend titulo="Remuneração — override individual" impacto="override" />
        <p className="text-[11px] text-neutral-500 -mt-0.5">
          Deixe em branco para usar o default da premissa (Pró-labore) ou da
          tabela salarial (Rem. Gestão).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Pró-labore (R$/mês)" htmlFor={`pl-${socio.id}`}>
            <MoneyField
              id={`pl-${socio.id}`}
              name="proLaboreMensal"
              initial={socio.proLaboreMensal}
              placeholder="usa premissa"
            />
          </Field>
          <Field label="Rem. Gestão (R$/mês)" htmlFor={`rg-${socio.id}`}>
            <MoneyField
              id={`rg-${socio.id}`}
              name="remuneracaoGestaoMensal"
              initial={socio.remuneracaoGestaoMensal}
              placeholder="usa tabela"
            />
          </Field>
        </div>
      </fieldset>

      {/* Grupo 4: Insumos anuais */}
      <fieldset
        className="rounded-md border border-amber-200 bg-amber-50/30 p-3 space-y-2"
        disabled={!editavel}
      >
        <GroupLegend titulo="Insumos individuais anuais (R$/ano)" impacto="afeta-calculo" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Originação anual padrão"
            htmlFor={`or-${socio.id}`}
            hint="Alimenta a Comissão de Originação no engine NOVO."
          >
            <MoneyField
              id={`or-${socio.id}`}
              name="originacaoAnualPadrao"
              initial={socio.originacaoAnualPadrao}
              placeholder="R$ 0"
            />
          </Field>
          {socio.isFundador ? (
            <Field
              label="Funding fundador anual"
              htmlFor={`ff-${socio.id}`}
              hint="Valor anual deduzido do LL e pago diretamente."
            >
              <MoneyField
                id={`ff-${socio.id}`}
                name="fundingFundadorAnual"
                initial={socio.fundingFundadorAnual}
                placeholder="R$ 0"
              />
            </Field>
          ) : (
            // Mantém hidden pra zerar o campo se sócio deixar de ser fundador
            // (estrutural — só via script — mas defensivo).
            <input type="hidden" name="fundingFundadorAnual" value="" />
          )}
        </div>
        {!socio.isFundador && (
          <p className="text-[11px] text-neutral-500">
            <em>Funding fundador</em> só aparece para sócios marcados como fundador.
          </p>
        )}
      </fieldset>

      {/* Grupo 5: Observações + status salvamento */}
      <fieldset
        className="rounded-md border border-neutral-200 bg-white p-3 space-y-2"
        disabled={!editavel}
      >
        <GroupLegend titulo="Observações" impacto="nao-afeta" />
        <Field label="Texto livre" htmlFor={`ob-${socio.id}`}>
          <Textarea
            id={`ob-${socio.id}`}
            name="observacoes"
            defaultValue={socio.observacoes ?? ""}
            key={`ob-${socio.id}-${socio.observacoes ?? "x"}`}
            maxLength={500}
            rows={2}
            placeholder="Opcional — anotações que NÃO afetam o cálculo."
          />
        </Field>
      </fieldset>

      <div className="flex items-center justify-end h-4">
        {editavel && <StatusSalvamento pending={pending} salvouAt={salvouAt} />}
      </div>
    </form>
  );
}

/** Legend padrão de fieldset com badge de impacto à direita. */
function GroupLegend({
  titulo,
  impacto,
}: {
  titulo: string;
  impacto: "afeta-calculo" | "override" | "nao-afeta";
}) {
  const config = {
    "afeta-calculo": { label: "afeta cálculo", className: "bg-peri-50 text-peri-800 border-peri-200" },
    "override": { label: "override por sócio", className: "bg-amber-50 text-amber-800 border-amber-200" },
    "nao-afeta": { label: "não afeta cálculo", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  }[impacto];

  return (
    <legend className="px-1.5 inline-flex items-center gap-2">
      <span className="text-xs font-medium text-navy-900">{titulo}</span>
      <span
        className={cn(
          "text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded border",
          config.className,
        )}
      >
        {config.label}
      </span>
    </legend>
  );
}

