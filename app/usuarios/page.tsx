import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { dataHora } from "@/lib/format";
import { criarUsuarioComSenha, resetarSenha } from "@/lib/usuario-service";
import { logAudit } from "@/lib/audit";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import type { UsuarioRole } from "@prisma/client";

const ROLES: UsuarioRole[] = ["ADMIN", "CONSULTOR", "SOCIO", "LEITOR"];

const ROLE_LABEL: Record<UsuarioRole, string> = {
  ADMIN: "Admin",
  CONSULTOR: "Consultor (WRE)",
  SOCIO: "Sócio (vê só seu)",
  LEITOR: "Leitor",
};

async function criarAction(formData: FormData) {
  "use server";
  const session = await auth();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nome = String(formData.get("nome") ?? "").trim() || undefined;
  const roles = (formData.getAll("roles") as string[]).filter(Boolean) as UsuarioRole[];
  const socioId = String(formData.get("socioId") ?? "") || null;
  if (!email || roles.length === 0) {
    redirect(`/usuarios?erro=${encodeURIComponent("E-mail e ao menos 1 role obrigatórios.")}`);
  }
  const ja = await prisma.usuario.findUnique({ where: { email } });
  if (ja) redirect(`/usuarios?erro=${encodeURIComponent("E-mail já cadastrado.")}`);
  const { usuario, senhaProvisoriaPlano } = await criarUsuarioComSenha({
    email, nome, roles, socioId,
  });
  await logAudit({
    usuarioId: session?.user?.id, acao: "usuario.criar",
    recurso: `Usuario:${usuario.id}`,
    meta: { email, roles },
  });
  redirect(`/usuarios?criado=${usuario.id}&senha=${encodeURIComponent(senhaProvisoriaPlano)}`);
}

async function alternarAtivoAction(formData: FormData) {
  "use server";
  const session = await auth();
  const id = String(formData.get("id"));
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) return;
  await prisma.usuario.update({ where: { id }, data: { ativo: !u.ativo } });
  await logAudit({
    usuarioId: session?.user?.id, acao: u.ativo ? "usuario.desativar" : "usuario.ativar",
    recurso: `Usuario:${id}`,
  });
  revalidatePath("/usuarios");
}

async function resetarAction(formData: FormData) {
  "use server";
  const session = await auth();
  const id = String(formData.get("id"));
  const senhaProvisoria = await resetarSenha(id);
  await logAudit({
    usuarioId: session?.user?.id, acao: "usuario.resetar-senha", recurso: `Usuario:${id}`,
  });
  redirect(`/usuarios?resetado=${id}&senha=${encodeURIComponent(senhaProvisoria)}`);
}

async function alterarRolesAction(formData: FormData) {
  "use server";
  const session = await auth();
  const id = String(formData.get("id"));
  const roles = (formData.getAll("roles") as string[]).filter(Boolean) as UsuarioRole[];
  const socioId = String(formData.get("socioId") ?? "") || null;
  if (roles.length === 0) return;
  await prisma.usuario.update({ where: { id }, data: { roles, socioId } });
  await logAudit({
    usuarioId: session?.user?.id, acao: "usuario.atualizar",
    recurso: `Usuario:${id}`, meta: { roles, socioId },
  });
  revalidatePath("/usuarios");
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ criado?: string; resetado?: string; senha?: string; erro?: string }>;
}) {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  // Apenas ADMIN.
  if (!session?.user?.roles?.includes("ADMIN")) notFound();
  void escopo;

  const sp = await searchParams;
  const [usuarios, socios] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: [{ ativo: "desc" }, { criadoEm: "desc" }],
      include: { socio: { select: { nome: true } } },
      take: 200,
    }),
    prisma.socio.findMany({
      where: { ativo: true },
      orderBy: [{ nome: "asc" }],
      take: 200,
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Usuários ({usuarios.length})</h1>
      <p className="text-sm text-neutral-600 mt-1">Gerencie acessos. Senhas geradas são exibidas uma única vez.</p>

      {/* Avisos de senha gerada (visíveis apenas no redirect imediato após criar/resetar) */}
      {sp.erro && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{sp.erro}</div>
      )}
      {(sp.criado || sp.resetado) && sp.senha && (
        <div className="mt-4 rounded border border-mint-400 bg-mint-50 p-4 text-sm">
          <div className="font-medium text-mint-900">
            {sp.criado ? "Usuário criado" : "Senha resetada"} — senha provisória abaixo.
          </div>
          <div className="mt-2 flex items-center gap-3">
            <code className="bg-white border border-mint-400 rounded px-3 py-1.5 font-mono text-base text-navy-900 tabular-nums">
              {sp.senha}
            </code>
            <span className="text-xs text-neutral-600">
              Comunique ao usuário por canal seguro. Será trocada no 1º login.
            </span>
          </div>
          <div className="mt-2 text-xs">
            <Link href="/usuarios" className="text-peri-700 hover:underline">ocultar</Link>
          </div>
        </div>
      )}

      {/* Form criar */}
      <form action={criarAction} className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 space-y-3">
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Novo usuário</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            name="email" type="email" required placeholder="email@dominio.com"
            className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-peri-400 focus:outline-none focus:ring-1 focus:ring-peri-400"
          />
          <input
            name="nome" placeholder="Nome (opcional)"
            className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-peri-400 focus:outline-none focus:ring-1 focus:ring-peri-400"
          />
          <select
            name="socioId" defaultValue=""
            className="rounded border border-neutral-300 px-3 py-2 text-sm focus:border-peri-400 focus:outline-none focus:ring-1 focus:ring-peri-400"
            title="Vincular a um sócio (obrigatório para role SOCIO)"
          >
            <option value="">— sem vínculo de sócio —</option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {ROLES.map((r) => (
            <label key={r} className="inline-flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="roles" value={r} className="accent-peri-600" />
              <span>{ROLE_LABEL[r]}</span>
            </label>
          ))}
          <button className="ml-auto rounded bg-navy-900 hover:bg-navy-700 text-white px-4 py-2 text-sm font-medium transition">
            Criar (gera senha provisória)
          </button>
        </div>
      </form>

      {/* Lista */}
      <div className="mt-8 rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600 text-left text-xs">
            <tr>
              <th className="px-4 py-2 font-medium">Email / Nome</th>
              <th className="px-3 py-2 font-medium">Roles + Sócio vinculado</th>
              <th className="px-3 py-2 font-medium">Último login</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-peri-50">
                <td className="px-4 py-2">
                  <div className="font-medium text-navy-900">{u.email}</div>
                  {u.nome && <div className="text-xs text-neutral-500">{u.nome}</div>}
                </td>
                <td className="px-3 py-2" colSpan={2}>
                  <form action={alterarRolesAction} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="id" value={u.id} />
                    {ROLES.map((r) => (
                      <label key={r} className="inline-flex items-center gap-1 text-xs">
                        <input
                          type="checkbox" name="roles" value={r}
                          defaultChecked={u.roles.includes(r)}
                          className="accent-peri-600"
                        />
                        <span>{r}</span>
                      </label>
                    ))}
                    <select
                      name="socioId" defaultValue={u.socioId ?? ""}
                      className="rounded border border-neutral-300 px-2 py-1 text-xs"
                      title="vínculo com sócio"
                    >
                      <option value="">— sem sócio —</option>
                      {socios.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                    <button className="text-xs text-peri-700 hover:text-peri-500 font-medium">aplicar</button>
                    <span className="text-xs text-neutral-400">
                      {u.ultimoLogin ? `entrou ${dataHora(u.ultimoLogin)}` : "nunca entrou"}
                    </span>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                    !u.ativo ? "bg-neutral-200 text-neutral-500"
                    : u.senhaProvisoria ? "bg-amber-100 text-amber-900 ring-1 ring-amber-400 ring-inset"
                    : "bg-mint-100 text-mint-900 ring-1 ring-mint-400 ring-inset"
                  }`}>
                    {!u.ativo ? "INATIVO" : u.senhaProvisoria ? "SENHA PROVISÓRIA" : "ATIVO"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5 justify-end">
                    <form action={resetarAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        className="text-xs text-peri-700 hover:text-peri-500 font-medium"
                        title="Gera nova senha provisória"
                      >
                        ↺ resetar senha
                      </button>
                    </form>
                    <span className="text-neutral-300">·</span>
                    <form action={alternarAtivoAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        className={`text-xs font-medium ${u.ativo ? "text-red-700 hover:text-red-500" : "text-mint-700 hover:text-mint-500"}`}
                      >
                        {u.ativo ? "desativar" : "reativar"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
