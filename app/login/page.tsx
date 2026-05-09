import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Logomark } from "@/components/shell/logomark";

const MENSAGENS: Record<string, string> = {
  "senha-trocada": "Senha trocada com sucesso. Faça login novamente.",
};

const ERROS: Record<string, string> = {
  CredentialsSignin: "E-mail ou senha incorretos.",
  default: "Não foi possível entrar. Tente novamente.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; erro?: string }>;
}) {
  const sp = await searchParams;
  const aviso = sp.msg ? MENSAGENS[sp.msg] : null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-neutral-50 to-peri-50/30">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Logomark size="md" />
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-navy-900">WRE Simulador</h1>
          <p className="text-xs text-neutral-500">DSF · acesso interno</p>
        </div>

        {aviso && (
          <div className="mb-3 rounded-md border border-mint-300 bg-mint-50 px-3 py-2 text-xs text-mint-900 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> {aviso}
          </div>
        )}
        {sp.erro && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {sp.erro}
          </div>
        )}

        <Card>
          <form
            action={async (formData) => {
              "use server";
              try {
                await signIn("credentials", {
                  email: formData.get("email"),
                  password: formData.get("password"),
                  redirectTo: "/",
                });
              } catch (e) {
                // signIn faz redirect via NEXT_REDIRECT — re-throw para o Next
                // tratar normalmente. Apenas AuthError indica falha real.
                if (e instanceof AuthError) {
                  const code = (e.type ?? "default") as keyof typeof ERROS;
                  redirect(`/login?erro=${encodeURIComponent(ERROS[code] ?? ERROS.default)}`);
                }
                throw e;
              }
            }}
            className="p-6 space-y-3"
          >
            <Field label="E-mail" htmlFor="email" required>
              <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
            </Field>
            <Field label="Senha" htmlFor="password" required>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </Field>
            <SubmitButton variant="secondary" className="w-full mt-1">
              Entrar
            </SubmitButton>
          </form>
        </Card>

        <p className="text-center text-xs text-neutral-400 mt-4">
          Acesso restrito · login sob alocação prévia
        </p>
      </div>
    </main>
  );
}
