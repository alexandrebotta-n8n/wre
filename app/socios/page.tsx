import Link from "next/link";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { escopoDe } from "@/lib/auth/escopo";
import type { SessionUser } from "@/lib/auth/guards";
import { nomeOuIniciais } from "@/lib/format";
import { getModoNome } from "@/lib/preferencias";
import { logAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Toolbar, SearchInput } from "@/components/ui/toolbar";
import { NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { TableShell, THead, TBody, TH, TR, TD } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";

async function atualizarAreaAction(formData: FormData) {
  "use server";
  const session = await auth();
  const roles = session?.user?.roles ?? [];
  if (!roles.some((r) => r === "ADMIN" || r === "CONSULTOR")) return;
  const id = String(formData.get("id"));
  const areaPraticaId = String(formData.get("areaPraticaId") ?? "") || null;
  await prisma.socio.update({ where: { id }, data: { areaPraticaId } });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "socio.area.atualizar",
    recurso: `Socio:${id}`,
    meta: { areaPraticaId },
  });
  await flashSuccess("Área atualizada.");
  revalidatePath("/socios");
}

const PUBLICOS_NOVA_POLITICA = [
  { id: "SOCIO_CAPITAL", nome: "Sócio de Capital" },
  { id: "SOCIO_CAPITAL_GESTOR", nome: "Sócio de Capital — Gestor" },
  { id: "SOCIO_CAPITAL_LIDER_UNIDADE", nome: "Sócio de Capital — Líder de Unidade" },
  { id: "SOCIO_SERVICOS", nome: "Sócio de Serviços" },
  { id: "SOCIO_SERVICOS_ESTRATEGICO", nome: "Sócio de Serviços Estratégico" },
  { id: "LIDER_UNIDADE_NON_EQUITY", nome: "Líder de Unidade Non-Equity" },
] as const;
const PUBLICOS_LIDER = new Set(["SOCIO_CAPITAL_LIDER_UNIDADE", "LIDER_UNIDADE_NON_EQUITY"]);

async function atualizarClassificacaoNovaAction(formData: FormData) {
  "use server";
  const session = await auth();
  const roles = session?.user?.roles ?? [];
  if (!roles.some((r) => r === "ADMIN" || r === "CONSULTOR")) return;
  const id = String(formData.get("id"));
  const publicoDefault = String(formData.get("publicoDefault") ?? "");
  const unidadeLideradaIdRaw = String(formData.get("unidadeLideradaId") ?? "") || null;
  if (!PUBLICOS_NOVA_POLITICA.some((p) => p.id === publicoDefault)) {
    await flashSuccess("Classificação inválida.");
    return;
  }
  // Só persiste unidade liderada se a categoria for de líder.
  const unidadeLideradaId = PUBLICOS_LIDER.has(publicoDefault) ? unidadeLideradaIdRaw : null;
  await prisma.socio.update({
    where: { id },
    data: {
      publicoDefault: publicoDefault as never,
      unidadeLideradaId,
    },
  });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "socio.classificacao.atualizar",
    recurso: `Socio:${id}`,
    meta: { publicoDefault, unidadeLideradaId },
  });
  await flashSuccess("Classificação atualizada.");
  revalidatePath("/socios");
}

async function atualizarRemuneracaoIndividualAction(formData: FormData) {
  "use server";
  const session = await auth();
  const roles = session?.user?.roles ?? [];
  if (!roles.some((r) => r === "ADMIN" || r === "CONSULTOR")) return;
  const id = String(formData.get("id"));
  const parseOpt = (v: FormDataEntryValue | null): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    if (!isFinite(n) || n < 0) return null;
    return n;
  };
  const proLaboreMensal = parseOpt(formData.get("proLaboreMensal"));
  const remuneracaoGestaoMensal = parseOpt(formData.get("remuneracaoGestaoMensal"));
  await prisma.socio.update({
    where: { id },
    data: { proLaboreMensal, remuneracaoGestaoMensal },
  });
  await logAudit({
    usuarioId: session?.user?.id,
    acao: "socio.remuneracao.atualizar",
    recurso: `Socio:${id}`,
    meta: { proLaboreMensal, remuneracaoGestaoMensal },
  });
  await flashSuccess("Remuneração individual atualizada.");
  revalidatePath("/socios");
  revalidatePath("/simulacao");
}

export default async function SociosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string; tipo?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const escopo = escopoDe(session?.user as SessionUser | undefined);
  const modoNome = await getModoNome();

  const where: Record<string, unknown> = { ativo: true };
  if (escopo.ehSocioRestrito) where.id = escopo.socioIdEscopo ?? "__nada__";
  if (sp.q) where.nome = { contains: sp.q, mode: "insensitive" };
  if (sp.area === "sem") where.areaPraticaId = null;
  else if (sp.area && sp.area !== "todas") where.areaPraticaId = sp.area;
  if (sp.tipo === "fundadores") where.isFundador = true;
  if (sp.tipo === "nao-fundadores") where.isFundador = false;

  const [socios, areas, unidades] = await Promise.all([
    prisma.socio.findMany({
      where,
      include: { areaPratica: true, unidadeLiderada: { select: { id: true, codigo: true, nome: true } } },
      orderBy: [
        { isFundador: "desc" },
        { percentualQuotasDefault: "desc" },
        { nome: "asc" },
      ],
      take: 200,
    }),
    escopo.podeMutar
      ? prisma.areaPratica.findMany({ where: { ativa: true }, orderBy: [{ ordem: "asc" }], take: 50 })
      : Promise.resolve([]),
    escopo.podeMutar
      ? prisma.unidade.findMany({
          where: { ativa: true, isMatriz: false },
          orderBy: [{ codigo: "asc" }],
          take: 50,
          select: { id: true, codigo: true, nome: true },
        })
      : Promise.resolve([]),
  ]);

  const semFiltros = !sp.q && !sp.area && !sp.tipo;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <PageHeader
        title="Sócios e Líderes"
        description={`${socios.length} pessoa(s) listada(s) — base do simulador`}
      />

      <Card className="overflow-hidden">
        {escopo.podeMutar && (
          <Toolbar>
            <form method="get" className="flex flex-wrap items-center gap-2 flex-1">
              <SearchInput name="q" defaultValue={sp.q ?? ""} placeholder="Buscar por nome…" />
              <NativeSelect
                name="area"
                defaultValue={sp.area ?? ""}
                className="h-9 w-auto min-w-[180px]"
                aria-label="Filtrar por área"
              >
                <option value="">Todas as áreas</option>
                <option value="sem">— sem área —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                name="tipo"
                defaultValue={sp.tipo ?? ""}
                className="h-9 w-auto min-w-[150px]"
                aria-label="Filtrar por tipo"
              >
                <option value="">Todos</option>
                <option value="fundadores">Só fundadores</option>
                <option value="nao-fundadores">Sem fundadores</option>
              </NativeSelect>
              <Button type="submit" variant="secondary" size="sm">
                Filtrar
              </Button>
              {!semFiltros && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/socios">Limpar</Link>
                </Button>
              )}
            </form>
          </Toolbar>
        )}

        {socios.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="Nenhum sócio encontrado"
              description="Ajuste a busca ou os filtros para ver mais resultados."
            />
          </div>
        ) : (
          <TableShell caption="Lista de sócios e líderes ativos">
            <THead>
              <tr>
                <TH className="px-4">Sócio</TH>
                <TH>Cargo</TH>
                <TH className="text-right">Quotas (default)</TH>
                <TH>Nível · Faixa</TH>
                <TH>Área de prática</TH>
                <TH>Classificação (Política DSF v1)</TH>
                <TH>Remuneração (override individual)</TH>
                <TH>Tipo</TH>
              </tr>
            </THead>
            <TBody>
              {socios.map((s) => (
                <TR key={s.id}>
                  <TD className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar nome={s.nome} seed={s.id} size="sm" />
                      <div className="min-w-0">
                        <div
                          className="font-medium text-navy-900 truncate"
                          title={modoNome === "iniciais" ? s.nome : undefined}
                        >
                          {nomeOuIniciais(s.nome, modoNome)}
                        </div>
                      </div>
                    </div>
                  </TD>
                  <TD className="text-neutral-600">{s.cargo}</TD>
                  <TD className="text-right tabular-nums text-neutral-700">
                    {s.percentualQuotasDefault > 0
                      ? (s.percentualQuotasDefault * 100).toFixed(4) + "%"
                      : "—"}
                  </TD>
                  <TD className="text-neutral-600 text-xs">
                    {s.nivelCargo ?? "—"} · {s.faixaSalarial ?? "—"}
                  </TD>
                  <TD>
                    {escopo.podeMutar ? (
                      <form action={atualizarAreaAction} className="inline-flex items-center gap-1.5">
                        <input type="hidden" name="id" value={s.id} />
                        <NativeSelect
                          name="areaPraticaId"
                          defaultValue={s.areaPraticaId ?? ""}
                          className="h-8 text-xs w-auto min-w-[150px]"
                          aria-label={`Área de ${s.nome}`}
                        >
                          <option value="">— sem área —</option>
                          {areas.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nome}
                            </option>
                          ))}
                        </NativeSelect>
                        <SubmitButton size="sm" variant="subtle">
                          Salvar
                        </SubmitButton>
                      </form>
                    ) : s.areaPratica ? (
                      <Badge variant="info" size="sm">
                        {s.areaPratica.nome}
                      </Badge>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </TD>
                  <TD>
                    {escopo.podeMutar ? (
                      <form action={atualizarClassificacaoNovaAction} className="inline-flex items-center gap-1.5 flex-wrap">
                        <input type="hidden" name="id" value={s.id} />
                        <NativeSelect
                          name="publicoDefault"
                          defaultValue={s.publicoDefault}
                          className="h-8 text-xs w-auto min-w-[200px]"
                          aria-label={`Classificação de ${s.nome}`}
                        >
                          {PUBLICOS_NOVA_POLITICA.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </NativeSelect>
                        {PUBLICOS_LIDER.has(s.publicoDefault) && (
                          <NativeSelect
                            name="unidadeLideradaId"
                            defaultValue={s.unidadeLideradaId ?? ""}
                            className="h-8 text-xs w-auto min-w-[110px]"
                            aria-label={`Unidade liderada por ${s.nome}`}
                          >
                            <option value="">— escolher unidade —</option>
                            {unidades.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.codigo} — {u.nome}
                              </option>
                            ))}
                          </NativeSelect>
                        )}
                        <SubmitButton size="sm" variant="subtle">
                          Salvar
                        </SubmitButton>
                      </form>
                    ) : (
                      <div className="text-xs">
                        <Badge variant="info" size="sm">
                          {PUBLICOS_NOVA_POLITICA.find((p) => p.id === s.publicoDefault)?.nome ?? s.publicoDefault}
                        </Badge>
                        {s.unidadeLiderada && (
                          <span className="ml-1.5 text-neutral-500">
                            · {s.unidadeLiderada.codigo}
                          </span>
                        )}
                      </div>
                    )}
                  </TD>
                  <TD>
                    {escopo.podeMutar ? (
                      <form
                        action={atualizarRemuneracaoIndividualAction}
                        className="flex items-center gap-1.5 flex-wrap min-w-[280px]"
                      >
                        <input type="hidden" name="id" value={s.id} />
                        <div className="flex flex-col text-[10px] text-neutral-500">
                          <label className="leading-none mb-0.5">Pró-labore/mês</label>
                          <input
                            type="number"
                            name="proLaboreMensal"
                            defaultValue={s.proLaboreMensal ?? ""}
                            placeholder="(usa premissa)"
                            step={500}
                            min={0}
                            className="h-8 w-24 px-1.5 text-xs text-right tabular-nums border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-peri-400"
                            aria-label={`Pró-labore mensal de ${s.nome}`}
                          />
                        </div>
                        <div className="flex flex-col text-[10px] text-neutral-500">
                          <label className="leading-none mb-0.5">Gestão/mês</label>
                          <input
                            type="number"
                            name="remuneracaoGestaoMensal"
                            defaultValue={s.remuneracaoGestaoMensal ?? ""}
                            placeholder="(usa tabela)"
                            step={500}
                            min={0}
                            className="h-8 w-24 px-1.5 text-xs text-right tabular-nums border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-peri-400"
                            aria-label={`Remuneração de gestão mensal de ${s.nome}`}
                          />
                        </div>
                        <SubmitButton size="sm" variant="subtle">
                          Salvar
                        </SubmitButton>
                      </form>
                    ) : (
                      <div className="text-xs text-neutral-600 tabular-nums">
                        {s.proLaboreMensal != null ? (
                          <div>Pró: R$ {s.proLaboreMensal.toLocaleString("pt-BR")}/mês</div>
                        ) : (
                          <div className="text-neutral-400">Pró: usa premissa</div>
                        )}
                        {s.remuneracaoGestaoMensal != null ? (
                          <div>Gestão: R$ {s.remuneracaoGestaoMensal.toLocaleString("pt-BR")}/mês</div>
                        ) : (
                          <div className="text-neutral-400">Gestão: usa tabela</div>
                        )}
                      </div>
                    )}
                  </TD>
                  <TD>
                    {s.isFundador ? (
                      <Badge variant="success" size="sm">
                        fundador
                      </Badge>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </TableShell>
        )}
      </Card>
    </main>
  );
}
