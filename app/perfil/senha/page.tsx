// Página de troca de senha — usada quando senhaProvisoria=true (forçada pelo
// middleware) ou voluntariamente (usuário clica em "trocar senha").
import Link from "next/link";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth, signOut } from "@/auth";
import { logAudit } from "@/lib/audit";

const SENHA_MIN = 8;

async function trocarSenhaAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const atual = String(formData.get("senhaAtual") ?? "");
  const nova = String(formData.get("senhaNova") ?? "");
  const conf = String(formData.get("senhaConfirma") ?? "");

  if (nova !== conf) {
    redirect(`/perfil/senha?erro=${encodeURIComponent("As senhas não conferem.")}`);
  }
  if (nova.length < SENHA_MIN) {
    redirect(`/perfil/senha?erro=${encodeURIComponent(`Senha muito curta (mín. ${SENHA_MIN} caracteres).`)}`);
  }
  if (nova === atual) {
    redirect(`/perfil/senha?erro=${encodeURIComponent("A nova senha deve ser diferente da atual.")}`);
  }

  const u = await prisma.usuario.findUnique({ where: { id: session.user.id } });
  if (!u || !u.senhaHash) {
    redirect(`/perfil/senha?erro=${encodeURIComponent("Conta sem senha definida — peça ao admin.")}`);
  }
  const ok = await bcrypt.compare(atual, u.senhaHash);
  if (!ok) {
    await logAudit({
      usuarioId: u.id, acao: "perfil.senha.falhou", recurso: `Usuario:${u.id}`,
      meta: { motivo: "senha-atual-invalida" },
    });
    redirect(`/perfil/senha?erro=${encodeURIComponent("Senha atual incorreta.")}`);
  }

  const novoHash = await bcrypt.hash(nova, 10);
  await prisma.usuario.update({
    where: { id: u.id },
    data: { senhaHash: novoHash, senhaProvisoria: false },
  });
  await logAudit({
    usuarioId: u.id, acao: "perfil.senha.trocada", recurso: `Usuario:${u.id}`,
  });

  // Força re-login pra que o JWT pegue senhaProvisoria=false e libere o resto do app.
  await signOut({ redirectTo: "/login?msg=senha-trocada" });
}

export default async function PerfilSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const sp = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-1.5 mb-6">
          <div className="flex flex-col gap-1" aria-hidden>
            <span className="block h-3 w-10 rounded-sm bg-navy-900" />
            <span className="block h-3 w-10 rounded-sm bg-peri-400" />
            <span className="block h-3 w-10 rounded-sm bg-mint-400" />
          </div>
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-navy-900">
            Trocar senha
          </h1>
          <p className="text-xs text-neutral-500">
            {session.user.senhaProvisoria
              ? "Sua senha é provisória — defina uma nova para continuar."
              : "Atualize sua senha de acesso."}
          </p>
        </div>

        {sp.erro && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {sp.erro}
          </div>
        )}

        <form
          action={trocarSenhaAction}
          className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <Field label="Senha atual">
            <input
              name="senhaAtual" type="password" required autoComplete="current-password"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-peri-400 focus:outline-none focus:ring-1 focus:ring-peri-400"
            />
          </Field>
          <Field label={`Nova senha (mín. ${SENHA_MIN} caracteres)`}>
            <input
              name="senhaNova" type="password" required minLength={SENHA_MIN} autoComplete="new-password"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-peri-400 focus:outline-none focus:ring-1 focus:ring-peri-400"
            />
          </Field>
          <Field label="Confirme a nova senha">
            <input
              name="senhaConfirma" type="password" required minLength={SENHA_MIN} autoComplete="new-password"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-peri-400 focus:outline-none focus:ring-1 focus:ring-peri-400"
            />
          </Field>
          <button
            type="submit"
            className="mt-2 rounded bg-navy-900 hover:bg-navy-700 text-white py-2 text-sm font-medium transition"
          >
            Trocar senha
          </button>
        </form>

        {!session.user.senhaProvisoria && (
          <p className="text-center text-xs text-neutral-400 mt-4">
            <Link href="/" className="hover:text-peri-600 transition underline">← voltar</Link>
          </p>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-700 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
