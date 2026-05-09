import type { Metadata } from "next";
import Link from "next/link";
import { signOut, auth } from "@/auth";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import "./globals.css";

export const metadata: Metadata = {
  title: "WRE Simulador — DSF",
  description: "Simulação de remuneração de sócios e líderes — WRE Consultoria → DSF",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen text-neutral-900 antialiased">
        {session?.user && (
          <header className="bg-navy-900 text-white">
            <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-6">
              <Link href="/" className="font-semibold tracking-tight flex items-center gap-2">
                <Logomark />
                <span>WRE Simulador</span>
                <span className="text-peri-200 font-normal text-sm">· DSF</span>
              </Link>
              <nav className="flex items-center gap-5 text-sm text-peri-100">
                <Link href="/cenarios" className="hover:text-mint-400 transition">Cenários</Link>
                <Link href="/cenarios/comparar" className="hover:text-mint-400 transition">Comparar</Link>
                <Link href="/apresentacao" className="hover:text-mint-400 transition">Apresentar</Link>
                <Link href="/socios" className="hover:text-mint-400 transition">Sócios</Link>
                {!escopo.ehSocioRestrito && (
                  <Link href="/premissas" className="hover:text-mint-400 transition">Premissas</Link>
                )}
                {session.user.roles.includes("ADMIN") && (
                  <Link href="/usuarios" className="hover:text-mint-400 transition">Usuários</Link>
                )}
              </nav>
              <div className="ml-auto flex items-center gap-3 text-sm">
                <span className="text-peri-200">{session.user.email}</span>
                <Link href="/perfil/senha" className="text-peri-100 hover:text-mint-400 underline transition">senha</Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button className="text-peri-100 hover:text-mint-400 underline transition">sair</button>
                </form>
              </div>
            </div>
          </header>
        )}
        {children}
      </body>
    </html>
  );
}

function Logomark() {
  // 3 cores da identidade: navy (escuro) → periwinkle → mint, em pequenos quadrados
  // empilhados verticalmente, espelhando o swatch fornecido.
  return (
    <span className="inline-flex flex-col gap-0.5" aria-hidden>
      <span className="block h-1.5 w-3 rounded-xs bg-navy-700 ring-1 ring-peri-200/40" />
      <span className="block h-1.5 w-3 rounded-xs bg-peri-400" />
      <span className="block h-1.5 w-3 rounded-xs bg-mint-400" />
    </span>
  );
}
