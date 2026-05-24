"use server";
// Server Actions da tela /socios.
//
// Decisão de design: ação ÚNICA que atualiza todos os campos editáveis de
// um Socio de uma vez (em vez de uma action por coluna). Motivos:
//   - Antes existiam duas actions inline (área de prática + classificação)
//     com silent return em role-check. Vários usuários relatavam que "ao
//     salvar, o valor voltava ao default" — sintoma de submit aceito pelo
//     form HTML mas ignorado pelo backend (sem feedback de erro).
//   - O `NativeSelect defaultValue=...` (uncontrolled) é re-renderizado a
//     partir do DB após revalidatePath; se o update não persistiu, o user
//     vê o valor "bouncing" para o original.
//   - Schema Zod .strict() centraliza validação e bloqueia mass assignment.
//   - requireRole(...) faz THROW em vez de return silencioso — logs ficam
//     visíveis e UI mostra erro real.
//
// CASCATA: quando muda campo de cálculo do sócio (qualquer um exceto
// observacoes), marca TODOS os cenários DRAFT como dirty para sinalizar
// que precisam recalcular. Idempotente — recálculo é puro.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { flashSuccess, flashError } from "@/lib/flash";
import { marcarTodosDraftsComoDirty } from "@/lib/cenario-service";
import {
  AtualizarSocioSchema,
  PUBLICOS_LIDER_DE_UNIDADE,
  type AtualizarSocioInput,
} from "@/lib/schemas/socio";

function parseFormData(formData: FormData): AtualizarSocioInput & { id: string } {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id ausente");

  const areaPraticaIdRaw = String(formData.get("areaPraticaId") ?? "");
  const publicoDefault = String(formData.get("publicoDefault") ?? "");
  const unidadeLideradaIdRaw = String(formData.get("unidadeLideradaId") ?? "");
  const nivelCargoRaw = String(formData.get("nivelCargo") ?? "");
  const faixaSalarialRaw = String(formData.get("faixaSalarial") ?? "");
  const percentualQuotasRaw = String(formData.get("percentualQuotasDefault") ?? "0");
  const proLaboreRaw = String(formData.get("proLaboreMensal") ?? "");
  const remGestaoRaw = String(formData.get("remuneracaoGestaoMensal") ?? "");
  const originacaoRaw = String(formData.get("originacaoAnualPadrao") ?? "");
  const fundingFundRaw = String(formData.get("fundingFundadorAnual") ?? "");
  const observacoesRaw = String(formData.get("observacoes") ?? "");

  // Helper: string vazia / inválida → null (= "usa default da premissa/tabela").
  const parseOptNumber = (v: string): number | null => {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  // Normaliza strings vazias para null antes de validar com Zod.
  const input = {
    areaPraticaId: areaPraticaIdRaw || null,
    publicoDefault,
    unidadeLideradaId: unidadeLideradaIdRaw || null,
    nivelCargo: nivelCargoRaw || null,
    faixaSalarial: faixaSalarialRaw || null,
    // Form envia em %, convertemos para fração [0..1].
    percentualQuotasDefault: Number(percentualQuotasRaw) / 100,
    proLaboreMensal: parseOptNumber(proLaboreRaw),
    remuneracaoGestaoMensal: parseOptNumber(remGestaoRaw),
    originacaoAnualPadrao: parseOptNumber(originacaoRaw),
    fundingFundadorAnual: parseOptNumber(fundingFundRaw),
    observacoes: observacoesRaw.trim() || null,
  };

  const parsed = AtualizarSocioSchema.parse(input);
  return { id, ...parsed };
}

// Campos cujo VALOR alimenta cálculo. Mudança em qualquer um desses → marca
// DRAFTs como dirty. `observacoes` é só documentação — ignorado.
const CAMPOS_DE_CALCULO = [
  "areaPraticaId",
  "publicoDefault",
  "unidadeLideradaId",
  "nivelCargo",
  "faixaSalarial",
  "percentualQuotasDefault",
  "proLaboreMensal",
  "remuneracaoGestaoMensal",
  "originacaoAnualPadrao",
  "fundingFundadorAnual",
] as const;

type CampoCalculo = typeof CAMPOS_DE_CALCULO[number];

// Compara dois snapshots por campos relevantes. Tolerância pra float em
// percentualQuotasDefault (form re-envia 14.871 → 0.14871 → reagregação).
function algumCampoDeCalculoMudou(
  antigo: Record<CampoCalculo, unknown>,
  novo: Record<CampoCalculo, unknown>,
): boolean {
  for (const k of CAMPOS_DE_CALCULO) {
    const a = antigo[k];
    const b = novo[k];
    if (typeof a === "number" && typeof b === "number") {
      if (Math.abs(a - b) > 1e-9) return true;
    } else if (a !== b) {
      return true;
    }
  }
  return false;
}

export async function atualizarSocioAction(formData: FormData): Promise<void> {
  try {
    // Throw em vez de silent return — bug raiz do "Salvei e não persistiu".
    const session = await requireRole("ADMIN", "CONSULTOR");
    const { id, ...input } = parseFormData(formData);

    // Defesa em profundidade: unidadeLideradaId só faz sentido para públicos
    // de líder de unidade. UI também esconde, mas a action zera por garantia.
    const unidadeLideradaId = PUBLICOS_LIDER_DE_UNIDADE.has(input.publicoDefault)
      ? input.unidadeLideradaId
      : null;

    // Snapshot ANTERIOR — pra decidir se algum campo de cálculo mudou.
    const antigo = await prisma.socio.findUnique({
      where: { id },
      select: {
        areaPraticaId: true,
        publicoDefault: true,
        unidadeLideradaId: true,
        nivelCargo: true,
        faixaSalarial: true,
        percentualQuotasDefault: true,
        proLaboreMensal: true,
        remuneracaoGestaoMensal: true,
        originacaoAnualPadrao: true,
        fundingFundadorAnual: true,
      },
    });
    if (!antigo) throw new Error("Sócio não encontrado");

    await prisma.socio.update({
      where: { id },
      data: {
        areaPraticaId: input.areaPraticaId,
        publicoDefault: input.publicoDefault,
        unidadeLideradaId,
        nivelCargo: input.nivelCargo,
        faixaSalarial: input.faixaSalarial,
        percentualQuotasDefault: input.percentualQuotasDefault,
        proLaboreMensal: input.proLaboreMensal,
        remuneracaoGestaoMensal: input.remuneracaoGestaoMensal,
        originacaoAnualPadrao: input.originacaoAnualPadrao,
        fundingFundadorAnual: input.fundingFundadorAnual,
        observacoes: input.observacoes,
      },
    });

    // Marca DRAFTs como dirty SE algum campo de cálculo mudou. Edição só de
    // observacoes não dispara recalc (idempotente seria ok, mas evita ruído
    // no badge "● alterado" e no flash success).
    const novo = {
      areaPraticaId: input.areaPraticaId,
      publicoDefault: input.publicoDefault,
      unidadeLideradaId,
      nivelCargo: input.nivelCargo,
      faixaSalarial: input.faixaSalarial,
      percentualQuotasDefault: input.percentualQuotasDefault,
      proLaboreMensal: input.proLaboreMensal,
      remuneracaoGestaoMensal: input.remuneracaoGestaoMensal,
      originacaoAnualPadrao: input.originacaoAnualPadrao,
      fundingFundadorAnual: input.fundingFundadorAnual,
    };
    let cenariosMarcadosDirty = 0;
    if (algumCampoDeCalculoMudou(antigo, novo)) {
      cenariosMarcadosDirty = await marcarTodosDraftsComoDirty();
    }

    await logAudit({
      usuarioId: session.id,
      acao: "socio.atualizar",
      recurso: `Socio:${id}`,
      // Apenas a lista de campos alterados — sem PII (padrão hardening).
      // safeMeta já redige conteúdo sensível, mas evitamos enviar de partida.
      meta: { campos: Object.keys(input), cenariosMarcadosDirty },
    });

    if (cenariosMarcadosDirty > 0) {
      await flashSuccess(
        `Sócio atualizado. ${cenariosMarcadosDirty} cenário(s) DRAFT marcado(s) pra recalcular.`,
      );
    } else {
      await flashSuccess("Sócio atualizado.");
    }
    // layout-level revalida toda a subtree (mais robusto que path-level em
    // Next.js 16 quando o componente tem múltiplas queries em paralelo).
    revalidatePath("/socios", "layout");
    // Mudanças em proLaboreMensal/remuneracaoGestaoMensal/publicoDefault
    // afetam novos cálculos em /simulacao — invalidar essa tree também.
    revalidatePath("/simulacao", "layout");
  } catch (e) {
    if (e instanceof AuthError) {
      await flashError(e.message);
      return;
    }
    const msg = e instanceof Error ? e.message : "Erro ao salvar sócio";
    await flashError(`Não foi possível salvar: ${msg}`);
    console.error("[socios.atualizar] falhou:", e);
  }
}

// ============================================================================
// Modo de quotas (GLOBAL por ano) — vive em ConfiguracaoAno.
// Trocar marca todos cenários DRAFT do ano como dirty + sincroniza
// Cenario.modoQuotas. APPLIED preserva (snapshot imutável).
// ============================================================================

export async function salvarModoQuotasAction(formData: FormData): Promise<void> {
  try {
    const session = await requireRole("ADMIN", "CONSULTOR");
    const ano = Number(formData.get("ano"));
    const modo = String(formData.get("modoQuotas") ?? "");
    if (!ano || ano < 2000 || ano > 2100) {
      await flashError("Ano inválido."); return;
    }
    if (modo !== "ORIGINAL" && modo !== "REDISTRIBUIDA") {
      await flashError("Modo de quotas inválido."); return;
    }

    await prisma.configuracaoAno.upsert({
      where: { ano },
      create: { ano, modoQuotas: modo, atualizadoPorId: session.id },
      update: { modoQuotas: modo, atualizadoPorId: session.id },
    });

    // Cascata: marca DRAFTs do ano como dirty + sincroniza Cenario.modoQuotas.
    const r = await prisma.cenario.updateMany({
      where: { ano, status: "DRAFT" },
      data: { modoQuotas: modo, parametrosDirty: true },
    });

    await logAudit({
      usuarioId: session.id,
      acao: "configuracao-ano.modo-quotas.atualizar",
      recurso: `ConfiguracaoAno:${ano}`,
      meta: { modo, cenariosMarcadosDirty: r.count },
    });

    const label = modo === "REDISTRIBUIDA" ? "REDISTRIBUÍDA" : "ORIGINAL";
    if (r.count > 0) {
      await flashSuccess(
        `Modo de quotas: ${label}. ${r.count} cenário(s) DRAFT do ano ${ano} marcado(s) pra recalcular.`,
      );
    } else {
      await flashSuccess(`Modo de quotas: ${label}.`);
    }
    revalidatePath("/socios", "layout");
    revalidatePath("/simulacao", "layout");
  } catch (e) {
    if (e instanceof AuthError) {
      await flashError(e.message);
      return;
    }
    const msg = e instanceof Error ? e.message : "Erro ao salvar modo de quotas";
    await flashError(msg);
    console.error("[socios.modo-quotas] falhou:", e);
  }
}
