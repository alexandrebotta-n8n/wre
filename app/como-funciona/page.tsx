// Hub /como-funciona — entrada principal da explicação do cálculo.
// 4 cards: Modelo NOVO · Modelo ATUAL · Etapas · Glossário.
import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers, Archive, ListOrdered, BookOpen, ArrowRight, BookOpenCheck } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Como funciona — WRE Simulador" };

const CARDS = [
  {
    href: "/como-funciona/modelo-novo",
    icone: Layers,
    titulo: "Modelo NOVO",
    desc: "RDA dividido em Bloco A · B · C, pool de unidade, chave interunidades.",
    badge: "principal",
  },
  {
    href: "/como-funciona/modelo-atual",
    icone: Archive,
    titulo: "Modelo ATUAL",
    desc: "Sistema vigente do 1T2026, usado como baseline de comparação.",
    badge: "baseline",
  },
  {
    href: "/como-funciona/etapas",
    icone: ListOrdered,
    titulo: "8 Etapas do cálculo",
    desc: "Da pró-labore ao prêmio final, passo a passo com fórmula e exemplo.",
    badge: "passo a passo",
  },
  {
    href: "/como-funciona/glossario",
    icone: BookOpen,
    titulo: "Glossário",
    desc: "RDA, Pool S/L/E, Chave O/E/G, POR_AREA e demais termos do modelo.",
    badge: "referência",
  },
];

export default async function ComoFuncionaHub() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/simulacao" }, { label: "Como funciona" }]}
        title="Como o cálculo funciona"
        description="Do Lucro Líquido da matriz até o pacote de cada sócio. Escolha por onde começar."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/politica">
              <BookOpenCheck className="h-3.5 w-3.5" /> Ver Política
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map((c) => {
          const I = c.icone;
          return (
            <Link key={c.href} href={c.href} className="group block">
              <Card className="h-full p-6 hover:border-peri-400 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-12 w-12 rounded-lg bg-peri-50 text-peri-700 inline-flex items-center justify-center group-hover:bg-peri-100 transition-colors">
                    <I className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-peri-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="mt-4 font-semibold text-navy-900 text-lg">{c.titulo}</h3>
                <p className="mt-1 text-sm text-neutral-600">{c.desc}</p>
                <div className="mt-3 pt-3 border-t border-neutral-100 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                  {c.badge}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="p-5 bg-peri-50/40 border-peri-200">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-semibold text-navy-900">Pronto para simular?</h3>
            <p className="text-sm text-neutral-700 mt-1">
              A página de Simulação mostra dois cenários lado a lado. Clique em um sócio na tabela
              para ver o waterfall com a composição.
            </p>
          </div>
          <Button asChild variant="primary" size="sm">
            <Link href="/simulacao">
              Ir para Simulação <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
