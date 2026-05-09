import Link from "next/link";
import { Folders, Users, GitCompare, Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ModeloBadge, StatusBadge } from "@/components/ui/badge";
import { dataHora } from "@/lib/format";

export default async function HomePage() {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);

  const [cenarios, socios, periodos, ultimosCenarios] = await Promise.all([
    prisma.cenario.count({ where: escopo.ehSocioRestrito ? { status: "APPLIED" } : {} }),
    prisma.socio.count({ where: { ativo: true } }),
    prisma.periodo.count(),
    prisma.cenario.findMany({
      where: escopo.ehSocioRestrito ? { status: "APPLIED" } : {},
      orderBy: [{ criadoEm: "desc" }],
      include: { premissa: { select: { nome: true } } },
      take: 5,
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      <PageHeader
        title={`Olá${session?.user?.name ? `, ${session.user.name}` : ""}`}
        description="Simulação de remuneração de sócios e líderes — DSF (Dupont Spiller & Fadanelli)."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard href="/cenarios" icon={<Folders className="h-4 w-4" />} label="Cenários" valor={cenarios} hint="modelados" />
        <StatCard href="/socios" icon={<Users className="h-4 w-4" />} label="Sócios" valor={socios} hint="ativos na base" />
        <StatCard icon={<Calendar className="h-4 w-4" />} label="Períodos" valor={periodos} hint="cadastrados" />
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionCard
          href="/cenarios"
          icon={<Folders className="h-5 w-5" />}
          title="Criar ou abrir cenário"
          description="Modelo Atual ou Novo, premissa, ano. Reclassifique sócios e calcule o pacote anual."
        />
        <ActionCard
          href="/cenarios/comparar"
          icon={<GitCompare className="h-5 w-5" />}
          title="Comparar cenários"
          description="Atual × Novo lado a lado, com diff por sócio em R$ e %."
        />
      </div>

      {/* Últimos cenários */}
      {ultimosCenarios.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wider mb-3">
            Últimos cenários
          </h2>
          <Card className="overflow-hidden divide-y divide-neutral-100">
            {ultimosCenarios.map((c) => (
              <Link
                key={c.id}
                href={`/cenarios/${c.id}`}
                className="flex items-center gap-3 p-4 hover:bg-peri-50/50 transition-colors focus-visible:outline-none focus-visible:bg-peri-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-navy-900 truncate">{c.nome}</div>
                  <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{c.premissa.nome}</span>
                    <span>·</span>
                    <span>Ano {c.ano}</span>
                    <span>·</span>
                    <span>criado {dataHora(c.criadoEm)}</span>
                  </div>
                </div>
                <ModeloBadge modelo={c.modelo} />
                <StatusBadge status={c.status} />
                <span className="text-peri-700 text-sm">→</span>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </main>
  );
}

function StatCard({
  href,
  icon,
  label,
  valor,
  hint,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  valor: number;
  hint: string;
}) {
  const inner = (
    <Card className="p-5 transition-colors hover:border-peri-400">
      <div className="flex items-center gap-2 text-xs text-neutral-500 uppercase tracking-wider">
        <span className="text-peri-600">{icon}</span>
        {label}
      </div>
      <div className="text-3xl font-semibold mt-2 text-navy-900 tabular-nums">{valor}</div>
      <div className="text-xs text-neutral-500 mt-0.5">{hint}</div>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="hover:border-peri-400 transition-colors">
      <Link
        href={href}
        className="block p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400 rounded-lg"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-peri-100 text-peri-700 flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-navy-900">{title}</h3>
            <p className="text-sm text-neutral-600 mt-1">{description}</p>
            <span className="text-xs text-peri-700 mt-3 inline-block">Abrir →</span>
          </div>
        </div>
      </Link>
    </Card>
  );
}
