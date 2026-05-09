import { signIn } from "@/auth";

const MENSAGENS: Record<string, string> = {
  "senha-trocada": "Senha trocada com sucesso. Faça login novamente.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const sp = await searchParams;
  const aviso = sp.msg ? MENSAGENS[sp.msg] : null;

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-50">
      <div className="w-full max-w-sm">
        {/* Logomark grande no topo */}
        <div className="flex flex-col items-center gap-1.5 mb-6">
          <div className="flex flex-col gap-1" aria-hidden>
            <span className="block h-3 w-10 rounded-sm bg-navy-900" />
            <span className="block h-3 w-10 rounded-sm bg-peri-400" />
            <span className="block h-3 w-10 rounded-sm bg-mint-400" />
          </div>
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-navy-900">
            WRE Simulador
          </h1>
          <p className="text-xs text-neutral-500">DSF · acesso interno</p>
        </div>

        {aviso && (
          <div className="mb-3 rounded border border-mint-400 bg-mint-50 px-3 py-2 text-xs text-mint-900">
            {aviso}
          </div>
        )}

        <form
          action={async (formData) => {
            "use server";
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: "/",
            });
          }}
          className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <label className="block">
            <span className="text-xs font-medium text-neutral-700 mb-1 block">E-mail</span>
            <input
              name="email" type="email" required autoComplete="email"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-peri-400 focus:outline-none focus:ring-1 focus:ring-peri-400"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-700 mb-1 block">Senha</span>
            <input
              name="password" type="password" required autoComplete="current-password"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-peri-400 focus:outline-none focus:ring-1 focus:ring-peri-400"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded bg-navy-900 hover:bg-navy-700 text-white py-2 text-sm font-medium transition"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-xs text-neutral-400 mt-4">
          Acesso restrito · login sob alocação prévia
        </p>
      </div>
    </main>
  );
}
