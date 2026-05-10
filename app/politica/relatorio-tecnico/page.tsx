// Texto integral do Relatório de Revisão Técnica (com TOC).
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RELATORIO_MD } from "../conteudo/relatorio";
import { MarkdownContent, extractToc } from "../markdown";
import { BuscaPolitica } from "../componentes/busca-politica";

export const metadata = { title: "Relatório técnico WRE — Política DSF" };

export default async function RelatorioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const toc = extractToc(RELATORIO_MD, 1);

  return (
    <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 space-y-5">
      <PageHeader
        breadcrumb={[
          { label: "Início", href: "/simulacao" },
          { label: "Política", href: "/politica" },
          { label: "Relatório técnico" },
        ]}
        title="Relatório de Revisão Técnica WRE"
        description="Análise técnica independente, premissas e recomendações que embasam a Política."
        meta={
          <>
            <Badge variant="info" size="sm">WRE — Maio 2026</Badge>
            <span className="text-neutral-500">·</span>
            <Link href="/politica" className="inline-flex items-center gap-1 hover:text-peri-700">
              <ArrowLeft className="h-3 w-3" /> Voltar ao hub
            </Link>
          </>
        }
        actions={
          <div className="flex gap-2 flex-wrap">
            <BuscaPolitica />
            <Button asChild variant="outline" size="sm">
              <a href="/docs/relatorio-revisao-tecnica-v8.docx" download>
                <Download className="h-3.5 w-3.5" /> Baixar .docx
              </a>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <Card className="p-3">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 mb-2">
                Sumário
              </div>
              <nav>
                <ol className="space-y-1 text-xs">
                  {toc.map((entry) => (
                    <li key={entry.id}>
                      <a
                        href={`#${entry.id}`}
                        className="block px-2 py-1 rounded text-neutral-700 hover:bg-peri-50 hover:text-peri-800 transition-colors leading-snug"
                      >
                        {entry.titulo}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </Card>
          </div>
        </aside>

        <article className="min-w-0">
          <Card className="px-6 py-6 lg:px-10 lg:py-8">
            <MarkdownContent md={RELATORIO_MD} />
          </Card>
        </article>
      </div>
    </main>
  );
}
