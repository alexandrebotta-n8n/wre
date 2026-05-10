// Resultados da busca em /politica.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BuscaPolitica } from "../componentes/busca-politica";
import { buscar } from "@/lib/politica/busca";

export const metadata = { title: "Buscar — Política DSF" };

export default async function BuscaResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const resultados = q.length >= 2 ? buscar(q, 30) : [];

  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 space-y-5">
      <PageHeader
        breadcrumb={[
          { label: "Início", href: "/simulacao" },
          { label: "Política", href: "/politica" },
          { label: "Buscar" },
        ]}
        title={q ? `Busca: "${q}"` : "Busca na Política"}
        description={
          q
            ? `${resultados.length} resultado(s) encontrado(s)`
            : "Digite ao menos 2 caracteres para buscar."
        }
        actions={<BuscaPolitica defaultValue={q} />}
        meta={
          <Link href="/politica" className="inline-flex items-center gap-1 hover:text-peri-700">
            <ArrowLeft className="h-3 w-3" /> Voltar ao hub
          </Link>
        }
      />

      {!q && (
        <Card className="p-8 text-center text-sm text-neutral-500">
          Digite uma palavra ou expressão para buscar — ex: <em>vesting</em>, <em>bloco B</em>,
          <em> líder de unidade</em>, <em>haveres</em>.
        </Card>
      )}

      {q && resultados.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm text-neutral-700">
            Nenhum resultado para <strong>&ldquo;{q}&rdquo;</strong>.
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Tente outras palavras-chave ou abra o{" "}
            <Link href="/politica/documento-completo" className="text-peri-700 hover:underline">
              documento completo
            </Link>
            .
          </p>
        </Card>
      )}

      {q && resultados.length > 0 && (
        <div className="space-y-2">
          {resultados.map((r, i) => (
            <Link
              key={i}
              href={r.href}
              className="block rounded-lg border border-neutral-200 p-4 hover:border-peri-300 hover:bg-peri-50/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                    {r.contexto}
                  </div>
                  <h3 className="font-semibold text-navy-900 mt-0.5">{r.titulo}</h3>
                </div>
                <Badge variant="info" size="sm">score {r.score}</Badge>
              </div>
              {r.snippet && (
                <p
                  className="mt-2 text-sm text-neutral-700 leading-relaxed [&_mark]:bg-amber-200 [&_mark]:text-navy-900 [&_mark]:rounded [&_mark]:px-0.5"
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
