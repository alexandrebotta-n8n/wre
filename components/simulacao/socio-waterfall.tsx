"use client";
// Painel expansível embaixo da linha do sócio na tabela comparativa.
// Mostra a composição do pacote (trace[] do engine) lado a lado para A e B,
// com barra horizontal proporcional a cada etapa relativa ao total.
//
// Cada etapa tem um ícone "?" com tooltip rico explicando o que aquela
// linha de remuneração representa (vê `EXPLICACOES_ETAPAS`).
import * as React from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, HelpCircle } from "lucide-react";
import { brl } from "@/lib/format";
import { Tooltip } from "@/components/ui/tooltip";
import type { TraceItem } from "./types";

// Dicionário de explicações por etapa. A chave é o prefixo antes do ponto
// (ex: "1.pro-labore" → key "pro-labore"); número indica ordem de apuração.
// Mantém o texto curto e didático — vira tooltip.
const EXPLICACOES_ETAPAS: Record<string, { titulo: string; corpo: React.ReactNode }> = {
  "pro-labore": {
    titulo: "Pró-labore",
    corpo: (
      <>
        Valor mensal fixo (igual ao salário CLT do sócio), pago todo mês.
        Cadastrado em <strong>Premissa.proLaboreMensal</strong> (global) ou no próprio
        sócio (<strong>Socio.proLaboreMensal</strong>, override individual).
        Aplica-se a todas as categorias de sócio elegíveis (exceto Líder Non-Equity).
      </>
    ),
  },
  gestao: {
    titulo: "Remuneração de Gestão",
    corpo: (
      <>
        Pagamento mensal por exercer cargo de gestão (CEO, Diretor, Gestor de
        área). Valor vem da <strong>tabela salarial por nível × faixa</strong>
        (ex: A/INICIAL = R$ 9.600/mês). Override individual via
        <strong> Socio.remuneracaoGestaoMensal</strong>.
      </>
    ),
  },
  admin: {
    titulo: "Remuneração de Administração (Modelo NOVO)",
    corpo: (
      <>
        Equivalente à <strong>Remuneração de Gestão</strong> no Modelo NOVO.
        Pago a Capital Gestor (Default), Sócio de Serviços (Default), Capital
        Líder de Unidade (Condicionado) e Serviços Estratégico (Condicionado),
        quando cadastrados com nível+faixa. É deduzido do LL antes do RDA.
      </>
    ),
  },
  fundador: {
    titulo: "Funding Fundador",
    corpo: (
      <>
        Valor anual <strong>discricionário</strong> definido individualmente
        no cadastro do fundador (<code>/socios</code> →
        <strong> Funding fundador anual</strong>). Cada fundador recebe o
        valor próprio (sem rateio por quotas). É deduzido do LL antes de
        formar a base de distribuição (DSF residual ou RDA central).
      </>
    ),
  },
  "comissao-orig": {
    titulo: "Comissão de Originação (Modelo NOVO)",
    corpo: (
      <>
        % aplicado sobre o valor que o sócio <strong>originou</strong> no ano
        (cadastrado em <code>/socios</code> →
        <strong> Originação anual padrão</strong>). Taxa configurada em
        <strong> Premissa.taxaComissaoOriginacao</strong>. Incentivo direto a
        quem traz negócio.
      </>
    ),
  },
  distribuicao: {
    titulo: "Distribuição de Lucros (Modelo ATUAL)",
    corpo: (
      <>
        Parcela do <strong>funding residual</strong> (LL DSF − funding
        fundadores) rateada entre sócios não-fundadores proporcional ao
        <strong> % de quotas</strong>. Depois ainda é multiplicado por
        (1 − reserva), tipicamente 0,95 (5% vai pra reserva/prêmio).
      </>
    ),
  },
  "pool-unidade": {
    titulo: "Pool da Unidade (Modelo NOVO)",
    corpo: (
      <>
        Cada unidade não-matriz tem o LL fatiado em 50/30/20:
        <br />• 50% volta à matriz (entra no RDA central);
        <br />• <strong>30% vai pro Líder da Unidade</strong> (esta linha);
        <br />• 20% retido localmente (equipe/reserva).
      </>
    ),
  },
  premio: {
    titulo: "Prêmio de Performance (Modelo ATUAL)",
    corpo: (
      <>
        A <strong>reserva</strong> (5% do funding residual) é distribuída
        <strong> uniformemente</strong> entre sócios elegíveis ao prêmio
        (default: Sócio Capital + Capital Gestor). Cada um recebe o mesmo
        valor — independente de quotas.
      </>
    ),
  },
  "bloco-A": {
    titulo: "Bloco A — Quotas (Modelo NOVO)",
    corpo: (
      <>
        <strong>45% do RDA</strong> (Resultado Disponível para Apuração)
        distribuído proporcional ao % de quotas entre <strong>Sócios de
        Capital não-fundadores</strong>. Recompensa quem investiu no
        capital social da firma.
      </>
    ),
  },
  "bloco-B": {
    titulo: "Bloco B — Mérito (Modelo NOVO)",
    corpo: (
      <>
        <strong>35% do RDA</strong> distribuído por mérito entre 5 categorias
        (todas exceto Líder Non-Equity). Modo configurável:
        <br />• <strong>UNIFORME</strong>: igual pra todos;
        <br />• <strong>PESO_INDIVIDUAL</strong>: peso editável por sócio;
        <br />• <strong>ORIGINACAO</strong>: proporcional ao originado;
        <br />• <strong>POR_AREA</strong>: pesos por área de prática (orgânico + incremental).
      </>
    ),
  },
};

function explicacaoPara(etapa: string): { titulo: string; corpo: React.ReactNode } | null {
  // "8.bloco-A" → "bloco-A"
  const m = /^\d+\.(.+)$/.exec(etapa);
  const key = m ? m[1] : etapa;
  return EXPLICACOES_ETAPAS[key] ?? null;
}

export function SocioWaterfall({
  nome,
  nomeA,
  nomeB,
  totalA,
  totalB,
  traceA,
  traceB,
  alertasA,
  alertasB,
}: {
  nome: string;
  nomeA?: string;
  nomeB?: string;
  totalA: number | null;
  totalB: number | null;
  traceA: TraceItem[];
  traceB: TraceItem[];
  alertasA: string[];
  alertasB: string[];
}) {
  const temA = traceA.length > 0;
  const temB = traceB.length > 0;
  const cols = temA && temB ? "md:grid-cols-2" : "md:grid-cols-1";

  return (
    <div className="bg-neutral-50/70 border-t border-neutral-200 px-6 py-5">
      <div className={`grid grid-cols-1 ${cols} gap-6`}>
        {temA && (
          <Coluna
            rotulo={`Cenário A${nomeA ? ` · ${nomeA}` : ""}`}
            total={totalA ?? 0}
            trace={traceA}
            alertas={alertasA}
          />
        )}
        {temB && (
          <Coluna
            rotulo={`Cenário B${nomeB ? ` · ${nomeB}` : ""}`}
            total={totalB ?? 0}
            trace={traceB}
            alertas={alertasB}
          />
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-neutral-200/70 text-[11px] text-neutral-500 flex items-center justify-between flex-wrap gap-2">
        <span>
          Composição do pacote de <strong className="text-neutral-700">{nome}</strong>. Etapas vêm da
          ordem de apuração do engine; barras são proporcionais ao total da coluna. Passe o mouse
          no <HelpCircle className="inline h-3 w-3 -mt-0.5" /> de cada linha para entender o que ela representa.
        </span>
        <Link
          href="/como-funciona"
          className="inline-flex items-center gap-1 text-peri-700 hover:underline font-medium"
        >
          Como cheguei aqui? <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function Coluna({
  rotulo,
  total,
  trace,
  alertas,
}: {
  rotulo: string;
  total: number;
  trace: TraceItem[];
  alertas: string[];
}) {
  // Filtra etapas com valor; etapas sem valor (como "9.ajustes" descritivos) ficam ao final
  const comValor = trace.filter((t) => t.valor !== undefined && t.valor !== 0);
  const semValor = trace.filter((t) => t.valor === undefined || t.valor === 0);
  const maxAbs = Math.max(...comValor.map((t) => Math.abs(t.valor!)), 1);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-900">{rotulo}</h4>
        <span className="text-sm font-semibold text-navy-900 tabular-nums">{brl(total, true)}</span>
      </div>
      <ol className="space-y-1.5">
        {comValor.map((t, i) => {
          const pct = (Math.abs(t.valor!) / maxAbs) * 100;
          const negativo = t.valor! < 0;
          const exp = explicacaoPara(t.etapa);
          return (
            <li key={i} className="text-xs">
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className="flex items-baseline gap-1.5 min-w-0">
                  <code className="text-[10px] font-mono text-peri-700 font-medium tabular-nums">
                    {t.etapa}
                  </code>
                  <span className="text-neutral-700 truncate">{t.descricao}</span>
                  {exp && (
                    <Tooltip
                      side="top"
                      content={
                        <div className="space-y-1">
                          <div className="font-semibold">{exp.titulo}</div>
                          <div className="text-white/90 font-normal">{exp.corpo}</div>
                        </div>
                      }
                    >
                      <HelpCircle className="h-3 w-3 text-neutral-400 hover:text-neutral-600 cursor-help flex-shrink-0" />
                    </Tooltip>
                  )}
                </span>
                <span
                  className={
                    "tabular-nums font-medium flex-shrink-0 " +
                    (negativo ? "text-red-700" : "text-navy-900")
                  }
                >
                  {negativo ? "" : "+"}
                  {brl(t.valor!, true)}
                </span>
              </div>
              <div className="h-1.5 rounded bg-neutral-200/60 overflow-hidden">
                <div
                  className={(negativo ? "bg-red-300" : "bg-peri-400") + " h-full"}
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
            </li>
          );
        })}
        {comValor.length === 0 && (
          <li className="text-xs text-neutral-500 italic">— sem etapas com valor registradas —</li>
        )}
      </ol>
      {semValor.length > 0 && (
        <details className="mt-2">
          <summary className="text-[10px] uppercase tracking-wider text-neutral-500 cursor-pointer hover:text-neutral-700">
            +{semValor.length} etapa(s) sem valor
          </summary>
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-neutral-600 pl-3">
            {semValor.map((t, i) => (
              <li key={i}>
                <code className="text-[10px] font-mono text-neutral-500">{t.etapa}</code> {t.descricao}
              </li>
            ))}
          </ul>
        </details>
      )}
      {alertas.length > 0 && (
        <div className="mt-3 space-y-1">
          {alertas.map((a, i) => {
            const sev = a.includes("[ERROR]") ? "ERROR" : a.includes("[WARNING]") ? "WARNING" : "INFO";
            const cor =
              sev === "ERROR"
                ? "bg-red-50 text-red-800 ring-red-200"
                : sev === "WARNING"
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-neutral-100 text-neutral-700 ring-neutral-200";
            return (
              <div
                key={i}
                className={"text-[11px] rounded ring-1 ring-inset px-2 py-1 inline-flex items-start gap-1.5 mr-1 " + cor}
              >
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{a.replace(/^\[[A-Z]+\]\s*/, "")}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
