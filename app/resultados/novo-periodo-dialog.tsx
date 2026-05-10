"use client";
import * as React from "react";
import { Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { criarPeriodoAction } from "./acoes";

export function NovoPeriodoDialog() {
  const [open, setOpen] = React.useState(false);
  const [tipo, setTipo] = React.useState<"TRIMESTRE" | "ANO">("TRIMESTRE");
  const [ano, setAno] = React.useState(new Date().getFullYear());
  const [trimestre, setTrimestre] = React.useState(1);
  const rotuloAuto = tipo === "TRIMESTRE" ? `${trimestre}T${ano}` : `${ano}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" size="sm">
          <Plus className="h-3.5 w-3.5" /> Novo período
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar novo período</DialogTitle>
          <DialogDescription>
            Adicione um trimestre (1T, 2T, 3T, 4T) ou um período anual. Depois você lança os
            resultados na tabela.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (fd) => {
            await criarPeriodoAction(fd);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <Field label="Tipo" htmlFor="tipo" required>
            <NativeSelect
              id="tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "TRIMESTRE" | "ANO")}
            >
              <option value="TRIMESTRE">Trimestre</option>
              <option value="ANO">Ano (consolidado)</option>
            </NativeSelect>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ano" htmlFor="ano" required>
              <Input
                id="ano"
                type="number"
                name="ano"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                min={2020}
                max={2100}
                required
              />
            </Field>
            {tipo === "TRIMESTRE" && (
              <Field label="Trimestre" htmlFor="trimestre" required>
                <NativeSelect
                  id="trimestre"
                  name="trimestre"
                  value={trimestre}
                  onChange={(e) => setTrimestre(Number(e.target.value))}
                >
                  <option value={1}>1º</option>
                  <option value={2}>2º</option>
                  <option value={3}>3º</option>
                  <option value={4}>4º</option>
                </NativeSelect>
              </Field>
            )}
          </div>

          <Field label="Rótulo" htmlFor="rotulo" hint="auto-gerado, edite se preferir">
            <Input id="rotulo" name="rotulo" defaultValue={rotuloAuto} maxLength={20} required />
          </Field>

          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <SubmitButton variant="primary">Criar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
