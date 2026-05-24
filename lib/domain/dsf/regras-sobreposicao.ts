// Validador de não-sobreposição (Mapa Econômico §3, Política DSF v1).
//
// Regra sistêmica: cada fato gerador econômico deve ter um mecanismo principal.
// Acumulações são exceção, registradas como alerta para revisão da governança.
//
// Combinações classificadas (tabela do Anexo C do Relatório Etapa 1):
//   - permitido: ok, sem alerta
//   - permitido-com-controle: emite alerta INFO
//   - controlado: emite alerta WARNING (exige base limpa documentada)
//   - excepcional: emite alerta WARNING (exige aprovação formal)
//   - nao-aplicavel: emite alerta ERROR (combinação proibida)

import type { Publico, PacoteRemuneracao } from "./tipos";

type Severidade = "INFO" | "WARNING" | "ERROR";

export interface AlertaSobreposicao {
  severidade: Severidade;
  codigo: string;
  mensagem: string;
}

export function validarSobreposicao(
  publico: Publico,
  p: PacoteRemuneracao,
): AlertaSobreposicao[] {
  const alertas: AlertaSobreposicao[] = [];
  const tem = (v: number) => v > 0;

  // Bloco A só para Sócios de Capital
  const ehCapital =
    publico === "SOCIO_CAPITAL" ||
    publico === "SOCIO_CAPITAL_GESTOR" ||
    publico === "SOCIO_CAPITAL_LIDER_UNIDADE";
  if (tem(p.blocoA) && !ehCapital) {
    alertas.push({
      severidade: "ERROR",
      codigo: "BLOCO_A_NON_EQUITY",
      mensagem: `Bloco A não aplicável a ${publico}. Exige status de Sócio de Capital.`,
    });
  }

  // Bloco B + pool de unidade — controlado
  if (tem(p.blocoB) && tem(p.poolUnidade)) {
    alertas.push({
      severidade: "WARNING",
      codigo: "BLOCO_B_POOL_DUPLO",
      mensagem:
        "Bloco B + Pool de Unidade sobre o mesmo resultado local. Garantir base limpa.",
    });
  }

  // Bloco B + créditos (originação/execução/gestão) — controlado
  const temCredito =
    tem(p.creditoOriginacao) || tem(p.creditoExecucao) || tem(p.creditoGestaoCP);
  if (tem(p.blocoB) && temCredito) {
    alertas.push({
      severidade: "WARNING",
      codigo: "BLOCO_B_CREDITO",
      mensagem:
        "Bloco B + créditos (originação/execução/gestão) — verificar exclusão na base do Bloco B.",
    });
  }

  // Remuneração de Gestão + crédito de gestão CP — controlado
  if (tem(p.remuneracaoGestao) && tem(p.creditoGestaoCP)) {
    alertas.push({
      severidade: "WARNING",
      codigo: "GESTAO_DUPLA",
      mensagem:
        "Remuneração de Administração + Crédito de Gestão CP — não confundir gestão institucional com gestão de cliente/projeto.",
    });
  }

  // Remuneração de Administração — categorias que recebem na Política DSF v1.
  // Atualizado pra incluir SOCIO_SERVICOS e SOCIO_CAPITAL_LIDER_UNIDADE (planilha
  // de/para "Dados Sócios para Simulador.xlsx" confirma: tabela salarial E é
  // cadastrada também pra Sócios de Serviço puros — categoria E).
  // FUNDADOR, SOCIO_CAPITAL, LIDER_UNIDADE_NON_EQUITY, LIDER_TECNICO ficam de
  // fora: se receberem rem.gestão, o alerta permanece útil pra revisão.
  const temFuncaoGestao =
    publico === "SOCIO_CAPITAL_GESTOR" ||
    publico === "SOCIO_CAPITAL_LIDER_UNIDADE" ||
    publico === "SOCIO_SERVICOS" ||
    publico === "SOCIO_SERVICOS_ESTRATEGICO" ||
    publico === "LIDER_TECNICO"; // CLT recebe salário por design (engine ATUAL)
  if (tem(p.remuneracaoGestao) && !temFuncaoGestao) {
    alertas.push({
      severidade: "WARNING",
      codigo: "GESTAO_SEM_FUNCAO",
      mensagem: `Remuneração de Administração para ${publico} requer designação formal de função de gestão.`,
    });
  }

  // Bloco C — sempre excepcional
  if (tem(p.blocoC)) {
    alertas.push({
      severidade: "INFO",
      codigo: "BLOCO_C_EXCEPCIONAL",
      mensagem: "Bloco C aplicado — confirmar deliberação estratégica formal.",
    });
  }

  // Pool de unidade para Sócio de Capital sem liderança formal
  if (tem(p.poolUnidade) && publico === "SOCIO_CAPITAL") {
    alertas.push({
      severidade: "ERROR",
      codigo: "POOL_SEM_LIDERANCA",
      mensagem:
        "Pool de Unidade requer designação formal de liderança (SOCIO_CAPITAL_LIDER_UNIDADE ou LIDER_UNIDADE_NON_EQUITY).",
    });
  }

  return alertas;
}

// Helper para uso pelos engines
export function mensagensDeAlerta(alertas: AlertaSobreposicao[]): string[] {
  return alertas.map((a) => `[${a.severidade}] ${a.codigo}: ${a.mensagem}`);
}
