import { Layers } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ColunaEmpty({
  slot,
  outroCenarioId,
  periodoId,
}: {
  slot: "a" | "b";
  outroCenarioId: string;
  periodoId: string;
}) {
  const sp = new URLSearchParams();
  if (outroCenarioId) sp.set(slot === "a" ? "b" : "a", outroCenarioId);
  if (periodoId) sp.set("periodoId", periodoId);
  sp.set("drawer", "1");
  return (
    <Card className="min-h-[300px] flex items-center justify-center">
      <EmptyState
        icon={<Layers className="h-5 w-5" />}
        title={`Coluna ${slot.toUpperCase()} vazia`}
        description="Selecione um cenário para começar a comparar."
        action={
          <Button asChild variant="primary" size="sm">
            <Link href={`/simulacao?${sp.toString()}`}>Abrir lista de cenários</Link>
          </Button>
        }
      />
    </Card>
  );
}
