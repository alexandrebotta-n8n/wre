// Detalhe do modelo NOVO — fluxo + descrição executiva.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Modelo NOVO — Como funciona" };

export default async function ModeloNovoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Início", href: "/simulacao" },
          { label: "Como funciona", href: "/como-funciona" },
          { label: "Modelo NOVO" },
        ]}
        title="Modelo NOVO — Política DSF"
        description="O modelo principal: RDA dividido em Bloco A (45%) institucional, B (35%) performance, C (20%) estratégica."
        meta={
          <Link href="/como-funciona" className="inline-flex items-center gap-1 hover:text-peri-700">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
        }
      />

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-3">Fluxo completo</h2>
        <div className="space-y-3">
          <Bloco titulo="LL Matriz" sub="Lucro líquido apurado" cor="navy" />
          <Conector label="− pró-labore − gestão − funding fundadores" />
          <Bloco titulo="RDA" sub="Resultado Distribuível Ajustado" cor="peri" destaque />
          <Conector label="dividido em 3 blocos (somam 100%)" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <BlocoCard letra="A" pct="45%" titulo="Institucional" desc="Apenas Sócios de Capital · proporcional às quotas" cor="mint" />
            <BlocoCard letra="B" pct="35%" titulo="Performance" desc="Capital + Serviços · 4 modos de distribuição" cor="peri" />
            <BlocoCard letra="C" pct="20%" titulo="Estratégica" desc="Retido na matriz · expansão e reserva" cor="amber" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-3">
          Quem recebe o quê — resumo por categoria
        </h2>
        <p className="text-sm text-neutral-600 mb-4">
          A Política DSF v1 define 6 categorias e 7 mecanismos econômicos. Cada categoria tem
          combinação distinta de aplicabilidade. Visão sintética:
        </p>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left px-3 py-2 border-b-2 border-neutral-200 font-semibold text-navy-900 sticky left-0 bg-neutral-50">
                  Categoria
                </th>
                <th className="px-2 py-2 border-b-2 border-neutral-200 font-semibold text-navy-900 text-center">Pró-labore</th>
                <th className="px-2 py-2 border-b-2 border-neutral-200 font-semibold text-navy-900 text-center">Bloco A</th>
                <th className="px-2 py-2 border-b-2 border-neutral-200 font-semibold text-navy-900 text-center">Bloco B</th>
                <th className="px-2 py-2 border-b-2 border-neutral-200 font-semibold text-navy-900 text-center">Rem. Adm.</th>
                <th className="px-2 py-2 border-b-2 border-neutral-200 font-semibold text-navy-900 text-center">Pool 30%</th>
                <th className="px-2 py-2 border-b-2 border-neutral-200 font-semibold text-navy-900 text-center">Comissão Orig.</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              <Row label="Sócio de Capital" cells={["✓","✓","✓","—","—","∑"]} />
              <Row label="Sócio Capital — Gestor" cells={["✓","✓","✓","✓","—","∑"]} />
              <Row label="Sócio Capital — Líder de Unidade" cells={["✓","✓","✓","cond.","✓","∑"]} />
              <Row label="Sócio de Serviços" cells={["✓","—","✓","✓","—","∑"]} />
              <Row label="Sócio de Serviços Estratégico" cells={["✓","—","✓","cond.","—","∑"]} />
              <Row label="Líder de Unidade Non-Equity" cells={["—","—","—","—","✓","∑"]} />
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-neutral-700">
          <span><strong className="text-mint-700">✓</strong> Default · aplica automaticamente</span>
          <span><strong className="text-neutral-500">—</strong> Não aplicável</span>
          <span><strong className="text-amber-700">cond.</strong> Condicionado · só com cargo formal</span>
          <span><strong className="text-peri-700">∑</strong> Cumulativo · soma quando há fato gerador</span>
        </div>
        <div className="mt-3 p-3 bg-neutral-50 rounded text-xs text-neutral-700 leading-relaxed">
          <strong className="text-navy-900">Bloco C (20%)</strong> aparece como Excepcional para todas as 6 categorias —
          retido como reserva estratégica, distribuição discricionária do Comitê, sem cálculo automático no engine.
          Veja a <Link href="/politica/categorias-socio" className="text-peri-700 hover:underline">matriz oficial completa</Link> na Política.
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-3">Por que essa estrutura?</h2>
        <ul className="space-y-3 text-sm text-neutral-800 leading-relaxed">
          <li>
            <strong className="text-navy-900">Bloco A (45%)</strong> — segrega o retorno do capital do
            retorno da performance. Quem assume risco institucional (equity) recebe por isso
            independentemente do desempenho do exercício, proporcional às quotas.
          </li>
          <li>
            <strong className="text-navy-900">Bloco B (35%)</strong> — premia o desempenho do exercício.
            Pode contemplar Sócios de Serviços, e usa critério configurável (uniforme, individual,
            originação ou peso por área de prática).
          </li>
          <li>
            <strong className="text-navy-900">Bloco C (20%)</strong> — reserva estratégica. Garante
            recursos para expansão geográfica, retenção de talentos-chave, sucessão, inovação. Decisão
            discricionária do Comitê.
          </li>
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-3">Próximos passos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link href="/como-funciona/etapas" className="rounded-lg border border-neutral-200 p-4 hover:border-peri-300 transition-colors group">
            <div className="font-semibold text-navy-900 inline-flex items-center gap-2">
              Ver as 8 etapas em detalhe
              <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-peri-600" />
            </div>
            <div className="text-xs text-neutral-600 mt-1">Cada etapa com fórmula, descrição e exemplo numérico.</div>
          </Link>
          <Link href="/politica/blocos" className="rounded-lg border border-neutral-200 p-4 hover:border-peri-300 transition-colors group">
            <div className="font-semibold text-navy-900 inline-flex items-center gap-2">
              Texto da Política sobre os Blocos
              <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-peri-600" />
            </div>
            <div className="text-xs text-neutral-600 mt-1">Cláusula 9 + Anexo VII integrados.</div>
          </Link>
        </div>
        <div className="mt-4">
          <Button asChild variant="primary" size="sm">
            <Link href="/simulacao">Simular agora <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}

function Bloco({ titulo, sub, cor, destaque }: { titulo: string; sub: string; cor: "navy" | "peri"; destaque?: boolean }) {
  const map = {
    navy: "bg-navy-50 border-navy-200 text-navy-900",
    peri: "bg-peri-50 border-peri-300 text-peri-900",
  };
  return (
    <div className={`rounded-lg border-2 px-4 py-3 ${map[cor]}${destaque ? " shadow-sm ring-1 ring-peri-300" : ""}`}>
      <div className="font-semibold text-base">{titulo}</div>
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

function Row({ label, cells }: { label: string; cells: string[] }) {
  const cell = (v: string) => {
    if (v === "✓") return <span className="text-mint-700 font-bold">✓</span>;
    if (v === "—") return <span className="text-neutral-400">—</span>;
    if (v === "cond.") return <span className="text-amber-700 text-[10px] font-medium">cond.</span>;
    if (v === "∑") return <span className="text-peri-700 font-bold">∑</span>;
    return v;
  };
  return (
    <tr className="even:bg-neutral-50/40">
      <td className="px-3 py-2 border-b border-neutral-100 font-medium text-navy-900 sticky left-0 bg-inherit">
        {label}
      </td>
      {cells.map((c, i) => (
        <td key={i} className="px-2 py-2 border-b border-neutral-100 text-center">
          {cell(c)}
        </td>
      ))}
    </tr>
  );
}

function BlocoCard({ letra, pct, titulo, desc, cor }: { letra: string; pct: string; titulo: string; desc: string; cor: "mint" | "peri" | "amber" }) {
  const map = { mint: "border-mint-300 bg-mint-50/40", peri: "border-peri-300 bg-peri-50/40", amber: "border-amber-300 bg-amber-50/40" };
  return (
    <div className={`rounded-lg border-2 p-4 ${map[cor]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-navy-900">Bloco {letra}</span>
        <span className="text-sm font-semibold text-navy-900 tabular-nums">{pct}</span>
      </div>
      <div className="font-semibold text-sm text-navy-900 mt-1">{titulo}</div>
      <p className="text-xs text-neutral-700 mt-2 leading-relaxed">{desc}</p>
    </div>
  );
}
