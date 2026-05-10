import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { dataHora } from "@/lib/format";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { ParamsAtualSchema, ParamsNovoSchema } from "@/lib/schemas/premissa";
import { ModeloBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { StickyActions } from "@/components/cenario/sticky-actions";
import { SumValidator } from "@/components/premissa/sum-validator";
import { MatrizPesosArea } from "@/components/premissa/matriz-pesos-area";
import { atualizarPremissaComSnapshot } from "@/lib/premissa-service";
import { flashError, flashSuccess } from "@/lib/flash";
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
      const pesosOrganico: Record<string, number> = {};
      const pesosIncremental: Record<string, number> = {};
      for (const [k, v] of formData.entries()) {
        if (k.startsWith("pesoOrg-")) pesosOrganico[k.slice(8)] = Number(v) || 0;
        else if (k.startsWith("pesoInc-")) pesosIncremental[k.slice(8)] = Number(v) || 0;
      }
      const mixOrganico = Number(formData.get("mixOrganico") ?? 0);
      const mixIncremental = Number(formData.get("mixIncremental") ?? 0);
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
        distribuicaoBlocoB: String(formData.get("distribuicaoBlocoB")) as "UNIFORME" | "PESO_INDIVIDUAL" | "ORIGINACAO" | "POR_AREA",
        pesosPorArea: Object.keys(pesosOrganico).length > 0
          ? { mixOrganico, mixIncremental, pesosOrganico, pesosIncremental }
          : undefined,
      });
    }
  } catch (e) {
    const z = e as { issues?: Array<{ message: string }> };
    const msg = z.issues?.[0]?.message ?? "Parâmetros inválidos";
    await flashError(msg);
    redirect(`/premissas/${id}`);
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
  await flashSuccess("Premissa salva — versão anterior arquivada no histórico.");
  revalidatePath(`/premissas/${id}`);
  revalidatePath("/premissas");
  redirect(`/premissas/${id}`);
}

export default async function PremissaEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  if (escopo.ehSocioRestrito) redirect("/simulacao");
  const p = await prisma.premissa.findUnique({ where: { id } });
  if (!p) notFound();
  const params_ = p.parametros as Record<string, unknown>;
  const areas = p.modelo === "NOVO"
    ? await prisma.areaPratica.findMany({ where: { ativa: true }, orderBy: [{ ordem: "asc" }], take: 50 })
    : [];

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 pb-4 space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Premissas", href: "/premissas" },
          { label: p.nome },
        ]}
        title="Editar premissa"
        meta={
          <>
            <ModeloBadge modelo={p.modelo} />
            <span>·</span>
            <span>v{p.versao}</span>
            <span>·</span>
            <span>atualizada em {dataHora(p.atualizadoEm)}</span>
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/premissas/${p.id}/historico`}>
              <History className="h-3.5 w-3.5" /> Histórico (v{p.versao})
            </Link>
          </Button>
        }
      />

      <form action={salvarAction} className="space-y-6">
        <input type="hidden" name="id" value={p.id} />

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Identidade</CardTitle>
              <CardDescription>Nome e descrição visíveis na lista de premissas.</CardDescription>
            </div>
          </CardHeader>
          <div className="p-5 space-y-4">
            <Field label="Nome" htmlFor="prem-nome" required>
              <Input id="prem-nome" name="nome" defaultValue={p.nome} required maxLength={120} />
            </Field>
            <Field label="Descrição" htmlFor="prem-desc">
              <Textarea id="prem-desc" name="descricao" defaultValue={p.descricao ?? ""} rows={2} placeholder="Opcional — contexto desta premissa" />
            </Field>
          </div>
        </Card>

        {p.modelo === "ATUAL" ? (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Parâmetros do modelo Atual</CardTitle>
                <CardDescription>Replica o sistema de remuneração 1T2026.</CardDescription>
              </div>
            </CardHeader>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Pró-labore mensal (R$)">
                  <Input type="number" name="proLaboreMensal" defaultValue={params_.proLaboreMensal as number} step="100" required />
                </Field>
                <Field label="Reserva sobre funding (%)" hint="0.05 = 5%">
                  <Input type="number" name="reservaPercentual" defaultValue={params_.reservaPercentual as number} step="0.01" required />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Unidade dos fundadores" hint="código (ex: BG)">
                  <Input name="unidadeFundadores" defaultValue={String(params_.unidadeFundadores)} required />
                </Field>
                <Field label="Unidade matriz" hint="código (ex: DSF)">
                  <Input name="unidadeMatriz" defaultValue={String(params_.unidadeMatriz)} required />
                </Field>
              </div>
              <Field label="Reserva vira prêmio uniforme">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="reservaViraPremio"
                    defaultChecked={Boolean(params_.reservaViraPremio)}
                    className="accent-peri-600"
                  />
                  <span>Sim, distribui a reserva como prêmio igual entre elegíveis</span>
                </label>
              </Field>
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Blocos do RDA central</CardTitle>
                  <CardDescription>Devem somar 1.0 (100% do RDA distribuível).</CardDescription>
                </div>
              </CardHeader>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Bloco A — Institucional"><Input type="number" name="percentualBlocoA" defaultValue={params_.percentualBlocoA as number} step="0.01" required /></Field>
                  <Field label="Bloco B — Performance"><Input type="number" name="percentualBlocoB" defaultValue={params_.percentualBlocoB as number} step="0.01" required /></Field>
                  <Field label="Bloco C — Estratégico"><Input type="number" name="percentualBlocoC" defaultValue={params_.percentualBlocoC as number} step="0.01" required /></Field>
                </div>
                <SumValidator names={["percentualBlocoA", "percentualBlocoB", "percentualBlocoC"]} alvo={1.0} rotulo="A + B + C" />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Pool de unidade</CardTitle>
                  <CardDescription>Sociedade + Líder + Equipe/Reserva devem somar 1.0.</CardDescription>
                </div>
              </CardHeader>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Sociedade"><Input type="number" name="poolSociedade" defaultValue={params_.poolSociedade as number} step="0.01" required /></Field>
                  <Field label="Líder"><Input type="number" name="poolLider" defaultValue={params_.poolLider as number} step="0.01" required /></Field>
                  <Field label="Equipe / reserva"><Input type="number" name="poolEquipeReserva" defaultValue={params_.poolEquipeReserva as number} step="0.01" required /></Field>
                </div>
                <SumValidator names={["poolSociedade", "poolLider", "poolEquipeReserva"]} alvo={1.0} rotulo="Sociedade + Líder + Equipe" />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Chave-padrão de alocação interunidades</CardTitle>
                  <CardDescription>Originação 20-40% · Execução 50-70% · Gestão 0-15%. Total = 1.0.</CardDescription>
                </div>
              </CardHeader>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Originação" hint="20-40%"><Input type="number" name="chaveOriginacao" defaultValue={params_.chaveOriginacao as number} step="0.05" required /></Field>
                  <Field label="Execução" hint="50-70%"><Input type="number" name="chaveExecucao" defaultValue={params_.chaveExecucao as number} step="0.05" required /></Field>
                  <Field label="Gestão CP" hint="0-15%"><Input type="number" name="chaveGestaoCP" defaultValue={params_.chaveGestaoCP as number} step="0.05" required /></Field>
                </div>
                <SumValidator names={["chaveOriginacao", "chaveExecucao", "chaveGestaoCP"]} alvo={1.0} rotulo="Orig + Exec + Gestão" />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Faixas de ajuste (mín / máx)</CardTitle>
                  <CardDescription>Limites para cálculo dinâmico das chaves.</CardDescription>
                </div>
              </CardHeader>
              <div className="p-5 grid grid-cols-2 gap-4">
                <Field label="Originação min"><Input type="number" name="faixaOrigMin" defaultValue={params_.faixaOrigMin as number} step="0.05" required /></Field>
                <Field label="Originação max"><Input type="number" name="faixaOrigMax" defaultValue={params_.faixaOrigMax as number} step="0.05" required /></Field>
                <Field label="Execução min"><Input type="number" name="faixaExecMin" defaultValue={params_.faixaExecMin as number} step="0.05" required /></Field>
                <Field label="Execução max"><Input type="number" name="faixaExecMax" defaultValue={params_.faixaExecMax as number} step="0.05" required /></Field>
                <Field label="Gestão min"><Input type="number" name="faixaGestaoMin" defaultValue={params_.faixaGestaoMin as number} step="0.05" required /></Field>
                <Field label="Gestão max"><Input type="number" name="faixaGestaoMax" defaultValue={params_.faixaGestaoMax as number} step="0.05" required /></Field>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Distribuição do Bloco B + Pro-rata</CardTitle>
                  <CardDescription>Como ratear performance e o mínimo de meses para entrar no rateio.</CardDescription>
                </div>
              </CardHeader>
              <div className="p-5 grid grid-cols-2 gap-4">
                <Field label="Distribuição do Bloco B" hint="como ratear performance">
                  <NativeSelect name="distribuicaoBlocoB" defaultValue={String(params_.distribuicaoBlocoB ?? "UNIFORME")}>
                    <option value="UNIFORME">Uniforme — partes iguais</option>
                    <option value="PESO_INDIVIDUAL">Por peso individual</option>
                    <option value="ORIGINACAO">Por originação esperada</option>
                    <option value="POR_AREA">Por área de prática (planilha 1T2026)</option>
                  </NativeSelect>
                </Field>
                <Field label="Pro-rata mínimo (meses)">
                  <Input type="number" name="proRataMinMeses" defaultValue={params_.proRataMinMeses as number} step="1" min="0" max="12" required />
                </Field>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Pesos por área de prática</CardTitle>
                  <CardDescription>Aplicado quando a distribuição do Bloco B for &quot;Por área&quot;.</CardDescription>
                </div>
              </CardHeader>
              <div className="p-5">
                <MatrizPesosArea
                  areas={areas.map((a) => ({ codigo: a.codigo, nome: a.nome }))}
                  defaults={params_.pesosPorArea as {
                    mixOrganico: number;
                    mixIncremental: number;
                    pesosOrganico: Record<string, number>;
                    pesosIncremental: Record<string, number>;
                  } | undefined}
                />
              </div>
            </Card>
          </>
        )}

        <StickyActions>
          <span className="text-xs text-neutral-500">
            Salvar cria um snapshot da versão anterior no histórico.
          </span>
          <div className="ml-auto flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/premissas">Cancelar</Link>
            </Button>
            <SubmitButton variant="primary" size="sm">Salvar alterações</SubmitButton>
          </div>
        </StickyActions>
      </form>
    </main>
  );
}
