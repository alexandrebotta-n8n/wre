"use client";
import * as React from "react";
import { useEffect, useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Lê a senha provisória gerada do cookie HTTP `wre.senhaGerada` (one-shot)
 * via API route, exibe em Dialog, e permite copiar. NUNCA passamos senha via URL.
 */
export function SenhaGeradaDialog() {
  const [open, setOpen] = useState(false);
  const [senha, setSenha] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch("/api/usuarios/senha-gerada", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { senha?: string; email?: string } | null) => {
        if (d?.senha) {
          setSenha(d.senha);
          setEmail(d.email ?? null);
          setOpen(true);
        }
      })
      .catch(() => {});
  }, []);

  const copiar = async () => {
    if (!senha) return;
    try {
      await navigator.clipboard.writeText(senha);
      setCopiado(true);
      toast.success("Senha copiada");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar — copie manualmente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-600" />
            Senha provisória gerada
          </DialogTitle>
          <DialogDescription>
            Esta senha aparece <strong>uma única vez</strong>. Comunique ao usuário por canal seguro
            (WhatsApp, telefone — nunca por e-mail aberto).
            {email && <> Usuário: <strong className="text-navy-900">{email}</strong>.</>}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-neutral-50 border border-neutral-200 p-4 flex items-center gap-3">
          <code className="flex-1 font-mono text-base text-navy-900 tabular-nums select-all break-all">
            {senha}
          </code>
          <Button onClick={copiar} variant={copiado ? "primary" : "outline"} size="sm">
            {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiado ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <p className="text-xs text-neutral-500">
          A senha será trocada no primeiro login. Se você perder esta janela, pode resetar
          novamente para gerar outra.
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="primary" size="sm">Entendido</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
