import { permanentRedirect } from "next/navigation";

// /cenarios/comparar?a&b → /simulacao?a&b (periodoId é ignorado — visão anual).
export default async function CompararRedirect({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.a) params.set("a", sp.a);
  if (sp.b) params.set("b", sp.b);
  permanentRedirect(`/simulacao${params.toString() ? `?${params.toString()}` : ""}`);
}
