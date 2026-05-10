"use client";
// Modal que lista todos os alertas do cenário, traduzidos para PT-BR
// e agrupados por sócio. Acionado pelo KPI "Alertas" da coluna.
import * as React from "react";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseAlerta, severidadePeso, type SeveridadeAlerta } from "@/lib/explicacao/alertas";

export interface AlertasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cenarioNome: string;
  /** Lista de alertas crus por sócio (formato `[SEV] CODIGO: msg`). */
  alertasPorSocio: Array<{ socioNome: string; alertas: string[] }>;
}

export function AlertasDialog({
  open,
  onOpenChange,
  cenarioNome,
  alertasPorSocio,
}: AlertasDialogProps) {
  // Filtra sócios que têm pelo menos 1 alerta e ordena por gravidade.
  const itens = React.useMemo(() => {
    return alertasPorSocio
      .filter((s) => s.alertas.length > 0)
      .map((s) => ({
        socioNome: s.socioNome,
        traduzidos: s.alertas.map(parseAlerta).sort(
          (a, b) => severidadePeso(a.severidade) - severidadePeso(b.severidade),
        ),
      }))
      .sort((a, b) => {
        const ga = severidadePeso(a.traduzidos[0]?.severidade ?? "INFO");
        const gb = severidadePeso(b.traduzidos[0]?.severidade ?? "INFO");
        return ga - gb;
      });
  }, [alertasPorSocio]);

  const totals = React.useMemo(() => {
    let erros = 0;
    let warns = 0;
    let infos = 0;
    for (const { traduzidos } of itens) {
      for (const t of traduzidos) {
        if (t.severidade === "ERROR") erros++;
        else if (t.severidade === "WARNING") warns++;
        else infos++;
      }
    }
    return { erros, warns, infos };
  }, [itens]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="max-w-2xl p-0 max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-neutral-200">
          <div className="min-w-0">
            <DialogTitle className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Alertas — {cenarioNome}
            </DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              Cada alerta foi gerado pelo engine ao calcular um sócio. Erros bloqueiam Publicar; warnings só avisam.
            </DialogDescription>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {totals.erros > 0 && (
                <Badge variant="error" size="sm">
                  {totals.erros} erro{totals.erros > 1 ? "s" : ""}
                </Badge>
              )}
              {totals.warns > 0 && (
                <Badge variant="warning" size="sm">
                  {totals.warns} aviso{totals.warns > 1 ? "s" : ""}
                </Badge>
              )}
              {totals.infos > 0 && (
                <Badge variant="info" size="sm">
                  {totals.infos} info
                </Badge>
              )}
            </div>
          </div>
          <DialogClose
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {itens.length === 0 && (
            <div className="text-center py-8 text-sm text-neutral-500">
              Nenhum alerta neste cenário. ✓
            </div>
          )}
          {itens.map((it) => (
            <div key={it.socioNome} className="rounded-md border border-neutral-200 overflow-hidden">
              <div className="px-3 py-2 bg-neutral-50/70 border-b border-neutral-200 text-sm font-medium text-navy-900">
                {it.socioNome}
              </div>
              <ul className="divide-y divide-neutral-100">
                {it.traduzidos.map((a, i) => (
                  <li key={`${a.codigo}-${i}`} className="px-3 py-2.5 flex items-start gap-2.5">
                    <IconeSeveridade severidade={a.severidade} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-navy-900">{a.titulo}</span>
                        <code className="text-[10px] text-neutral-400 font-mono">{a.codigo}</code>
                      </div>
                      <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{a.descricao}</p>
                      <p className="text-xs mt-1.5">
                        <span className="font-medium text-peri-700">Como resolver: </span>
                        <span className="text-neutral-700">{a.solucao}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IconeSeveridade({ severidade }: { severidade: SeveridadeAlerta }) {
  const Icon = severidade === "ERROR" ? AlertCircle : severidade === "WARNING" ? AlertTriangle : Info;
  return (
    <Icon
      className={cn(
        "h-4 w-4 shrink-0 mt-0.5",
        severidade === "ERROR" && "text-red-600",
        severidade === "WARNING" && "text-amber-600",
        severidade === "INFO" && "text-peri-600",
      )}
      aria-hidden
    />
  );
}
