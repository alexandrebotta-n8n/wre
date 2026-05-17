"use server";
// Server actions para editar variáveis globais do ano em /simulacao.
// Cada alteração marca todos os cenários DRAFT do ano como dirty —
// usuário recebe aviso para Recalcular.
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { flashError, flashSuccess } from "@/lib/flash";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import {
  salvarLLUnidadeAno,
  salvarOriginacaoAnoPorSocio,
} from "@/lib/cenario-service";

function rev() {
  revalidatePath("/simulacao");
}

async function exigirMutacao() {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  if (!escopo.podeMutar) throw new Error("Sem permissão");
  return { session };
}

/** Recebe payload JSON: `{ ano, unidades: [{unidadeId, lucroLiquido, fundingVariavel?}] }`. */
export async function salvarGlobaisAction(formData: FormData) {
  try {
    const { session } = await exigirMutacao();
    const ano = Number(formData.get("ano"));
    const payload = JSON.parse(String(formData.get("payload") ?? "{}")) as {
      unidades?: Array<{ unidadeId: string; lucroLiquido: number; fundingVariavel?: number | null }>;
    };
    if (!ano || ano < 2020) {
      await flashError("Ano inválido.");
      return;
    }

    const unidades = Array.isArray(payload.unidades) ? payload.unidades : [];
    for (const u of unidades) {
      if (!u.unidadeId) continue;
      await salvarLLUnidadeAno({
        ano,
        unidadeId: u.unidadeId,
        lucroLiquido: Number(u.lucroLiquido) || 0,
        fundingVariavel: u.fundingVariavel == null ? null : Number(u.fundingVariavel),
      });
    }

    await logAudit({
      usuarioId: session?.user?.id,
      acao: "globais.atualizar",
      recurso: `Ano:${ano}`,
      meta: { unidades: unidades.length },
    });
    await flashSuccess(
      "Variáveis globais salvas. Cenários DRAFT marcados para recalcular.",
    );
  } catch (e) {
    await flashError(e instanceof Error ? e.message : "Falha ao salvar globais");
  }
  rev();
}

/** Recebe payload JSON: `{ ano, socios: [{socioId, valor}] }`. */
export async function salvarOriginacaoGlobalAction(formData: FormData) {
  try {
    const { session } = await exigirMutacao();
    const ano = Number(formData.get("ano"));
    const payload = JSON.parse(String(formData.get("payload") ?? "{}")) as {
      socios?: Array<{ socioId: string; valor: number }>;
    };
    if (!ano || ano < 2020) {
      await flashError("Ano inválido.");
      return;
    }
    const socios = Array.isArray(payload.socios) ? payload.socios : [];
    for (const s of socios) {
      if (!s.socioId) continue;
      await salvarOriginacaoAnoPorSocio({
        ano,
        socioId: s.socioId,
        valor: Number(s.valor) || 0,
      });
    }
    await logAudit({
      usuarioId: session?.user?.id,
      acao: "originacao.global.atualizar",
      recurso: `Ano:${ano}`,
      meta: { socios: socios.length },
    });
    await flashSuccess(
      `Originação salva para ${socios.length} sócio(s). Recalcule os cenários.`,
    );
  } catch (e) {
    await flashError(e instanceof Error ? e.message : "Falha ao salvar originação");
  }
  rev();
}
