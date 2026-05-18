"use client";
// Hook + componente pra auto-submit de forms com debounce + indicador inline.
//
// Padrão usado em qualquer form que queira "salvar enquanto digita":
//
//   const { formRef, onAnyChange, pending, salvouAt } = useAutoSubmit({ delay: 600 });
//   return (
//     <form ref={formRef} onChange={onAnyChange} action={minhaAction}>
//       ...
//       <StatusSalvamento pending={pending} salvouAt={salvouAt} />
//     </form>
//   );
//
// IMPORTANTE: o hook usa "adjusting state during render" (React docs) pra
// detectar transição pending→idle sem setState em useEffect. `salvouAt` é
// contador puro (não timestamp), então não viola a regra react-hooks/purity.
import * as React from "react";
import { useState, useRef, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

export interface UseAutoSubmitOptions {
  /** Tempo de debounce em ms. Default 600. */
  delay?: number;
}

export function useAutoSubmit(options: UseAutoSubmitOptions = {}) {
  const delay = options.delay ?? 600;
  const formRef = useRef<HTMLFormElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, start] = useTransition();
  const [salvouAt, setSalvouAt] = useState<number>(0); // incrementa cada save

  // Detecta transição pending→idle via "adjusting state during render".
  const [prevPending, setPrevPending] = useState(false);
  if (prevPending && !pending) {
    setPrevPending(false);
    setSalvouAt((n) => n + 1);
  } else if (!prevPending && pending) {
    setPrevPending(true);
  }

  const onAnyChange = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (formRef.current) {
        start(() => {
          formRef.current?.requestSubmit();
        });
      }
    }, delay);
  }, [delay]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { formRef, onAnyChange, pending, salvouAt };
}

export interface StatusSalvamentoProps {
  pending: boolean;
  /** Contador incrementado a cada save completo (0 = nenhum save ainda). */
  salvouAt: number;
  /** Classes extras para customizar posicionamento. */
  className?: string;
}

/** Indicador inline "Salvando…" / "Salvo ✓" para forms com auto-save. */
export function StatusSalvamento({ pending, salvouAt, className }: StatusSalvamentoProps) {
  const [prevSalvouAt, setPrevSalvouAt] = useState(salvouAt);
  const [mostraSalvo, setMostraSalvo] = useState(false);
  if (salvouAt !== prevSalvouAt) {
    setPrevSalvouAt(salvouAt);
    setMostraSalvo(true);
  }
  React.useEffect(() => {
    if (mostraSalvo) {
      const t = setTimeout(() => setMostraSalvo(false), 3000);
      return () => clearTimeout(t);
    }
  }, [mostraSalvo]);

  if (pending) {
    return (
      <span className={"inline-flex items-center gap-1 text-[11px] text-peri-700 " + (className ?? "")}>
        <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
      </span>
    );
  }
  if (mostraSalvo && salvouAt > 0) {
    return (
      <span className={"inline-flex items-center gap-1 text-[11px] text-mint-700 " + (className ?? "")}>
        <Check className="h-3 w-3" /> Salvo
      </span>
    );
  }
  return null;
}
