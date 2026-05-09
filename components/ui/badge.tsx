import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { CenarioStatus, ModeloRegra } from "@prisma/client";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-neutral-100 text-neutral-700 ring-neutral-200",
        info: "bg-peri-50 text-peri-700 ring-peri-200",
        success: "bg-mint-100 text-mint-900 ring-mint-400/60",
        warning: "bg-amber-50 text-amber-800 ring-amber-200",
        error: "bg-red-50 text-red-700 ring-red-200",
        outline: "bg-white text-neutral-600 ring-neutral-300",
        navy: "bg-navy-100 text-navy-900 ring-navy-200",
      },
      size: {
        sm: "px-1.5 py-0 text-[10px]",
        md: "px-2 py-0.5 text-xs",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

/** ATUAL=navy (sistema vigente), NOVO=mint (proposta) */
export function ModeloBadge({ modelo }: { modelo: ModeloRegra }) {
  return (
    <Badge variant={modelo === "ATUAL" ? "navy" : "success"}>
      {modelo === "ATUAL" ? "Atual" : "Novo"}
    </Badge>
  );
}

const STATUS_LABEL: Record<CenarioStatus, string> = {
  DRAFT: "Rascunho",
  APPLIED: "Publicado",
  ARCHIVED: "Arquivado",
};

export function StatusBadge({ status }: { status: CenarioStatus }) {
  const variant: BadgeProps["variant"] =
    status === "DRAFT" ? "neutral" : status === "APPLIED" ? "info" : "outline";
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}
