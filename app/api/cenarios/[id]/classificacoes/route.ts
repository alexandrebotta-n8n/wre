// Atualiza/cria classificações em lote (PUT — substitui o conjunto).
import { prisma } from "@/lib/prisma";
import { withAuth, parseJson, ApiError } from "@/lib/api/handler";
import { AtualizarClassificacaoSchema } from "@/lib/schemas/cenario";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const BodySchema = z.object({
  classificacoes: z.array(AtualizarClassificacaoSchema).min(1),
  /** Versão esperada do cenário (optimistic locking). Se omitido, pula a checagem. */
  versionExpected: z.number().int().optional(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(
    async (session) => {
      const { id: cenarioId } = await ctx.params;
      const body = await parseJson(req, BodySchema);
      const cenario = await prisma.cenario.findUnique({ where: { id: cenarioId } });
      if (!cenario) throw new ApiError("Cenário não encontrado", 404);
      if (cenario.status !== "DRAFT") {
        throw new ApiError("Apenas cenários em rascunho podem ser editados", 409);
      }
      if (body.versionExpected !== undefined && cenario.versao !== body.versionExpected) {
        throw new ApiError(
          `Conflito de edição: cenário foi atualizado por outro usuário (esperado v${body.versionExpected}, atual v${cenario.versao}). Recarregue.`,
          409,
        );
      }

      // Upsert por (cenarioId, socioId) + increment de versão atomicamente.
      await prisma.$transaction([
        ...body.classificacoes.map((c) =>
          prisma.classificacaoSocio.upsert({
            where: { cenarioId_socioId: { cenarioId, socioId: c.socioId } },
            create: {
              cenarioId,
              socioId: c.socioId,
              publico: c.publico,
              unidadeId: c.unidadeId ?? null,
              percentualQuotas: c.percentualQuotas,
              originacaoEsperada: c.originacaoEsperada,
              nivelCargoOverride: c.nivelCargoOverride ?? null,
              faixaSalarialOverride: c.faixaSalarialOverride ?? null,
            },
            update: {
              publico: c.publico,
              unidadeId: c.unidadeId ?? null,
              percentualQuotas: c.percentualQuotas,
              originacaoEsperada: c.originacaoEsperada,
              nivelCargoOverride: c.nivelCargoOverride ?? null,
              faixaSalarialOverride: c.faixaSalarialOverride ?? null,
            },
          }),
        ),
        prisma.cenario.update({
          where: { id: cenarioId },
          data: { versao: { increment: 1 } },
        }),
      ]);

      await logAudit({
        usuarioId: session.id,
        acao: "cenario.classificacoes.atualizar",
        recurso: `Cenario:${cenarioId}`,
        meta: { quantidade: body.classificacoes.length },
      });
      return { ok: true, atualizadas: body.classificacoes.length, versao: cenario.versao + 1 };
    },
    { roles: ["ADMIN", "CONSULTOR"], req },
  );
}
