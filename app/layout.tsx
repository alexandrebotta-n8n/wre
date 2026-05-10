import type { Metadata } from "next";
import { Toaster } from "sonner";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut, auth } from "@/auth";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { getModoNome, setModoNome } from "@/lib/preferencias";
import { Header } from "@/components/shell/header";
import { FlashConsumer } from "@/components/shell/flash-consumer";
import "./globals.css";

export const metadata: Metadata = {
  title: "WRE Simulador — DSF",
  description: "Simulação de remuneração de sócios e líderes — WRE Consultoria → DSF",
};

async function alternarModoNomeAction() {
  "use server";
  const atual = await getModoNome();
  await setModoNome(atual === "iniciais" ? "completo" : "iniciais");
  revalidatePath("/", "layout");
}

async function signOutAction() {
  "use server";
  // signOut + redirectTo gera response inesperado no client de server action
  // (Auth.js v5 beta + Next 16). Separar é o padrão estável.
  await signOut({ redirect: false });
  redirect("/login");
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const modoNome = await getModoNome();

  const navItems = session?.user
    ? [
        { href: "/simulacao", label: "Simulação" },
        { href: "/socios", label: "Sócios" },
        { href: "/politica", label: "Política" },
        ...(!escopo.ehSocioRestrito ? [{ href: "/resultados", label: "Resultados" }] : []),
        ...(!escopo.ehSocioRestrito ? [{ href: "/premissas", label: "Premissas" }] : []),
        ...(session.user.roles.includes("ADMIN") ? [{ href: "/usuarios", label: "Usuários" }] : []),
      ]
    : [];

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-navy-900 focus:px-3 focus:py-1.5 focus:rounded focus:shadow"
        >
          Pular para o conteúdo
        </a>
        {session?.user && (
          <Header
            email={session.user.email ?? ""}
            navItems={navItems}
            modoNomeIniciais={modoNome === "iniciais"}
            alternarModoNomeAction={alternarModoNomeAction}
            signOutAction={signOutAction}
          />
        )}
        <div id="conteudo">{children}</div>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "border border-neutral-200 shadow-md",
            },
          }}
        />
        <Suspense fallback={null}>
          <FlashConsumer />
        </Suspense>
      </body>
    </html>
  );
}
