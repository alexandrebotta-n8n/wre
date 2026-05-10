import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Logomark } from "@/components/shell/logomark";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-neutral-50 to-peri-50/30">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Logomark size="md" />
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-navy-900">WRE Simulador</h1>
        </div>
        <EmptyState
          icon={<Compass className="h-5 w-5" />}
          title="Página não encontrada"
          description="Esta rota não existe (mais) ou você não tem permissão pra acessá-la. Cenários, comparações e apresentações agora vivem em uma página única."
          action={
            <Button asChild variant="primary">
              <Link href="/simulacao">Ir para Simulação</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
