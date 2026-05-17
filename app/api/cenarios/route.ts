import { prisma } from "@/lib/prisma";
import { withAuth, parseJson, ApiError } from "@/lib/api/handler";
import { CriarCenarioSchema } from "@/lib/schemas/cenario";
import { criarCenarioComDefaults } from "@/lib/cenario-service";
import { logAudit } from "@/lib/audit";
import { escopoDe } from "@/lib/auth/escopo";
import { checkRateLimit } from "@/lib/api/rate-limit";

// Rate limit conservador: até 30 cenários criados por usuário a cada 1h
// (evita flood acidental de scripts/tests; uso humano normal fica <5/h).
const CENARIO_CRIAR_LIMITE = { max: 30, janelaMs: 60 * 60 * 1000 };

export async function GET() {
  return withAuth(async (session) => {
    const escopo = escopoDe(session);
    return prisma.cenario.findMany({
      // SOCIO só vê cenários publicados.
      where: escopo.ehSocioRestrito ? { status: "APPLIED" } : {},
      orderBy: [{ criadoEm: "desc" }],
      include: { premissa: { select: { nome: true, modelo: true } } },
      take: 200,
    });
  });
}

export async function POST(req: Request) {
  return withAuth(
    async (session) => {
      const rl = await checkRateLimit({
        acao: "cenario.criar",
        usuarioId: session.id,
        maxPorUsuario: CENARIO_CRIAR_LIMITE.max,
        janelaMs: CENARIO_CRIAR_LIMITE.janelaMs,
      });
      if (!rl.ok) throw new ApiError(rl.motivo ?? "Rate limit", 429);

      const input = await parseJson(req, CriarCenarioSchema);
      const cenario = await criarCenarioComDefaults({
        nome: input.nome,
        descricao: input.descricao,
        ano: input.ano,
        modelo: input.modelo,
        premissaId: input.premissaId,
        criadoPorId: session.id,
      });
      await logAudit({
        usuarioId: session.id,
        acao: "cenario.criar",
        recurso: `Cenario:${cenario.id}`,
        meta: { nome: input.nome, modelo: input.modelo, ano: input.ano },
      });
      return Response.json(cenario, { status: 201 });
    },
    { roles: ["ADMIN", "CONSULTOR"], req },
  );
}
