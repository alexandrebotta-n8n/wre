"use client";
import { Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { salvarComoPremissaAction } from "@/app/simulacao/acoes";

export function SalvarPremissaDialog({
  cenarioId,
  cenarioNome,
}: {
  cenarioId: string;
  cenarioNome: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Salvar override como nova premissa reutilizável">
          <Save className="h-3.5 w-3.5" /> Salvar como premissa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar parâmetros como premissa</DialogTitle>
          <DialogDescription>
            Os parâmetros customizados de <strong>{cenarioNome}</strong> viram uma nova premissa
            no catálogo. Outros cenários poderão usá-la como template.
          </DialogDescription>
        </DialogHeader>
        <form action={salvarComoPremissaAction} className="space-y-4">
          <input type="hidden" name="cenarioId" value={cenarioId} />
          <Field label="Nome da premissa" htmlFor={`sp-nome-${cenarioId}`} required>
            <Input
              id={`sp-nome-${cenarioId}`}
              name="nome"
              required
              maxLength={120}
              placeholder={`ex: Política DSF v2 — derivada de "${cenarioNome}"`}
              autoFocus
            />
          </Field>
          <Field label="Descrição" htmlFor={`sp-desc-${cenarioId}`}>
            <Textarea
              id={`sp-desc-${cenarioId}`}
              name="descricao"
              rows={2}
              placeholder="Opcional — contexto desta variação"
            />
          </Field>
          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <SubmitButton variant="primary">Salvar premissa</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
