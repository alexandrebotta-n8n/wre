import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";

export default async function SociosPage() {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const socios = await prisma.socio.findMany({
    where: {
      ativo: true,
      ...(escopo.ehSocioRestrito ? { id: escopo.socioIdEscopo ?? "__nada__" } : {}),
    },
    orderBy: [{ isFundador: "desc" }, { percentualQuotasDefault: "desc" }, { nome: "asc" }],
    take: 200,
  });
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
              <th className="px-4 py-2 font-medium">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {socios.map((s) => (
              <tr key={s.id} className="hover:bg-peri-50">
                <td className="px-4 py-2 font-medium">{s.nome}</td>
                <td className="px-4 py-2 text-neutral-600">{s.cargo}</td>
                <td className="px-4 py-2 text-neutral-600 tabular-nums">
                  {s.percentualQuotasDefault > 0 ? (s.percentualQuotasDefault * 100).toFixed(4) + "%" : "—"}
                </td>
                <td className="px-4 py-2 text-neutral-600">{s.nivelCargo ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-600">{s.faixaSalarial ?? "—"}</td>
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
