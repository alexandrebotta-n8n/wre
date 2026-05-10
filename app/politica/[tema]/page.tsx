// Rota dinâmica /politica/[tema] — renderiza um tema baseado em metadata.
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { TemaShell } from "../componentes/tema-shell";
import { getTema, TEMAS } from "../conteudo/temas";
import { Visual } from "../visuais";

export async function generateStaticParams() {
  return TEMAS.map((t) => ({ tema: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tema: string }>;
}): Promise<Metadata> {
  const { tema: slug } = await params;
  const tema = getTema(slug);
  if (!tema) return { title: "Política DSF — WRE Simulador" };
  return { title: `${tema.titulo} — Política DSF` };
}

export default async function TemaPage({ params }: { params: Promise<{ tema: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tema: slug } = await params;
  const tema = getTema(slug);
  if (!tema) notFound();

  return <TemaShell tema={tema} visual={<Visual k={tema.visual} />} />;
}
