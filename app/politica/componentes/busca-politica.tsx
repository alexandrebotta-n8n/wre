"use client";
// Caixa de busca client-side: navega para /politica/buscar?q=... no Enter/Submit.
import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function BuscaPolitica({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [v, setV] = React.useState(defaultValue);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = v.trim();
        if (q) router.push(`/politica/buscar?q=${encodeURIComponent(q)}`);
      }}
      className="relative flex-1 min-w-[200px] max-w-md"
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
      <Input
        type="search"
        name="q"
        placeholder="Buscar na Política…  (ex: vesting, bloco B, líder)"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="pl-9"
      />
    </form>
  );
}
