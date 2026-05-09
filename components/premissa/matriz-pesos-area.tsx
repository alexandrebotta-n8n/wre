"use client";
// Matriz de pesos por área (8 linhas × 2 colunas: Orgânico / Incremental)
// + mix Orgânico/Incremental.
// Cada input renderiza como `name="pesoOrg-<codigo>"` e `name="pesoInc-<codigo>"`
// para o Server Action recompor o objeto pesosPorArea.
import { useEffect, useMemo, useRef, useState } from "react";

interface Area {
  codigo: string;
  nome: string;
}

interface Pesos {
  mixOrganico: number;
  mixIncremental: number;
  pesosOrganico: Record<string, number>;
  pesosIncremental: Record<string, number>;
}

interface Props {
  areas: Area[];
  defaults?: Pesos;
}

const PESOS_VAZIO_DEFAULT: Pesos = {
  mixOrganico: 0.76,
  mixIncremental: 0.24,
  pesosOrganico: {},
  pesosIncremental: {},
};

export function MatrizPesosArea({ areas, defaults }: Props) {
  const d = defaults ?? PESOS_VAZIO_DEFAULT;
  const formRef = useRef<HTMLDivElement>(null);
  const [somaOrg, setSomaOrg] = useState(0);
  const [somaInc, setSomaInc] = useState(0);
  const [somaMix, setSomaMix] = useState(0);

  const areasKey = useMemo(() => areas.map((a) => a.codigo).join(","), [areas]);

  useEffect(() => {
    const root = formRef.current?.closest("form");
    if (!root) return;
    const recalc = () => {
      let sOrg = 0, sInc = 0, sMix = 0;
      for (const a of areas) {
        const o = root.querySelector<HTMLInputElement>(`[name="pesoOrg-${a.codigo}"]`);
        const i = root.querySelector<HTMLInputElement>(`[name="pesoInc-${a.codigo}"]`);
        sOrg += Number(o?.value ?? 0) || 0;
        sInc += Number(i?.value ?? 0) || 0;
      }
      const mO = root.querySelector<HTMLInputElement>(`[name="mixOrganico"]`);
      const mI = root.querySelector<HTMLInputElement>(`[name="mixIncremental"]`);
      sMix = (Number(mO?.value ?? 0) || 0) + (Number(mI?.value ?? 0) || 0);
      setSomaOrg(sOrg);
      setSomaInc(sInc);
      setSomaMix(sMix);
    };
    recalc();
    root.addEventListener("input", recalc);
    return () => root.removeEventListener("input", recalc);
  }, [areasKey, areas]);

  return (
    <div ref={formRef} className="space-y-4">
      {/* Mix Orgânico/Incremental */}
      <div>
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
          Mix Orgânico × Incremental (deve somar 1.0)
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center">
          <Field label="Mix Orgânico">
            <Num name="mixOrganico" defaultValue={d.mixOrganico} step="0.01" />
          </Field>
          <Field label="Mix Incremental">
            <Num name="mixIncremental" defaultValue={d.mixIncremental} step="0.01" />
          </Field>
          <Badge ok={Math.abs(somaMix - 1) <= 0.001} valor={somaMix} alvo={1} rotulo="mix" />
        </div>
      </div>

      {/* Tabela de pesos */}
      <div>
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
          Peso por área de prática (cada coluna deve somar 1.0)
        </div>
        <div className="overflow-hidden rounded border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600 text-xs">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Área</th>
                <th className="text-right px-3 py-2 font-medium">Peso Orgânico</th>
                <th className="text-right px-3 py-2 font-medium">Peso Incremental</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {areas.map((a) => (
                <tr key={a.codigo} className="hover:bg-peri-50">
                  <td className="px-3 py-1.5 font-medium text-navy-900">{a.nome}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Num
                      name={`pesoOrg-${a.codigo}`}
                      defaultValue={d.pesosOrganico[a.codigo] ?? 0}
                      step="0.05" min="0" max="1"
                      compact
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <Num
                      name={`pesoInc-${a.codigo}`}
                      defaultValue={d.pesosIncremental[a.codigo] ?? 0}
                      step="0.05" min="0" max="1"
                      compact
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-50 text-xs">
              <tr>
                <td className="px-3 py-2 text-neutral-600 font-medium">Σ</td>
                <td className="px-3 py-2 text-right">
                  <Badge ok={Math.abs(somaOrg - 1) <= 0.001} valor={somaOrg} alvo={1} rotulo="orgânico" />
                </td>
                <td className="px-3 py-2 text-right">
                  <Badge ok={Math.abs(somaInc - 1) <= 0.001} valor={somaInc} alvo={1} rotulo="incremental" />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          Aplicado quando <strong>distribuição do Bloco B = POR_AREA</strong>. Sócios sem área vinculada recebem peso 0.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-700 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

interface NumProps extends React.InputHTMLAttributes<HTMLInputElement> {
  compact?: boolean;
}
function Num({ compact, ...props }: NumProps) {
  return (
    <input
      type="number" required {...props}
      className={`rounded border border-neutral-300 px-2 py-1 text-xs tabular-nums focus:border-peri-400 focus:outline-none focus:ring-1 focus:ring-peri-400 ${compact ? "w-20 text-right" : "w-full px-3 py-2 text-sm"}`}
    />
  );
}

function Badge({ ok, valor, alvo, rotulo }: { ok: boolean; valor: number; alvo: number; rotulo: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${
        ok
          ? "bg-mint-50 text-mint-900 ring-1 ring-mint-400 ring-inset"
          : "bg-red-50 text-red-800 ring-1 ring-red-300 ring-inset"
      }`}
      title={`${rotulo}: ${valor.toFixed(2)} / ${alvo.toFixed(2)}`}
    >
      <span aria-hidden>{ok ? "✓" : "⚠"}</span>
      <span className="tabular-nums">{valor.toFixed(2)}</span>
    </span>
  );
}
