"use server";
// Server Actions da página /simulacao.
// Concentradas aqui (em vez de inline na page.tsx) para reuso entre os
// componentes-cliente das colunas/drawers.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { flashError, flashSuccess } from "@/lib/flash";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import {
  calcularCenario,
  clonarCenarioComoRascunho,
  criarCenarioComDefaults,
  atualizarParametrosOverride,
} from "@/lib/cenario-service";
import { logPermissionDenied } from "@/lib/auth/audit-denied";

function rev() {
  revalidatePath("/simulacao");
}

// Marca o tour de boas-vindas como visto (cookie de longa duração).
// Não revalida — só preferência de exibição local do navegador.
export async function marcarTourVistoAction(): Promise<void> {
  const { marcarTourVisto } = await import("@/lib/preferencias");
  await marcarTourVisto();
}

// ============================================================================
// Cenário
// ============================================================================

export async function criarCenarioAction(formData: FormData) {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  if (!escopo.podeMutar) {
    await flashError("Sem permissão para criar cenário.");
    return;
  }
  const nome = String(formData.get("nome") ?? "").trim();
  const ano = Number(formData.get("ano") ?? new Date().getFullYear());
  const modelo = String(formData.get("modelo") ?? "NOVO") as "ATUAL" | "NOVO";
  const premissaId = String(formData.get("premissaId") ?? "");
  const slot = String(formData.get("slot") ?? "a") as "a" | "b";
  const outroSlot = String(formData.get("outroCenarioId") ?? "");
  if (!nome || !premissaId) {
    await flashError("Nome e premissa são obrigatórios.");
    return;
  }
  try {
    const c = await criarCenarioComDefaults({
      nome, ano, modelo, premissaId, criadoPorId: session?.user?.id,
    });
    await logAudit({
      usuarioId: session?.user?.id,
      acao: "cenario.criar",
      recurso: `Cenario:${c.id}`,
      meta: { nome, ano, modelo, slot },
    });

    // Auto-calcular (anual) — UX fluida: 1 clique do empty state já entrega
    // cenário calculado. Se não houver ResultadoPeriodo cadastrado, ignora.
    let mensagem = `Cenário "${nome}" criado e aberto na coluna ${slot.toUpperCase()}.`;
    try {
      await calcularCenario({ cenarioId: c.id });
      mensagem = `Cenário "${nome}" criado e calculado. Veja a comparação.`;
    } catch {
      // Falha no cálculo automático não bloqueia (ex: ano sem ResultadoPeriodo).
    }
    await flashSuccess(mensagem);
    const params = new URLSearchParams();
    if (slot === "a") {
      params.set("a", c.id);
      if (outroSlot) params.set("b", outroSlot);
    } else {
      if (outroSlot) params.set("a", outroSlot);
      params.set("b", c.id);
    }
    redirect(`/simulacao?${params.toString()}`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Falha ao criar cenário";
    await flashError(msg);
  }
}

export async function calcularAction(formData: FormData) {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const cenarioId = String(formData.get("cenarioId"));
  if (!escopo.podeMutar) {
    await logPermissionDenied(session?.user?.id, "cenario.calcular", `Cenario:${cenarioId}`);
    return;
  }
  try {
    await calcularCenario({ cenarioId });
    await logAudit({
      usuarioId: session?.user?.id,
      acao: "cenario.calcular",
      recurso: `Cenario:${cenarioId}`,
    });
    await flashSuccess("Pacotes recalculados.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao calcular";
    await flashError(`Falha ao calcular: ${msg}`);
  }
  rev();
}

export async function publicarAction(formData: FormData) {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const cenarioId = String(formData.get("cenarioId"));
  if (!escopo.podeMutar) {
    await logPermissionDenied(session?.user?.id, "cenario.aplicar", `Cenario:${cenarioId}`);
    return;
  }

  // Auto-cálculo antes de publicar — garante snapshot atualizado.
  try {
    await calcularCenario({ cenarioId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao calcular";
    await flashError(`Falha ao calcular antes de publicar: ${msg}`);
    rev();
    return;
  }

  const cenario = await prisma.cenario.findUnique({
    where: { id: cenarioId },
    include: { classificacoes: true, remuneracoes: true, premissa: true },
  });
  if (!cenario || cenario.status !== "DRAFT") return;
  const erros = cenario.remuneracoes.flatMap((r) =>
    ((r.alertas as string[] | null) ?? []).filter((a) => a.includes("[ERROR]")),
  );
  if (erros.length > 0) {
    await flashError(`${erros.length} alerta(s) ERROR impedem a publicação. Corrija antes.`);
    rev();
    return;
  }
  await prisma.cenario.updateMany({
    where: { modelo: cenario.modelo, ano: cenario.ano, status: "APPLIED" },
    data: { status: "ARCHIVED" },
  });
  await prisma.cenario.update({
    where: { id: cenarioId },
    data: {
      status: "APPLIED",
      aplicadoEm: new Date(),
      snapshot: {
        cenario: { id: cenario.id, nome: cenario.nome, modelo: cenario.modelo, ano: cenario.ano },
        premissa: { id: cenario.premissa.id, nome: cenario.premissa.nome, parametros: cenario.premissa.parametros },
        parametrosEfetivos: cenario.parametrosOverride ?? cenario.premissa.parametros,
        classificacoes: cenario.classificacoes,
        remuneracoes: cenario.remuneracoes,
      } as never,
    },
  });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "cenario.aplicar",
    recurso: `Cenario:${cenarioId}`,
    meta: { modelo: cenario.modelo, ano: cenario.ano },
  });
  await flashSuccess("Versão final salva — cálculo congelado.");
  rev();
}

export async function reabrirComoRascunhoAction(formData: FormData) {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  if (!escopo.podeMutar) {
    await flashError("Sem permissão para reabrir cenário.");
    return;
  }
  const cenarioId = String(formData.get("cenarioId"));
  const novoNome = String(formData.get("novoNome") ?? "").trim() || undefined;
  const slot = String(formData.get("slot") ?? "a") as "a" | "b";
  const outroSlot = String(formData.get("outroCenarioId") ?? "");
  try {
    const novo = await clonarCenarioComoRascunho({
      cenarioId,
      novoNome,
      criadoPorId: session?.user?.id,
    });
    await logAudit({
      usuarioId: session?.user?.id,
      acao: "cenario.reabrir-como-rascunho",
      recurso: `Cenario:${novo.id}`,
      meta: { origemId: cenarioId },
    });
    await flashSuccess("Rascunho criado a partir do cenário publicado.");
    const params = new URLSearchParams();
    if (slot === "a") {
      params.set("a", novo.id);
      if (outroSlot) params.set("b", outroSlot);
    } else {
      if (outroSlot) params.set("a", outroSlot);
      params.set("b", novo.id);
    }
    redirect(`/simulacao?${params.toString()}`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Falha ao reabrir como rascunho";
    await flashError(msg);
  }
}

// ============================================================================
// Arquivar / Excluir cenário
// ============================================================================

export async function arquivarCenarioAction(formData: FormData) {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const cenarioId = String(formData.get("cenarioId"));
  if (!escopo.podeMutar) {
    await logPermissionDenied(session?.user?.id, "cenario.arquivar", `Cenario:${cenarioId}`);
    return;
  }
  const c = await prisma.cenario.findUnique({ where: { id: cenarioId }, select: { status: true, nome: true } });
  if (!c) return;
  if (c.status === "ARCHIVED") {
    await flashError("Cenário já está arquivado.");
    return;
  }
  await prisma.cenario.update({
    where: { id: cenarioId },
    data: { status: "ARCHIVED" },
  });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "cenario.arquivar",
    recurso: `Cenario:${cenarioId}`,
    meta: { statusAnterior: c.status },
  });
  await flashSuccess(`Cenário "${c.nome}" arquivado.`);
  rev();
}

export async function excluirCenarioAction(formData: FormData) {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const cenarioId = String(formData.get("cenarioId"));
  if (!escopo.podeMutar) {
    await logPermissionDenied(session?.user?.id, "cenario.excluir", `Cenario:${cenarioId}`);
    return;
  }
  const c = await prisma.cenario.findUnique({
    where: { id: cenarioId },
    select: { status: true, nome: true },
  });
  if (!c) return;
  // Política: APPLIED nunca pode ser deletado (snapshot é registro formal
  // de deliberação dos sócios). Apenas DRAFT ou ARCHIVED.
  if (c.status === "APPLIED") {
    await flashError(
      "Cenário publicado não pode ser excluído (registro formal). Arquive primeiro.",
    );
    return;
  }
  // Cascade já configurado em schema.prisma — apaga ClassificacaoSocio +
  // RemuneracaoCalculada automaticamente.
  await prisma.cenario.delete({ where: { id: cenarioId } });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "cenario.excluir",
    recurso: `Cenario:${cenarioId}`,
    meta: { nome: c.nome, status: c.status },
  });
  await flashSuccess(`Cenário "${c.nome}" excluído.`);
  redirect("/simulacao");
}

// ============================================================================
// Override de parâmetros
// ============================================================================

export async function atualizarOverrideAction(formData: FormData) {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const cenarioId = String(formData.get("cenarioId"));
  if (!escopo.podeMutar) {
    await logPermissionDenied(session?.user?.id, "cenario.parametros.atualizar", `Cenario:${cenarioId}`);
    return;
  }
  const overrideJson = String(formData.get("override") ?? "");
  let override: Record<string, unknown> | null;
  try {
    override = overrideJson ? JSON.parse(overrideJson) : null;
  } catch {
    await flashError("Override inválido (JSON malformado).");
    return;
  }
  try {
    await atualizarParametrosOverride({ cenarioId, parametrosOverride: override });
    await logAudit({
      usuarioId: session?.user?.id,
      acao: "cenario.parametros.atualizar",
      recurso: `Cenario:${cenarioId}`,
      meta: { campos: override ? Object.keys(override) : ["limpou-override"] },
    });
    await flashSuccess("Parâmetros atualizados — clique em Recalcular.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao salvar parâmetros";
    await flashError(msg);
  }
  rev();
}


