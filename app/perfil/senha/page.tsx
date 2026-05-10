// Página de troca de senha — usada quando senhaProvisoria=true (forçada pelo
// middleware) ou voluntariamente.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Logomark } from "@/components/shell/logomark";
import { trocarSenhaAction } from "./acoes";

const SENHA_MIN = 8;

export default async function PerfilSenhaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const provisoria = session.user.senhaProvisoria;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-neutral-50 to-peri-50/30">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Logomark size="md" />
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-navy-900">Trocar senha</h1>
          <p className="text-xs text-neutral-500 text-center">
            {provisoria
              ? "Sua senha é provisória — defina uma nova para continuar."
              : "Atualize sua senha de acesso."}
          </p>
        </div>

        {provisoria && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
            <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Por segurança, escolha uma senha forte (mín. {SENHA_MIN} caracteres) que você não use em outro lugar.
            </span>
          </div>
        )}

        <Card>
          <form action={trocarSenhaAction} className="p-6 space-y-3">
            <Field label="Senha atual" htmlFor="senhaAtual" required>
              <Input id="senhaAtual" name="senhaAtual" type="password" required autoComplete="current-password" />
            </Field>
            <Field label={`Nova senha (mín. ${SENHA_MIN} caracteres)`} htmlFor="senhaNova" required>
              <Input id="senhaNova" name="senhaNova" type="password" required minLength={SENHA_MIN} autoComplete="new-password" />
            </Field>
            <Field label="Confirme a nova senha" htmlFor="senhaConfirma" required>
              <Input id="senhaConfirma" name="senhaConfirma" type="password" required minLength={SENHA_MIN} autoComplete="new-password" />
            </Field>
            <SubmitButton variant="secondary" className="w-full mt-2">
              Trocar senha
            </SubmitButton>
          </form>
        </Card>

        {!provisoria && (
          <p className="text-center text-xs text-neutral-400 mt-4">
            <Link href="/" className="hover:text-peri-600 transition underline">← voltar</Link>
          </p>
        )}
      </div>
    </main>
  );
}
