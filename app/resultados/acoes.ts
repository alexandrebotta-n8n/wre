"use server";
// Server Actions de /resultados — CRUD de ResultadoPeriodo + criação de Período.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { flashError, flashSuccess } from "@/lib/flash";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import {
  CriarPeriodoSchema,
  SalvarResultadoPeriodoSchema,
} from "@/lib/schemas/resultados";

function rev() {
  revalidatePath("/resultados");
  revalidatePath("/simulacao");
}

async function exigirMutacao() {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  if (!escopo.podeMutar) throw new Error("Sem permissão");
  return { session, escopo };
}

export async function salvarResultadoAction(formData: FormData) {
  try {
    const { session } = await exigirMutacao();
    const data = SalvarResultadoPeriodoSchema.parse({
      unidadeId: String(formData.get("unidadeId") ?? ""),
      periodoId: String(formData.get("periodoId") ?? ""),
      lucroLiquido: Number(formData.get("lucroLiquido") ?? 0),
      fundingVariavel:
        formData.get("fundingVariavel") === null || formData.get("fundingVariavel") === ""
          ? null
          : Number(formData.get("fundingVariavel")),
      ehReal: formData.get("ehReal") === "on" || formData.get("ehReal") === "true",
      fonte: String(formData.get("fonte") ?? "").trim() || undefined,
    });

    const r = await prisma.resultadoPeriodo.upsert({
      where: { unidadeId_periodoId: { unidadeId: data.unidadeId, periodoId: data.periodoId } },
      create: {
        unidadeId: data.unidadeId,
        periodoId: data.periodoId,
        lucroLiquido: data.lucroLiquido,
        fundingVariavel: data.fundingVariavel ?? undefined,
        ehReal: data.ehReal ?? true,
        fonte: data.fonte,
      },
      update: {
        lucroLiquido: data.lucroLiquido,
        fundingVariavel: data.fundingVariavel ?? undefined,
        ehReal: data.ehReal ?? true,
        fonte: data.fonte,
      },
    });

    await logAudit({
      usuarioId: session?.user?.id,
      acao: "resultado.salvar",
      recurso: `ResultadoPeriodo:${r.id}`,
      meta: { unidadeId: data.unidadeId, periodoId: data.periodoId, lucroLiquido: data.lucroLiquido },
    });
    await flashSuccess("Resultado salvo.");
  } catch (e) {
    await flashError(e instanceof Error ? e.message : "Erro ao salvar resultado.");
  }
  rev();
}

export async function excluirResultadoAction(formData: FormData) {
  try {
    const { session } = await exigirMutacao();
    const id = String(formData.get("id") ?? "");
    if (!id) throw new Error("id obrigatório");
    await prisma.resultadoPeriodo.delete({ where: { id } });
    await logAudit({
      usuarioId: session?.user?.id,
      acao: "resultado.excluir",
      recurso: `ResultadoPeriodo:${id}`,
    });
    await flashSuccess("Resultado removido.");
  } catch (e) {
    await flashError(e instanceof Error ? e.message : "Erro ao remover resultado.");
  }
  rev();
}

export async function criarPeriodoAction(formData: FormData) {
  try {
    const { session } = await exigirMutacao();
    const tipo = String(formData.get("tipo") ?? "TRIMESTRE") as "TRIMESTRE" | "ANO";
    const ano = Number(formData.get("ano") ?? new Date().getFullYear());
    const trimestreRaw = formData.get("trimestre");
    const trimestre =
      tipo === "TRIMESTRE" && trimestreRaw !== null && trimestreRaw !== ""
        ? Number(trimestreRaw)
        : undefined;
    const rotuloAuto =
      tipo === "TRIMESTRE" && trimestre ? `${trimestre}T${ano}` : `${ano}`;
    const data = CriarPeriodoSchema.parse({
      tipo,
      ano,
      trimestre,
      rotulo: String(formData.get("rotulo") ?? rotuloAuto).trim() || rotuloAuto,
    });

    const p = await prisma.periodo.upsert({
      where: {
        tipo_ano_trimestre: { tipo: data.tipo, ano: data.ano, trimestre: data.trimestre ?? null as never },
      },
      create: {
        tipo: data.tipo,
        ano: data.ano,
        trimestre: data.trimestre ?? null,
        rotulo: data.rotulo,
      },
      update: { rotulo: data.rotulo },
    });
    await logAudit({
      usuarioId: session?.user?.id,
      acao: "periodo.criar",
      recurso: `Periodo:${p.id}`,
      meta: { tipo: data.tipo, ano: data.ano, trimestre: data.trimestre },
    });
    await flashSuccess(`Período ${data.rotulo} criado.`);
  } catch (e) {
    await flashError(e instanceof Error ? e.message : "Erro ao criar período.");
  }
  rev();
}
