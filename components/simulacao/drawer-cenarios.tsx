"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Menu, Plus, X, Search } from "lucide-react";
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
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge, ModeloBadge, StatusBadge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { criarCenarioAction } from "@/app/simulacao/acoes";
import { MenuCenario } from "./menu-cenario";
import type { CenarioListItem, PremissaOption } from "./types";
import { cn } from "@/lib/utils";

export function DrawerCenarios({
  cenarios,
  premissas,
  aId,
  bId,
  periodoId,
  podeMutar,
  defaultOpen,
}: {
  cenarios: CenarioListItem[];
  premissas: PremissaOption[];
  aId: string;
  bId: string;
  periodoId: string;
  podeMutar: boolean;
  defaultOpen: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(defaultOpen);
  const [novoOpen, setNovoOpen] = React.useState(false);
  const [busca, setBusca] = React.useState("");
  const [filtroModelo, setFiltroModelo] = React.useState<"" | "ATUAL" | "NOVO">("");
  const [filtroStatus, setFiltroStatus] = React.useState<"" | "DRAFT" | "APPLIED" | "ARCHIVED">("");

  const filtrados = cenarios.filter((c) => {
    if (busca && !c.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroModelo && c.modelo !== filtroModelo) return false;
    if (filtroStatus && c.status !== filtroStatus) return false;
    return true;
  });

  function abrirEm(slot: "a" | "b", cenarioId: string) {
    const params = new URLSearchParams();
    if (slot === "a") {
      params.set("a", cenarioId);
      if (bId) params.set("b", bId);
    } else {
      if (aId) params.set("a", aId);
      params.set("b", cenarioId);
    }
    if (periodoId) params.set("periodoId", periodoId);
    router.push(`/simulacao?${params.toString()}`);
    setOpen(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Menu className="h-3.5 w-3.5" />
            Cenários ({cenarios.length})
          </Button>
        </DialogTrigger>
        <DialogContent
          hideClose
          className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-screen w-full max-w-md rounded-none border-r-0 p-0 flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <div>
              <DialogTitle>Cenários ({filtrados.length}/{cenarios.length})</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Clique em &ldquo;Abrir como A&rdquo; ou &ldquo;B&rdquo; para colocar na coluna correspondente.
              </DialogDescription>
            </div>
            <DialogClose className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100" aria-label="Fechar">
              <X className="h-4 w-4" />
            </DialogClose>
          </div>

          {/* Filtros */}
          <div className="p-3 border-b border-neutral-200 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                placeholder="Buscar por nome…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <NativeSelect
                value={filtroModelo}
                onChange={(e) => setFiltroModelo(e.target.value as "" | "ATUAL" | "NOVO")}
                className="h-8 text-xs flex-1"
                aria-label="Modelo"
              >
                <option value="">Todos modelos</option>
                <option value="NOVO">Novo</option>
                <option value="ATUAL">Atual</option>
              </NativeSelect>
              <NativeSelect
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as "" | "DRAFT" | "APPLIED" | "ARCHIVED")}
                className="h-8 text-xs flex-1"
                aria-label="Status"
              >
                <option value="">Todos status</option>
                <option value="DRAFT">Rascunho</option>
                <option value="APPLIED">Publicado</option>
                <option value="ARCHIVED">Arquivado</option>
              </NativeSelect>
            </div>
            {podeMutar && (
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => setNovoOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Novo cenário
              </Button>
            )}
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filtrados.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-8">
                Nenhum cenário com esses filtros.
              </p>
            )}
            {filtrados.map((c) => {
              const isA = c.id === aId;
              const isB = c.id === bId;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-md border p-3 transition-colors",
                    isA || isB ? "border-peri-400 bg-peri-50/50" : "border-neutral-200 hover:border-peri-300",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-navy-900 truncate">{c.nome}</div>
                      <div className="text-xs text-neutral-500 truncate mt-0.5">
                        {c.premissaNome} · ano {c.ano}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ModeloBadge modelo={c.modelo} />
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {isA ? (
                      <Badge variant="info" size="sm">aberto em A</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => abrirEm("a", c.id)}>
                        Abrir como A
                      </Button>
                    )}
                    {isB ? (
                      <Badge variant="info" size="sm">aberto em B</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => abrirEm("b", c.id)}>
                        Abrir como B
                      </Button>
                    )}
                    {podeMutar && (
                      <div className="ml-auto">
                        <MenuCenario
                          cenarioId={c.id}
                          cenarioNome={c.nome}
                          status={c.status}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: novo cenário */}
      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar cenário</DialogTitle>
            <DialogDescription>
              Será criado em rascunho com classificações default. Você poderá editar tudo na coluna.
            </DialogDescription>
          </DialogHeader>
          <form action={criarCenarioAction} className="space-y-4">
            <input type="hidden" name="periodoId" value={periodoId} />
            <input type="hidden" name="outroCenarioId" value={aId || bId} />
            <Field label="Nome" htmlFor="cn-nome" required>
              <Input id="cn-nome" name="nome" required maxLength={120} placeholder="ex: NOVO 2026 — base política v1" autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ano" htmlFor="cn-ano" required>
                <Input id="cn-ano" name="ano" type="number" defaultValue={new Date().getFullYear()} min={2020} max={2100} />
              </Field>
              <Field label="Abrir em" htmlFor="cn-slot" required>
                <NativeSelect id="cn-slot" name="slot" defaultValue={aId ? "b" : "a"}>
                  <option value="a">Coluna A</option>
                  <option value="b">Coluna B</option>
                </NativeSelect>
              </Field>
            </div>
            <Field label="Modelo" htmlFor="cn-modelo" required>
              <NativeSelect id="cn-modelo" name="modelo" defaultValue="NOVO">
                <option value="NOVO">Novo (Política DSF v1)</option>
                <option value="ATUAL">Atual (Sistema 1T2026)</option>
              </NativeSelect>
            </Field>
            <Field label="Premissa" htmlFor="cn-prem" required hint="Template de parâmetros (você pode editar depois)">
              <NativeSelect id="cn-prem" name="premissaId" required defaultValue="">
                <option value="" disabled>Escolha…</option>
                <optgroup label="Modelo Novo">
                  {premissas.filter((p) => p.modelo === "NOVO").map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </optgroup>
                <optgroup label="Modelo Atual">
                  {premissas.filter((p) => p.modelo === "ATUAL").map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </optgroup>
              </NativeSelect>
            </Field>
            <DialogFooter className="gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <SubmitButton variant="primary">Criar e abrir</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
