import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { dataHora } from "@/lib/format";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { ParamsAtualSchema, ParamsNovoSchema } from "@/lib/schemas/premissa";
import { ModeloBadge } from "@/components/ui/badges";
import { SumValidator } from "@/components/premissa/sum-validator";
import { atualizarPremissaComSnapshot } from "@/lib/premissa-service";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";

async function salvarAction(formData: FormData) {
  "use server";
  const session = await auth();
  const id = String(formData.get("id"));
  const existing = await prisma.premissa.findUnique({ where: { id } });
  if (!existing) return;

  const nome = String(formData.get("nome") ?? existing.nome);
  const descricao = String(formData.get("descricao") ?? "") || null;

  let parametros: unknown;
  try {
    if (existing.modelo === "ATUAL") {
      parametros = ParamsAtualSchema.parse({
        proLaboreMensal: Number(formData.get("proLaboreMensal")),
        unidadeFundadores: String(formData.get("unidadeFundadores")),
        unidadeMatriz: String(formData.get("unidadeMatriz")),
        reservaPercentual: Number(formData.get("reservaPercentual")),
        reservaViraPremio: formData.get("reservaViraPremio") === "on",
      });
    } else {
      parametros = ParamsNovoSchema.parse({
        percentualBlocoA: Number(formData.get("percentualBlocoA")),
        percentualBlocoB: Number(formData.get("percentualBlocoB")),
        percentualBlocoC: Number(formData.get("percentualBlocoC")),
        poolSociedade: Number(formData.get("poolSociedade")),
        poolLider: Number(formData.get("poolLider")),
        poolEquipeReserva: Number(formData.get("poolEquipeReserva")),
        chaveOriginacao: Number(formData.get("chaveOriginacao")),
        chaveExecucao: Number(formData.get("chaveExecucao")),
        chaveGestaoCP: Number(formData.get("chaveGestaoCP")),
        faixaOrigMin: Number(formData.get("faixaOrigMin")),
        faixaOrigMax: Number(formData.get("faixaOrigMax")),
        faixaExecMin: Number(formData.get("faixaExecMin")),
        faixaExecMax: Number(formData.get("faixaExecMax")),
        faixaGestaoMin: Number(formData.get("faixaGestaoMin")),
        faixaGestaoMax: Number(formData.get("faixaGestaoMax")),
        proRataMinMeses: Number(formData.get("proRataMinMeses")),
        distribuicaoBlocoB: String(formData.get("distribuicaoBlocoB")) as "UNIFORME" | "PESO_INDIVIDUAL" | "ORIGINACAO",
      });
    }
  } catch (e) {
    const z = e as { issues?: Array<{ message: string }> };
    const msg = z.issues?.[0]?.message ?? "Parâmetros inválidos";
    redirect(`/premissas/${id}?erro=${encodeURIComponent(msg)}`);
  }

  await atualizarPremissaComSnapshot(
    id,
    { nome, descricao, parametros },
    { snapshotPorId: session?.user?.id, motivo: "edição via UI" },
  );
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "premissa.atualizar",
    recurso: `Premissa:${id}`,
    meta: { nome, modelo: existing.modelo },
  });
  revalidatePath(`/premissas/${id}`);
  revalidatePath("/premissas");
  redirect(`/premissas/${id}?ok=1`);
}

export default async function PremissaEdit({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  if (escopo.ehSocioRestrito) notFound();
  const p = await prisma.premissa.findUnique({ where: { id } });
  if (!p) notFound();
  const params_ = p.parametros as Record<string, unknown>;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="text-sm text-neutral-500">
        <Link href="/premissas" className="hover:underline">← Premissas</Link>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Editar premissa</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/premissas/${p.id}/historico`}
            className="rounded border border-neutral-300 px-3 py-1 text-xs font-medium text-navy-900 hover:border-peri-400 hover:bg-peri-50 transition"
          >
            histórico (v{p.versao})
          </Link>
          <ModeloBadge modelo={p.modelo} />
        </div>
      </div>

      {sp.erro && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {sp.erro}
        </div>
      )}
      {sp.ok && !sp.erro && (
        <div className="mt-4 rounded border border-mint-400 bg-mint-50 px-3 py-2 text-sm text-mint-900">
          Premissa salva.
        </div>
      )}

      <form action={salvarAction} className="mt-6 rounded-lg border border-neutral-200 bg-white p-6 space-y-5">
        <input type="hidden" name="id" value={p.id} />

        <Field label="Nome">
          <input name="nome" defaultValue={p.nome} required maxLength={120}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
        </Field>
        <Field label="Descrição">
          <textarea name="descricao" defaultValue={p.descricao ?? ""} rows={2}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
        </Field>

        <div className="border-t border-neutral-200 pt-5">
          <h2 className="text-sm font-medium text-neutral-700 uppercase tracking-wide">Parâmetros</h2>

          {p.modelo === "ATUAL" ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Pró-labore mensal (R$)">
                  <Num name="proLaboreMensal" defaultValue={params_.proLaboreMensal as number} step="100" />
                </Field>
                <Field label="Reserva sobre funding (%)" hint="0.05 = 5%">
                  <Num name="reservaPercentual" defaultValue={params_.reservaPercentual as number} step="0.01" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Unidade dos fundadores" hint="código (ex: BG)">
                  <input name="unidadeFundadores" defaultValue={String(params_.unidadeFundadores)}
                    className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
                </Field>
                <Field label="Unidade matriz" hint="código (ex: DSF)">
                  <input name="unidadeMatriz" defaultValue={String(params_.unidadeMatriz)}
                    className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
                </Field>
              </div>
              <Field label="Reserva vira prêmio uniforme entre elegíveis">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="reservaViraPremio"
                    defaultChecked={Boolean(params_.reservaViraPremio)} />
                  <span>sim, distribui a reserva como prêmio igual</span>
                </label>
              </Field>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              <Section titulo="Blocos do RDA central (devem somar 1.0)">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Bloco A — Institucional"><Num name="percentualBlocoA" defaultValue={params_.percentualBlocoA as number} step="0.01" /></Field>
                  <Field label="Bloco B — Performance"><Num name="percentualBlocoB" defaultValue={params_.percentualBlocoB as number} step="0.01" /></Field>
                  <Field label="Bloco C — Estratégico"><Num name="percentualBlocoC" defaultValue={params_.percentualBlocoC as number} step="0.01" /></Field>
                </div>
                <div className="mt-2">
                  <SumValidator
                    names={["percentualBlocoA", "percentualBlocoB", "percentualBlocoC"]}
                    alvo={1.0} rotulo="A + B + C" />
                </div>
              </Section>

              <Section titulo="Pool de unidade (somam 1.0)">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Sociedade"><Num name="poolSociedade" defaultValue={params_.poolSociedade as number} step="0.01" /></Field>
                  <Field label="Líder"><Num name="poolLider" defaultValue={params_.poolLider as number} step="0.01" /></Field>
                  <Field label="Equipe / reserva"><Num name="poolEquipeReserva" defaultValue={params_.poolEquipeReserva as number} step="0.01" /></Field>
                </div>
                <div className="mt-2">
                  <SumValidator
                    names={["poolSociedade", "poolLider", "poolEquipeReserva"]}
                    alvo={1.0} rotulo="Sociedade + Líder + Equipe" />
                </div>
              </Section>

              <Section titulo="Chave-padrão alocação interunidades">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Originação" hint="20-40%"><Num name="chaveOriginacao" defaultValue={params_.chaveOriginacao as number} step="0.05" /></Field>
                  <Field label="Execução" hint="50-70%"><Num name="chaveExecucao" defaultValue={params_.chaveExecucao as number} step="0.05" /></Field>
                  <Field label="Gestão CP" hint="0-15%"><Num name="chaveGestaoCP" defaultValue={params_.chaveGestaoCP as number} step="0.05" /></Field>
                </div>
                <div className="mt-2">
                  <SumValidator
                    names={["chaveOriginacao", "chaveExecucao", "chaveGestaoCP"]}
                    alvo={1.0} rotulo="Orig + Exec + Gestão" />
                </div>
              </Section>

              <Section titulo="Faixas de ajuste (mín / máx)">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Originação min"><Num name="faixaOrigMin" defaultValue={params_.faixaOrigMin as number} step="0.05" /></Field>
                  <Field label="Originação max"><Num name="faixaOrigMax" defaultValue={params_.faixaOrigMax as number} step="0.05" /></Field>
                  <Field label="Execução min"><Num name="faixaExecMin" defaultValue={params_.faixaExecMin as number} step="0.05" /></Field>
                  <Field label="Execução max"><Num name="faixaExecMax" defaultValue={params_.faixaExecMax as number} step="0.05" /></Field>
                  <Field label="Gestão min"><Num name="faixaGestaoMin" defaultValue={params_.faixaGestaoMin as number} step="0.05" /></Field>
                  <Field label="Gestão max"><Num name="faixaGestaoMax" defaultValue={params_.faixaGestaoMax as number} step="0.05" /></Field>
                </div>
              </Section>

              <Section titulo="Distribuição do Bloco B + Pro-rata">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Distribuição do Bloco B" hint="como ratear performance">
                    <select name="distribuicaoBlocoB" defaultValue={String(params_.distribuicaoBlocoB ?? "UNIFORME")}
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm">
                      <option value="UNIFORME">UNIFORME — partes iguais</option>
                      <option value="PESO_INDIVIDUAL">PESO_INDIVIDUAL — proporcional ao peso por sócio</option>
                      <option value="ORIGINACAO">ORIGINACAO — proporcional à originação esperada</option>
                    </select>
                  </Field>
                  <Field label="Pro-rata mínimo (meses)"><Num name="proRataMinMeses" defaultValue={params_.proRataMinMeses as number} step="1" min="0" max="12" /></Field>
                </div>
              </Section>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 pt-5">
          <span className="text-xs text-neutral-500">Atualizada em {dataHora(p.atualizadoEm)}</span>
          <div className="flex gap-2">
            <Link href="/premissas" className="rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-peri-50 transition">Cancelar</Link>
            <button className="rounded bg-navy-900 hover:bg-navy-700 text-white px-4 py-2 text-sm font-medium transition">Salvar</button>
          </div>
        </div>
      </form>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-neutral-700 mb-1">
        {label}
        {hint && <span className="text-neutral-400 font-normal ml-2">({hint})</span>}
      </div>
      {children}
    </label>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{titulo}</div>
      {children}
    </div>
  );
}

function Num(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" required {...props}
    className="w-full rounded border border-neutral-300 px-3 py-2 text-sm tabular-nums focus:border-peri-400 focus:outline-none focus:ring-1 focus:ring-peri-400" />;
}
