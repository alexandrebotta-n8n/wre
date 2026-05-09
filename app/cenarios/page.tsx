import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dataHora } from "@/lib/format";
import { criarCenarioComDefaults } from "@/lib/cenario-service";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { ModeloBadge, StatusBadge } from "@/components/ui/badges";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";

async function criar(formData: FormData) {
  "use server";
  const session = await auth();
  const nome = String(formData.get("nome") ?? "").trim();
  const ano = Number(formData.get("ano") ?? new Date().getFullYear());
  const modelo = String(formData.get("modelo") ?? "ATUAL") as "ATUAL" | "NOVO";
  const premissaId = String(formData.get("premissaId") ?? "");
  if (!nome || !premissaId) return;
  const c = await criarCenarioComDefaults({
    nome, ano, modelo, premissaId,
    criadoPorId: session?.user?.id,
  });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "cenario.criar",
    recurso: `Cenario:${c.id}`,
    meta: { nome, ano, modelo },
  });
  redirect(`/cenarios/${c.id}`);
}

export default async function CenariosPage() {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const [cenarios, premissas] = await Promise.all([
    prisma.cenario.findMany({
      where: escopo.ehSocioRestrito ? { status: "APPLIED" } : {},
      orderBy: [{ criadoEm: "desc" }],
      include: { premissa: { select: { nome: true } } },
      take: 100,
    }),
    escopo.podeMutar
      ? prisma.premissa.findMany({ where: { ativa: true }, take: 50 })
      : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Cenários</h1>
          <p className="text-sm text-neutral-600 mt-1">{cenarios.length} cenários criados</p>
        </div>
      </div>

      {/* Form de criação — apenas para perfis com mutação */}
      {escopo.podeMutar && (
      <form
        action={criar}
        className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 grid grid-cols-1 sm:grid-cols-5 gap-3"
      >
        <input
          name="nome" placeholder="Nome (ex: NOVO 2026 — base política v1)"
          required maxLength={120}
          className="sm:col-span-2 rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          name="ano" type="number" defaultValue={2026} min={2020} max={2100}
          className="rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <select
          name="modelo" defaultValue="NOVO"
          className="rounded border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="ATUAL">ATUAL (1T2026)</option>
          <option value="NOVO">NOVO (Política DSF v1)</option>
        </select>
        <select
          name="premissaId" required
          className="rounded border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">premissa…</option>
          {premissas.map((p) => (
            <option key={p.id} value={p.id}>{p.nome} ({p.modelo})</option>
          ))}
        </select>
        <button
          type="submit"
          className="sm:col-span-5 rounded bg-navy-900 hover:bg-navy-700 text-white py-2 text-sm font-medium transition"
        >
          Criar cenário (gera classificações default)
        </button>
      </form>
      )}

      {/* Tabela */}
      <div className="mt-8 rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Modelo</th>
              <th className="px-4 py-2 font-medium">Ano</th>
              <th className="px-4 py-2 font-medium">Premissa</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {cenarios.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-neutral-500">
                Nenhum cenário ainda. Crie um acima.
              </td></tr>
            )}
            {cenarios.map((c) => (
              <tr key={c.id} className="hover:bg-peri-50">
                <td className="px-4 py-2">
                  <Link href={`/cenarios/${c.id}`} className="text-peri-700 hover:text-peri-500 font-medium">{c.nome}</Link>
                </td>
                <td className="px-4 py-2"><ModeloBadge modelo={c.modelo} /></td>
                <td className="px-4 py-2 tabular-nums">{c.ano}</td>
                <td className="px-4 py-2 text-neutral-600">{c.premissa.nome}</td>
                <td className="px-4 py-2"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-2 text-neutral-500 text-xs">{dataHora(c.criadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
