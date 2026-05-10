"use client";
// Drawer lateral de ajuda da página /simulacao.
// TOC à esquerda + conteúdo à direita; rolagem âncora-a-âncora.
// Aceita prop `secaoInicial` para abrir em uma seção específica
// (usado por botões "?" dos sub-drawers).
import * as React from "react";
import { HelpCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECOES_AJUDA, type SecaoAjudaId } from "@/lib/ajuda/conteudo-simulacao";

export function AjudaDrawer({
  triggerLabel = "Ajuda",
  triggerVariant = "outline",
  secaoInicial,
  iconOnly = false,
}: {
  triggerLabel?: string;
  triggerVariant?: "outline" | "ghost";
  secaoInicial?: SecaoAjudaId;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [secaoAtiva, setSecaoAtiva] = React.useState<SecaoAjudaId>(
    secaoInicial ?? SECOES_AJUDA[0].id,
  );

  function abrir() {
    if (secaoInicial && secaoInicial !== secaoAtiva) setSecaoAtiva(secaoInicial);
    setOpen(true);
  }

  // Quando abre, scroll para a seção ativa.
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      document.getElementById(`ajuda-${secaoAtiva}`)?.scrollIntoView({ block: "start", behavior: "auto" });
    }, 50);
    return () => clearTimeout(t);
  }, [open, secaoAtiva]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button
            variant={triggerVariant}
            size="icon"
            aria-label="Abrir ajuda"
            title="Ajuda da Simulação"
            onClick={abrir}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant={triggerVariant} size="sm" aria-label="Abrir ajuda" onClick={abrir}>
            <HelpCircle className="h-3.5 w-3.5" />
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        hideClose
        className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-screen w-full max-w-2xl rounded-none border-r-0 p-0 flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <div>
            <DialogTitle className="inline-flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-peri-600" />
              Ajuda da Simulação
            </DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              Guia rápido do fluxo, parâmetros e termos. Para ir a fundo, links abrem{" "}
              <span className="text-peri-700">/como-funciona</span>.
            </DialogDescription>
          </div>
          <DialogClose
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100"
            aria-label="Fechar ajuda"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </div>

        <div className="flex-1 grid grid-cols-[200px_1fr] overflow-hidden">
          {/* TOC */}
          <nav className="border-r border-neutral-200 overflow-y-auto py-2">
            <ul className="space-y-0.5 px-2">
              {SECOES_AJUDA.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSecaoAtiva(s.id);
                      document
                        .getElementById(`ajuda-${s.id}`)
                        ?.scrollIntoView({ block: "start", behavior: "smooth" });
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors",
                      secaoAtiva === s.id
                        ? "bg-peri-50 text-peri-800 font-medium"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-navy-900",
                    )}
                  >
                    {s.titulo}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Conteúdo */}
          <div className="overflow-y-auto px-6 py-5 space-y-8" data-ajuda-conteudo>
            {SECOES_AJUDA.map((s) => (
              <section
                key={s.id}
                id={`ajuda-${s.id}`}
                aria-labelledby={`ajuda-titulo-${s.id}`}
                className="scroll-mt-2"
              >
                <h3
                  id={`ajuda-titulo-${s.id}`}
                  className="text-sm font-semibold text-navy-900 uppercase tracking-wider mb-2"
                >
                  {s.titulo}
                </h3>
                {s.componente()}
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
