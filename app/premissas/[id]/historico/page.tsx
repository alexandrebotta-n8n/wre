import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { RotateCcw, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { dataHora } from "@/lib/format";
import { ModeloBadge, Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PremissaChips } from "@/components/premissa/chips";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { restaurarVersao } from "@/lib/premissa-service";
import { logAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";

async function restaurarAction(formData: FormData) {
  "use server";
  const session = await auth();
  const premissaId = String(formData.get("premissaId"));
  const historicoId = String(formData.get("historicoId"));
  await restaurarVersao({ premissaId, historicoId, porId: session?.user?.id });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "premissa.restaurar",
    recurso: `Premissa:${premissaId}`,
    meta: { historicoId },
  });
  await flashSuccess("Versão restaurada como nova versão atual.");
  revalidatePath(`/premissas/${premissaId}`);
  revalidatePath(`/premissas/${premissaId}/historico`);
  redirect(`/premissas/${premissaId}`);
}

export default async function HistoricoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  if (escopo.ehSocioRestrito) redirect("/simulacao");

  const premissa = await prisma.premissa.findUnique({
    where: { id },
    include: {
      historico: {
        orderBy: [{ versao: "desc" }],
        include: { snapshotPor: { select: { email: true, nome: true } } },
        take: 200,
      },
    },
  });
  if (!premissa) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Premissas", href: "/premissas" },
          { label: premissa.nome, href: `/premissas/${id}` },
          { label: "Histórico" },
        ]}
        title="Histórico de versões"
        description={`Versão atual: v${premissa.versao}. Cada save cria um snapshot da anterior.`}
        actions={<ModeloBadge modelo={premissa.modelo} />}
      />

      {/* Timeline */}
      <ol className="relative border-l-2 border-neutral-200 ml-3 space-y-6">
        {/* Atual */}
        <li className="relative pl-6">
          <span className="absolute -left-[11px] top-1.5 h-5 w-5 rounded-full bg-peri-600 ring-4 ring-peri-100 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          <Card className="border-peri-300 bg-peri-50/40">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="info" size="md">v{premissa.versao}</Badge>
                    <Badge variant="success" size="sm">Atual</Badge>
                  </div>
                  <h2 className="mt-2 font-semibold text-navy-900">{premissa.nome}</h2>
                  {premissa.descricao && (
                    <p className="text-sm text-neutral-700 mt-0.5">{premissa.descricao}</p>
                  )}
                  <div className="mt-3">
                    <PremissaChips modelo={premissa.modelo} parametros={premissa.parametros as Record<string, unknown>} />
                  </div>
                </div>
                <span className="text-xs text-neutral-500 flex-shrink-0">{dataHora(premissa.atualizadoEm)}</span>
              </div>
            </div>
          </Card>
        </li>

        {/* Snapshots */}
        {premissa.historico.length === 0 && (
          <li className="relative pl-6">
            <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-neutral-200" />
            <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/50 px-5 py-4 text-sm text-neutral-500">
              Sem snapshots — esta premissa ainda não foi editada.
            </p>
          </li>
        )}

        {premissa.historico.map((h) => (
          <li key={h.id} className="relative pl-6">
            <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-neutral-300 ring-4 ring-white">
              <Clock className="h-3 w-3 text-white absolute inset-0 m-auto" aria-hidden />
            </span>
            <Card>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="neutral" size="md">v{h.versao}</Badge>
                      <span className="text-xs text-neutral-500">{dataHora(h.snapshotEm)}</span>
                      {h.snapshotPor && (
                        <span className="text-xs text-neutral-400">por {h.snapshotPor.email}</span>
                      )}
                    </div>
                    <h2 className="mt-2 font-medium text-navy-900">{h.nome}</h2>
                    {h.descricao && <p className="text-sm text-neutral-600 mt-0.5">{h.descricao}</p>}
                    {h.motivo && (
                      <p className="text-xs text-neutral-500 mt-1 italic">motivo: {h.motivo}</p>
                    )}
                    <div className="mt-3">
                      <PremissaChips modelo={premissa.modelo} parametros={h.parametros as Record<string, unknown>} />
                    </div>
                  </div>
                  {escopo.podeMutar && (
                    <ConfirmDialog
                      trigger={
                        <Button variant="outline" size="sm">
                          <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                        </Button>
                      }
                      title={`Restaurar versão v${h.versao}?`}
                      description="A versão atual será arquivada como novo snapshot, e estes parâmetros se tornarão a versão corrente."
                      action={restaurarAction}
                      hiddenFields={{ premissaId: premissa.id, historicoId: h.id }}
                      confirmLabel="Restaurar"
                    />
                  )}
                </div>

                <Collapsible className="mt-3">
                  <CollapsibleTrigger asChild>
                    <button className="text-xs text-peri-700 hover:text-peri-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400 rounded">
                      Ver JSON cru
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="mt-2 text-xs bg-neutral-50 border border-neutral-200 rounded p-3 overflow-x-auto max-h-72">
                      {JSON.stringify(h.parametros, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <div className="text-center">
        <Button asChild variant="outline" size="sm">
          <Link href={`/premissas/${id}`}>← Voltar para edição</Link>
        </Button>
      </div>
    </main>
  );
}
