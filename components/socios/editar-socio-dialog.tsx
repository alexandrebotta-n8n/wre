"use client";
// Modal de edição completa de um Sócio.
//
// Substitui os dois forms inline antigos (área + classificação) que tinham
// silent-fail no role-check e causavam o sintoma "salvei e voltou para o
// default". Agora:
//   - Todos os campos editáveis num único form
//   - Server Action `atualizarSocioAction` faz requireRole (throw) + Zod
//   - revalidatePath("/socios", "layout") garante atualização da tabela
//   - UI mostra/esconde "Unidade liderada" reativa à classificação escolhida
import { useState } from "react";
import { Pencil } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { atualizarSocioAction } from "@/app/socios/acoes";

export interface AreaOption {
  id: string;
  nome: string;
}
export interface UnidadeOption {
  id: string;
  codigo: string;
  nome: string;
}
export interface SocioEditavel {
  id: string;
  nome: string;
  cargo: string;
  isFundador: boolean;
  areaPraticaId: string | null;
  publicoDefault: string;
  unidadeLideradaId: string | null;
  nivelCargo: "A" | "B" | "C" | "D" | null;
  faixaSalarial: "INICIAL" | "PLENO" | "EXPERT" | null;
  percentualQuotasDefault: number;
  proLaboreMensal: number | null;
  remuneracaoGestaoMensal: number | null;
  observacoes: string | null;
}

const PUBLICOS: Array<{ id: string; nome: string }> = [
  { id: "SOCIO_CAPITAL", nome: "Sócio de Capital" },
  { id: "SOCIO_CAPITAL_GESTOR", nome: "Sócio de Capital — Gestor" },
  { id: "SOCIO_CAPITAL_LIDER_UNIDADE", nome: "Sócio de Capital — Líder de Unidade" },
  { id: "SOCIO_SERVICOS", nome: "Sócio de Serviços" },
  { id: "SOCIO_SERVICOS_ESTRATEGICO", nome: "Sócio de Serviços Estratégico" },
  { id: "LIDER_UNIDADE_NON_EQUITY", nome: "Líder de Unidade Non-Equity" },
];
const PUBLICOS_LIDER = new Set(["SOCIO_CAPITAL_LIDER_UNIDADE", "LIDER_UNIDADE_NON_EQUITY"]);

const NIVEIS = ["A", "B", "C", "D"] as const;
const FAIXAS = ["INICIAL", "PLENO", "EXPERT"] as const;

export function EditarSocioDialog({
  socio,
  areas,
  unidades,
}: {
  socio: SocioEditavel;
  areas: AreaOption[];
  unidades: UnidadeOption[];
}) {
  const [open, setOpen] = useState(false);
  // Estado local mínimo: só para mostrar/esconder o campo "Unidade liderada"
  // conforme a classificação selecionada. Demais campos ficam uncontrolled
  // (defaultValue). Reset acontece quando o socio prop muda (após revalidate)
  // ou quando o dialog reabre — usamos o padrão "adjusting state during
  // render" (React docs) para evitar setState em useEffect.
  const [publicoSelecionado, setPublicoSelecionado] = useState(socio.publicoDefault);
  const [prevPublicoProp, setPrevPublicoProp] = useState(socio.publicoDefault);
  if (prevPublicoProp !== socio.publicoDefault) {
    setPrevPublicoProp(socio.publicoDefault);
    setPublicoSelecionado(socio.publicoDefault);
  }
  const ehLider = PUBLICOS_LIDER.has(publicoSelecionado);

  async function onSubmit(formData: FormData) {
    await atualizarSocioAction(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Editar ${socio.nome}`}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar sócio</DialogTitle>
          <DialogDescription>
            Alterações na classificação aqui são o <strong>default</strong> — cada cenário ainda pode
            sobrescrever em <em>Simulação → Classificações</em>.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-3.5">
          <input type="hidden" name="id" value={socio.id} />

          <div className="rounded-md bg-neutral-50 border border-neutral-200 p-3 text-xs space-y-0.5">
            <div className="font-medium text-navy-900">{socio.nome}</div>
            <div className="text-neutral-600">
              {socio.cargo}
              {socio.isFundador && (
                <span className="ml-1.5 text-emerald-600 font-medium">· fundador</span>
              )}
            </div>
          </div>

          <Field label="Área de prática" htmlFor="socio-area">
            <NativeSelect
              id="socio-area"
              name="areaPraticaId"
              defaultValue={socio.areaPraticaId ?? ""}
            >
              <option value="">— sem área —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Classificação (Política DSF v1)" htmlFor="socio-publico">
            <NativeSelect
              id="socio-publico"
              name="publicoDefault"
              value={publicoSelecionado}
              onChange={(e) => setPublicoSelecionado(e.target.value)}
            >
              {PUBLICOS.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </NativeSelect>
          </Field>

          {ehLider && (
            <Field label="Unidade liderada" htmlFor="socio-unidade" required>
              <NativeSelect
                id="socio-unidade"
                name="unidadeLideradaId"
                defaultValue={socio.unidadeLideradaId ?? ""}
                required
              >
                <option value="">— escolher unidade —</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>{u.codigo} — {u.nome}</option>
                ))}
              </NativeSelect>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nível de cargo" htmlFor="socio-nivel">
              <NativeSelect
                id="socio-nivel"
                name="nivelCargo"
                defaultValue={socio.nivelCargo ?? ""}
              >
                <option value="">— sem nível —</option>
                {NIVEIS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Faixa salarial" htmlFor="socio-faixa">
              <NativeSelect
                id="socio-faixa"
                name="faixaSalarial"
                defaultValue={socio.faixaSalarial ?? ""}
              >
                <option value="">— sem faixa —</option>
                {FAIXAS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field
            label="Quotas default (%)"
            htmlFor="socio-quotas"
            hint="Participação societária base; usada quando o cenário não sobrescreve."
          >
            <Input
              id="socio-quotas"
              name="percentualQuotasDefault"
              type="number"
              step="0.0001"
              min="0"
              max="100"
              defaultValue={(socio.percentualQuotasDefault * 100).toFixed(4)}
              className="tabular-nums"
            />
          </Field>

          <fieldset className="rounded-md border border-neutral-200 p-3 space-y-3">
            <legend className="px-1.5 text-xs font-medium text-navy-900">
              Remuneração — override individual
            </legend>
            <p className="text-xs text-neutral-500 -mt-1">
              Deixe em branco para usar o default da premissa (Pró-labore) ou da
              tabela salarial (Rem. Gestão).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pró-labore (R$/mês)" htmlFor="socio-prolabore">
                <Input
                  id="socio-prolabore"
                  name="proLaboreMensal"
                  type="number"
                  step="100"
                  min="0"
                  defaultValue={socio.proLaboreMensal ?? ""}
                  placeholder="usa premissa"
                  className="tabular-nums"
                />
              </Field>
              <Field label="Rem. Gestão (R$/mês)" htmlFor="socio-remgestao">
                <Input
                  id="socio-remgestao"
                  name="remuneracaoGestaoMensal"
                  type="number"
                  step="100"
                  min="0"
                  defaultValue={socio.remuneracaoGestaoMensal ?? ""}
                  placeholder="usa tabela"
                  className="tabular-nums"
                />
              </Field>
            </div>
          </fieldset>

          <Field label="Observações" htmlFor="socio-obs">
            <Textarea
              id="socio-obs"
              name="observacoes"
              defaultValue={socio.observacoes ?? ""}
              maxLength={500}
              rows={2}
              placeholder="Opcional"
            />
          </Field>

          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <SubmitButton variant="primary">Salvar alterações</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
