"use client";
import * as React from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function NovoCenarioDialog({
  premissas,
  action,
}: {
  premissas: Array<{ id: string; nome: string; modelo: "ATUAL" | "NOVO" }>;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary" size="md">
          <Plus className="h-4 w-4" />
          Novo cenário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar cenário</DialogTitle>
          <DialogDescription>
            Será criado em <strong>rascunho</strong> com as classificações default. Você poderá
            editar tudo antes de calcular.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <Field label="Nome" htmlFor="cenario-nome" required>
            <Input
              id="cenario-nome"
              name="nome"
              required
              maxLength={120}
              placeholder="ex: NOVO 2026 — base política v1"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ano" htmlFor="cenario-ano" required>
              <Input
                id="cenario-ano"
                name="ano"
                type="number"
                defaultValue={new Date().getFullYear()}
                min={2020}
                max={2100}
              />
            </Field>
            <Field label="Modelo" htmlFor="cenario-modelo" required>
              <NativeSelect id="cenario-modelo" name="modelo" defaultValue="NOVO">
                <option value="ATUAL">Atual (1T2026)</option>
                <option value="NOVO">Novo (Política DSF v1)</option>
              </NativeSelect>
            </Field>
          </div>
          <Field label="Premissa" htmlFor="cenario-premissa" required hint="Template de parâmetros que será aplicado">
            <NativeSelect id="cenario-premissa" name="premissaId" required defaultValue="">
              <option value="" disabled>
                Escolha uma premissa…
              </option>
              <optgroup label="Modelo Novo">
                {premissas
                  .filter((p) => p.modelo === "NOVO")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Modelo Atual">
                {premissas
                  .filter((p) => p.modelo === "ATUAL")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
              </optgroup>
            </NativeSelect>
          </Field>
          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton variant="primary">Criar cenário</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
