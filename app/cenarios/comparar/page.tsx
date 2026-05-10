import { permanentRedirect } from "next/navigation";

// /cenarios/comparar?a&b&periodoId → /simulacao?a&b&periodoId
export default async function CompararRedirect({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; periodoId?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.a) params.set("a", sp.a);
  if (sp.b) params.set("b", sp.b);
  if (sp.periodoId) params.set("periodoId", sp.periodoId);
  permanentRedirect(`/simulacao${params.toString() ? `?${params.toString()}` : ""}`);
}
