"use client";
// Tabela editável de Originação por sócio × período.
// Insumo da camada "Individuais" no engine NOVO — alimenta o cálculo de
// "Comissão de Originação" (taxa × valor originado).
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
import { salvarOriginacaoAction, excluirOriginacaoAction } from "./acoes";

interface Periodo { id: string; tipo: string; ano: number; trimestre: number | null; rotulo: string }
interface Socio { id: string; nome: string; cargo: string }
interface OriginacaoBruta {
  id: string;
  socioId: string;
  periodoId: string;
  valor: number;
  ehReal: boolean;
  fonte: string | null;
}

export function TabelaOriginacao({
  periodos,
  socios,
  mapa,
}: {
  periodos: Periodo[];
  socios: Socio[];
  mapa: Record<string, OriginacaoBruta>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-navy-900 border-b-2 border-neutral-200 sticky left-0 bg-neutral-50 z-10 min-w-[180px]">
              <span className="inline-flex items-center gap-1">
                Sócio
                <Tooltip content="Cada sócio pode originar receita. O valor é multiplicado pela taxa de comissão da premissa NOVA para calcular a Comissão de Originação no cenário.">
                  <HelpCircle className="h-3 w-3 text-neutral-400" />
                </Tooltip>
              </span>
            </th>
            {periodos.map((p) => (
              <th
                key={p.id}
                className="px-3 py-2 text-left font-semibold text-navy-900 border-b-2 border-neutral-200 min-w-[180px]"
              >
                <div>{p.rotulo}</div>
                <div className="text-[10px] text-neutral-500 font-normal mt-0.5">
                  {p.tipo === "ANO" ? "anual" : `T${p.trimestre} de ${p.ano}`}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {socios.map((s) => (
            <tr key={s.id} className="even:bg-neutral-50/40 hover:bg-peri-50/20">
              <td className="px-3 py-2 border-b border-neutral-100 font-semibold text-navy-900 sticky left-0 bg-inherit">
                <div>{s.nome}</div>
                <div className="text-[10px] text-neutral-500 font-normal">{s.cargo}</div>
              </td>
              {periodos.map((p) => {
                const r = mapa[`${s.id}|${p.id}`];
                return (
                  <td key={p.id} className="px-3 py-2 border-b border-neutral-100 align-top">
                    <CelulaOriginacao socio={s} periodo={p} originacao={r} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {socios.length === 0 ? (
        <div className="text-center py-12 text-sm text-neutral-500">
          Nenhum sócio ativo. Cadastre em <a href="/socios" className="text-peri-700 hover:underline">/socios</a>.
        </div>
      ) : periodos.length === 0 ? (
        <div className="text-center py-12 text-sm text-neutral-500">
          Nenhum período cadastrado. Use &ldquo;+ Novo período&rdquo; para começar.
        </div>
      ) : null}
    </div>
  );
}

function CelulaOriginacao({
  socio,
  periodo,
  originacao,
}: {
  socio: Socio;
  periodo: Periodo;
  originacao?: OriginacaoBruta;
}) {
  if (!originacao) {
    return (
      <EditDialog socio={socio} periodo={periodo} originacao={undefined}>
        <button
          type="button"
          className="text-xs text-neutral-400 hover:text-peri-700 italic underline-offset-2 hover:underline"
          title="Adicionar originação"
        >
          — adicionar
        </button>
      </EditDialog>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold tabular-nums text-navy-900">{brl(originacao.valor, true)}</span>
        <div className="flex items-center gap-0.5">
          <EditDialog socio={socio} periodo={periodo} originacao={originacao}>
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
            title={`Excluir originação ${socio.nome} · ${periodo.rotulo}?`}
            description="Esta ação remove apenas a originação deste sócio neste período."
            action={excluirOriginacaoAction}
            hiddenFields={{ id: originacao.id }}
            confirmLabel="Excluir"
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {originacao.ehReal ? (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="h-2.5 w-2.5" /> real
          </Badge>
        ) : (
          <Badge variant="warning" size="sm">
            <Clock className="h-2.5 w-2.5" /> orçado
          </Badge>
        )}
        {originacao.fonte && (
          <span className="text-[10px] text-neutral-500 truncate" title={originacao.fonte}>
            {originacao.fonte}
          </span>
        )}
      </div>
    </div>
  );
}

function EditDialog({
  socio,
  periodo,
  originacao,
  children,
}: {
  socio: Socio;
  periodo: Periodo;
  originacao?: OriginacaoBruta;
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
            {originacao ? "Editar" : "Adicionar"} originação · {socio.nome}
          </DialogTitle>
          <DialogDescription>
            Período <strong>{periodo.rotulo}</strong> ({periodo.tipo === "ANO" ? "anual" : "trimestral"})
          </DialogDescription>
        </DialogHeader>
        <form
          action={(fd) => {
            start(async () => {
              await salvarOriginacaoAction(fd);
              setOpen(false);
            });
          }}
          className="space-y-3"
        >
          <input type="hidden" name="socioId" value={socio.id} />
          <input type="hidden" name="periodoId" value={periodo.id} />

          <Field
            label={
              <span className="inline-flex items-center gap-1">
                Valor originado (R$)
                <Tooltip content="Receita que este sócio originou no período. A comissão é calculada na simulação NOVA aplicando a taxa configurada na premissa.">
                  <HelpCircle className="h-3 w-3 text-neutral-400" />
                </Tooltip>
              </span>
            }
            htmlFor="valor"
            required
          >
            <Input
              id="valor"
              type="number"
              name="valor"
              defaultValue={originacao?.valor ?? 0}
              step="1000"
              required
              className="text-right tabular-nums"
            />
          </Field>

          <Field label="Fonte" htmlFor="fonte" hint="Ex: 'CRM 1T2026', 'Estimativa do sócio'">
            <Input
              id="fonte"
              name="fonte"
              defaultValue={originacao?.fonte ?? ""}
              maxLength={120}
              placeholder="origem do dado"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="ehReal"
              defaultChecked={originacao?.ehReal ?? true}
              className="accent-peri-600"
            />
            <span>É um valor REAL (consolidado)</span>
            <Tooltip content="Marque quando o valor já foi efetivamente originado. Desmarque quando for projeção.">
              <HelpCircle className="h-3 w-3 text-neutral-400" />
            </Tooltip>
          </label>

          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <SubmitButton variant="primary" disabled={pending}>
              {originacao ? "Salvar" : "Adicionar"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
