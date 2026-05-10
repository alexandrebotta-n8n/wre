// Detalhe do modelo ATUAL — baseline de comparação.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Modelo ATUAL — Como funciona" };

export default async function ModeloAtualPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Início", href: "/simulacao" },
          { label: "Como funciona", href: "/como-funciona" },
          { label: "Modelo ATUAL" },
        ]}
        title="Modelo ATUAL — baseline 1T2026"
        description="O sistema vigente, usado como referência para medir o impacto do modelo NOVO."
        meta={
          <Link href="/como-funciona" className="inline-flex items-center gap-1 hover:text-peri-700">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
        }
      />

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-3">Fluxo do modelo ATUAL</h2>
        <div className="space-y-3">
          <Bloco titulo="LL Matriz" sub="Lucro líquido apurado" cor="navy" />
          <Conector label="− pró-labore − gestão − funding fundadores" />
          <Bloco titulo="Funding residual" sub="LL − rem. fundadores" cor="peri" destaque />
          <Conector label="aplicar reserva (5% padrão)" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Bloco titulo="Distribuição por quotas" sub="(quota / Σquotas_não-fund) × funding × (1 − reserva%)" cor="mint" />
            <Bloco titulo="Prêmio uniforme" sub="reserva ÷ N elegíveis (se 'vira prêmio')" cor="amber" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-3">Características-chave</h2>
        <ul className="space-y-2 text-sm text-neutral-800 leading-relaxed list-disc pl-5">
          <li>Distribuição é proporcional a quotas dos não-fundadores (depois de reservar fundo dos fundadores).</li>
          <li>Reserva de 5% pode ser distribuída como prêmio uniforme entre os elegíveis.</li>
          <li>Não há os blocos A/B/C nem o pool de unidade — toda alocação é centralizada.</li>
          <li>Sócios de Serviços podem entrar somente via prêmio, não via quotas.</li>
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-3">Compare com o modelo NOVO</h2>
        <p className="text-sm text-neutral-700 mb-4">
          A página de Simulação coloca os dois modelos lado a lado: você vê o impacto sócio a sócio
          no momento em que muda parâmetros do NOVO.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="primary" size="sm">
            <Link href="/simulacao">Comparar na Simulação <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/como-funciona/modelo-novo">Ver modelo NOVO</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}

function Bloco({ titulo, sub, cor, destaque }: { titulo: string; sub: string; cor: "navy" | "peri" | "mint" | "amber"; destaque?: boolean }) {
  const map = {
    navy: "bg-navy-50 border-navy-200 text-navy-900",
    peri: "bg-peri-50 border-peri-300 text-peri-900",
    mint: "bg-mint-50 border-mint-200 text-mint-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
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
