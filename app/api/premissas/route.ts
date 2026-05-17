import { prisma } from "@/lib/prisma";
import { withAuth, parseJson } from "@/lib/api/handler";
import { CriarPremissaSchema, ParamsAtualSchema, ParamsNovoSchema } from "@/lib/schemas/premissa";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  return withAuth(async () => {
    const url = new URL(req.url);
    const modelo = url.searchParams.get("modelo");
    return prisma.premissa.findMany({
      where: { ativa: true, ...(modelo ? { modelo: modelo as never } : {}) },
      orderBy: [{ atualizadoEm: "desc" }],
      take: 100,
    });
  });
}

export async function POST(req: Request) {
  return withAuth(
    async (session) => {
      const input = await parseJson(req, CriarPremissaSchema);
      // Re-validar parametros conforme modelo
      const params = input.modelo === "ATUAL"
        ? ParamsAtualSchema.parse(input.parametros)
        : ParamsNovoSchema.parse(input.parametros);
      const p = await prisma.premissa.create({
        data: {
          nome: input.nome,
          descricao: input.descricao,
          modelo: input.modelo,
          parametros: params as never,
        },
      });
      await logAudit({
        usuarioId: session.id,
        acao: "premissa.criar",
        recurso: `Premissa:${p.id}`,
        meta: { nome: input.nome, modelo: input.modelo },
      });
      return Response.json(p, { status: 201 });
    },
    { roles: ["ADMIN", "CONSULTOR"], req },
  );
}
