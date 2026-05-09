import * as React from "react";
import { cn } from "@/lib/utils";

export function StickyActions({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-4 sm:-mx-6 mt-8 px-4 sm:px-6 py-3 border-t shadow-[0_-4px_12px_-8px_rgba(0,0,0,0.15)] flex items-center gap-2 flex-wrap",
        variant === "danger"
          ? "bg-red-50 border-red-200"
          : "bg-white/95 backdrop-blur border-neutral-200",
        className,
      )}
    >
      {children}
    </div>
  );
}
