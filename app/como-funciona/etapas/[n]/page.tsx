// Detalhe de uma etapa: fórmula, descrição, exemplo numérico passo a passo.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ETAPAS, getEtapa } from "../../etapas-data";

export async function generateStaticParams() {
  return ETAPAS.map((e) => ({ n: String(e.numero) }));
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  const e = getEtapa(n);
  return { title: e ? `Etapa ${e.numero}: ${e.titulo}` : "Etapa não encontrada" };
}

export default async function EtapaDetalhePage({ params }: { params: Promise<{ n: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { n } = await params;
  const e = getEtapa(n);
  if (!e) notFound();

  const idx = ETAPAS.findIndex((x) => x.numero === e.numero);
  const anterior = idx > 0 ? ETAPAS[idx - 1] : null;
  const proxima = idx < ETAPAS.length - 1 ? ETAPAS[idx + 1] : null;

  return (
    <main className="mx-auto max-w-[1000px] px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Início", href: "/simulacao" },
          { label: "Como funciona", href: "/como-funciona" },
          { label: "Etapas", href: "/como-funciona/etapas" },
          { label: `${e.numero}. ${e.titulo}` },
        ]}
        title={`Etapa ${e.numero} — ${e.titulo}`}
        description={e.descricao}
        meta={
          <>
            {e.modelo === "NOVO" ? (
              <Badge variant="info" size="sm">apenas modelo NOVO</Badge>
            ) : e.modelo === "ATUAL" ? (
              <Badge variant="warning" size="sm">apenas modelo ATUAL</Badge>
            ) : (
              <Badge variant="success" size="sm">aplica em ambos os modelos</Badge>
            )}
          </>
        }
      />

      {/* Fórmula */}
      <Card className="p-6">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 mb-2">
          Fórmula
        </div>
        <code className="block text-sm font-mono text-peri-800 bg-peri-50/60 rounded px-4 py-3 break-all leading-relaxed">
          {e.formula}
        </code>
      </Card>

      {/* Exemplo */}
      <Card className="p-6 bg-amber-50/40 border-amber-200">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-800 mb-2">
          Exemplo numérico
        </div>
        <div className="space-y-2">
          <div className="text-sm text-neutral-800">
            <strong>Entrada:</strong> {e.exemploNumeros}
          </div>
          <div className="text-base font-semibold text-navy-900">
            → {e.exemploResultado}
          </div>
        </div>
      </Card>

      {/* Veja também */}
      {e.veja && (
        <Card className="p-4 bg-peri-50/40 border-peri-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-neutral-700">
              Saiba mais na cláusula correspondente da Política.
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={e.veja}>
                Ver na Política <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Navegação ant/prox */}
      <div className="grid grid-cols-2 gap-3">
        {anterior ? (
          <Link
            href={`/como-funciona/etapas/${anterior.numero}`}
            className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 hover:border-peri-300 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 text-neutral-400 group-hover:text-peri-600 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">Etapa {anterior.numero}</div>
              <div className="font-medium text-sm text-navy-900 truncate">{anterior.titulo}</div>
            </div>
          </Link>
        ) : <div />}
        {proxima ? (
          <Link
            href={`/como-funciona/etapas/${proxima.numero}`}
            className="flex items-start gap-2 justify-end text-right rounded-lg border border-neutral-200 p-3 hover:border-peri-300 transition-colors group"
          >
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">Etapa {proxima.numero}</div>
              <div className="font-medium text-sm text-navy-900 truncate">{proxima.titulo}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-peri-600 mt-0.5" />
          </Link>
        ) : <div />}
      </div>

      <div className="text-center pt-2">
        <Link href="/como-funciona/etapas" className="text-sm text-peri-700 hover:underline">
          ← Voltar ao índice das 8 etapas
        </Link>
      </div>
    </main>
  );
}
