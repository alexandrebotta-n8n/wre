// 12 visuais (server components) — um por tema. Renderização sem JS no cliente.
// Mantemos todos num único arquivo para facilitar manutenção e evitar imports
// dispersos. Ponto de entrada: <Visual k="..." />.
import {
  Compass,
  Award,
  Heart,
  Link as LinkIcon,
  Shield,
  Crown,
  Sparkles,
  CheckCircle2,
  Users,
  TrendingUp,
} from "lucide-react";
import type { VisualKey } from "./conteudo/temas";

// =====================================================================
// Roteador
// =====================================================================

export function Visual({ k }: { k: VisualKey }) {
  switch (k) {
    case "cards-principios":
      return <CardsPrincipios />;
    case "matriz-categorias":
      return <MatrizCategorias />;
    case "timeline-vesting":
      return <TimelineVesting />;
    case "diagrama-unidade":
      return <DiagramaUnidade />;
    case "funil-lateral":
      return <FunilLateral />;
    case "org-chart-governanca":
      return <OrgChartGovernanca />;
    case "waterfall-blocos":
      return <WaterfallBlocos />;
    case "donut-pool":
      return <DonutPool />;
    case "matriz-pesos":
      return <MatrizPesos />;
    case "tabela-saida":
      return <TabelaSaida />;
    case "mapa-expansao":
      return <MapaExpansao />;
    case "cards-finais":
      return <CardsFinais />;
  }
}

// =====================================================================
// 1. Princípios — grid 7 cards
// =====================================================================
const PRINCIPIOS = [
  { icone: Shield, titulo: "Institucionalidade", desc: "Decisões em órgãos formais, registradas em ata." },
  { icone: Award, titulo: "Meritocracia c/ responsabilidade", desc: "Mérito mensurável, com ônus pelas decisões." },
  { icone: Heart, titulo: "Perenidade", desc: "Preservação da Sociedade no longo prazo." },
  { icone: LinkIcon, titulo: "Alinhamento", desc: "Sócios, unidades e estratégia institucional alinhados." },
  { icone: Compass, titulo: "Discricionariedade técnica", desc: "Comitês competentes decidem com autonomia." },
  { icone: Crown, titulo: "Proteção do equity", desc: "Núcleo institucional do capital protegido." },
  { icone: Sparkles, titulo: "Marca, cultura, plataforma", desc: "Valorização do ativo institucional DSF." },
];

function CardsPrincipios() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {PRINCIPIOS.map((p, i) => {
        const I = p.icone;
        return (
          <div
            key={i}
            className="rounded-lg border border-neutral-200 p-4 hover:border-peri-300 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-peri-50 text-peri-700 inline-flex items-center justify-center flex-shrink-0">
                <I className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-navy-900">{p.titulo}</div>
                <div className="text-xs text-neutral-600 mt-0.5">{p.desc}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// 2. Categorias × mecanismos — matriz oficial Política DSF v1
// =====================================================================
// Reflete a tabela vinculante: 6 categorias × 7 mecanismos econômicos.
// Estados: D (Default), N (Não aplicável), Exc (Excepcional),
// Cond (Condicionado), Cum (Cumulativo).
type Estado = "D" | "N" | "Exc" | "Cond" | "Cum";

function MatrizCategorias() {
  const cols = [
    "Pró-labore",
    "Bloco A",
    "Bloco B",
    "Bloco C",
    "Rem. Adm.",
    "Pool 30%",
    "Créditos O/E/G",
  ];
  const rows: Array<{ label: string; sub?: string; vals: Estado[] }> = [
    {
      label: "Sócio de Capital",
      vals:    ["D",       "D",       "D",       "Exc",     "N",       "N",       "Cum"],
    },
    {
      label: "Sócio Capital — Gestor",
      sub: "+ rem. administração",
      vals:    ["D",       "D",       "D",       "Exc",     "D",       "N",       "Cum"],
    },
    {
      label: "Sócio Capital — Líder de Unidade",
      sub: "+ pool 30% local",
      vals:    ["D",       "D",       "D",       "Exc",     "Cond",    "D",       "Cum"],
    },
    {
      label: "Sócio de Serviços (Non-Equity)",
      vals:    ["D",       "N",       "D",       "Exc",     "D",       "N",       "Cum"],
    },
    {
      label: "Sócio de Serviços Estratégico",
      vals:    ["D",       "N",       "D",       "Exc",     "Cond",    "N",       "Cum"],
    },
    {
      label: "Líder de Unidade Non-Equity",
      sub: "só pool + créditos",
      vals:    ["N",       "N",       "N",       "Exc",     "N",       "D",       "Cum"],
    },
  ];

  const sym = (v: Estado) => {
    const map: Record<Estado, { bg: string; tx: string; label: string; title: string }> = {
      D:    { bg: "bg-mint-100",   tx: "text-mint-800",   label: "✓",    title: "Default — aplica automaticamente" },
      N:    { bg: "bg-neutral-100", tx: "text-neutral-500", label: "—",    title: "Não aplicável — categoria não recebe" },
      Exc:  { bg: "bg-amber-100",  tx: "text-amber-800",  label: "exc.", title: "Excepcional — depende do Comitê" },
      Cond: { bg: "bg-amber-50",   tx: "text-amber-700",  label: "cond.", title: "Condicionado — só se cargo formal" },
      Cum:  { bg: "bg-peri-100",   tx: "text-peri-800",   label: "∑",    title: "Cumulativo — soma aos demais" },
    };
    const c = map[v];
    return (
      <span
        className={`inline-flex min-w-[1.25rem] h-5 px-1.5 rounded-full ${c.bg} ${c.tx} items-center justify-center text-[10px] font-medium`}
        title={c.title}
      >
        {c.label}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 border-b-2 border-neutral-200 font-semibold text-navy-900 sticky left-0 bg-white z-10 min-w-[200px]">
              Categoria
            </th>
            {cols.map((c) => (
              <th
                key={c}
                className="px-2 py-2 border-b-2 border-neutral-200 font-semibold text-navy-900 text-center whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="even:bg-neutral-50/40 hover:bg-peri-50/30 transition-colors">
              <td className="px-3 py-2 border-b border-neutral-100 align-top sticky left-0 bg-inherit">
                <div className="font-medium text-navy-900">{r.label}</div>
                {r.sub && <div className="text-[10px] text-neutral-500 mt-0.5">{r.sub}</div>}
              </td>
              {r.vals.map((v, j) => (
                <td key={j} className="px-2 py-2 border-b border-neutral-100 text-center">
                  {sym(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-neutral-700">
        <span className="inline-flex items-center gap-1">{sym("D")} Default — aplica automaticamente</span>
        <span className="inline-flex items-center gap-1">{sym("N")} Não aplicável</span>
        <span className="inline-flex items-center gap-1">{sym("Exc")} Excepcional (Comitê)</span>
        <span className="inline-flex items-center gap-1">{sym("Cond")} Condicionado (cargo formal)</span>
        <span className="inline-flex items-center gap-1">{sym("Cum")} Cumulativo (soma)</span>
      </div>
    </div>
  );
}

// =====================================================================
// 3. Timeline de vesting
// =====================================================================
function TimelineVesting() {
  const fases = [
    { label: "Non-Equity", sub: "Sócio de Serviços ou Estratégico", cor: "bg-neutral-200 text-neutral-700" },
    { label: "Avaliação", sub: "Comitê de Promoções", cor: "bg-peri-200 text-peri-900" },
    { label: "Cliff (12m)", sub: "Sem consolidação", cor: "bg-amber-200 text-amber-900" },
    { label: "Vesting 25%/ano", sub: "3 anos seguintes", cor: "bg-amber-100 text-amber-800" },
    { label: "Equity pleno", sub: "100% consolidado", cor: "bg-mint-200 text-mint-900" },
    { label: "Probatório", sub: "Período opcional pós-ingresso", cor: "bg-neutral-100 text-neutral-700" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {fases.map((f, i) => (
          <div key={i} className="text-center">
            <div className={`mx-auto h-12 w-12 rounded-full ${f.cor} inline-flex items-center justify-center font-bold text-base shadow-sm`}>
              {i + 1}
            </div>
            <div className="mt-2 font-semibold text-sm text-navy-900">{f.label}</div>
            <div className="text-[11px] text-neutral-600 leading-tight mt-0.5">{f.sub}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-[11px] text-neutral-500 italic text-center">
        Tempos referenciais — cliff, ritmo e período probatório são definidos caso a caso pelos Comitês.
      </div>
    </div>
  );
}

// =====================================================================
// 4. Diagrama matriz × unidade
// =====================================================================
function DiagramaUnidade() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
      <div className="text-center">
        <div className="mx-auto rounded-lg border-2 border-navy-300 bg-navy-50 p-4">
          <div className="text-[10px] uppercase tracking-wider text-navy-700 font-semibold">Matriz</div>
          <div className="text-lg font-bold text-navy-900 mt-1">DSF Central</div>
          <div className="text-xs text-neutral-600 mt-2">Marca · governança · suporte</div>
        </div>
      </div>
      <div className="text-center px-2">
        <div className="text-[11px] text-neutral-500 mb-1">resultado da unidade ↔ retorno institucional</div>
        <svg viewBox="0 0 200 40" className="w-full max-w-[200px] mx-auto">
          <line x1="10" y1="20" x2="190" y2="20" stroke="currentColor" strokeWidth="1.5" className="text-peri-400" strokeDasharray="3 3" />
          <polygon points="190,20 180,15 180,25" className="fill-peri-500" />
          <polygon points="10,20 20,15 20,25" className="fill-peri-500" />
        </svg>
      </div>
      <div className="text-center">
        <div className="mx-auto rounded-lg border-2 border-mint-300 bg-mint-50 p-4">
          <div className="text-[10px] uppercase tracking-wider text-mint-800 font-semibold">Unidade satélite</div>
          <div className="text-lg font-bold text-navy-900 mt-1">Liderada</div>
          <div className="text-xs text-neutral-600 mt-2">Operação local + carteira</div>
        </div>
      </div>
      {/* Pool */}
      <div className="md:col-span-3 mt-2">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50/40 p-4">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-3 text-center">
            Pool sobre o LL da unidade
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <PoolBox pct="50%" label="Sociedade" sub="institucional" cor="navy" />
            <PoolBox pct="30%" label="Líder" sub="incentivo" cor="peri" />
            <PoolBox pct="20%" label="Equipe / Reserva" sub="local" cor="mint" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PoolBox({ pct, label, sub, cor }: { pct: string; label: string; sub: string; cor: "navy" | "peri" | "mint" }) {
  const map = {
    navy: "bg-navy-50 border-navy-300 text-navy-900",
    peri: "bg-peri-50 border-peri-300 text-peri-900",
    mint: "bg-mint-50 border-mint-300 text-mint-900",
  };
  return (
    <div className={`rounded border-2 p-3 ${map[cor]}`}>
      <div className="text-2xl font-bold tabular-nums">{pct}</div>
      <div className="font-semibold text-sm">{label}</div>
      <div className="text-[11px] opacity-70">{sub}</div>
    </div>
  );
}

// =====================================================================
// 5. Funil de ingresso lateral
// =====================================================================
function FunilLateral() {
  const etapas = [
    { largura: "100%", label: "Candidato externo", cor: "bg-neutral-100 text-neutral-700" },
    { largura: "85%", label: "Avaliação (carteira, reputação, cultura)", cor: "bg-peri-100 text-peri-900" },
    { largura: "65%", label: "Ingresso como Sócio de Serviços / Estratégico", cor: "bg-peri-200 text-peri-900" },
    { largura: "45%", label: "Período de integração + metas", cor: "bg-amber-100 text-amber-900" },
    { largura: "25%", label: "Revisão de retenção e aderência", cor: "bg-amber-200 text-amber-900" },
    { largura: "15%", label: "Eventual progressão ao Equity", cor: "bg-mint-200 text-mint-900" },
  ];
  return (
    <div className="space-y-2">
      {etapas.map((e, i) => (
        <div key={i} className="flex items-center justify-center">
          <div
            className={`${e.cor} px-4 py-2.5 rounded text-sm font-medium text-center transition-all`}
            style={{ width: e.largura }}
          >
            {i + 1}. {e.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// =====================================================================
// 6. Org-chart de governança
// =====================================================================
function OrgChartGovernanca() {
  const comites = [
    {
      nome: "Comitê de Partnership",
      cor: "navy",
      composicao: "3-5 Sócios de Capital",
      competencias: ["Ingresso", "Progressão", "Permanência qualificada", "Desligamento"],
    },
    {
      nome: "Comitê de Remuneração e Economics",
      cor: "peri",
      composicao: "3 Sócios (2 institucionais + 1 econômico-financeiro)",
      competencias: ["Critérios de distribuição", "Pesos de avaliação", "Pools de unidade", "Chave interunidades"],
    },
    {
      nome: "Comitê de Promoções e Avaliação",
      cor: "mint",
      composicao: "3 Sócios (sem conflito no ciclo)",
      competencias: ["Indicações", "Parecer técnico", "Acompanhamento", "Medidas corretivas"],
    },
  ];
  const corMap: Record<string, string> = {
    navy: "border-navy-400 bg-navy-50",
    peri: "border-peri-400 bg-peri-50",
    mint: "border-mint-400 bg-mint-50",
  };
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {comites.map((c) => (
          <div key={c.nome} className={`rounded-lg border-2 ${corMap[c.cor]} p-4`}>
            <h4 className="font-bold text-navy-900 text-sm">{c.nome}</h4>
            <div className="mt-1 text-[11px] text-neutral-600">{c.composicao}</div>
            <div className="mt-3 space-y-1">
              {c.competencias.map((k) => (
                <div key={k} className="text-xs flex items-start gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-peri-600 mt-0.5 flex-shrink-0" />
                  {k}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-[11px] text-neutral-500 italic">
        Mandato: 2 anos com recondução · Quórum: maioria simples · Conflito: declaração e abstenção
      </div>
    </div>
  );
}

// =====================================================================
// 7. Waterfall LL → RDA → Blocos
// =====================================================================
function WaterfallBlocos() {
  return (
    <div className="space-y-3">
      <NoFluxo nome="LL Matriz" sub="Lucro líquido apurado" cor="navy" />
      <Conector label="− admin (pró-labore + gestão + funding fundadores)" />
      <NoFluxo nome="RDA — Resultado Distribuível Ajustado" sub="Base dos blocos" cor="peri" destaque />
      <Conector label="dividido em 3 blocos" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BlocoCard letra="A" pct="45%" titulo="Institucional" publico="Apenas Sócios de Capital" metodo="Proporcional às quotas" cor="mint" />
        <BlocoCard letra="B" pct="35%" titulo="Performance" publico="Capital + Serviços (avaliação)" metodo="Uniforme · Individual · Originação · Por área" cor="peri" />
        <BlocoCard letra="C" pct="20%" titulo="Estratégica" publico="Retido na matriz" metodo="Expansão, retenção, sucessão" cor="amber" />
      </div>
    </div>
  );
}

function NoFluxo({ nome, sub, cor, destaque }: { nome: string; sub: string; cor: "navy" | "peri" | "mint" | "amber"; destaque?: boolean }) {
  const corMap = {
    navy: "bg-navy-50 border-navy-200 text-navy-900",
    peri: "bg-peri-50 border-peri-300 text-peri-900",
    mint: "bg-mint-50 border-mint-200 text-mint-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
  };
  return (
    <div className={`rounded-lg border-2 px-4 py-3 ${corMap[cor]}${destaque ? " shadow-sm ring-1 ring-peri-300" : ""}`}>
      <div className="font-semibold text-base">{nome}</div>
      <div className="text-xs opacity-80 mt-0.5">{sub}</div>
    </div>
  );
}
function Conector({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1">
      <div className="h-4 w-px bg-neutral-300" />
      <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-medium">{label}</span>
      <div className="h-4 w-px bg-neutral-300" />
    </div>
  );
}
function BlocoCard({ letra, pct, titulo, publico, metodo, cor }: { letra: string; pct: string; titulo: string; publico: string; metodo: string; cor: "mint" | "peri" | "amber" }) {
  const corMap = { mint: "border-mint-300 bg-mint-50/40", peri: "border-peri-300 bg-peri-50/40", amber: "border-amber-300 bg-amber-50/40" };
  return (
    <div className={"rounded-lg border-2 p-4 " + corMap[cor]}>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-navy-900">Bloco {letra}</span>
        <span className="text-sm font-semibold text-navy-900 tabular-nums">{pct}</span>
      </div>
      <div className="font-semibold text-sm text-navy-900 mt-1">{titulo}</div>
      <div className="text-xs text-neutral-700 mt-2">
        <div className="font-medium">Público:</div>
        <div>{publico}</div>
      </div>
      <div className="text-xs text-neutral-700 mt-2">
        <div className="font-medium">Método:</div>
        <div>{metodo}</div>
      </div>
    </div>
  );
}

// =====================================================================
// 8. Donut Pool + chave O/E/G
// =====================================================================
function DonutPool() {
  // Donut SVG simples — segmentos 50/30/20
  const segs = [
    { pct: 50, label: "Sociedade", cor: "fill-navy-400" },
    { pct: 30, label: "Líder", cor: "fill-peri-500" },
    { pct: 20, label: "Equipe/Reserva", cor: "fill-mint-400" },
  ];
  let acc = 0;
  const r = 60, cx = 80, cy = 80;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      <div>
        <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 mb-3">
          Pool da unidade (sobre LL local)
        </div>
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 160 160" className="w-40 h-40 flex-shrink-0">
            {segs.map((s, i) => {
              const start = (acc / 100) * 360 - 90;
              acc += s.pct;
              const end = (acc / 100) * 360 - 90;
              const large = s.pct > 50 ? 1 : 0;
              const x1 = cx + r * Math.cos((start * Math.PI) / 180);
              const y1 = cy + r * Math.sin((start * Math.PI) / 180);
              const x2 = cx + r * Math.cos((end * Math.PI) / 180);
              const y2 = cy + r * Math.sin((end * Math.PI) / 180);
              return (
                <path
                  key={i}
                  d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
                  className={s.cor}
                />
              );
            })}
            <circle cx={cx} cy={cy} r={28} className="fill-white" />
            <text x={cx} y={cy + 5} textAnchor="middle" className="fill-navy-900 text-sm font-semibold">
              LL_local
            </text>
          </svg>
          <ul className="text-sm space-y-1.5">
            {segs.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span className={`inline-block h-3 w-3 rounded ${s.cor.replace("fill-", "bg-")}`} />
                <span className="font-semibold text-navy-900 tabular-nums">{s.pct}%</span>
                <span className="text-neutral-700">{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 mb-3">
          Chave-padrão interunidades
        </div>
        <div className="space-y-2">
          {[
            { sigla: "O", pct: "30%", label: "Originação / Relacionamento", faixa: "20–40%" },
            { sigla: "E", pct: "60%", label: "Execução / Produção", faixa: "50–70%" },
            { sigla: "G", pct: "10%", label: "Gestão", faixa: "0–15%" },
          ].map((c) => (
            <div key={c.sigla} className="rounded border border-neutral-200 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-peri-100 text-peri-800 inline-flex items-center justify-center font-bold text-lg flex-shrink-0">
                {c.sigla}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-navy-900">{c.label}</div>
                <div className="text-xs text-neutral-500">Faixa de ajuste: {c.faixa}</div>
              </div>
              <div className="text-lg font-bold text-navy-900 tabular-nums">{c.pct}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-neutral-500 italic mt-2">
          Vedação absoluta de dupla contagem do mesmo resultado entre unidades.
        </p>
      </div>
    </div>
  );
}

// =====================================================================
// 9. Matriz de pesos por perfil/fase
// =====================================================================
function MatrizPesos() {
  const colsFase = ["Implantação (nova)", "Crescimento", "Madura"];
  const linhas = [
    { criterio: "Implantação operacional", pesos: ["alto", "medio", "baixo"] },
    { criterio: "Crescimento de carteira", pesos: ["alto", "alto", "medio"] },
    { criterio: "Geração de receita local", pesos: ["alto", "alto", "medio"] },
    { criterio: "Consolidação de equipe", pesos: ["alto", "medio", "baixo"] },
    { criterio: "Rentabilidade recorrente", pesos: ["baixo", "medio", "alto"] },
    { criterio: "Retenção de clientes", pesos: ["medio", "alto", "alto"] },
    { criterio: "Institucionalidade", pesos: ["baixo", "medio", "alto"] },
    { criterio: "Sucessão", pesos: ["baixo", "baixo", "alto"] },
    { criterio: "Colaboração interunidades", pesos: ["medio", "alto", "alto"] },
  ];
  const sym = (p: string) => {
    const map: Record<string, string> = {
      alto: "bg-mint-100 text-mint-800",
      medio: "bg-peri-100 text-peri-800",
      baixo: "bg-neutral-100 text-neutral-600",
    };
    const txt: Record<string, string> = { alto: "alto", medio: "médio", baixo: "baixo" };
    return <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${map[p]}`}>{txt[p]}</span>;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 border-b-2 border-neutral-200 font-semibold text-navy-900">Critério</th>
            {colsFase.map((c) => (
              <th key={c} className="px-3 py-2 border-b-2 border-neutral-200 font-semibold text-navy-900 text-center">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="even:bg-neutral-50/40">
              <td className="px-3 py-2 border-b border-neutral-100 text-navy-900">{l.criterio}</td>
              {l.pesos.map((p, j) => (
                <td key={j} className="px-3 py-2 border-b border-neutral-100 text-center">{sym(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-[11px] text-neutral-500">
        Matriz referencial — a Matriz de Pesos por Perfil e Geografia oficial é definida em política operacional aprovada pela governança.
      </div>
    </div>
  );
}

// =====================================================================
// 10. Tabela de modalidades de saída
// =====================================================================
function TabelaSaida() {
  const linhas = [
    { tipo: "Saída amigável", quotas: "Recompra ao valor do AdS", haveres: "Conforme AdS", vesting: "Mantém parcela vestida", cor: "mint" },
    { tipo: "Saída volitiva", quotas: "Recompra com possível desconto", haveres: "Conforme AdS", vesting: "Pode reverter parcela não vestida", cor: "peri" },
    { tipo: "Bad leaver", quotas: "Recompra a valor patrimonial", haveres: "Sem haveres adicionais", vesting: "Reverte parcela não vestida", cor: "amber" },
    { tipo: "Aposentadoria", quotas: "Recompra ao valor do AdS", haveres: "Conforme AdS + planos previstos", vesting: "100% consolidado se elegível", cor: "mint" },
    { tipo: "Morte / invalidez", quotas: "Recompra para sucessores", haveres: "Conforme AdS", vesting: "Antecipação possível", cor: "navy" },
  ];
  const corMap: Record<string, string> = {
    mint: "bg-mint-50 border-mint-200",
    peri: "bg-peri-50 border-peri-200",
    amber: "bg-amber-50 border-amber-200",
    navy: "bg-navy-50 border-navy-200",
  };
  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {linhas.map((l, i) => (
          <div key={i} className={`rounded-lg border-2 p-4 ${corMap[l.cor]}`}>
            <div className="font-bold text-navy-900 text-base">{l.tipo}</div>
            <dl className="mt-2 space-y-1.5 text-xs">
              <Item label="Quotas" v={l.quotas} />
              <Item label="Haveres" v={l.haveres} />
              <Item label="Vesting" v={l.vesting} />
            </dl>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-neutral-500 italic mt-3">
        AdS = Acordo de Sócios vigente, que prevalece para fins de valuation e apuração de haveres.
      </p>
    </div>
  );
}
function Item({ label, v }: { label: string; v: string }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2">
      <dt className="font-semibold text-neutral-700">{label}:</dt>
      <dd className="text-neutral-800">{v}</dd>
    </div>
  );
}

// =====================================================================
// 11. Mapa de expansão (placeholder estilizado)
// =====================================================================
function MapaExpansao() {
  const unidades = [
    { nome: "Matriz", cidade: "Caxias do Sul", status: "ativa", x: 50, y: 65 },
    { nome: "Unidade Sul", cidade: "Porto Alegre", status: "ativa", x: 48, y: 78 },
    { nome: "SP", cidade: "São Paulo", status: "planejada", x: 60, y: 55 },
    { nome: "RJ", cidade: "Rio de Janeiro", status: "futura", x: 68, y: 50 },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-6 items-start">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-peri-50 to-mint-50 rounded-lg border border-neutral-200 overflow-hidden">
        {/* Mapa muito simplificado do BR */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path
            d="M 35 30 L 50 25 L 65 30 L 75 40 L 75 55 L 70 70 L 60 80 L 50 85 L 40 80 L 35 70 L 30 60 L 28 50 L 30 40 Z"
            className="fill-mint-100/60 stroke-mint-300"
            strokeWidth="0.4"
          />
        </svg>
        {unidades.map((u) => (
          <div
            key={u.nome}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${u.x}%`, top: `${u.y}%` }}
          >
            <div
              className={
                "h-3 w-3 rounded-full ring-2 ring-white " +
                (u.status === "ativa" ? "bg-peri-600 animate-pulse" : u.status === "planejada" ? "bg-amber-500" : "bg-neutral-400")
              }
            />
            <div className="absolute left-4 top-0 whitespace-nowrap text-[10px] font-medium text-navy-900 bg-white/80 backdrop-blur px-1.5 py-0.5 rounded shadow-sm">
              {u.nome}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Status</div>
        <Legenda cor="bg-peri-600" label="Ativa" />
        <Legenda cor="bg-amber-500" label="Planejada (próx. 12m)" />
        <Legenda cor="bg-neutral-400" label="Futura / em análise" />
        <p className="text-[11px] text-neutral-500 italic mt-3">
          Mapa ilustrativo — atualização contínua conforme planos de expansão.
        </p>
      </div>
    </div>
  );
}
function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-700">
      <span className={`h-2.5 w-2.5 rounded-full ${cor}`} />
      {label}
    </div>
  );
}

// =====================================================================
// 12. Cards de disposições finais
// =====================================================================
function CardsFinais() {
  const itens = [
    {
      icone: TrendingUp,
      titulo: "Vigência",
      desc: "Em vigor desde a assinatura, prazo indeterminado, até substituição/revisão pela governança.",
    },
    {
      icone: Users,
      titulo: "Confidencialidade",
      desc: "Obrigação por toda a vigência + 5 anos após. Não afasta sigilo profissional advocatício.",
    },
    {
      icone: CheckCircle2,
      titulo: "Invalidade parcial",
      desc: "Eventual nulidade de uma cláusula não prejudica as demais — todas permanecem válidas.",
    },
    {
      icone: Sparkles,
      titulo: "Assinatura",
      desc: "Válida física ou eletronicamente, em uma ou mais vias, conforme legislação aplicável.",
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {itens.map((item, i) => {
        const I = item.icone;
        return (
          <div key={i} className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-peri-50 text-peri-700 inline-flex items-center justify-center flex-shrink-0">
                <I className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-sm text-navy-900">{item.titulo}</div>
                <div className="text-xs text-neutral-700 mt-1 leading-relaxed">{item.desc}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
