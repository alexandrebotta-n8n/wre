"use client";
// Dialog "Explicar este cenário" — gera narrativa textual + botão Copiar.
import * as React from "react";
import { BookOpen, Copy, Check } from "lucide-react";
import { toast } from "sonner";
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
import { Tooltip } from "@/components/ui/tooltip";

export function ExplicacaoDialog({
  paragrafos,
  cenarioNome,
}: {
  paragrafos: string[];
  cenarioNome: string;
}) {
  const [copiado, setCopiado] = React.useState(false);

  const textoCru = paragrafos.map((p) => p.replace(/\*\*/g, "")).join("\n\n");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoCru);
      setCopiado(true);
      toast.success("Narrativa copiada para a área de transferência.");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto manualmente.");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Tooltip
          side="bottom"
          content={
            <>
              <strong>Explicar este cenário</strong>: gera uma narrativa em texto contando
              como o total anual foi formado — premissas, blocos, créditos, fundadores, prêmios.
              Útil para apresentar ao Comitê ou comparar com outro cenário.
            </>
          }
        >
          <Button variant="outline" size="sm">
            <BookOpen className="h-3.5 w-3.5" /> Explicar
          </Button>
        </Tooltip>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Como o total anual foi formado · {cenarioNome}</DialogTitle>
          <DialogDescription>
            Narrativa gerada a partir do trace de cálculo. Lista as etapas econômicas
            (pró-labore, gestão, blocos, créditos, fundadores) e seus valores agregados.
            Útil para apresentar ao Comitê.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-neutral-800 leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
          {paragrafos.map((p, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: renderInlineMd(p) }} />
          ))}
        </div>
        <DialogFooter className="gap-2 pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">Fechar</Button>
          </DialogClose>
          <Button type="button" variant="primary" size="sm" onClick={copiar}>
            {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiado ? "Copiado" : "Copiar texto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Converte **bold** em <strong>. Texto vem do servidor (lib/explicacao/narrativa.ts), confiável. */
function renderInlineMd(s: string): string {
  // Escape HTML básico
  const esc = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-navy-900">$1</strong>');
}
