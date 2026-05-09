// Página de troca de senha — usada quando senhaProvisoria=true (forçada pelo
// middleware) ou voluntariamente.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth, signOut } from "@/auth";
import { logAudit } from "@/lib/audit";
import { flashError } from "@/lib/flash";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Logomark } from "@/components/shell/logomark";

const SENHA_MIN = 8;

async function trocarSenhaAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const atual = String(formData.get("senhaAtual") ?? "");
  const nova = String(formData.get("senhaNova") ?? "");
  const conf = String(formData.get("senhaConfirma") ?? "");

  if (nova !== conf) {
    await flashError("As senhas não conferem.");
    redirect("/perfil/senha");
  }
  if (nova.length < SENHA_MIN) {
    await flashError(`Senha muito curta (mín. ${SENHA_MIN} caracteres).`);
    redirect("/perfil/senha");
  }
  if (nova === atual) {
    await flashError("A nova senha deve ser diferente da atual.");
    redirect("/perfil/senha");
  }

  const u = await prisma.usuario.findUnique({ where: { id: session.user.id } });
  if (!u || !u.senhaHash) {
    await flashError("Conta sem senha definida — peça ao admin.");
    redirect("/perfil/senha");
  }
  const ok = await bcrypt.compare(atual, u.senhaHash);
  if (!ok) {
    await logAudit({
      usuarioId: u.id,
      acao: "perfil.senha.falhou",
      recurso: `Usuario:${u.id}`,
      meta: { motivo: "senha-atual-invalida" },
    });
    await flashError("Senha atual incorreta.");
    redirect("/perfil/senha");
  }

  const novoHash = await bcrypt.hash(nova, 10);
  await prisma.usuario.update({
    where: { id: u.id },
    data: { senhaHash: novoHash, senhaProvisoria: false },
  });
  await logAudit({
    usuarioId: u.id,
    acao: "perfil.senha.trocada",
    recurso: `Usuario:${u.id}`,
  });

  await signOut({ redirectTo: "/login?msg=senha-trocada" });
}

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
