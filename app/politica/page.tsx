// Página /politica — leitura da Política de Partnership DSF + Relatório técnico.
// Acessível a todos autenticados (inclusive sócios restritos).
import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, FileText, BookOpen } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { POLITICA_MD } from "./conteudo/politica";
import { RELATORIO_MD } from "./conteudo/relatorio";
import { MarkdownContent, extractToc } from "./markdown";

export const metadata = { title: "Política DSF — WRE Simulador" };

export default async function PoliticaPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const ativa = sp.doc === "relatorio" ? "relatorio" : "politica";

  const md = ativa === "relatorio" ? RELATORIO_MD : POLITICA_MD;
  const toc = extractToc(md, 1); // só headings de nível 1 (CLÁUSULA / ANEXO / numeração principal)

  const arquivoDownload =
    ativa === "relatorio"
      ? "/docs/relatorio-revisao-tecnica-v8.docx"
      : "/docs/politica-partnership-dsf.docx";

  return (
    <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 space-y-5">
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/simulacao" }, { label: "Política DSF" }]}
        title="Política de Partnership DSF"
        description="Documento estruturante do sistema de partnership, governança e modelo econômico — uso interno DSF."
        meta={
          <>
            <Badge variant="success" size="sm">vigente</Badge>
            <span className="text-neutral-500">·</span>
            <span>Versão consolidada · confidencial</span>
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={arquivoDownload} download>
              <Download className="h-3.5 w-3.5" /> Baixar .docx
            </a>
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200">
        <TabLink ativo={ativa === "politica"} href="/politica" icon={<BookOpen className="h-3.5 w-3.5" />}>
          Política de Partnership
        </TabLink>
        <TabLink ativo={ativa === "relatorio"} href="/politica?doc=relatorio" icon={<FileText className="h-3.5 w-3.5" />}>
          Relatório de Revisão Técnica
        </TabLink>
        <span className="ml-auto text-xs text-neutral-500 pb-1.5 hidden md:block">
          Dúvidas sobre como o modelo é aplicado nos cálculos? Veja{" "}
          <Link href="/como-funciona" className="text-peri-700 hover:underline font-medium">
            Como funciona
          </Link>
          .
        </span>
      </div>

      {/* Layout: TOC + Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* TOC sticky em desktop */}
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

        {/* Conteúdo */}
        <article className="min-w-0">
          <Card className="px-6 py-6 lg:px-10 lg:py-8">
            <MarkdownContent md={md} />
          </Card>
        </article>
      </div>
    </main>
  );
}

function TabLink({
  href,
  ativo,
  icon,
  children,
}: {
  href: string;
  ativo: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
        (ativo
          ? "border-peri-600 text-peri-800"
          : "border-transparent text-neutral-600 hover:text-navy-900 hover:border-neutral-300")
      }
    >
      {icon}
      {children}
    </Link>
  );
}
