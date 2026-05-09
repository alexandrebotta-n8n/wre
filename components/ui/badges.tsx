// Badges padronizados — usam a paleta de identidade (navy/periwinkle/mint).
import type { CenarioStatus, ModeloRegra } from "@prisma/client";

export function ModeloBadge({ modelo }: { modelo: ModeloRegra }) {
  // ATUAL = navy (sistema vigente, mais "pesado")
  // NOVO  = mint (proposta nova, fresh)
  const cls = modelo === "ATUAL"
    ? "bg-navy-100 text-navy-900 ring-1 ring-navy-200 ring-inset"
    : "bg-mint-100 text-mint-900 ring-1 ring-mint-400 ring-inset";
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{modelo}</span>;
}

export function StatusBadge({ status }: { status: CenarioStatus }) {
  const cls =
    status === "DRAFT"   ? "bg-neutral-100 text-neutral-700"
    : status === "APPLIED" ? "bg-peri-100 text-peri-700 ring-1 ring-peri-200 ring-inset"
    : "bg-neutral-200 text-neutral-500";
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}
