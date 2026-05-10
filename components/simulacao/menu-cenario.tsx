"use client";
// Menu de ações destrutivas/secundárias do cenário (⋮ dropdown).
// Usado na coluna e no drawer.
import * as React from "react";
import { useState } from "react";
import { MoreVertical, Archive, Trash2, FilePlus2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { arquivarCenarioAction, excluirCenarioAction, reabrirComoRascunhoAction } from "@/app/simulacao/acoes";

export type CenarioStatus = "DRAFT" | "APPLIED" | "ARCHIVED";

export function MenuCenario({
  cenarioId,
  cenarioNome,
  status,
  slot,
  outroCenarioId,
  size = "sm",
}: {
  cenarioId: string;
  cenarioNome: string;
  status: CenarioStatus;
  /** Slot da coluna onde o menu está aberto. Se omitido, action assume "a". */
  slot?: "a" | "b";
  /** ID do cenário aberto na outra coluna — preserva contexto após o redirect. */
  outroCenarioId?: string;
  size?: "sm" | "md";
}) {
  const [arquivarOpen, setArquivarOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [reabrirOpen, setReabrirOpen] = useState(false);

  const podeArquivar = status !== "ARCHIVED";
  const podeExcluir = status !== "APPLIED"; // APPLIED só pode arquivar
  const podeReabrir = status === "APPLIED" || status === "ARCHIVED";
  const exigeConfirmacaoForte = status === "ARCHIVED"; // arquivado tinha valor — confirma 2×

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size={size === "md" ? "sm" : "icon"} aria-label={`Ações do cenário ${cenarioNome}`}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {podeReabrir && (
            <DropdownMenuItem onSelect={() => setReabrirOpen(true)}>
              <FilePlus2 className="h-3.5 w-3.5" />
              Reabrir como rascunho
            </DropdownMenuItem>
          )}
          {podeReabrir && (podeArquivar || podeExcluir) && <DropdownMenuSeparator />}
          {podeArquivar && (
            <DropdownMenuItem onSelect={() => setArquivarOpen(true)}>
              <Archive className="h-3.5 w-3.5" />
              Arquivar
            </DropdownMenuItem>
          )}
          {podeArquivar && podeExcluir && <DropdownMenuSeparator />}
          {podeExcluir && (
            <DropdownMenuItem destructive onSelect={() => setExcluirOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </DropdownMenuItem>
          )}
          {!podeArquivar && !podeExcluir && !podeReabrir && (
            <DropdownMenuItem disabled>Nenhuma ação disponível</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog: reabrir como rascunho */}
      <Dialog open={reabrirOpen} onOpenChange={setReabrirOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reabrir como rascunho?</DialogTitle>
            <DialogDescription>
              Cria um novo cenário <strong>DRAFT</strong> com mesma premissa, parâmetros e
              classificações de &ldquo;{cenarioNome}&rdquo;. O original fica intacto como
              registro. O rascunho começa sem cálculo — recalcule depois.
            </DialogDescription>
          </DialogHeader>
          <form action={reabrirComoRascunhoAction} className="space-y-3">
            <input type="hidden" name="cenarioId" value={cenarioId} />
            {slot && <input type="hidden" name="slot" value={slot} />}
            {outroCenarioId && <input type="hidden" name="outroCenarioId" value={outroCenarioId} />}
            <Field label="Nome do novo rascunho" htmlFor={`reab-${cenarioId}`}>
              <Input
                id={`reab-${cenarioId}`}
                name="novoNome"
                defaultValue={`${cenarioNome} (cópia)`}
                maxLength={120}
                autoFocus
              />
            </Field>
            <DialogFooter className="gap-2 pt-1">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <SubmitButton variant="primary">
                <FilePlus2 className="h-3.5 w-3.5" />
                Criar rascunho
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: arquivar */}
      <Dialog open={arquivarOpen} onOpenChange={setArquivarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Arquivar &ldquo;{cenarioNome}&rdquo;?</DialogTitle>
            <DialogDescription>
              O cenário sai da lista padrão mas continua acessível via filtro &ldquo;Arquivados&rdquo;.
              Snapshot e histórico ficam preservados. Reversível mudando o filtro de status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <form action={arquivarCenarioAction}>
              <input type="hidden" name="cenarioId" value={cenarioId} />
              <SubmitButton variant="primary">Arquivar</SubmitButton>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: excluir (com confirmação forte se ARCHIVED) */}
      <Dialog open={excluirOpen} onOpenChange={setExcluirOpen}>
        <DialogContent className="max-w-md">
          {exigeConfirmacaoForte ? (
            <ExcluirComDigitar cenarioId={cenarioId} cenarioNome={cenarioNome} onClose={() => setExcluirOpen(false)} />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Excluir &ldquo;{cenarioNome}&rdquo;?</DialogTitle>
                <DialogDescription>
                  Apaga permanentemente o cenário, suas classificações e cálculos.
                  <strong className="block mt-1 text-red-700">Esta ação não pode ser desfeita.</strong>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <form action={excluirCenarioAction}>
                  <input type="hidden" name="cenarioId" value={cenarioId} />
                  <SubmitButton variant="destructive">Excluir</SubmitButton>
                </form>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Confirmação por digitação — para cenários ARCHIVED (têm histórico relevante). */
function ExcluirComDigitar({
  cenarioId,
  cenarioNome,
  onClose,
}: {
  cenarioId: string;
  cenarioNome: string;
  onClose: () => void;
}) {
  const [texto, setTexto] = useState("");
  const ok = texto.trim() === cenarioNome.trim();
  return (
    <>
      <DialogHeader>
        <DialogTitle>Excluir cenário arquivado?</DialogTitle>
        <DialogDescription>
          Cenários arquivados costumam ter valor histórico. Esta ação é{" "}
          <strong>permanente</strong> — apaga snapshot, classificações e cálculos.
          Para confirmar, digite o nome exato:
        </DialogDescription>
      </DialogHeader>
      <Field label={`Digite "${cenarioNome}" para confirmar`} htmlFor={`conf-${cenarioId}`}>
        <Input
          id={`conf-${cenarioId}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={cenarioNome}
          autoFocus
        />
      </Field>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <form action={excluirCenarioAction}>
          <input type="hidden" name="cenarioId" value={cenarioId} />
          <SubmitButton variant="destructive" disabled={!ok}>
            Excluir permanentemente
          </SubmitButton>
        </form>
      </DialogFooter>
    </>
  );
}
