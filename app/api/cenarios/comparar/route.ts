// Comparativo entre 2 cenários para um mesmo período.
// Retorna pacotes do A e do B alinhados por sócio + diff por componente.
import { prisma } from "@/lib/prisma";
import { withAuth, ApiError } from "@/lib/api/handler";

export async function GET(req: Request) {
  return withAuth(async () => {
    const url = new URL(req.url);
    const aId = url.searchParams.get("a");
    const bId = url.searchParams.get("b");
    const periodoId = url.searchParams.get("periodoId");
    if (!aId || !bId || !periodoId) {
      throw new ApiError("Parâmetros obrigatórios: a, b, periodoId", 400);
    }

    const [a, b, periodo] = await Promise.all([
      prisma.cenario.findUnique({
        where: { id: aId },
        include: {
          remuneracoes: {
            where: { periodoId },
            include: { socio: { select: { nome: true, isFundador: true, percentualQuotasDefault: true } } },
          },
        },
      }),
      prisma.cenario.findUnique({
        where: { id: bId },
        include: {
          remuneracoes: {
            where: { periodoId },
            include: { socio: { select: { nome: true, isFundador: true, percentualQuotasDefault: true } } },
          },
        },
      }),
      prisma.periodo.findUnique({ where: { id: periodoId } }),
    ]);
    if (!a) throw new ApiError(`Cenário A (${aId}) não encontrado`, 404);
    if (!b) throw new ApiError(`Cenário B (${bId}) não encontrado`, 404);
    if (!periodo) throw new ApiError("Período não encontrado", 404);

    const mapA = new Map(a.remuneracoes.map((r) => [r.socioId, r]));
    const mapB = new Map(b.remuneracoes.map((r) => [r.socioId, r]));
    const todosSocioIds = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));

    const linhas = todosSocioIds.map((sid) => {
      const ra = mapA.get(sid);
      const rb = mapB.get(sid);
      const nome = ra?.socio.nome ?? rb?.socio.nome ?? "?";
      const totalA = ra?.total ?? 0;
      const totalB = rb?.total ?? 0;
      return {
        socioId: sid,
        nome,
        a: ra ? pacote(ra) : null,
        b: rb ? pacote(rb) : null,
        diffTotal: totalB - totalA,
        diffPercentual: totalA > 0 ? (totalB - totalA) / totalA : null,
      };
    });
    // Ordena por |diff| descendente
    linhas.sort((x, y) => Math.abs(y.diffTotal) - Math.abs(x.diffTotal));

    return {
      cenarioA: { id: a.id, nome: a.nome, modelo: a.modelo },
      cenarioB: { id: b.id, nome: b.nome, modelo: b.modelo },
      periodo: { id: periodo.id, rotulo: periodo.rotulo },
      totalA: linhas.reduce((acc, l) => acc + (l.a?.total ?? 0), 0),
      totalB: linhas.reduce((acc, l) => acc + (l.b?.total ?? 0), 0),
      linhas,
    };
  });
}

function pacote(r: {
  proLabore: number; remuneracaoGestao: number; remuneracaoFundador: number;
  blocoA: number; blocoB: number; blocoC: number; poolUnidade: number;
  creditoOriginacao: number; creditoExecucao: number; creditoGestaoCP: number;
  premio: number; ajustes: number; total: number;
}) {
  return {
    proLabore: r.proLabore,
    remuneracaoGestao: r.remuneracaoGestao,
    remuneracaoFundador: r.remuneracaoFundador,
    blocoA: r.blocoA,
    blocoB: r.blocoB,
    blocoC: r.blocoC,
    poolUnidade: r.poolUnidade,
    creditoOriginacao: r.creditoOriginacao,
    creditoExecucao: r.creditoExecucao,
    creditoGestaoCP: r.creditoGestaoCP,
    premio: r.premio,
    ajustes: r.ajustes,
    total: r.total,
  };
}
