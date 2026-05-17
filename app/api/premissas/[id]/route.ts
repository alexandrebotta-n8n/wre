import { prisma } from "@/lib/prisma";
import { withAuth, parseJson, ApiError } from "@/lib/api/handler";
import {
  AtualizarPremissaSchema, ParamsAtualSchema, ParamsNovoSchema,
} from "@/lib/schemas/premissa";
import { logAudit } from "@/lib/audit";
import { atualizarPremissaComSnapshot } from "@/lib/premissa-service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await ctx.params;
    const p = await prisma.premissa.findUnique({ where: { id } });
    if (!p) throw new ApiError("Premissa não encontrada", 404);
    return p;
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(
    async (session) => {
      const { id } = await ctx.params;
      const existing = await prisma.premissa.findUnique({ where: { id } });
      if (!existing) throw new ApiError("Premissa não encontrada", 404);
      const input = await parseJson(req, AtualizarPremissaSchema);
      const args: { nome?: string; descricao?: string | null; parametros?: unknown } = {};
      if (input.nome !== undefined) args.nome = input.nome;
      if (input.descricao !== undefined) args.descricao = input.descricao;
      if (input.parametros !== undefined) {
        args.parametros = existing.modelo === "ATUAL"
          ? ParamsAtualSchema.parse(input.parametros)
          : ParamsNovoSchema.parse(input.parametros);
      }
      const p = await atualizarPremissaComSnapshot(id, args, {
        snapshotPorId: session.id,
        motivo: "edição via API",
      });
      await logAudit({
        usuarioId: session.id,
        acao: "premissa.atualizar",
        recurso: `Premissa:${id}`,
        meta: { campos: Object.keys(args) },
      });
      return p;
    },
    { roles: ["ADMIN", "CONSULTOR"], req },
  );
}
