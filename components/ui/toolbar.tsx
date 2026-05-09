import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export function Toolbar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 px-4 py-3 border-b border-neutral-200 bg-white",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SearchInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative flex-1 min-w-[180px] max-w-xs", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" aria-hidden />
      <Input className="pl-8" placeholder="Buscar…" {...props} />
    </div>
  );
}
