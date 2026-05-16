"use server";
// Server action de troca de senha extraída para módulo próprio.
// Inline actions em page.tsx tiveram colisão de identidade com a
// signOutAction do layout (Next 16 + Turbopack): submits caíam no
// signOut em vez de validar/persistir. Módulo dedicado resolve.
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth, signOut } from "@/auth";
import { logAudit } from "@/lib/audit";
import { flashError } from "@/lib/flash";

const SENHA_MIN = 8;

export async function trocarSenhaAction(formData: FormData) {
  try {
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

    // Auth.js v5: signOut com `redirectTo` retorna um formato de response que o
    // cliente do server action não consegue processar (limpa cookie + 303),
    // gerando "An unexpected response was received from the server" no
    // <ErrorBoundary>. Padrão estável: signOut(redirect:false) + redirect()
    // explícito do next/navigation. Mesma fix vale para signOutAction global.
    try {
      await signOut({ redirect: false });
    } catch (signOutErr) {
      // signOut pode lançar em algumas versões do Auth.js v5 beta mesmo com
      // redirect:false. Não é fatal — o redirect a seguir leva ao /login que
      // exige nova autenticação independentemente. Log para diagnóstico.
      console.error("[trocarSenhaAction] signOut falhou (não-fatal):", signOutErr);
    }
    redirect("/login?msg=senha-trocada");
  } catch (e) {
    // redirect() do next/navigation lança NEXT_REDIRECT — Next captura no
    // boundary externo. NÃO devemos engolir essa exceção.
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    // digest interno do Next também usa esse prefixo
    if (e instanceof Error && (e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    // Qualquer outro erro: log + flash + redirect ao invés de cair em error.tsx.
    console.error("[trocarSenhaAction] falhou:", e);
    await flashError("Erro inesperado ao trocar senha. Se persistir, contate o admin.");
    redirect("/perfil/senha");
  }
}
