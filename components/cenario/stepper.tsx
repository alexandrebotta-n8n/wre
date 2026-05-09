import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  label: string;
  description?: string;
  /** done | current | pending | locked */
  state: "done" | "current" | "pending" | "locked";
}

export function Stepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex items-stretch flex-wrap gap-y-2">
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        const numero = i + 1;
        return (
          <li key={s.label} className="flex items-center flex-1 min-w-[140px]">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  s.state === "done" && "bg-mint-500 text-white",
                  s.state === "current" && "bg-peri-600 text-white ring-4 ring-peri-200",
                  s.state === "pending" && "bg-neutral-200 text-neutral-600",
                  s.state === "locked" && "bg-neutral-100 text-neutral-400",
                )}
                aria-hidden
              >
                {s.state === "done" ? <Check className="h-3.5 w-3.5" /> : numero}
              </span>
              <div className="min-w-0">
                <div
                  className={cn(
                    "text-sm font-medium truncate",
                    s.state === "current"
                      ? "text-navy-900"
                      : s.state === "done"
                      ? "text-neutral-700"
                      : "text-neutral-500",
                  )}
                >
                  {s.label}
                </div>
                {s.description && (
                  <div className="text-xs text-neutral-500 truncate">{s.description}</div>
                )}
              </div>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "mx-3 flex-1 h-0.5 rounded-full",
                  s.state === "done" ? "bg-mint-400" : "bg-neutral-200",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
