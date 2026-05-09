import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { nomeOuIniciais } from "@/lib/format";
import { getModoNome } from "@/lib/preferencias";
import { logAudit } from "@/lib/audit";

async function atualizarAreaAction(formData: FormData) {
  "use server";
  const session = await auth();
  // Só ADMIN/CONSULTOR podem mudar área (afeta cálculo do Bloco B em modo POR_AREA)
  const roles = session?.user?.roles ?? [];
  if (!roles.some((r) => r === "ADMIN" || r === "CONSULTOR")) return;
  const id = String(formData.get("id"));
  const areaPraticaId = String(formData.get("areaPraticaId") ?? "") || null;
  await prisma.socio.update({ where: { id }, data: { areaPraticaId } });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "socio.area.atualizar",
    recurso: `Socio:${id}`,
    meta: { areaPraticaId },
  });
  revalidatePath("/socios");
}

export default async function SociosPage() {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const modoNome = await getModoNome();
  const [socios, areas] = await Promise.all([
    prisma.socio.findMany({
      where: {
        ativo: true,
        ...(escopo.ehSocioRestrito ? { id: escopo.socioIdEscopo ?? "__nada__" } : {}),
      },
      include: { areaPratica: true },
      orderBy: [{ isFundador: "desc" }, { percentualQuotasDefault: "desc" }, { nome: "asc" }],
      take: 200,
    }),
    escopo.podeMutar
      ? prisma.areaPratica.findMany({ where: { ativa: true }, orderBy: [{ ordem: "asc" }], take: 50 })
      : Promise.resolve([]),
  ]);
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Sócios e Líderes ({socios.length})</h1>
      <div className="mt-6 rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600 text-left text-xs">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Cargo</th>
              <th className="px-4 py-2 font-medium">Quotas (default)</th>
              <th className="px-4 py-2 font-medium">Nível</th>
              <th className="px-4 py-2 font-medium">Faixa</th>
              <th className="px-4 py-2 font-medium">Área de prática</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {socios.map((s) => (
              <tr key={s.id} className="hover:bg-peri-50">
                <td className="px-4 py-2 font-medium" title={modoNome === "iniciais" ? s.nome : undefined}>
                  {nomeOuIniciais(s.nome, modoNome)}
                </td>
                <td className="px-4 py-2 text-neutral-600">{s.cargo}</td>
                <td className="px-4 py-2 text-neutral-600 tabular-nums">
                  {s.percentualQuotasDefault > 0 ? (s.percentualQuotasDefault * 100).toFixed(4) + "%" : "—"}
                </td>
                <td className="px-4 py-2 text-neutral-600">{s.nivelCargo ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-600">{s.faixaSalarial ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-600">
                  {escopo.podeMutar ? (
                    <form action={atualizarAreaAction} className="inline-flex items-center gap-1.5">
                      <input type="hidden" name="id" value={s.id} />
                      <select
                        name="areaPraticaId" defaultValue={s.areaPraticaId ?? ""}
                        className="rounded border border-neutral-300 px-2 py-0.5 text-xs"
                      >
                        <option value="">— sem área —</option>
                        {areas.map((a) => (
                          <option key={a.id} value={a.id}>{a.nome}</option>
                        ))}
                      </select>
                      <button className="text-xs text-peri-700 hover:text-peri-500 font-medium">salvar</button>
                    </form>
                  ) : (
                    s.areaPratica ? (
                      <span className="inline-block rounded bg-peri-100 text-peri-700 px-2 py-0.5 text-xs ring-1 ring-peri-200 ring-inset">
                        {s.areaPratica.nome}
                      </span>
                    ) : "—"
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-600">
                  {s.isFundador ? <span className="inline-block rounded px-2 py-0.5 text-xs bg-mint-100 text-mint-900 ring-1 ring-mint-400 ring-inset">fundador</span> : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
