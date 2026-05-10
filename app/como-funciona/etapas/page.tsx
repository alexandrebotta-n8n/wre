// Índice das 8 etapas — uma linha por etapa com link para detalhe.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ETAPAS } from "../etapas-data";

export const metadata = { title: "Etapas do cálculo — Como funciona" };

export default async function EtapasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Início", href: "/simulacao" },
          { label: "Como funciona", href: "/como-funciona" },
          { label: "Etapas" },
        ]}
        title="As 8 etapas do cálculo"
        description="Da pró-labore ao pacote final, em ordem de apuração. Clique em cada etapa para detalhes."
        meta={
          <Link href="/como-funciona" className="inline-flex items-center gap-1 hover:text-peri-700">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <ol className="divide-y divide-neutral-100">
          {ETAPAS.map((e) => (
            <li key={e.numero}>
              <Link
                href={`/como-funciona/etapas/${e.numero}`}
                className="flex items-start gap-4 px-5 py-4 hover:bg-peri-50/30 transition-colors group"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-peri-100 text-peri-800 font-bold text-base inline-flex items-center justify-center">
                  {e.numero}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-navy-900">{e.titulo}</h3>
                    {e.modelo === "NOVO" ? (
                      <Badge variant="info" size="sm">apenas NOVO</Badge>
                    ) : e.modelo === "ATUAL" ? (
                      <Badge variant="warning" size="sm">apenas ATUAL</Badge>
                    ) : (
                      <Badge variant="success" size="sm">ambos</Badge>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 mt-0.5">{e.descricao}</p>
                  <code className="block mt-1.5 text-[11px] font-mono text-peri-800 bg-peri-50/60 rounded px-2 py-1 break-all">
                    {e.formula}
                  </code>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-peri-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-2" />
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </main>
  );
}
