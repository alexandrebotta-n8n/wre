import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Plus, Settings2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { dataHora } from "@/lib/format";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import { ModeloBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogHeader, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { PremissaChips } from "@/components/premissa/chips";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";

const DEFAULTS_ATUAL = {
  proLaboreMensal: 5000,
  unidadeFundadores: "BG",
  unidadeMatriz: "DSF",
  reservaPercentual: 0.05,
  reservaViraPremio: true,
};

const DEFAULTS_NOVO = {
  percentualBlocoA: 0.45, percentualBlocoB: 0.35, percentualBlocoC: 0.20,
  poolSociedade: 0.50, poolLider: 0.30, poolEquipeReserva: 0.20,
  chaveOriginacao: 0.30, chaveExecucao: 0.60, chaveGestaoCP: 0.10,
  faixaOrigMin: 0.20, faixaOrigMax: 0.40,
  faixaExecMin: 0.50, faixaExecMax: 0.70,
  faixaGestaoMin: 0.00, faixaGestaoMax: 0.15,
  proRataMinMeses: 3,
  distribuicaoBlocoB: "UNIFORME",
};

async function criarAction(formData: FormData) {
  "use server";
  const session = await auth();
  const nome = String(formData.get("nome") ?? "").trim();
  const modelo = String(formData.get("modelo") ?? "NOVO") as "ATUAL" | "NOVO";
  if (!nome) return;
  const p = await prisma.premissa.create({
    data: {
      nome,
      modelo,
      parametros: (modelo === "ATUAL" ? DEFAULTS_ATUAL : DEFAULTS_NOVO) as never,
    },
  });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "premissa.criar",
    recurso: `Premissa:${p.id}`,
    meta: { nome, modelo },
  });
  await flashSuccess(`Premissa "${nome}" criada com defaults.`);
  redirect(`/premissas/${p.id}`);
}

export default async function PremissasPage() {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  if (escopo.ehSocioRestrito) notFound();

  const premissas = await prisma.premissa.findMany({
    orderBy: [{ atualizadoEm: "desc" }],
    take: 100,
  });

  const novoButton = escopo.podeMutar ? (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus className="h-4 w-4" /> Nova premissa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar premissa</DialogTitle>
          <DialogDescription>
            Será criada com os parâmetros default do modelo. Você pode editar depois.
          </DialogDescription>
        </DialogHeader>
        <form action={criarAction} className="space-y-4">
          <Field label="Nome" htmlFor="prem-nome" required>
            <Input id="prem-nome" name="nome" required maxLength={120} placeholder="ex: Política DSF v2 — 50/30/20" autoFocus />
          </Field>
          <Field label="Modelo" htmlFor="prem-modelo" required>
            <NativeSelect id="prem-modelo" name="modelo" defaultValue="NOVO">
              <option value="NOVO">Novo (Política DSF v1)</option>
              <option value="ATUAL">Atual (Sistema 1T2026)</option>
            </NativeSelect>
          </Field>
          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <SubmitButton variant="primary">Criar premissa</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  ) : null;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <PageHeader
        title="Premissas"
        description={`${premissas.length} template(s) — parâmetros reutilizáveis entre cenários`}
        actions={novoButton}
      />

      {premissas.length === 0 ? (
        <EmptyState
          icon={<Settings2 className="h-5 w-5" />}
          title="Nenhuma premissa cadastrada"
          description="Crie a primeira premissa para começar a modelar cenários."
          action={novoButton}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {premissas.map((p) => (
            <Card key={p.id} className="hover:border-peri-400 transition-colors">
              <Link href={`/premissas/${p.id}`} className="block p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400 rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-navy-900 truncate">{p.nome}</h2>
                  <ModeloBadge modelo={p.modelo} />
                </div>
                {p.descricao && <p className="text-sm text-neutral-600 mt-1.5 line-clamp-2">{p.descricao}</p>}
                <div className="mt-3">
                  <PremissaChips modelo={p.modelo} parametros={p.parametros as Record<string, unknown>} />
                </div>
                <div className="text-xs text-neutral-500 mt-3 flex items-center justify-between">
                  <span>v{p.versao} · atualizada em {dataHora(p.atualizadoEm)}</span>
                  <span className="text-peri-700">Editar →</span>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
