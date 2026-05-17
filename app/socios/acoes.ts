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
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { flashSuccess, flashError } from "@/lib/flash";
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

    await logAudit({
      usuarioId: session.id,
      acao: "socio.atualizar",
      recurso: `Socio:${id}`,
      // Apenas a lista de campos alterados — sem PII (padrão hardening).
      // safeMeta já redige conteúdo sensível, mas evitamos enviar de partida.
      meta: { campos: Object.keys(input) },
    });

    await flashSuccess("Sócio atualizado.");
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
