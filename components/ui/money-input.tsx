"use client";
// MoneyInput — input controlado com máscara monetária BRL.
//
// Comportamento:
//   - Em FOCO: edita como número simples (1500000), sem máscara.
//   - Em BLUR: formata como "R$ 1.500.000,00".
//   - Aceita valor numérico (number) e devolve number | null no onChange.
//   - Vazio = null (representa "sem valor"). Útil para campos opcionais.
//
// Hidden input opcional para form actions (name + value como número puro).
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  /** Se passar `name`, renderiza um hidden input com o valor numérico para forms. */
  name?: string;
}

const NF_BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function parseInputToNumber(raw: string): number | null {
  if (raw == null || raw.trim() === "") return null;
  // Tira tudo que não é dígito, vírgula, ponto ou sinal.
  const cleaned = raw
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "") // remove milhar BR
    .replace(",", "."); // decimal BR → US
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function MoneyInput({
  value,
  onChange,
  name,
  className,
  placeholder = "R$ 0",
  ...rest
}: MoneyInputProps) {
  const [foco, setFoco] = React.useState(false);
  const [bruto, setBruto] = React.useState<string>(
    value == null ? "" : String(Math.round(value)),
  );
  // Sincroniza `bruto` com `value` externo quando NÃO em foco — padrão
  // "adjusting state during render" (React docs), evita setState em useEffect.
  const [prevValueAjuste, setPrevValueAjuste] = React.useState<number | null | undefined>(value);
  if (!foco && prevValueAjuste !== value) {
    setPrevValueAjuste(value);
    setBruto(value == null ? "" : String(Math.round(value)));
  }

  const exibido = foco
    ? bruto
    : value == null || isNaN(value)
    ? ""
    : NF_BRL.format(value);

  return (
    <>
      <Input
        type="text"
        inputMode="numeric"
        value={exibido}
        placeholder={placeholder}
        onFocus={() => setFoco(true)}
        onBlur={() => {
          setFoco(false);
          const n = parseInputToNumber(bruto);
          onChange(n);
        }}
        onChange={(e) => {
          setBruto(e.target.value);
          // Atualiza imediatamente o número (para uso reativo do estado externo).
          const n = parseInputToNumber(e.target.value);
          onChange(n);
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

/**
 * MoneyField — wrapper que conecta MoneyInput a forms uncontrolled.
 *
 * MoneyInput é controlado (value + onChange). Pra usar em forms com
 * `<form action>` que leem FormData, este wrapper mantém estado local + o
 * hidden input `name` do MoneyInput entrega o valor numérico cru pra action.
 *
 * Auto-save: quando dentro de um form que usa `useAutoSubmit`, o onChange
 * interno do MoneyInput dispara o `onChange` do form pai naturalmente.
 *
 * Re-sync: quando a prop `initial` muda (após revalidate de save), o estado
 * sincroniza via "adjusting state during render".
 */
export function MoneyField({
  id,
  name,
  initial,
  placeholder,
  className,
  required,
}: {
  id?: string;
  name: string;
  initial: number | null;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  const [valor, setValor] = React.useState<number | null>(initial);
  const [prev, setPrev] = React.useState(initial);
  if (prev !== initial) {
    setPrev(initial);
    setValor(initial);
  }
  return (
    <MoneyInput
      id={id}
      name={name}
      value={valor}
      onChange={setValor}
      placeholder={placeholder}
      className={className}
      required={required}
    />
  );
}
