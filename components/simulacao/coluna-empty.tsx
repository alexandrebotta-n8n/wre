// Estado vazio de uma coluna — "Coluna A vazia / Coluna B vazia".
// Quando o sistema sabe qual modelo aquela coluna deveria ter (A=ATUAL, B=NOVO),
// oferece criar com 1 clique usando a premissa default daquele modelo.
import Link from "next/link";
import { Sparkles, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModeloBadge } from "@/components/ui/badge";
import { criarCenarioAction } from "@/app/simulacao/acoes";
import { SubmitButton } from "@/components/ui/submit-button";

export interface ColunaEmptyProps {
  slot: "a" | "b";
  outroCenarioId: string;
  /** Se passada, oferece criar cenário do modelo correspondente com 1 clique. */
  modeloSugerido?: "ATUAL" | "NOVO";
  /** Premissa default daquele modelo (caso ofereça criar). */
  premissaDefaultId?: string;
  premissaDefaultNome?: string;
  /** Premissa default do modelo oposto (caminho secundário "criar do outro modelo"). */
  premissaOutroId?: string;
  podeMutar: boolean;
}

const ROTULOS = {
  ATUAL: { titulo: "Sistema vigente", subtitulo: "modelo Atual — baseline" },
  NOVO: { titulo: "Proposta nova", subtitulo: "modelo Novo — Política DSF v1" },
};

export function ColunaEmpty({
  slot,
  outroCenarioId,
  modeloSugerido,
  premissaDefaultId,
  premissaDefaultNome,
  premissaOutroId,
  podeMutar,
}: ColunaEmptyProps) {
  const modeloOutro: "ATUAL" | "NOVO" | undefined = modeloSugerido
    ? modeloSugerido === "ATUAL"
      ? "NOVO"
      : "ATUAL"
    : undefined;
  const podeCriarOutro = podeMutar && modeloOutro && premissaOutroId;
  // Link pra abrir drawer (escolher cenário existente)
  const drawerSp = new URLSearchParams();
  if (outroCenarioId) drawerSp.set(slot === "a" ? "b" : "a", outroCenarioId);
  drawerSp.set("drawer", "1");
  const drawerHref = `/simulacao?${drawerSp.toString()}`;

  const podeCriar = podeMutar && modeloSugerido && premissaDefaultId;

  return (
    <Card className="min-h-[300px] flex flex-col items-center justify-center text-center p-6 border-dashed">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">
          Coluna {slot.toUpperCase()}
        </span>
        {modeloSugerido && (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-neutral-400">
            sugestão: <ModeloBadge modelo={modeloSugerido} />
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-peri-100 text-peri-700">
          {modeloSugerido ? <Sparkles className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
        </div>
        {modeloSugerido ? (
          <>
            <h3 className="text-base font-semibold text-navy-900">
              {ROTULOS[modeloSugerido].titulo}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {ROTULOS[modeloSugerido].subtitulo}
            </p>
            <p className="text-sm text-neutral-600 mt-3 max-w-xs mx-auto">
              Ainda não há cenário <strong>{modeloSugerido === "ATUAL" ? "Atual" : "Novo"}</strong> criado.
              {podeCriar && premissaDefaultNome && (
                <>
                  {" "}Posso criar agora usando <strong>{premissaDefaultNome}</strong>.
                </>
              )}
            </p>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-navy-900">Coluna vazia</h3>
            <p className="text-sm text-neutral-600 mt-1 max-w-xs mx-auto">
              Selecione um cenário existente para começar a comparar.
            </p>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        {podeCriar && (
          <form action={criarCenarioAction}>
            <input
              type="hidden"
              name="nome"
              value={`${modeloSugerido === "ATUAL" ? "Atual" : "Novo"} ${new Date().getFullYear()}`}
            />
            <input type="hidden" name="ano" value={new Date().getFullYear()} />
            <input type="hidden" name="modelo" value={modeloSugerido!} />
            <input type="hidden" name="premissaId" value={premissaDefaultId!} />
            <input type="hidden" name="slot" value={slot} />
            <input type="hidden" name="outroCenarioId" value={outroCenarioId} />
            <SubmitButton variant="primary" size="sm">
              <Sparkles className="h-3.5 w-3.5" />
              Criar cenário {modeloSugerido === "ATUAL" ? "Atual" : "Novo"}
            </SubmitButton>
          </form>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href={drawerHref}>
            {podeCriar ? "Ou escolher existente" : "Abrir lista de cenários"}
          </Link>
        </Button>
      </div>

      {podeCriarOutro && (
        <form action={criarCenarioAction} className="mt-2">
          <input
            type="hidden"
            name="nome"
            value={`${modeloOutro === "ATUAL" ? "Atual" : "Novo"} ${new Date().getFullYear()}`}
          />
          <input type="hidden" name="ano" value={new Date().getFullYear()} />
          <input type="hidden" name="modelo" value={modeloOutro!} />
          <input type="hidden" name="premissaId" value={premissaOutroId!} />
          <input type="hidden" name="slot" value={slot} />
          <input type="hidden" name="outroCenarioId" value={outroCenarioId} />
          <SubmitButton variant="ghost" size="sm" className="text-xs text-neutral-500 hover:text-peri-700">
            ou criar cenário {modeloOutro === "ATUAL" ? "Atual" : "Novo"} aqui
          </SubmitButton>
        </form>
      )}
    </Card>
  );
}
