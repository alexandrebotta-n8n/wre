"use client";
// Drawer (sheet) com tabela editável de classificações do cenário.
// Usa batch-save: usuário edita várias linhas, clica "Salvar tudo".
import * as React from "react";
import { useState } from "react";
import { Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { atualizarClassificacoesAction } from "@/app/simulacao/acoes";
import type { Publico } from "@/lib/domain/dsf";

const PUBLICOS: Publico[] = [
  "SOCIO_CAPITAL",
  "SOCIO_CAPITAL_GESTOR",
  "SOCIO_CAPITAL_LIDER_UNIDADE",
  "SOCIO_SERVICOS",
  "SOCIO_SERVICOS_ESTRATEGICO",
  "LIDER_UNIDADE_NON_EQUITY",
  "LIDER_TECNICO",
  "FUNDADOR",
];

const PUBLICOS_LABEL: Record<Publico, string> = {
  SOCIO_CAPITAL: "Sócio de Capital",
  SOCIO_CAPITAL_GESTOR: "Sócio de Capital — Gestor",
  SOCIO_CAPITAL_LIDER_UNIDADE: "Sócio de Capital — Líder Un.",
  SOCIO_SERVICOS: "Sócio de Serviços",
  SOCIO_SERVICOS_ESTRATEGICO: "Sócio de Serviços Estr.",
  LIDER_UNIDADE_NON_EQUITY: "Líder de Un. Non-Equity",
  LIDER_TECNICO: "Líder Técnico",
  FUNDADOR: "Fundador",
};

export interface ClassificacaoItem {
  id: string;
  nome: string;
  cargo: string;
  publico: string;
  percentualQuotas: number;
  pesoBlocoB: number | null;
  originacaoEsperada: number;
}

export function DrawerClassificacoes({
  cenarioId,
  classificacoes,
}: {
  cenarioId: string;
  classificacoes: ClassificacaoItem[];
}) {
  const [open, setOpen] = useState(false);
  const [estado, setEstado] = useState<Record<string, ClassificacaoItem>>({});
  const dirtyIds = Object.keys(estado);

  function setCampo<K extends keyof ClassificacaoItem>(id: string, campo: K, valor: ClassificacaoItem[K]) {
    setEstado((s) => {
      const orig = classificacoes.find((c) => c.id === id);
      if (!orig) return s;
      const cur = s[id] ?? { ...orig };
      return { ...s, [id]: { ...cur, [campo]: valor } };
    });
  }

  async function salvar() {
    const payload = dirtyIds.map((id) => {
      const c = estado[id];
      return {
        id,
        publico: c.publico as Publico,
        pesoBlocoB: c.pesoBlocoB,
        originacaoEsperada: c.originacaoEsperada,
        percentualQuotas: c.percentualQuotas,
      };
    });
    const fd = new FormData();
    fd.set("cenarioId", cenarioId);
    fd.set("classificacoes", JSON.stringify(payload));
    await atualizarClassificacoesAction(fd);
    setEstado({});
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Users className="h-3.5 w-3.5" /> Classificações ({classificacoes.length})
        </Button>
      </DialogTrigger>
      <DialogContent
        hideClose
        className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-screen w-full max-w-3xl rounded-none p-0 flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <div>
            <DialogTitle>Classificações do cenário</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              Edite vários sócios e clique <strong>Salvar tudo</strong>. Recalcule depois para ver o efeito.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            {dirtyIds.length > 0 && (
              <Badge variant="warning" size="sm">{dirtyIds.length} pendente(s)</Badge>
            )}
            <Button
              variant="primary"
              size="sm"
              disabled={dirtyIds.length === 0}
              onClick={salvar}
            >
              Salvar tudo
            </Button>
            <DialogClose className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100" aria-label="Fechar">
              <X className="h-4 w-4" />
            </DialogClose>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50/80 text-neutral-600 text-xs sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Sócio</th>
                <th className="text-left px-3 py-2 font-medium">Público</th>
                <th className="text-right px-3 py-2 font-medium">Quota %</th>
                <th className="text-right px-3 py-2 font-medium">Peso B</th>
                <th className="text-right px-3 py-2 font-medium">Originação (R$/ano)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {classificacoes.map((c) => {
                const cur = estado[c.id] ?? c;
                const isDirty = !!estado[c.id];
                return (
                  <tr key={c.id} className={isDirty ? "bg-amber-50/30" : ""}>
                    <td className="px-3 py-1.5">
                      <div className="font-medium text-navy-900">{c.nome}</div>
                      <div className="text-[10px] text-neutral-500">{c.cargo}</div>
                    </td>
                    <td className="px-3 py-1.5">
                      <NativeSelect
                        value={cur.publico}
                        onChange={(e) => setCampo(c.id, "publico", e.target.value)}
                        className="h-8 text-xs w-auto min-w-[180px]"
                      >
                        {PUBLICOS.map((p) => (
                          <option key={p} value={p}>{PUBLICOS_LABEL[p]}</option>
                        ))}
                      </NativeSelect>
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        step="0.0001"
                        defaultValue={(cur.percentualQuotas * 100).toFixed(4)}
                        onChange={(e) => setCampo(c.id, "percentualQuotas", Number(e.target.value) / 100)}
                        className="h-8 text-right text-xs tabular-nums w-[90px]"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        defaultValue={cur.pesoBlocoB ?? ""}
                        onChange={(e) => setCampo(c.id, "pesoBlocoB", e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="1.0"
                        className="h-8 text-right text-xs tabular-nums w-[70px]"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        step="10000"
                        min="0"
                        defaultValue={cur.originacaoEsperada || ""}
                        onChange={(e) => setCampo(c.id, "originacaoEsperada", Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 text-right text-xs tabular-nums w-[120px]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
