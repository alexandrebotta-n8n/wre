import Link from "next/link";
import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ToggleTrace, TraceConteudo } from "@/components/cenario/trace";
import { brl, dataHora, nomeOuIniciais } from "@/lib/format";
import { getModoNome } from "@/lib/preferencias";
import { calcularCenario } from "@/lib/cenario-service";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { Publico } from "@/lib/domain/dsf";
import { ModeloBadge, StatusBadge } from "@/components/ui/badges";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";

const PUBLICOS: Publico[] = [
  "SOCIO_CAPITAL",
  "SOCIO_CAPITAL_GESTOR",
  "SOCIO_CAPITAL_LIDER_UNIDADE",
  "SOCIO_SERVICOS",
  "SOCIO_SERVICOS_ESTRATEGICO",
  "LIDER_UNIDADE_NON_EQUITY",
  "LIDER_TECNICO",
  "FUNDADOR",
];

const PUBLICOS_LABEL: Record<Publico, string> = {
  SOCIO_CAPITAL: "Sócio de Capital",
  SOCIO_CAPITAL_GESTOR: "Sócio de Capital — Gestor",
  SOCIO_CAPITAL_LIDER_UNIDADE: "Sócio de Capital — Líder Unidade",
  SOCIO_SERVICOS: "Sócio de Serviços",
  SOCIO_SERVICOS_ESTRATEGICO: "Sócio de Serviços Estratégico",
  LIDER_UNIDADE_NON_EQUITY: "Líder de Unidade Non-Equity",
  LIDER_TECNICO: "Líder Técnico",
  FUNDADOR: "Fundador",
};

async function calcularAction(formData: FormData) {
  "use server";
  const session = await auth();
  const cenarioId = String(formData.get("cenarioId"));
  const periodoId = String(formData.get("periodoId"));
  await calcularCenario({ cenarioId, periodoId });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "cenario.calcular",
    recurso: `Cenario:${cenarioId}`,
    meta: { periodoId },
  });
  revalidatePath(`/cenarios/${cenarioId}`);
}

async function atualizarClassificacaoAction(formData: FormData) {
  "use server";
  const session = await auth();
  const cenarioId = String(formData.get("cenarioId"));
  const classificacaoId = String(formData.get("classificacaoId"));
  const publico = String(formData.get("publico")) as Publico;
  const pesoBlocoBRaw = String(formData.get("pesoBlocoB") ?? "").trim();
  const originacaoRaw = String(formData.get("originacaoEsperada") ?? "").trim();
  const quotasRaw = String(formData.get("percentualQuotas") ?? "").trim();

  const data: {
    publico: Publico;
    pesoBlocoB: number | null;
    originacaoEsperada?: number;
    percentualQuotas?: number;
  } = {
    publico,
    pesoBlocoB: pesoBlocoBRaw ? Number(pesoBlocoBRaw) : null,
  };
  if (originacaoRaw) data.originacaoEsperada = Number(originacaoRaw);
  if (quotasRaw) data.percentualQuotas = Number(quotasRaw) / 100;

  await prisma.classificacaoSocio.update({
    where: { id: classificacaoId },
    data,
  });
  await prisma.cenario.update({
    where: { id: cenarioId },
    data: { versao: { increment: 1 } },
  });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "cenario.classificacao.editar",
    recurso: `Cenario:${cenarioId}`,
    meta: { classificacaoId, publico, peso: data.pesoBlocoB, originacao: data.originacaoEsperada },
  });
  revalidatePath(`/cenarios/${cenarioId}`);
}

async function aplicarAction(formData: FormData) {
  "use server";
  const session = await auth();
  const cenarioId = String(formData.get("cenarioId"));
  const cenario = await prisma.cenario.findUnique({
    where: { id: cenarioId },
    include: { classificacoes: true, remuneracoes: true, premissa: true },
  });
  if (!cenario || cenario.status !== "DRAFT") return;

  // Bloqueia aplicar se há alertas ERROR não-resolvidos.
  const erros = cenario.remuneracoes.flatMap((r) =>
    ((r.alertas as string[] | null) ?? []).filter((a) => a.includes("[ERROR]")),
  );
  if (erros.length > 0) {
    redirect(`/cenarios/${cenarioId}?erro=${encodeURIComponent(`${erros.length} alerta(s) ERROR impedem a aplicação. Corrija antes.`)}`);
  }
  // Arquiva qualquer APPLIED para (modelo, ano)
  await prisma.cenario.updateMany({
    where: { modelo: cenario.modelo, ano: cenario.ano, status: "APPLIED" },
    data: { status: "ARCHIVED" },
  });
  await prisma.cenario.update({
    where: { id: cenarioId },
    data: {
      status: "APPLIED",
      aplicadoEm: new Date(),
      snapshot: {
        cenario: { id: cenario.id, nome: cenario.nome, modelo: cenario.modelo, ano: cenario.ano },
        premissa: { id: cenario.premissa.id, nome: cenario.premissa.nome, parametros: cenario.premissa.parametros },
        classificacoes: cenario.classificacoes,
        remuneracoes: cenario.remuneracoes,
      } as never,
    },
  });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "cenario.aplicar",
    recurso: `Cenario:${cenarioId}`,
    meta: { modelo: cenario.modelo, ano: cenario.ano },
  });
  revalidatePath(`/cenarios/${cenarioId}`);
}

export default async function CenarioDetalhe({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const modoNome = await getModoNome();
  const dn = (n: string) => nomeOuIniciais(n, modoNome);

  const cenario = await prisma.cenario.findUnique({
    where: { id },
    include: {
      premissa: true,
      classificacoes: {
        where: escopo.ehSocioRestrito
          ? { socioId: escopo.socioIdEscopo ?? "__nada__" }
          : {},
        include: { socio: { include: { areaPratica: true } }, unidade: true },
        orderBy: [{ socio: { isFundador: "desc" } }, { socio: { percentualQuotasDefault: "desc" } }],
      },
      remuneracoes: {
        where: escopo.ehSocioRestrito
          ? { socioId: escopo.socioIdEscopo ?? "__nada__" }
          : {},
        include: { socio: true, periodo: true },
        orderBy: [{ total: "desc" }],
      },
    },
  });
  if (!cenario) notFound();
  // SOCIO só pode ver cenários APPLIED.
  if (escopo.ehSocioRestrito && cenario.status !== "APPLIED") notFound();

  const periodos = escopo.podeMutar
    ? await prisma.periodo.findMany({
        orderBy: [{ ano: "desc" }, { trimestre: "asc" }],
        take: 50,
      })
    : [];

  const totalPacote = cenario.remuneracoes.reduce((acc, r) => acc + r.total, 0);
  // SOCIO nunca vê edição; demais perfis editam apenas DRAFT.
  const isReadOnly = !escopo.podeMutar || cenario.status !== "DRAFT";
  // Alertas ERROR bloqueiam aplicar.
  const errosCount = cenario.remuneracoes.reduce(
    (acc, r) => acc + ((r.alertas as string[] | null) ?? []).filter((a) => a.includes("[ERROR]")).length,
    0,
  );
  const podeAplicar = escopo.podeMutar && !isReadOnly && cenario.remuneracoes.length > 0 && errosCount === 0;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="text-sm text-neutral-500">
        <Link href="/cenarios" className="hover:underline">← Cenários</Link>
      </div>

      {sp.erro && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>⚠ </strong>{sp.erro}
        </div>
      )}

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{cenario.nome}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-neutral-600">
            <ModeloBadge modelo={cenario.modelo} />
            <span>Ano {cenario.ano}</span>
            <span>·</span>
            <span>{cenario.premissa.nome}</span>
            <span>·</span>
            <StatusBadge status={cenario.status} />
            <span>·</span>
            <span>v{cenario.versao}</span>
            <span>·</span>
            <span>{dataHora(cenario.criadoEm)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cenario.remuneracoes.length > 0 && (
            <>
              <Link
                href={`/apresentacao?a=${cenario.id}&periodoId=${cenario.remuneracoes[0].periodoId}`}
                className="rounded border border-peri-400 bg-peri-50 px-4 py-2 text-sm font-medium text-peri-700 hover:bg-peri-100 transition"
                title="Modo apresentação (slides)"
              >
                ▶ Apresentar
              </Link>
              <a
                href={`/api/cenarios/${cenario.id}/exportar`}
                className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-navy-900 hover:border-peri-400 hover:bg-peri-50 transition"
              >
                ⬇ XLSX
              </a>
            </>
          )}
          {escopo.podeMutar && !isReadOnly && cenario.remuneracoes.length > 0 && (
            <form action={aplicarAction}>
              <input type="hidden" name="cenarioId" value={cenario.id} />
              <button
                className="rounded bg-peri-600 text-white px-4 py-2 text-sm font-medium hover:bg-peri-700 transition disabled:bg-neutral-300 disabled:cursor-not-allowed disabled:hover:bg-neutral-300"
                disabled={!podeAplicar}
                title={podeAplicar ? "Aplica o cenário (snapshot imutável)" : `Não é possível aplicar: ${errosCount} alerta(s) ERROR pendente(s)`}
              >
                Aplicar (snapshot imutável){errosCount > 0 ? ` · ${errosCount} ERROR` : ""}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Calcular — apenas para perfis que podem mutar */}
      {escopo.podeMutar && cenario.status === "DRAFT" && (
      <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="font-medium text-navy-900">Calcular</h2>
        <form action={calcularAction} className="mt-3 flex items-center gap-3">
          <input type="hidden" name="cenarioId" value={cenario.id} />
          <select
            name="periodoId" required
            className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-peri-400 focus:outline-none focus:ring-1 focus:ring-peri-400"
          >
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>{p.rotulo}</option>
            ))}
          </select>
          <button className="rounded bg-navy-900 hover:bg-navy-700 text-white px-4 py-2 text-sm font-medium transition">
            Calcular agora
          </button>
        </form>
      </section>
      )}

      {/* Classificações editáveis */}
      <section className="mt-8 rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <h2 className="font-medium">Classificações ({cenario.classificacoes.length})</h2>
          <span className="text-xs text-neutral-500">
            Edite público, quota %, peso (Bloco B) e originação esperada. Recalcule depois.
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white text-neutral-600 text-left text-xs">
              <tr>
                <th className="px-4 py-2 font-medium">Sócio</th>
                <th className="px-3 py-2 font-medium">Público</th>
                <th className="px-3 py-2 font-medium text-right">Quota %</th>
                <th className="px-3 py-2 font-medium text-right">Peso B</th>
                <th className="px-3 py-2 font-medium text-right">Originação (R$/ano)</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {cenario.classificacoes.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <div className="font-medium" title={modoNome === "iniciais" ? c.socio.nome : undefined}>
                      {dn(c.socio.nome)}
                    </div>
                    <div className="text-xs text-neutral-500 flex items-center gap-1.5 flex-wrap">
                      <span>{c.socio.cargo}</span>
                      {c.socio.isFundador && <span className="text-mint-700">· fundador</span>}
                      {c.socio.areaPratica && (
                        <span className="inline-block rounded bg-peri-100 text-peri-700 px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-peri-200 ring-inset">
                          {c.socio.areaPratica.nome}
                        </span>
                      )}
                    </div>
                  </td>
                  {isReadOnly ? (
                    <>
                      <td className="px-3 py-2 text-neutral-700">{PUBLICOS_LABEL[c.publico as Publico]}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{(c.percentualQuotas * 100).toFixed(4)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.pesoBlocoB ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.originacaoEsperada ? c.originacaoEsperada.toLocaleString("pt-BR") : "—"}</td>
                      <td></td>
                    </>
                  ) : (
                    <td className="px-2 py-2" colSpan={5}>
                      <form action={atualizarClassificacaoAction} className="grid grid-cols-[1fr_90px_70px_140px_60px] gap-2 items-center">
                        <input type="hidden" name="cenarioId" value={cenario.id} />
                        <input type="hidden" name="classificacaoId" value={c.id} />
                        <select
                          name="publico" defaultValue={c.publico}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs"
                        >
                          {PUBLICOS.map((p) => (
                            <option key={p} value={p}>{PUBLICOS_LABEL[p]}</option>
                          ))}
                        </select>
                        <input
                          name="percentualQuotas" type="number" step="0.0001"
                          defaultValue={(c.percentualQuotas * 100).toFixed(4)}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs text-right tabular-nums"
                          title="quota %"
                        />
                        <input
                          name="pesoBlocoB" type="number" step="0.5" min="0"
                          defaultValue={c.pesoBlocoB ?? ""}
                          placeholder="1.0"
                          className="rounded border border-neutral-300 px-2 py-1 text-xs text-right tabular-nums"
                          title="peso Bloco B (default 1)"
                        />
                        <input
                          name="originacaoEsperada" type="number" step="10000" min="0"
                          defaultValue={c.originacaoEsperada || ""}
                          placeholder="0"
                          className="rounded border border-neutral-300 px-2 py-1 text-xs text-right tabular-nums"
                          title="originação esperada anual (R$)"
                        />
                        <button className="text-xs text-peri-700 hover:text-peri-500 font-medium">salvar</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pacotes calculados */}
      {cenario.remuneracoes.length > 0 && (
        <section className="mt-8 rounded-lg border border-neutral-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <h2 className="font-medium">Pacotes calculados — {cenario.remuneracoes[0].periodo.rotulo}</h2>
            <span className="text-sm text-neutral-700">Total: <strong>{brl(totalPacote)}</strong></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white text-neutral-600 text-left text-xs">
                <tr>
                  <th className="px-4 py-2 font-medium">Sócio</th>
                  <th className="px-3 py-2 font-medium text-right">Pró-labore</th>
                  <th className="px-3 py-2 font-medium text-right">Gestão</th>
                  <th className="px-3 py-2 font-medium text-right">Fundador</th>
                  <th className="px-3 py-2 font-medium text-right">Bloco A</th>
                  <th className="px-3 py-2 font-medium text-right">Bloco B</th>
                  <th className="px-3 py-2 font-medium text-right">Pool</th>
                  <th className="px-3 py-2 font-medium text-right">Prêmio</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                  <th className="px-3 py-2 font-medium">Alertas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {cenario.remuneracoes.map((r) => {
                  const alertas = (r.alertas as string[] | null) ?? [];
                  const trace = (r.trace as Array<{ etapa: string; descricao: string; valor?: number }> | null) ?? [];
                  return (
                    <Fragment key={r.id}>
                      <tr className="hover:bg-peri-50">
                        <td className="px-4 py-2">
                          <ToggleTrace
                            alvo={`trace-${r.id}`}
                            nome={dn(r.socio.nome)}
                            temAlerta={alertas.length > 0}
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.proLabore ? brl(r.proLabore, true) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.remuneracaoGestao ? brl(r.remuneracaoGestao, true) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.remuneracaoFundador ? brl(r.remuneracaoFundador, true) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.blocoA ? brl(r.blocoA, true) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.blocoB ? brl(r.blocoB, true) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.poolUnidade ? brl(r.poolUnidade, true) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.premio ? brl(r.premio, true) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{brl(r.total, true)}</td>
                        <td className="px-3 py-2 text-xs">
                          {alertas.length === 0 ? (
                            <span className="text-mint-600" title="sem alertas">✓</span>
                          ) : (
                            <span className={alertas.some((a) => a.includes("[ERROR]")) ? "text-red-600" : "text-amber-600"}>
                              {alertas.length} alerta(s)
                            </span>
                          )}
                        </td>
                      </tr>
                      {/* Linha de trace expansível (controlada pelo ToggleTrace) */}
                      <tr id={`trace-${r.id}`} className="hidden bg-neutral-50/60">
                        <td colSpan={10} className="px-6 py-3">
                          <TraceConteudo trace={trace} alertas={alertas} />
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Sumário de alertas (resumo + dica) */}
          {(() => {
            const stats = cenario.remuneracoes.reduce(
              (acc, r) => {
                const al = (r.alertas as string[] | null) ?? [];
                acc.error += al.filter((a) => a.includes("[ERROR]")).length;
                acc.warn += al.filter((a) => a.includes("[WARNING]")).length;
                acc.info += al.filter((a) => a.includes("[INFO]")).length;
                return acc;
              },
              { error: 0, warn: 0, info: 0 },
            );
            const total = stats.error + stats.warn + stats.info;
            if (total === 0) return null;
            return (
              <div className="border-t border-neutral-200 px-5 py-3 bg-neutral-50 flex items-center gap-3 text-xs">
                <span className="text-neutral-500">Alertas (total {total}):</span>
                {stats.error > 0 && <span className="text-red-700 font-medium">● {stats.error} ERROR</span>}
                {stats.warn > 0 && <span className="text-amber-700 font-medium">● {stats.warn} WARNING</span>}
                {stats.info > 0 && <span className="text-neutral-600">● {stats.info} INFO</span>}
                <span className="text-neutral-400 ml-auto">Clique no nome de um sócio para ver o trace + alertas individuais ↑</span>
              </div>
            );
          })()}
        </section>
      )}
    </main>
  );
}
