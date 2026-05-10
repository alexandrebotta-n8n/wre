// Layout padrão de uma página de tema /politica/[tema].
// Header → resumo executivo → visual → exemplo → texto integral colapsável → veja-também.
import Link from "next/link";
import { ArrowLeft, FileText, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { MarkdownContent } from "../markdown";
import { extrairClausulas, extrairAnexos } from "../conteudo/extratos";
import { ExemploPratico } from "./exemplo-pratico";
import { VejaTambem } from "./veja-tambem";
import { BuscaPolitica } from "./busca-politica";
import type { TemaPolitica } from "../conteudo/temas";

export function TemaShell({
  tema,
  visual,
}: {
  tema: TemaPolitica;
  visual: React.ReactNode;
}) {
  const textoClausulas = extrairClausulas(tema.clausulas);
  const textoAnexos = tema.anexos.length > 0 ? extrairAnexos(tema.anexos) : "";

  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Início", href: "/simulacao" },
          { label: "Política", href: "/politica" },
          { label: tema.titulo },
        ]}
        title={tema.titulo}
        description={tema.resumoCurto}
        meta={
          <>
            <Badge variant="info" size="sm">{tema.refLabel}</Badge>
            <span className="text-neutral-500">·</span>
            <Link href="/politica" className="inline-flex items-center gap-1 hover:text-peri-700">
              <ArrowLeft className="h-3 w-3" /> Voltar à Política
            </Link>
          </>
        }
        actions={<BuscaPolitica />}
      />

      {/* Resumo executivo */}
      <Card className="p-6 bg-peri-50/30 border-peri-200">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-peri-800 mb-2">
          Resumo executivo
        </div>
        <div className="space-y-2 text-sm text-neutral-800 leading-relaxed">
          {tema.resumoExecutivo.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-peri-200/60 text-[11px] text-neutral-500 italic">
          Resumo elaborado pela WRE para navegação. Referência oficial é o texto integral
          (Política + Anexo) abaixo.
        </div>
      </Card>

      {/* Visual */}
      <Card className="p-6">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 mb-4">
          Visualização
        </div>
        {visual}
      </Card>

      {/* Exemplo */}
      <ExemploPratico
        titulo={tema.exemplo.titulo}
        descricao={tema.exemplo.descricao}
        hint={tema.exemplo.paramsSimulacao?.hint}
      />

      {/* Texto integral */}
      <details className="group">
        <summary className="cursor-pointer flex items-center justify-between gap-2 px-5 py-3 rounded-lg bg-white border border-neutral-200 hover:border-peri-300 transition-colors">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-navy-900">
            <FileText className="h-4 w-4 text-peri-600" />
            Texto integral{textoAnexos ? " (com anexo integrado)" : ""}
          </span>
          <ChevronDown className="h-4 w-4 text-neutral-400 group-open:rotate-180 transition-transform" />
        </summary>
        <Card className="px-6 py-6 lg:px-10 mt-2">
          <MarkdownContent md={textoClausulas} />
          {textoAnexos && (
            <>
              <hr className="my-6 border-neutral-200" />
              <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-800 mb-2">
                Anexo integrado
              </div>
              <MarkdownContent md={textoAnexos} />
            </>
          )}
        </Card>
      </details>

      {/* Veja também */}
      <VejaTambem slugs={tema.vejaTambem} />
    </main>
  );
}
