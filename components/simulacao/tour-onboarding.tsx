"use client";
// Tour de boas-vindas da /simulacao — exibido na 1ª visita.
// Custom (sem lib externa). Localiza elementos via [data-tour="..."],
// mede o rect e desenha overlay + tooltip card. Persistência via cookie
// gravado pela server action `marcarTourVistoAction`.
import * as React from "react";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marcarTourVistoAction } from "@/app/simulacao/acoes";
import { cn } from "@/lib/utils";

type Lado = "top" | "bottom" | "left" | "right" | "center";

interface PassoTour {
  /** Quando "center", mostra modal centralizado sem alvo. Caso contrário,
   *  procura o elemento via querySelector e ancora o card. */
  alvo: string | "center";
  lado?: Lado;
  titulo: string;
  corpo: React.ReactNode;
}

const PASSOS: PassoTour[] = [
  {
    alvo: "center",
    titulo: "Bem-vindo à Simulação",
    corpo: (
      <>
        Aqui você compara cenários de remuneração lado a lado e publica a versão oficial.
        Vou te mostrar os 4 lugares-chave em 30 segundos. Pode pular a qualquer momento.
      </>
    ),
  },
  {
    alvo: '[data-tour="cenarios"]',
    lado: "bottom",
    titulo: "Cenários",
    corpo: (
      <>
        Cada simulação é um <strong>cenário</strong>. Abra esta lista para criar, escolher qual
        cenário vai em cada coluna (A ou B) e filtrar por modelo/status.
      </>
    ),
  },
  {
    alvo: '[data-tour="parametros"]',
    lado: "left",
    titulo: "Parâmetros editáveis",
    corpo: (
      <>
        Ajuste os parâmetros do cenário inline. Clique <strong>Aplicar parâmetros</strong> para
        salvar e depois <strong>Recalcular</strong> para rodar o engine nos 4 trimestres do ano.
      </>
    ),
  },
  {
    alvo: '[data-tour="acoes-publicar"]',
    lado: "top",
    titulo: "Calcular & Publicar",
    corpo: (
      <>
        Quando estiver satisfeito, <strong>Publicar</strong> congela o cenário como snapshot
        imutável. Se faltarem trimestres, o sistema calcula antes de publicar.
      </>
    ),
  },
  {
    alvo: '[data-tour="ajuda"]',
    lado: "bottom",
    titulo: "Ajuda sempre à mão",
    corpo: (
      <>
        Reabra esta ajuda aqui sempre que precisar. Cada seção da página também tem um botão
        <strong> ?</strong> contextual que pula direto para o tópico relevante.
      </>
    ),
  },
];

const CARD_W = 340;
const CARD_GAP = 14;
const RECT_PADDING = 6;

export function TourOnboarding({ mostrar }: { mostrar: boolean }) {
  const [ativo, setAtivo] = React.useState(mostrar);
  const [passo, setPasso] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  const passoAtual = PASSOS[passo];

  // Mede o alvo a cada mudança de passo + scroll/resize.
  React.useEffect(() => {
    if (!ativo || !passoAtual || passoAtual.alvo === "center") return;
    function medir() {
      const el = document.querySelector(passoAtual!.alvo as string) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "auto" });
      setRect(el.getBoundingClientRect());
    }
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [ativo, passo, passoAtual]);


  async function fechar() {
    setAtivo(false);
    try {
      await marcarTourVistoAction();
    } catch {
      // sem persistência o tour reabre na próxima visita — aceitável
    }
  }

  if (!ativo || !passoAtual) return null;

  const isCenter = passoAtual.alvo === "center" || rect === null;
  const cardPos = isCenter ? null : posicionarCard(rect!, passoAtual.lado ?? "bottom");

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-label="Tour de boas-vindas">
      {/* overlay escurecido */}
      <div
        className="absolute inset-0 bg-navy-950/60 transition-opacity"
        onClick={fechar}
        aria-hidden
      />

      {/* spotlight */}
      {!isCenter && rect && (
        <div
          className="absolute rounded-md pointer-events-none ring-2 ring-peri-400 transition-all"
          style={{
            top: rect.top - RECT_PADDING,
            left: rect.left - RECT_PADDING,
            width: rect.width + RECT_PADDING * 2,
            height: rect.height + RECT_PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(13, 18, 39, 0.55)",
          }}
          aria-hidden
        />
      )}

      {/* card */}
      <div
        className={cn(
          "absolute bg-white rounded-lg shadow-xl ring-1 ring-neutral-200 p-4 w-[340px]",
          isCenter && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        )}
        style={
          isCenter
            ? undefined
            : { top: cardPos!.top, left: cardPos!.left }
        }
      >
        <div className="flex items-start justify-between gap-2">
          <div className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-peri-600" />
            <h3 className="text-sm font-semibold text-navy-900">{passoAtual.titulo}</h3>
          </div>
          <button
            type="button"
            onClick={fechar}
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-neutral-100 text-neutral-500"
            aria-label="Fechar tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-sm text-neutral-700 leading-relaxed mt-2">{passoAtual.corpo}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400">
            {passo + 1} / {PASSOS.length}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={fechar}>
              Pular
            </Button>
            {passo < PASSOS.length - 1 ? (
              <Button type="button" variant="primary" size="sm" onClick={() => setPasso(passo + 1)}>
                Próximo
                <ArrowRight className="h-3 w-3" />
              </Button>
            ) : (
              <Button type="button" variant="primary" size="sm" onClick={fechar}>
                Concluir
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function posicionarCard(rect: DOMRect, lado: Lado): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardH = 180; // estimativa — sem altura fixa para evitar jitter
  let top = 0;
  let left = 0;
  switch (lado) {
    case "top":
      top = rect.top - cardH - CARD_GAP;
      left = rect.left + rect.width / 2 - CARD_W / 2;
      break;
    case "bottom":
      top = rect.bottom + CARD_GAP;
      left = rect.left + rect.width / 2 - CARD_W / 2;
      break;
    case "left":
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.left - CARD_W - CARD_GAP;
      break;
    case "right":
    default:
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.right + CARD_GAP;
      break;
  }
  // Clamp dentro da viewport
  top = Math.max(12, Math.min(top, vh - cardH - 12));
  left = Math.max(12, Math.min(left, vw - CARD_W - 12));
  return { top, left };
}
