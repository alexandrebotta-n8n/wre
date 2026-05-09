import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-9 w-full rounded-md border bg-white px-3 py-1.5 text-sm text-navy-900 shadow-sm",
        "placeholder:text-neutral-400 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400 focus-visible:border-peri-400",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50",
        invalid ? "border-red-400" : "border-neutral-300",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm",
        "placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

/** Select HTML nativo estilizado consistente com Input. Para casos simples (form actions). */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-navy-900 shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400 focus-visible:border-peri-400",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
NativeSelect.displayName = "NativeSelect";
