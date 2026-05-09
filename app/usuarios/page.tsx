import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Plus, RotateCcw, Power, PowerOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { dataHora } from "@/lib/format";
import { criarUsuarioComSenha, resetarSenha } from "@/lib/usuario-service";
import { logAudit } from "@/lib/audit";
import { flashError, flashSuccess } from "@/lib/flash";
import { setSenhaGerada } from "@/lib/senha-gerada";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import type { UsuarioRole } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableShell, THead, TBody, TH, TR, TD } from "@/components/ui/data-table";
import { SenhaGeradaDialog } from "@/components/usuarios/senha-gerada-dialog";

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
    await flashError("E-mail e ao menos 1 role são obrigatórios.");
    redirect("/usuarios");
  }
  const ja = await prisma.usuario.findUnique({ where: { email } });
  if (ja) {
    await flashError("E-mail já cadastrado.");
    redirect("/usuarios");
  }
  const { usuario, senhaProvisoriaPlano } = await criarUsuarioComSenha({
    email,
    nome,
    roles,
    socioId,
  });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "usuario.criar",
    recurso: `Usuario:${usuario.id}`,
    meta: { email, roles },
  });
  await setSenhaGerada({ senha: senhaProvisoriaPlano, email, usuarioId: usuario.id });
  await flashSuccess(`Usuário ${email} criado.`);
  redirect("/usuarios");
}

async function alternarAtivoAction(formData: FormData) {
  "use server";
  const session = await auth();
  const id = String(formData.get("id"));
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) return;
  await prisma.usuario.update({ where: { id }, data: { ativo: !u.ativo } });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: u.ativo ? "usuario.desativar" : "usuario.ativar",
    recurso: `Usuario:${id}`,
  });
  await flashSuccess(u.ativo ? "Usuário desativado." : "Usuário reativado.");
  revalidatePath("/usuarios");
}

async function resetarAction(formData: FormData) {
  "use server";
  const session = await auth();
  const id = String(formData.get("id"));
  const senhaProvisoria = await resetarSenha(id);
  const u = await prisma.usuario.findUnique({ where: { id }, select: { email: true } });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "usuario.resetar-senha",
    recurso: `Usuario:${id}`,
  });
  await setSenhaGerada({ senha: senhaProvisoria, email: u?.email, usuarioId: id });
  await flashSuccess("Senha resetada — nova senha provisória gerada.");
  redirect("/usuarios");
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
    usuarioId: session?.user?.id,
    acao: "usuario.atualizar",
    recurso: `Usuario:${id}`,
    meta: { roles, socioId },
  });
  await flashSuccess("Acessos atualizados.");
  revalidatePath("/usuarios");
}

export default async function UsuariosPage() {
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  if (!session?.user?.roles?.includes("ADMIN")) notFound();
  void escopo;

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
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <PageHeader
        title="Usuários"
        description={`${usuarios.length} conta(s) — gerencie acessos e senhas`}
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="primary">
                <Plus className="h-4 w-4" /> Novo usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar usuário</DialogTitle>
                <DialogDescription>
                  Uma senha provisória será gerada e mostrada uma única vez. Comunique ao usuário por canal seguro.
                </DialogDescription>
              </DialogHeader>
              <form action={criarAction} className="space-y-4">
                <Field label="E-mail" htmlFor="u-email" required>
                  <Input id="u-email" name="email" type="email" required placeholder="email@dominio.com" />
                </Field>
                <Field label="Nome" htmlFor="u-nome">
                  <Input id="u-nome" name="nome" placeholder="Opcional" />
                </Field>
                <Field label="Vincular a sócio" htmlFor="u-socio" hint="Obrigatório para o role Sócio">
                  <NativeSelect id="u-socio" name="socioId" defaultValue="">
                    <option value="">— sem vínculo —</option>
                    {socios.map((s) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Roles" required>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {ROLES.map((r) => (
                      <label key={r} className="inline-flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name="roles" value={r} className="accent-peri-600" />
                        <span>{ROLE_LABEL[r]}</span>
                      </label>
                    ))}
                  </div>
                </Field>
                <DialogFooter className="gap-2 pt-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                  </DialogClose>
                  <SubmitButton variant="primary">Criar e gerar senha</SubmitButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="overflow-hidden">
        <TableShell caption="Lista de usuários do simulador">
          <THead>
            <tr>
              <TH className="px-4">Email / Nome</TH>
              <TH>Roles + Sócio vinculado</TH>
              <TH>Último login</TH>
              <TH>Status</TH>
              <TH className="text-right">Ações</TH>
            </tr>
          </THead>
          <TBody>
            {usuarios.map((u) => (
              <TR key={u.id}>
                <TD className="px-4 py-2.5">
                  <div className="font-medium text-navy-900">{u.email}</div>
                  {u.nome && <div className="text-xs text-neutral-500 mt-0.5">{u.nome}</div>}
                </TD>
                <TD>
                  <form action={alterarRolesAction} className="flex flex-wrap items-center gap-2.5">
                    <input type="hidden" name="id" value={u.id} />
                    {ROLES.map((r) => (
                      <label key={r} className="inline-flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          name="roles"
                          value={r}
                          defaultChecked={u.roles.includes(r)}
                          className="accent-peri-600"
                        />
                        <span>{r}</span>
                      </label>
                    ))}
                    <NativeSelect
                      name="socioId"
                      defaultValue={u.socioId ?? ""}
                      className="h-7 w-auto min-w-[140px] text-xs"
                      aria-label="vínculo com sócio"
                    >
                      <option value="">— sem sócio —</option>
                      {socios.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </NativeSelect>
                    <SubmitButton size="sm" variant="subtle">Aplicar</SubmitButton>
                  </form>
                </TD>
                <TD className="text-xs text-neutral-500">
                  {u.ultimoLogin ? dataHora(u.ultimoLogin) : "nunca"}
                </TD>
                <TD>
                  {!u.ativo ? (
                    <Badge variant="outline" size="sm">inativo</Badge>
                  ) : u.senhaProvisoria ? (
                    <Badge variant="warning" size="sm">senha provisória</Badge>
                  ) : (
                    <Badge variant="success" size="sm">ativo</Badge>
                  )}
                </TD>
                <TD className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm" title="Gera nova senha provisória">
                          <RotateCcw className="h-3.5 w-3.5" /> Resetar
                        </Button>
                      }
                      title="Resetar senha?"
                      description={`Uma nova senha provisória será gerada para ${u.email}. A atual deixará de funcionar.`}
                      action={resetarAction}
                      hiddenFields={{ id: u.id }}
                      confirmLabel="Resetar senha"
                      variant="destructive"
                    />
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm">
                          {u.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                          {u.ativo ? "Desativar" : "Reativar"}
                        </Button>
                      }
                      title={u.ativo ? "Desativar usuário?" : "Reativar usuário?"}
                      description={
                        u.ativo
                          ? `${u.email} não conseguirá mais entrar no sistema.`
                          : `${u.email} voltará a ter acesso normal.`
                      }
                      action={alternarAtivoAction}
                      hiddenFields={{ id: u.id }}
                      confirmLabel={u.ativo ? "Desativar" : "Reativar"}
                      variant={u.ativo ? "destructive" : "primary"}
                    />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </TableShell>
      </Card>

      {/* Lê o cookie one-shot e abre Dialog se houver senha gerada nesta sessão. */}
      <SenhaGeradaDialog />
    </main>
  );
}
