import * as React from "react";
import { cn } from "@/lib/utils";
import { iniciais } from "@/lib/format";

const COLORS = [
  "bg-peri-200 text-peri-900",
  "bg-mint-200 text-mint-900",
  "bg-amber-100 text-amber-900",
  "bg-navy-100 text-navy-900",
  "bg-rose-100 text-rose-900",
  "bg-violet-100 text-violet-900",
  "bg-sky-100 text-sky-900",
  "bg-emerald-100 text-emerald-900",
];

function hashColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({
  nome,
  seed,
  size = "md",
  className,
}: {
  nome: string;
  /** Use o id do socio para cor estável independente do nome anonimizado. */
  seed?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const cls = hashColor(seed ?? nome);
  const ini = iniciais(nome).replace(/\./g, "").slice(0, 2) || "?";
  const dim =
    size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-xs";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold ring-1 ring-inset ring-white/40",
        cls,
        dim,
        className,
      )}
      aria-hidden
    >
      {ini}
    </span>
  );
}
