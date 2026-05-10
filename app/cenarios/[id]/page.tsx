import { permanentRedirect } from "next/navigation";

// /cenarios/[id] → /simulacao?a=[id] (cenário abre na coluna A).
export default async function CenarioDetalheRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/simulacao?a=${id}`);
}
