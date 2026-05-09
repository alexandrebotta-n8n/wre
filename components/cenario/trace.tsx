"use client";
// Componentes para exibir o trace de cálculo de um sócio.
// ToggleTrace: botão na coluna "Sócio" que expande/colapsa a row de trace.
// TraceConteudo: a timeline propriamente dita (puro JSX, sem state).
import { useState } from "react";

interface ToggleProps {
  alvo: string; // id do <tr> que contém o trace (toggling display)
  nome: string;
  temAlerta: boolean;
}

export function ToggleTrace({ alvo, nome, temAlerta }: ToggleProps) {
  const [aberto, setAberto] = useState(false);

  const onClick = () => {
    const tr = document.getElementById(alvo);
    if (!tr) return;
    const novo = !aberto;
    setAberto(novo);
    if (novo) tr.classList.remove("hidden");
    else tr.classList.add("hidden");
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-left hover:text-peri-700 transition"
      aria-expanded={aberto}
      aria-controls={alvo}
      title="Ver passos do cálculo (etapas do Mapa Econômico)"
    >
      <span className={`text-xs select-none transition-transform ${aberto ? "rotate-90 text-peri-700" : "text-neutral-400"}`}>
        ▸
      </span>
      <span className="font-medium">{nome}</span>
      {temAlerta && <span className="text-amber-600 text-xs">●</span>}
    </button>
  );
}

interface TraceItem {
  etapa: string;
  descricao: string;
  valor?: number;
}

interface ConteudoProps {
  trace: TraceItem[];
  alertas: string[];
}

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export function TraceConteudo({ trace, alertas }: ConteudoProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
      <div>
        <h4 className="font-medium text-neutral-700 uppercase tracking-wide text-[10px] mb-2">
          Trace do cálculo (ordem de apuração)
        </h4>
        {trace.length === 0 ? (
          <p className="text-neutral-500">— nenhum passo registrado —</p>
        ) : (
          <ol className="space-y-1.5 border-l-2 border-peri-200 pl-3">
            {trace.map((t, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr_auto] gap-3 items-baseline">
                <span className="text-peri-700 font-mono text-[10px] font-medium tabular-nums">
                  {t.etapa}
                </span>
                <span className="text-neutral-700">{t.descricao}</span>
                {t.valor !== undefined && (
                  <span className="font-medium text-navy-900 tabular-nums">{fmt.format(t.valor)}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div>
        <h4 className="font-medium text-neutral-700 uppercase tracking-wide text-[10px] mb-2">
          Alertas de não-sobreposição
        </h4>
        {alertas.length === 0 ? (
          <p className="text-mint-700">✓ Nenhum alerta — ordem de apuração respeitada.</p>
        ) : (
          <ul className="space-y-1.5">
            {alertas.map((a, i) => {
              const sev = a.includes("[ERROR]") ? "ERROR"
                : a.includes("[WARNING]") ? "WARNING"
                : "INFO";
              const cor = sev === "ERROR" ? "text-red-700 bg-red-50 ring-red-200"
                : sev === "WARNING" ? "text-amber-800 bg-amber-50 ring-amber-200"
                : "text-neutral-700 bg-neutral-100 ring-neutral-200";
              return (
                <li key={i} className={`rounded ring-1 ring-inset px-2 py-1 ${cor}`}>
                  {a.replace(/^\[[A-Z]+\]\s*/, "")}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
