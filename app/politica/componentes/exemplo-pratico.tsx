// Bloco de exemplo numérico/aplicado + atalho para a Simulação.
import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExemploPratico({
  titulo,
  descricao,
  hint,
}: {
  titulo: string;
  descricao: string;
  hint?: string;
}) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/40 p-5">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-800 inline-flex items-center justify-center flex-shrink-0">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-800">
            Exemplo prático
          </div>
          <h3 className="mt-0.5 font-semibold text-navy-900 text-base">{titulo}</h3>
          <p className="mt-2 text-sm text-neutral-800 leading-relaxed">{descricao}</p>
          {hint && (
            <div className="mt-4 flex items-center gap-3 flex-wrap pt-3 border-t border-amber-200/60">
              <p className="text-xs text-neutral-700 italic flex-1 min-w-0">{hint}</p>
              <Button asChild size="sm" variant="primary">
                <Link href="/simulacao">
                  Simular este caso <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
