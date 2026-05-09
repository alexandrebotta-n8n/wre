/**
 * Marca visual do simulador — 3 quadrados empilhados nas cores da identidade
 * (navy → periwinkle → mint), espelhando o swatch fornecido.
 */
export function Logomark({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-2 w-4" : "h-1.5 w-3";
  return (
    <span className="inline-flex flex-col gap-0.5" aria-hidden>
      <span className={`block ${dim} rounded-sm bg-navy-700 ring-1 ring-peri-200/40`} />
      <span className={`block ${dim} rounded-sm bg-peri-400`} />
      <span className={`block ${dim} rounded-sm bg-mint-400`} />
    </span>
  );
}
