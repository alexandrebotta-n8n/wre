"use client";
// PercentInput — input controlado para percentuais.
//
// Padrão: o valor interno é uma fração [0..1], mas exibe e edita em % (0..100).
// Em FOCO: edita como "45" ou "12,5".
// Em BLUR: formata como "45,0%" / "12,5%".
//
// Props:
//   - value: number | null (fração 0..1)
//   - onChange: (v: number | null) => void  (recebe fração 0..1)
//   - max: limite superior em PERCENTUAL (default 100)
//   - decimals: casas decimais (default 1)
//
// Hidden input opcional via `name` envia a FRAÇÃO (ex: 0.45) para forms.
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PercentInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  name?: string;
  /** Máximo em pontos percentuais (default 100). */
  maxPct?: number;
  /** Casas decimais no display (default 1). */
  decimals?: number;
}

function parsePct(raw: string): number | null {
  if (raw == null || raw.trim() === "") return null;
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function PercentInput({
  value,
  onChange,
  name,
  className,
  placeholder = "0%",
  maxPct = 100,
  decimals = 1,
  ...rest
}: PercentInputProps) {
  const [foco, setFoco] = React.useState(false);
  // Bruto guarda em PERCENTUAL (string)
  const [bruto, setBruto] = React.useState<string>(
    value == null ? "" : (value * 100).toFixed(decimals).replace(".", ","),
  );
  // Adjust state during render quando value externo mudar e não estivermos em foco.
  const [prev, setPrev] = React.useState<number | null | undefined>(value);
  if (!foco && prev !== value) {
    setPrev(value);
    setBruto(value == null ? "" : (value * 100).toFixed(decimals).replace(".", ","));
  }

  const exibido = foco
    ? bruto
    : value == null || isNaN(value)
    ? ""
    : `${(value * 100).toFixed(decimals).replace(".", ",")}%`;

  return (
    <>
      <Input
        type="text"
        inputMode="decimal"
        value={exibido}
        placeholder={placeholder}
        onFocus={() => setFoco(true)}
        onBlur={() => {
          setFoco(false);
          const pct = parsePct(bruto);
          if (pct == null) {
            onChange(null);
          } else {
            const clamped = Math.max(0, Math.min(maxPct, pct));
            onChange(clamped / 100);
          }
        }}
        onChange={(e) => {
          setBruto(e.target.value);
          const pct = parsePct(e.target.value);
          if (pct == null) onChange(null);
          else onChange(Math.max(0, Math.min(maxPct, pct)) / 100);
        }}
        className={cn("text-right tabular-nums", className)}
        {...rest}
      />
      {name && (
        <input
          type="hidden"
          name={name}
          value={value == null || isNaN(value) ? "" : String(value)}
        />
      )}
    </>
  );
}
