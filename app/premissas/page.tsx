import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dataHora } from "@/lib/format";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { ModeloBadge } from "@/components/ui/badges";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";

const DEFAULTS_ATUAL = {
  proLaboreMensal: 5000,
  unidadeFundadores: "BG",
  unidadeMatriz: "DSF",
  reservaPercentual: 0.05,
  reservaViraPremio: true,
};

const DEFAULTS_NOVO = {
  percentualBlocoA: 0.45, percentualBlocoB: 0.35, percentualBlocoC: 0.20,
  poolSociedade: 0.50, poolLider: 0.30, poolEquipeReserva: 0.20,
  chaveOriginacao: 0.30, chaveExecucao: 0.60, chaveGestaoCP: 0.10,
  faixaOrigMin: 0.20, faixaOrigMax: 0.40,
  faixaExecMin: 0.50, faixaExecMax: 0.70,
  faixaGestaoMin: 0.00, faixaGestaoMax: 0.15,
  proRataMinMeses: 3,
  distribuicaoBlocoB: "UNIFORME",
};

async function criarAction(formData: FormData) {
  "use server";
  const session = await auth();
  const nome = String(formData.get("nome") ?? "").trim();
  const modelo = String(formData.get("modelo") ?? "NOVO") as "ATUAL" | "NOVO";
  if (!nome) return;
  const p = await prisma.premissa.create({
    data: {
      nome,
      modelo,
      parametros: (modelo === "ATUAL" ? DEFAULTS_ATUAL : DEFAULTS_NOVO) as never,
    },
  });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "premissa.criar",
    recurso: `Premissa:${p.id}`,
    meta: { nome, modelo },
  });
  redirect(`/premissas/${p.id}`);
}

export default async function PremissasPage() {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  // SOCIO restrito não tem acesso a premissas (são detalhes internos do modelo).
  if (escopo.ehSocioRestrito) notFound();

  const premissas = await prisma.premissa.findMany({
    orderBy: [{ atualizadoEm: "desc" }],
    take: 100,
  });
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Premissas ({premissas.length})</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Templates de parâmetros (pesos, %, faixas) reutilizáveis entre cenários.
          </p>
        </div>
      </div>

      {escopo.podeMutar && (
      <form action={criarAction} className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input name="nome" required maxLength={120} placeholder="Nome (ex: Política DSF v2 — 50/30/20)"
          className="sm:col-span-2 rounded border border-neutral-300 px-3 py-2 text-sm" />
        <select name="modelo" defaultValue="NOVO" className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="NOVO">NOVO (Política DSF v1)</option>
          <option value="ATUAL">ATUAL (Sistema 1T2026)</option>
        </select>
        <button className="sm:col-span-3 rounded bg-navy-900 hover:bg-navy-700 text-white py-2 text-sm font-medium transition">
          Criar premissa (defaults — depois você edita)
        </button>
      </form>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {premissas.map((p) => (
          <Link
            key={p.id} href={`/premissas/${p.id}`}
            className="block rounded-lg border border-neutral-200 bg-white p-5 hover:border-peri-400 transition"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-navy-900">{p.nome}</h2>
              <ModeloBadge modelo={p.modelo} />
            </div>
            {p.descricao && <p className="text-sm text-neutral-600 mt-1">{p.descricao}</p>}
            <pre className="mt-3 text-xs bg-neutral-50 border border-neutral-200 rounded p-3 overflow-x-auto max-h-48">
              {JSON.stringify(p.parametros, null, 2)}
            </pre>
            <div className="text-xs text-neutral-400 mt-2">Atualizada em {dataHora(p.atualizadoEm)}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
