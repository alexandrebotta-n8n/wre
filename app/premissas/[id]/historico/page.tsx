import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { dataHora } from "@/lib/format";
import { ModeloBadge } from "@/components/ui/badges";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { restaurarVersao } from "@/lib/premissa-service";
import { logAudit } from "@/lib/audit";

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
  revalidatePath(`/premissas/${premissaId}`);
  revalidatePath(`/premissas/${premissaId}/historico`);
  redirect(`/premissas/${premissaId}?ok=1`);
}

export default async function HistoricoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  if (escopo.ehSocioRestrito) notFound();

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
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="text-sm text-neutral-500">
        <Link href={`/premissas/${id}`} className="hover:underline">← {premissa.nome}</Link>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">
          Histórico de versões
        </h1>
        <ModeloBadge modelo={premissa.modelo} />
      </div>
      <p className="text-sm text-neutral-600 mt-1">
        Cada save cria um snapshot da versão anterior. Versão atual: <strong>v{premissa.versao}</strong>.
      </p>

      <div className="mt-6 space-y-3">
        {/* Versão atual no topo */}
        <article className="rounded-lg border-2 border-peri-400 bg-peri-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block rounded bg-peri-700 text-white px-2 py-0.5 text-xs font-medium">
                  v{premissa.versao}
                </span>
                <span className="text-xs font-medium text-peri-700 uppercase tracking-wide">atual</span>
              </div>
              <h2 className="mt-1 font-medium text-navy-900">{premissa.nome}</h2>
              {premissa.descricao && <p className="text-sm text-neutral-700 mt-0.5">{premissa.descricao}</p>}
            </div>
            <span className="text-xs text-neutral-500">desde {dataHora(premissa.atualizadoEm)}</span>
          </div>
          <pre className="mt-3 text-xs bg-white border border-peri-200 rounded p-3 overflow-x-auto max-h-72">
            {JSON.stringify(premissa.parametros, null, 2)}
          </pre>
        </article>

        {/* Snapshots históricos */}
        {premissa.historico.length === 0 && (
          <p className="rounded-lg border border-neutral-200 bg-white p-5 text-sm text-neutral-500 text-center">
            Sem histórico — esta premissa ainda não foi editada.
          </p>
        )}
        {premissa.historico.map((h) => (
          <article key={h.id} className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-block rounded bg-neutral-100 text-neutral-700 px-2 py-0.5 text-xs font-medium">
                  v{h.versao}
                </span>
                <h2 className="mt-1 font-medium text-navy-900 inline-block ml-2">{h.nome}</h2>
                {h.descricao && <p className="text-sm text-neutral-600 mt-0.5">{h.descricao}</p>}
                {h.motivo && (
                  <p className="text-xs text-neutral-500 mt-1 italic">
                    motivo: {h.motivo}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-xs text-neutral-500">
                  <div>{dataHora(h.snapshotEm)}</div>
                  {h.snapshotPor && <div className="text-neutral-400">por {h.snapshotPor.email}</div>}
                </div>
                {escopo.podeMutar && (
                  <form action={restaurarAction}>
                    <input type="hidden" name="premissaId" value={premissa.id} />
                    <input type="hidden" name="historicoId" value={h.id} />
                    <button
                      className="rounded border border-neutral-300 px-3 py-1.5 text-xs font-medium text-navy-900 hover:border-peri-400 hover:bg-peri-50 transition"
                      title="Restaura este conjunto de parâmetros como nova versão atual."
                    >
                      ↺ restaurar
                    </button>
                  </form>
                )}
              </div>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-neutral-600 hover:text-peri-700">
                ver parâmetros
              </summary>
              <pre className="mt-2 text-xs bg-neutral-50 border border-neutral-200 rounded p-3 overflow-x-auto max-h-72">
                {JSON.stringify(h.parametros, null, 2)}
              </pre>
            </details>
          </article>
        ))}
      </div>
    </main>
  );
}
