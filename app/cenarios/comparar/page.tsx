import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { brl, pct, nomeOuIniciais } from "@/lib/format";
import { auth } from "@/auth";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { getModoNome } from "@/lib/preferencias";

async function selecionarAction(formData: FormData) {
  "use server";
  const a = String(formData.get("a") ?? "");
  const b = String(formData.get("b") ?? "");
  const periodoId = String(formData.get("periodoId") ?? "");
  if (a && b && periodoId) {
    redirect(`/cenarios/comparar?a=${a}&b=${b}&periodoId=${periodoId}`);
  }
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; periodoId?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const modoNome = await getModoNome();
  const [cenarios, periodos] = await Promise.all([
    prisma.cenario.findMany({
      where: escopo.ehSocioRestrito ? { status: "APPLIED" } : {},
      orderBy: [{ criadoEm: "desc" }],
      include: { premissa: { select: { nome: true } } },
      take: 100,
    }),
    prisma.periodo.findMany({
      orderBy: [{ ano: "desc" }, { trimestre: "asc" }],
      take: 50,
    }),
  ]);

  let comparacao: ReturnType<typeof construirComparacao> | null = null;
  if (sp.a && sp.b && sp.periodoId) {
    comparacao = await carregarComparacao(sp.a, sp.b, sp.periodoId, escopo.socioIdEscopo);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Comparar cenários</h1>
      <p className="text-sm text-neutral-600 mt-1">
        Diff por sócio entre dois cenários (idealmente: ATUAL × NOVO no mesmo período).
      </p>

      <form action={selecionarAction} className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select name="a" defaultValue={sp.a ?? ""} required className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="">cenário A…</option>
          {cenarios.map((c) => (
            <option key={c.id} value={c.id}>{c.nome} ({c.modelo})</option>
          ))}
        </select>
        <select name="b" defaultValue={sp.b ?? ""} required className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="">cenário B…</option>
          {cenarios.map((c) => (
            <option key={c.id} value={c.id}>{c.nome} ({c.modelo})</option>
          ))}
        </select>
        <select name="periodoId" defaultValue={sp.periodoId ?? ""} required className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="">período…</option>
          {periodos.map((p) => (
            <option key={p.id} value={p.id}>{p.rotulo}</option>
          ))}
        </select>
        <button className="rounded bg-navy-900 hover:bg-navy-700 text-white py-2 text-sm font-medium transition">Comparar</button>
      </form>

      {comparacao && (
        <section className="mt-8 rounded-lg border border-neutral-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-200 bg-peri-50 flex items-center justify-end">
            <Link
              href={`/apresentacao?a=${sp.a}&b=${sp.b}&periodoId=${sp.periodoId}`}
              className="rounded border border-peri-400 bg-white px-3 py-1.5 text-xs font-medium text-peri-700 hover:bg-peri-100 transition"
            >
              ▶ Apresentar este comparativo
            </Link>
          </div>
          <div className="px-5 py-3 border-b border-neutral-200 bg-neutral-50 grid grid-cols-3 text-sm">
            <div>
              <div className="text-xs text-neutral-500">A · {comparacao.cenarioA.modelo}</div>
              <div className="font-medium">{comparacao.cenarioA.nome}</div>
              <div className="text-neutral-700 mt-1">Total: <strong>{brl(comparacao.totalA)}</strong></div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">B · {comparacao.cenarioB.modelo}</div>
              <div className="font-medium">{comparacao.cenarioB.nome}</div>
              <div className="text-neutral-700 mt-1">Total: <strong>{brl(comparacao.totalB)}</strong></div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-500">Diff total (B − A)</div>
              <div className={`font-semibold ${comparacao.totalB - comparacao.totalA >= 0 ? "text-mint-700" : "text-red-700"}`}>
                {comparacao.totalB - comparacao.totalA >= 0 ? "+" : ""}{brl(comparacao.totalB - comparacao.totalA)}
              </div>
              {comparacao.totalA > 0 && (
                <div className="text-xs text-neutral-500">{pct((comparacao.totalB - comparacao.totalA) / comparacao.totalA)}</div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-neutral-600 text-left text-xs">
                <tr>
                  <th className="px-4 py-2 font-medium">Sócio</th>
                  <th className="px-3 py-2 font-medium text-right">Total A</th>
                  <th className="px-3 py-2 font-medium text-right">Total B</th>
                  <th className="px-3 py-2 font-medium text-right">Diff</th>
                  <th className="px-3 py-2 font-medium text-right">Diff %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {comparacao.linhas.map((l) => (
                  <tr key={l.socioId} className="hover:bg-neutral-50">
                    <td className="px-4 py-2 font-medium" title={modoNome === "iniciais" ? l.nome : undefined}>
                      {nomeOuIniciais(l.nome, modoNome)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.totalA ? brl(l.totalA, true) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.totalB ? brl(l.totalB, true) : "—"}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${l.diff >= 0 ? "text-mint-700" : "text-red-700"}`}>
                      {l.diff >= 0 ? "+" : ""}{brl(l.diff, true)}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums text-xs ${l.diff >= 0 ? "text-mint-600" : "text-red-600"}`}>
                      {l.diffPct === null ? "—" : pct(l.diffPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!comparacao && (
        <p className="text-sm text-neutral-500 mt-6">
          Selecione 2 cenários e um período. <Link href="/cenarios" className="underline">Crie cenários</Link> se ainda não tiver.
        </p>
      )}
    </main>
  );
}

async function carregarComparacao(
  aId: string, bId: string, periodoId: string,
  socioIdEscopo: string | null,
) {
  // Se for SOCIO restrito, filtra remunerações para o próprio socioId.
  const remuneracoesWhere = socioIdEscopo
    ? { periodoId, socioId: socioIdEscopo }
    : { periodoId };
  const [a, b, periodo] = await Promise.all([
    prisma.cenario.findUnique({
      where: { id: aId },
      include: {
        remuneracoes: {
          where: remuneracoesWhere,
          include: { socio: { select: { nome: true } } },
        },
      },
    }),
    prisma.cenario.findUnique({
      where: { id: bId },
      include: {
        remuneracoes: {
          where: remuneracoesWhere,
          include: { socio: { select: { nome: true } } },
        },
      },
    }),
    prisma.periodo.findUnique({ where: { id: periodoId } }),
  ]);
  if (!a || !b || !periodo) return null;
  // SOCIO só pode comparar APPLIED.
  if (socioIdEscopo && (a.status !== "APPLIED" || b.status !== "APPLIED")) return null;
  return construirComparacao(a, b, periodo);
}

function construirComparacao(
  a: { id: string; nome: string; modelo: string; remuneracoes: Array<{ socioId: string; total: number; socio: { nome: string } }> },
  b: { id: string; nome: string; modelo: string; remuneracoes: Array<{ socioId: string; total: number; socio: { nome: string } }> },
  periodo: { rotulo: string },
) {
  const mapA = new Map(a.remuneracoes.map((r) => [r.socioId, r]));
  const mapB = new Map(b.remuneracoes.map((r) => [r.socioId, r]));
  const ids = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
  const linhas = ids.map((sid) => {
    const ra = mapA.get(sid);
    const rb = mapB.get(sid);
    const totalA = ra?.total ?? 0;
    const totalB = rb?.total ?? 0;
    return {
      socioId: sid,
      nome: ra?.socio.nome ?? rb?.socio.nome ?? "?",
      totalA,
      totalB,
      diff: totalB - totalA,
      diffPct: totalA > 0 ? (totalB - totalA) / totalA : null,
    };
  });
  linhas.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
  return {
    cenarioA: { id: a.id, nome: a.nome, modelo: a.modelo },
    cenarioB: { id: b.id, nome: b.nome, modelo: b.modelo },
    periodo: { rotulo: periodo.rotulo },
    totalA: linhas.reduce((acc, l) => acc + l.totalA, 0),
    totalB: linhas.reduce((acc, l) => acc + l.totalB, 0),
    linhas,
  };
}
