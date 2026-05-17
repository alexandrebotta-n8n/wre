"use server";
// Server actions para editar variáveis globais do ano em /simulacao.
// Único insumo global: LL DSF (matriz) + LL por unidade. Funding fundadores
// foi removido daqui — vive em /socios como campo individual.
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { logPermissionDenied } from "@/lib/auth/audit-denied";
import { flashError, flashSuccess } from "@/lib/flash";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { salvarLLUnidadeAno } from "@/lib/cenario-service";

function rev() {
  revalidatePath("/simulacao");
}

async function exigirMutacao(acao: string, recurso: string) {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  if (!escopo.podeMutar) {
    await logPermissionDenied(session?.user?.id, acao, recurso);
    throw new Error("Sem permissão");
  }
  return { session };
}

/** Payload JSON: `{ unidades: [{unidadeId, lucroLiquido}] }`. */
export async function salvarGlobaisAction(formData: FormData) {
  try {
    const ano = Number(formData.get("ano"));
    const { session } = await exigirMutacao("globais.atualizar", `Ano:${ano}`);
    const payload = JSON.parse(String(formData.get("payload") ?? "{}")) as {
      unidades?: Array<{ unidadeId: string; lucroLiquido: number }>;
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
