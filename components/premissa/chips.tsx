import { Badge } from "@/components/ui/badge";

const DISTRIB_LABEL: Record<string, string> = {
  UNIFORME: "B uniforme",
  PESO_INDIVIDUAL: "B por peso",
  ORIGINACAO: "B por originação",
  POR_AREA: "B por área",
};

/** Chips com os principais parâmetros de uma premissa (substitui JSON cru). */
export function PremissaChips({
  modelo,
  parametros,
}: {
  modelo: "ATUAL" | "NOVO";
  parametros: Record<string, unknown>;
}) {
  if (modelo === "ATUAL") {
    const proLabore = Number(parametros.proLaboreMensal ?? 0);
    const reserva = Number(parametros.reservaPercentual ?? 0);
    const viraPremio = Boolean(parametros.reservaViraPremio);
    return (
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="navy" size="sm">
          Pró-labore R$ {proLabore.toLocaleString("pt-BR")}/mês
        </Badge>
        <Badge variant="navy" size="sm">
          Reserva {(reserva * 100).toFixed(1)}%
        </Badge>
        {viraPremio && (
          <Badge variant="success" size="sm">
            Reserva → prêmio uniforme
          </Badge>
        )}
      </div>
    );
  }
  // NOVO
  const a = Number(parametros.percentualBlocoA ?? 0);
  const b = Number(parametros.percentualBlocoB ?? 0);
  const c = Number(parametros.percentualBlocoC ?? 0);
  const ps = Number(parametros.poolSociedade ?? 0);
  const pl = Number(parametros.poolLider ?? 0);
  const pe = Number(parametros.poolEquipeReserva ?? 0);
  const co = Number(parametros.chaveOriginacao ?? 0);
  const ce = Number(parametros.chaveExecucao ?? 0);
  const cg = Number(parametros.chaveGestaoCP ?? 0);
  const distrib = String(parametros.distribuicaoBlocoB ?? "UNIFORME");
  const fmt3 = (x: number, y: number, z: number) =>
    `${(x * 100).toFixed(0)}/${(y * 100).toFixed(0)}/${(z * 100).toFixed(0)}`;
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="info" size="sm">Blocos A/B/C {fmt3(a, b, c)}</Badge>
      <Badge variant="info" size="sm">Pool S/L/E {fmt3(ps, pl, pe)}</Badge>
      <Badge variant="info" size="sm">Chave O/E/G {fmt3(co, ce, cg)}</Badge>
      <Badge variant="success" size="sm">{DISTRIB_LABEL[distrib] ?? distrib}</Badge>
    </div>
  );
}
