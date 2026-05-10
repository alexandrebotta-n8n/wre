// Cross-links para outros temas no rodapé da página de tema.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTema, type TemaSlug } from "../conteudo/temas";

export function VejaTambem({ slugs }: { slugs: TemaSlug[] }) {
  const temas = slugs.map(getTema).filter((t): t is NonNullable<typeof t> => !!t);
  if (temas.length === 0) return null;
  return (
    <section>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 mb-2">
        Veja também
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {temas.map((t) => (
          <Link
            key={t.slug}
            href={`/politica/${t.slug}`}
            className="flex items-center justify-between gap-2 rounded border border-neutral-200 p-3 text-sm hover:border-peri-300 hover:bg-peri-50/30 transition-colors group"
          >
            <div className="min-w-0">
              <div className="font-medium text-navy-900 truncate">{t.titulo}</div>
              <div className="text-xs text-neutral-500 truncate">{t.refLabel}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-peri-600 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}
