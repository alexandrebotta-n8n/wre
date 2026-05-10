// Hub /politica — entrada principal da Política DSF.
// Cards visuais agrupados em 4 áreas + busca + atalhos para texto integral.
import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, FileText, BookOpen } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TemaCard } from "./componentes/tema-card";
import { BuscaPolitica } from "./componentes/busca-politica";
import { temasPorGrupo, GRUPOS } from "./conteudo/temas";

export const metadata = { title: "Política DSF — WRE Simulador" };

export default async function PoliticaHub() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const grupos = temasPorGrupo();
  const ordemGrupos: (keyof typeof GRUPOS)[] = ["fundamentos", "trilha", "modelo-economico", "ciclo-vida"];

  return (
    <main className="mx-auto max-w-[1300px] px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/simulacao" }, { label: "Política" }]}
        title="Política DSF"
        description="Sistema de partnership, governança e modelo econômico — navegue por tema, busque por palavra ou abra o documento integral."
        meta={
          <>
            <Badge variant="success" size="sm">vigente</Badge>
            <span className="text-neutral-500">·</span>
            <span>Versão consolidada · uso interno DSF</span>
          </>
        }
        actions={<BuscaPolitica />}
      />

      {/* Atalhos para conteúdo integral */}
      <Card className="p-4 bg-neutral-50/60">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 mr-2">
            Atalhos
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href="/politica/documento-completo">
              <BookOpen className="h-3.5 w-3.5" /> Documento completo
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/politica/relatorio-tecnico">
              <FileText className="h-3.5 w-3.5" /> Relatório técnico WRE
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/docs/politica-partnership-dsf.docx" download>
              <Download className="h-3.5 w-3.5" /> Política (.docx)
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/docs/relatorio-revisao-tecnica-v8.docx" download>
              <Download className="h-3.5 w-3.5" /> Relatório (.docx)
            </a>
          </Button>
        </div>
      </Card>

      {/* Grupos de temas */}
      {ordemGrupos.map((g) => (
        <section key={g} className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-navy-900">{GRUPOS[g].titulo}</h2>
            <p className="text-sm text-neutral-600">{GRUPOS[g].descricao}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grupos[g].map((t) => (
              <TemaCard key={t.slug} tema={t} />
            ))}
          </div>
        </section>
      ))}

      {/* Rodapé com link para Como funciona */}
      <Card className="p-5 bg-peri-50/40 border-peri-200">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-semibold text-navy-900">Como o modelo se traduz em números?</h3>
            <p className="text-sm text-neutral-700 mt-1">
              A página <strong>Como funciona</strong> mostra o fluxo completo do cálculo (do LL Matriz até o
              pacote de cada sócio) com diagramas, fórmulas e glossário.
            </p>
          </div>
          <Button asChild variant="primary" size="sm">
            <Link href="/como-funciona">Como funciona →</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
