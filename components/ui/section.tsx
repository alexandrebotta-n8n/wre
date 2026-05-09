import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Bloco de conteúdo com título sticky opcional. Use entre cards quando o
 * conteúdo for longo e o usuário precisar de orientação visual da seção.
 */
export function SectionHeading({
  className,
  level = 2,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { level?: 2 | 3 }) {
  const Comp: React.ElementType = level === 2 ? "h2" : "h3";
  return (
    <Comp
      className={cn(
        "font-semibold text-navy-900 tracking-tight",
        level === 2 ? "text-lg" : "text-base",
        className,
      )}
      {...props}
    />
  );
}
