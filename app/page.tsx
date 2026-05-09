import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const [cenarios, socios, periodos] = await Promise.all([
    prisma.cenario.count(),
    prisma.socio.count({ where: { ativo: true } }),
    prisma.periodo.count(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-navy-900">WRE Simulador</h1>
      <p className="text-sm text-neutral-600 mt-1">
        Simulação de remuneração de sócios e líderes — DSF (Dupont Spiller & Fadanelli).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <Card href="/cenarios" titulo="Cenários" valor={cenarios} subtitulo="criados" />
        <Card href="/socios" titulo="Sócios" valor={socios} subtitulo="ativos" />
        <Card href="/" titulo="Períodos" valor={periodos} subtitulo="cadastrados" />
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/cenarios"
          className="block rounded-lg border border-neutral-200 bg-white p-6 hover:border-peri-400 transition group"
        >
          <h2 className="font-medium text-navy-900 group-hover:text-peri-600">Criar novo cenário →</h2>
          <p className="text-sm text-neutral-600 mt-1">
            Escolher modelo (ATUAL × NOVO), premissa e ano. Reclassificar sócios. Calcular o pacote anual.
          </p>
        </Link>
        <Link
          href="/cenarios/comparar"
          className="block rounded-lg border border-neutral-200 bg-white p-6 hover:border-peri-400 transition group"
        >
          <h2 className="font-medium text-navy-900 group-hover:text-peri-600">Comparar cenários →</h2>
          <p className="text-sm text-neutral-600 mt-1">
            ATUAL × NOVO lado a lado, por sócio, com diff em R$ e %.
          </p>
        </Link>
      </div>
    </main>
  );
}

function Card({ href, titulo, valor, subtitulo }: { href: string; titulo: string; valor: number; subtitulo: string }) {
  return (
    <Link href={href} className="block rounded-lg border border-neutral-200 bg-white p-5 hover:border-peri-400 transition">
      <div className="text-sm text-neutral-500">{titulo}</div>
      <div className="text-3xl font-semibold mt-1 text-navy-900 tabular-nums">{valor}</div>
      <div className="text-xs text-neutral-500 mt-1">{subtitulo}</div>
    </Link>
  );
}
