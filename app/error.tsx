"use client";
// Boundary global de erros — captura exceções não-tratadas em pages/server actions.
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logomark } from "@/components/shell/logomark";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log no console (Vercel captura). Não vaza pro usuário.
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-neutral-50 to-red-50/20">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Logomark size="md" />
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-navy-900">WRE Simulador</h1>
        </div>
        <Card>
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-navy-900">Algo deu errado</h2>
              <p className="text-sm text-neutral-600 mt-1">
                Tente recarregar. Se persistir, volte à página principal.
              </p>
              {error.digest && (
                <p className="text-[10px] text-neutral-400 mt-2 font-mono">id: {error.digest}</p>
              )}
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Button onClick={reset} variant="primary" size="sm">
                <RotateCcw className="h-3.5 w-3.5" /> Tentar novamente
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/simulacao">Ir para Simulação</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
