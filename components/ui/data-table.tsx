import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Wrapper de tabela com scroll horizontal e sombras de borda (gradiente fade)
 * para indicar conteúdo cortado em telas estreitas. Use sticky-left
 * em colunas-chave usando classes Tailwind: `sticky left-0 bg-white z-10`.
 */
export function TableShell({ className, caption, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { caption?: string }) {
  return (
    <div className={cn("relative overflow-x-auto", className)} {...props}>
      {/* sombras de scroll laterais */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white to-transparent z-20" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-white to-transparent z-20" aria-hidden />
      <table className="w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-neutral-50/80 text-neutral-600 text-left text-xs", className)} {...props} />;
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-neutral-100", className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-peri-50/50 transition-colors", className)} {...props} />;
}

export function TH({ className, scope = "col", ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope={scope} className={cn("px-3 py-2 font-medium", className)} {...props} />;
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2 text-neutral-700", className)} {...props} />;
}
