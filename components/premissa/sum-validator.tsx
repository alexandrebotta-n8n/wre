"use client";
// Validador visual ao vivo: soma os valores de inputs com nomes determinados
// e mostra ✓ verde (mint) se bate com o alvo, ⚠ vermelho se não.
//
// Implementação leve: lê o form ancestor via ref, escuta `input` em qualquer
// child, recalcula. Não usa estado controlado nos inputs (mantém-os simples).
import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  /** Lista de `name`s dos inputs cuja soma vamos calcular. */
  names: string[];
  /** Valor alvo da soma (ex: 1.0 para Blocos A+B+C). */
  alvo: number;
  /** Casas decimais na exibição (default 2). */
  casas?: number;
  /** Tolerância — diferenças menores que isso ainda contam como ok. */
  tolerancia?: number;
  /** Rótulo descritivo (ex: "Blocos A+B+C"). */
  rotulo: string;
}

export function SumValidator({ names, alvo, casas = 2, tolerancia = 0.001, rotulo }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [soma, setSoma] = useState<number | null>(null);

  const namesKey = useMemo(() => names.join(","), [names]);

  useEffect(() => {
    const root = ref.current?.closest("form");
    if (!root) return;

    const recalcular = () => {
      let s = 0;
      for (const nome of names) {
        const el = root.querySelector<HTMLInputElement>(`[name="${nome}"]`);
        const v = el ? Number(el.value) : 0;
        if (Number.isFinite(v)) s += v;
      }
      setSoma(s);
    };

    recalcular();
    root.addEventListener("input", recalcular);
    return () => root.removeEventListener("input", recalcular);
  }, [namesKey, names]);

  if (soma === null) {
    return <div ref={ref} className="text-xs text-neutral-400">soma…</div>;
  }
  const diff = Math.abs(soma - alvo);
  const ok = diff <= tolerancia;
  return (
    <div
      ref={ref}
      className={`inline-flex items-center gap-2 rounded px-2 py-1 text-xs font-medium ${
        ok
          ? "bg-mint-50 text-mint-900 ring-1 ring-mint-400 ring-inset"
          : "bg-red-50 text-red-800 ring-1 ring-red-300 ring-inset"
      }`}
    >
      <span aria-hidden>{ok ? "✓" : "⚠"}</span>
      <span>
        {rotulo}: <span className="tabular-nums">{soma.toFixed(casas)}</span>
        <span className="text-neutral-500"> / {alvo.toFixed(casas)}</span>
      </span>
      {!ok && (
        <span className="text-red-700">
          (diff: {(soma - alvo > 0 ? "+" : "")}{(soma - alvo).toFixed(casas)})
        </span>
      )}
    </div>
  );
}
