// Modo apresentação — slide deck com identidade WRE/DSF.
// Recebe ?a=&b=&periodoId= e mostra cenário-A vs cenário-B (pode usar mesmo
// id em a e b para "apresentar 1 cenário" — slides comparativos não aparecem).
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { brl, pct, nomeOuIniciais } from "@/lib/format";
import { Deck } from "@/components/apresentacao/deck";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { getModoNome } from "@/lib/preferencias";

export default async function ApresentacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; periodoId?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const modoNome = await getModoNome();
  const dn = (n: string) => nomeOuIniciais(n, modoNome);

  if (!sp.a || !sp.periodoId) {
    return <SeletorApresentacao escopo={escopo.ehSocioRestrito} />;
  }

  const remuneracoesWhere = escopo.socioIdEscopo
    ? { periodoId: sp.periodoId, socioId: escopo.socioIdEscopo }
    : { periodoId: sp.periodoId };

  const [cA, cB, periodo] = await Promise.all([
    prisma.cenario.findUnique({
      where: { id: sp.a },
      include: {
        premissa: true,
        remuneracoes: { where: remuneracoesWhere, include: { socio: true } },
      },
    }),
    sp.b && sp.b !== sp.a
      ? prisma.cenario.findUnique({
          where: { id: sp.b },
          include: {
            premissa: true,
            remuneracoes: { where: remuneracoesWhere, include: { socio: true } },
          },
        })
      : Promise.resolve(null),
    prisma.periodo.findUnique({ where: { id: sp.periodoId } }),
  ]);

  if (!cA || !periodo) redirect("/apresentacao");
  if (escopo.ehSocioRestrito && cA.status !== "APPLIED") redirect("/apresentacao");

  const totalA = cA.remuneracoes.reduce((acc, r) => acc + r.total, 0);
  const totalB = cB ? cB.remuneracoes.reduce((acc, r) => acc + r.total, 0) : 0;
  const aplicarNomeRem = (rs: typeof cA.remuneracoes) =>
    rs.map((r) => ({ ...r, socio: { ...r.socio, nome: dn(r.socio.nome) } }));
  const topA = aplicarNomeRem([...cA.remuneracoes].sort((x, y) => y.total - x.total).slice(0, 10));

  // Comparativo por sócio
  type Linha = { socioId: string; nome: string; a: number; b: number; diff: number; diffPct: number | null };
  const comparativo: Linha[] = cB
    ? (() => {
        const mapA = new Map(cA.remuneracoes.map((r) => [r.socioId, r]));
        const mapB = new Map(cB.remuneracoes.map((r) => [r.socioId, r]));
        const ids = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
        return ids
          .map((sid) => {
            const ra = mapA.get(sid);
            const rb = mapB.get(sid);
            const ta = ra?.total ?? 0;
            const tb = rb?.total ?? 0;
            const nomeOriginal = ra?.socio.nome ?? rb?.socio.nome ?? "?";
            return {
              socioId: sid,
              nome: dn(nomeOriginal),
              a: ta, b: tb,
              diff: tb - ta,
              diffPct: ta > 0 ? (tb - ta) / ta : null,
            };
          })
          .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
      })()
    : [];

  // Pré-monta os slides
  const slides: React.ReactNode[] = [];

  // Slide 1 — Capa
  slides.push(
    <SlideCapa key="capa" cenarioA={cA} cenarioB={cB} periodoRotulo={periodo.rotulo} />,
  );

  // Slide 2 — Resumo executivo do A
  slides.push(
    <SlideResumo
      key="resA" titulo={cA.nome} subtitulo={`${cA.modelo} · ${cA.premissa.nome}`}
      total={totalA} numeroPacotes={cA.remuneracoes.length}
      cor="navy"
    />,
  );

  // Slide 3 — Pesos por área de prática (apenas se cenário usa POR_AREA)
  if (cA.modelo === "NOVO") {
    const params = cA.premissa.parametros as Record<string, unknown>;
    const distrib = params.distribuicaoBlocoB;
    if (distrib === "POR_AREA" && params.pesosPorArea) {
      const areas = await prisma.areaPratica.findMany({
        where: { ativa: true }, orderBy: [{ ordem: "asc" }], take: 50,
      });
      slides.push(
        <SlidePesosArea
          key="pesosArea"
          areas={areas.map((a) => ({ codigo: a.codigo, nome: a.nome }))}
          pesos={params.pesosPorArea as PesosPorArea}
        />,
      );
    }
  }

  // Slide 4 — Top sócios do A
  slides.push(
    <SlideTopSocios key="topA" titulo={`Top sócios — ${cA.nome}`} linhas={topA} />,
  );

  // Slides do B (se existir)
  if (cB) {
    slides.push(
      <SlideResumo
        key="resB" titulo={cB.nome} subtitulo={`${cB.modelo} · ${cB.premissa.nome}`}
        total={totalB} numeroPacotes={cB.remuneracoes.length}
        cor="mint"
      />,
    );
    const topB = aplicarNomeRem([...cB.remuneracoes].sort((x, y) => y.total - x.total).slice(0, 10));
    slides.push(<SlideTopSocios key="topB" titulo={`Top sócios — ${cB.nome}`} linhas={topB} />);

    // Slide comparativo agregado
    slides.push(
      <SlideComparativoTotal
        key="cmpTotal"
        nomeA={cA.nome} nomeB={cB.nome}
        modeloA={cA.modelo} modeloB={cB.modelo}
        totalA={totalA} totalB={totalB}
      />,
    );

    // Slide top diffs
    slides.push(<SlideTopDiffs key="diffs" linhas={comparativo.slice(0, 10)} />);
  }

  // Slide final — fonte de dados
  slides.push(<SlideFonte key="fim" periodo={periodo.rotulo} />);

  return (
    <Deck totalSlides={slides.length} voltarHref={cB ? "/cenarios/comparar" : `/cenarios/${cA.id}`}>
      {slides}
    </Deck>
  );
}

// ============================================================================
// Slides
// ============================================================================

function SlideCapa({
  cenarioA, cenarioB, periodoRotulo,
}: {
  cenarioA: { nome: string; modelo: "ATUAL" | "NOVO" };
  cenarioB: { nome: string; modelo: "ATUAL" | "NOVO" } | null;
  periodoRotulo: string;
}) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-12 text-center">
      <div className="flex flex-col gap-1.5" aria-hidden>
        <span className="block h-4 w-16 rounded-sm bg-navy-700 ring-1 ring-peri-200/40" />
        <span className="block h-4 w-16 rounded-sm bg-peri-400" />
        <span className="block h-4 w-16 rounded-sm bg-mint-400" />
      </div>
      <div className="mt-8 text-peri-200 text-sm uppercase tracking-[0.2em]">WRE Simulador · DSF</div>
      <h1 className="mt-3 text-5xl md:text-6xl font-bold tracking-tight">
        Simulação de remuneração
      </h1>
      <p className="mt-4 text-2xl text-peri-200">{periodoRotulo}</p>
      <div className="mt-12 flex flex-col items-center gap-3">
        <CenarioPill nome={cenarioA.nome} modelo={cenarioA.modelo} />
        {cenarioB && (
          <>
            <span className="text-mint-400 text-2xl">vs</span>
            <CenarioPill nome={cenarioB.nome} modelo={cenarioB.modelo} />
          </>
        )}
      </div>
    </div>
  );
}

function CenarioPill({ nome, modelo }: { nome: string; modelo: "ATUAL" | "NOVO" }) {
  const cls = modelo === "ATUAL" ? "bg-peri-400/20 ring-peri-400" : "bg-mint-400/20 ring-mint-400";
  return (
    <div className={`inline-flex items-center gap-3 rounded-full px-6 py-3 ring-1 ${cls}`}>
      <span className={`text-xs uppercase tracking-wider ${modelo === "ATUAL" ? "text-peri-200" : "text-mint-200"}`}>
        {modelo}
      </span>
      <span className="text-xl font-medium">{nome}</span>
    </div>
  );
}

function SlideResumo({
  titulo, subtitulo, total, numeroPacotes, cor,
}: {
  titulo: string; subtitulo: string; total: number; numeroPacotes: number;
  cor: "navy" | "mint" | "peri";
}) {
  const accent = cor === "mint" ? "text-mint-400" : cor === "peri" ? "text-peri-400" : "text-peri-200";
  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-12 text-center">
      <p className="text-peri-200 text-xs uppercase tracking-[0.2em]">Cenário</p>
      <h2 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight">{titulo}</h2>
      <p className="mt-2 text-lg text-peri-200">{subtitulo}</p>
      <div className="mt-12 grid grid-cols-2 gap-12">
        <div>
          <div className="text-xs uppercase tracking-wider text-peri-200">Total distribuído</div>
          <div className={`mt-2 text-5xl md:text-6xl font-bold tabular-nums ${accent}`}>{brl(total, true)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-peri-200">Pacotes calculados</div>
          <div className={`mt-2 text-5xl md:text-6xl font-bold tabular-nums ${accent}`}>{numeroPacotes}</div>
        </div>
      </div>
    </div>
  );
}

interface PesosPorArea {
  mixOrganico: number;
  mixIncremental: number;
  pesosOrganico: Record<string, number>;
  pesosIncremental: Record<string, number>;
}

function SlidePesosArea({
  areas, pesos,
}: {
  areas: Array<{ codigo: string; nome: string }>;
  pesos: PesosPorArea;
}) {
  // Calcula peso efetivo combinado por área = mixOrg×org + mixInc×inc
  const linhas = areas.map((a) => {
    const org = pesos.pesosOrganico[a.codigo] ?? 0;
    const inc = pesos.pesosIncremental[a.codigo] ?? 0;
    const efetivo = pesos.mixOrganico * org + pesos.mixIncremental * inc;
    return { ...a, org, inc, efetivo };
  });
  const max = Math.max(0.001, ...linhas.map((l) => l.efetivo));

  return (
    <div className="h-full w-full flex flex-col px-16 py-16">
      <p className="text-peri-200 text-xs uppercase tracking-[0.2em]">Bloco B · distribuição POR_AREA</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">Pesos por área de prática</h2>
      <p className="text-sm text-peri-200 mt-1">
        Mix Orgânico {(pesos.mixOrganico * 100).toFixed(0)}% · Incremental {(pesos.mixIncremental * 100).toFixed(0)}%
      </p>

      <div className="mt-8 flex-1 grid grid-cols-[1fr_auto_auto_auto] gap-x-6 gap-y-2 text-sm items-center">
        <div className="text-xs uppercase tracking-wider text-peri-200 pb-2 border-b border-peri-700/50">Área</div>
        <div className="text-xs uppercase tracking-wider text-peri-200 pb-2 border-b border-peri-700/50 text-right">Orgânico</div>
        <div className="text-xs uppercase tracking-wider text-peri-200 pb-2 border-b border-peri-700/50 text-right">Incremental</div>
        <div className="text-xs uppercase tracking-wider text-peri-200 pb-2 border-b border-peri-700/50 text-right">Efetivo</div>
        {linhas.map((l) => (
          <div key={l.codigo} className="contents">
            <div className="font-medium flex items-center gap-3">
              <span className="w-32 truncate">{l.nome}</span>
              <div className="flex-1 h-1.5 rounded-full bg-navy-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-peri-400 to-mint-400"
                  style={{ width: `${(l.efetivo / max) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-right tabular-nums text-peri-200">{(l.org * 100).toFixed(0)}%</div>
            <div className="text-right tabular-nums text-peri-200">{(l.inc * 100).toFixed(0)}%</div>
            <div className="text-right tabular-nums font-semibold text-mint-400">{(l.efetivo * 100).toFixed(2)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideTopSocios({
  titulo, linhas,
}: {
  titulo: string;
  linhas: Array<{ socio: { nome: string }; total: number }>;
}) {
  const max = Math.max(1, ...linhas.map((l) => l.total));
  return (
    <div className="h-full w-full flex flex-col px-16 py-16">
      <h2 className="text-3xl font-bold tracking-tight">{titulo}</h2>
      <p className="text-sm text-peri-200 mt-1">por valor total no período</p>
      <div className="mt-8 flex-1 flex flex-col gap-3">
        {linhas.map((l) => (
          <div key={l.socio.nome} className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div>
              <div className="text-base font-medium">{l.socio.nome}</div>
              <div className="mt-1 h-2 rounded-full bg-navy-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-peri-400 to-mint-400"
                  style={{ width: `${(l.total / max) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-xl font-semibold tabular-nums text-mint-400">{brl(l.total, true)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideComparativoTotal({
  nomeA, nomeB, modeloA, modeloB, totalA, totalB,
}: {
  nomeA: string; nomeB: string;
  modeloA: "ATUAL" | "NOVO"; modeloB: "ATUAL" | "NOVO";
  totalA: number; totalB: number;
}) {
  const diff = totalB - totalA;
  const diffPct = totalA > 0 ? diff / totalA : 0;
  const positivo = diff >= 0;
  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-12 text-center">
      <p className="text-peri-200 text-xs uppercase tracking-[0.2em]">Comparativo total</p>
      <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">A × B</h2>

      <div className="mt-12 grid grid-cols-3 gap-12 items-center">
        <div>
          <div className="text-xs uppercase tracking-wider text-peri-200">{modeloA}</div>
          <div className="mt-1 text-base text-peri-100">{nomeA}</div>
          <div className="mt-3 text-4xl font-bold tabular-nums text-peri-200">{brl(totalA, true)}</div>
        </div>
        <div className="text-center">
          <div className={`text-5xl font-bold tabular-nums ${positivo ? "text-mint-400" : "text-red-400"}`}>
            {positivo ? "+" : ""}{brl(diff, true)}
          </div>
          {totalA > 0 && (
            <div className={`mt-2 text-2xl tabular-nums ${positivo ? "text-mint-300" : "text-red-300"}`}>
              {positivo ? "+" : ""}{pct(diffPct)}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-peri-200">{modeloB}</div>
          <div className="mt-1 text-base text-peri-100">{nomeB}</div>
          <div className="mt-3 text-4xl font-bold tabular-nums text-mint-400">{brl(totalB, true)}</div>
        </div>
      </div>
    </div>
  );
}

function SlideTopDiffs({ linhas }: { linhas: Array<{ nome: string; a: number; b: number; diff: number; diffPct: number | null }> }) {
  return (
    <div className="h-full w-full flex flex-col px-16 py-16">
      <h2 className="text-3xl font-bold tracking-tight">Maiores impactos por sócio</h2>
      <p className="text-sm text-peri-200 mt-1">B − A, ordenado por |Δ|</p>
      <div className="mt-8 grid grid-cols-[1fr_auto_auto_auto] gap-x-6 gap-y-2 text-sm">
        <div className="text-xs uppercase tracking-wider text-peri-200 pb-2 border-b border-peri-700/50">Sócio</div>
        <div className="text-xs uppercase tracking-wider text-peri-200 pb-2 border-b border-peri-700/50 text-right">A</div>
        <div className="text-xs uppercase tracking-wider text-peri-200 pb-2 border-b border-peri-700/50 text-right">B</div>
        <div className="text-xs uppercase tracking-wider text-peri-200 pb-2 border-b border-peri-700/50 text-right">Δ</div>
        {linhas.map((l) => (
          <div key={l.nome} className="contents">
            <div className="font-medium">{l.nome}</div>
            <div className="text-right tabular-nums text-peri-200">{brl(l.a, true)}</div>
            <div className="text-right tabular-nums text-mint-300">{brl(l.b, true)}</div>
            <div className={`text-right tabular-nums font-semibold ${l.diff >= 0 ? "text-mint-400" : "text-red-400"}`}>
              {l.diff >= 0 ? "+" : ""}{brl(l.diff, true)}
              {l.diffPct !== null && (
                <span className="ml-2 text-xs text-peri-200">({l.diff >= 0 ? "+" : ""}{pct(l.diffPct)})</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideFonte({ periodo }: { periodo: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-12 text-center">
      <div className="flex gap-1" aria-hidden>
        <span className="block h-2 w-8 rounded-sm bg-navy-700" />
        <span className="block h-2 w-8 rounded-sm bg-peri-400" />
        <span className="block h-2 w-8 rounded-sm bg-mint-400" />
      </div>
      <h2 className="mt-6 text-3xl font-bold">Obrigado.</h2>
      <p className="mt-3 text-peri-200">
        Período: {periodo}
      </p>
      <p className="mt-12 text-xs text-peri-200/60">
        WRE Consultoria — Pessoas, Governança e Incentivos
      </p>
    </div>
  );
}

// ============================================================================
// Seletor inicial (quando não há ?a&periodoId)
// ============================================================================

async function SeletorApresentacao({ escopo }: { escopo: boolean }) {
  const [cenarios, periodos] = await Promise.all([
    prisma.cenario.findMany({
      where: escopo ? { status: "APPLIED" } : {},
      orderBy: [{ criadoEm: "desc" }],
      include: { premissa: { select: { nome: true } } },
      take: 100,
    }),
    prisma.periodo.findMany({
      orderBy: [{ ano: "desc" }, { trimestre: "asc" }],
      take: 50,
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Modo apresentação</h1>
      <p className="text-sm text-neutral-600 mt-1">
        Selecione 1 cenário (apresentação simples) ou 2 (comparativo) e o período.
      </p>

      <form action="/apresentacao" method="get" className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select name="a" required className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="">cenário A…</option>
          {cenarios.map((c) => (
            <option key={c.id} value={c.id}>{c.nome} ({c.modelo})</option>
          ))}
        </select>
        <select name="b" defaultValue="" className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="">— sem comparação —</option>
          {cenarios.map((c) => (
            <option key={c.id} value={c.id}>{c.nome} ({c.modelo})</option>
          ))}
        </select>
        <select name="periodoId" required className="rounded border border-neutral-300 px-3 py-2 text-sm">
          <option value="">período…</option>
          {periodos.map((p) => (
            <option key={p.id} value={p.id}>{p.rotulo}</option>
          ))}
        </select>
        <button className="sm:col-span-3 rounded bg-navy-900 hover:bg-navy-700 text-white py-2 text-sm font-medium transition">
          Iniciar apresentação ▶
        </button>
      </form>

      <p className="text-xs text-neutral-500 mt-4">
        Atalhos durante a apresentação: <kbd className="px-1 bg-neutral-200 rounded">←</kbd> / <kbd className="px-1 bg-neutral-200 rounded">→</kbd> navegar ·
        {" "}<kbd className="px-1 bg-neutral-200 rounded">F</kbd> tela cheia ·
        {" "}<kbd className="px-1 bg-neutral-200 rounded">Esc</kbd> fechar.
      </p>
      <p className="mt-2 text-xs">
        <Link href="/" className="text-peri-700 hover:underline">← voltar</Link>
      </p>
    </main>
  );
}
