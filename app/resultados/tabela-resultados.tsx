"use client";
// Tabela editável de Resultados — uma linha por (período × unidade).
// Edição inline: clica no valor, abre dialog de edição.
import * as React from "react";
import { useTransition } from "react";
import { Pencil, Trash2, HelpCircle, CheckCircle2, Clock } from "lucide-react";
import { brl } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { salvarResultadoAction, excluirResultadoAction } from "./acoes";

interface Periodo { id: string; tipo: string; ano: number; trimestre: number | null; rotulo: string }
interface Unidade { id: string; codigo: string; nome: string; isMatriz: boolean }
interface ResultadoBruto {
  id: string;
  unidadeId: string;
  periodoId: string;
  lucroLiquido: number;
  fundingVariavel: number | null;
  ehReal: boolean;
  fonte: string | null;
}

export function TabelaResultados({
  periodos,
  unidades,
  mapa,
}: {
  periodos: Periodo[];
  unidades: Unidade[];
  mapa: Record<string, ResultadoBruto>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-navy-900 border-b-2 border-neutral-200 sticky left-0 bg-neutral-50 z-10">
              <span className="inline-flex items-center gap-1">
                Período
                <Tooltip content="Período de apuração — trimestre ou ano. Pode ser histórico (real) ou projeção (orçado).">
                  <HelpCircle className="h-3 w-3 text-neutral-400" />
                </Tooltip>
              </span>
            </th>
            {unidades.map((u) => (
              <th
                key={u.id}
                className="px-3 py-2 text-left font-semibold text-navy-900 border-b-2 border-neutral-200 min-w-[200px]"
              >
                <div className="inline-flex items-center gap-1.5">
                  {u.nome}
                  {u.isMatriz && <Badge variant="navy" size="sm">matriz</Badge>}
                </div>
                <div className="text-[10px] text-neutral-500 font-normal mt-0.5">
                  cód. {u.codigo}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periodos.map((p) => (
            <tr key={p.id} className="even:bg-neutral-50/40 hover:bg-peri-50/20">
              <td className="px-3 py-2 border-b border-neutral-100 font-semibold text-navy-900 sticky left-0 bg-inherit">
                <div>{p.rotulo}</div>
                <div className="text-[10px] text-neutral-500 font-normal">
                  {p.tipo === "ANO" ? "anual" : `T${p.trimestre} de ${p.ano}`}
                </div>
              </td>
              {unidades.map((u) => {
                const r = mapa[`${p.id}|${u.id}`];
                return (
                  <td key={u.id} className="px-3 py-2 border-b border-neutral-100 align-top">
                    <CelulaResultado periodo={p} unidade={u} resultado={r} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {periodos.length === 0 && (
        <div className="text-center py-12 text-sm text-neutral-500">
          Nenhum período cadastrado. Use &ldquo;+ Novo período&rdquo; para começar.
        </div>
      )}
    </div>
  );
}

function CelulaResultado({
  periodo,
  unidade,
  resultado,
}: {
  periodo: Periodo;
  unidade: Unidade;
  resultado?: ResultadoBruto;
}) {
  if (!resultado) {
    return (
      <EditDialog periodo={periodo} unidade={unidade} resultado={undefined}>
        <button
          type="button"
          className="text-xs text-neutral-400 hover:text-peri-700 italic underline-offset-2 hover:underline"
          title="Adicionar resultado"
        >
          — adicionar
        </button>
      </EditDialog>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold tabular-nums text-navy-900">{brl(resultado.lucroLiquido, true)}</span>
        <div className="flex items-center gap-0.5">
          <EditDialog periodo={periodo} unidade={unidade} resultado={resultado}>
            <button
              type="button"
              className="p-1 rounded hover:bg-peri-100 text-neutral-400 hover:text-peri-700 transition-colors"
              title="Editar"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </EditDialog>
          <ConfirmDialog
            trigger={
              <button
                type="button"
                className="p-1 rounded hover:bg-red-100 text-neutral-400 hover:text-red-600 transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            }
            title={`Excluir resultado ${unidade.nome} · ${periodo.rotulo}?`}
            description="Esta ação remove apenas o resultado financeiro deste período/unidade. Cenários existentes podem ficar sem dados para esse período."
            action={excluirResultadoAction}
            hiddenFields={{ id: resultado.id }}
            confirmLabel="Excluir"
          />
        </div>
      </div>
      {resultado.fundingVariavel != null && (
        <div className="text-[11px] text-neutral-600 tabular-nums">
          funding: {brl(resultado.fundingVariavel, true)}
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        {resultado.ehReal ? (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="h-2.5 w-2.5" /> real
          </Badge>
        ) : (
          <Badge variant="warning" size="sm">
            <Clock className="h-2.5 w-2.5" /> orçado
          </Badge>
        )}
        {resultado.fonte && (
          <span className="text-[10px] text-neutral-500 truncate" title={resultado.fonte}>
            {resultado.fonte}
          </span>
        )}
      </div>
    </div>
  );
}

function EditDialog({
  periodo,
  unidade,
  resultado,
  children,
}: {
  periodo: Periodo;
  unidade: Unidade;
  resultado?: ResultadoBruto;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {resultado ? "Editar" : "Adicionar"} resultado · {unidade.nome}
          </DialogTitle>
          <DialogDescription>
            Período <strong>{periodo.rotulo}</strong> ({periodo.tipo === "ANO" ? "anual" : "trimestral"})
          </DialogDescription>
        </DialogHeader>
        <form
          action={(fd) => {
            start(async () => {
              await salvarResultadoAction(fd);
              setOpen(false);
            });
          }}
          className="space-y-3"
        >
          <input type="hidden" name="unidadeId" value={unidade.id} />
          <input type="hidden" name="periodoId" value={periodo.id} />

          <Field
            label={
              <span className="inline-flex items-center gap-1">
                Lucro Líquido (R$)
                <Tooltip content="Lucro líquido após impostos, despesas e custos operacionais — antes da remuneração de sócios.">
                  <HelpCircle className="h-3 w-3 text-neutral-400" />
                </Tooltip>
              </span>
            }
            htmlFor="ll"
            required
          >
            <Input
              id="ll"
              type="number"
              name="lucroLiquido"
              defaultValue={resultado?.lucroLiquido ?? 0}
              step="1000"
              required
              className="text-right tabular-nums"
            />
          </Field>

          <Field
            label={
              <span className="inline-flex items-center gap-1">
                Funding Variável (R$)
                <Tooltip content="Já descontado de pró-labore + remuneração de gestão + remuneração de fundadores. Compatível com a coluna 'FUNDING PARA VARIÁVEIS' da planilha. Opcional — se vazio, o engine deduz.">
                  <HelpCircle className="h-3 w-3 text-neutral-400" />
                </Tooltip>
              </span>
            }
            htmlFor="fv"
            hint="opcional"
          >
            <Input
              id="fv"
              type="number"
              name="fundingVariavel"
              defaultValue={resultado?.fundingVariavel ?? ""}
              step="1000"
              className="text-right tabular-nums"
            />
          </Field>

          <Field label="Fonte" htmlFor="fonte" hint="Ex: '1T2026 oficial', 'Orçamento 2026 v3'">
            <Input
              id="fonte"
              name="fonte"
              defaultValue={resultado?.fonte ?? ""}
              maxLength={120}
              placeholder="origem do dado"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="ehReal"
              defaultChecked={resultado?.ehReal ?? true}
              className="accent-peri-600"
            />
            <span>É um valor REAL (consolidado)</span>
            <Tooltip content="Marque quando for resultado já apurado oficialmente. Desmarque quando for orçamento ou projeção (aparece com badge 'orçado' na tabela).">
              <HelpCircle className="h-3 w-3 text-neutral-400" />
            </Tooltip>
          </label>

          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <SubmitButton variant="primary" disabled={pending}>
              {resultado ? "Salvar" : "Adicionar"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
