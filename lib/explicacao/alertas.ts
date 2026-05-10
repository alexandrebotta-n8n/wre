// Tradução PT-BR dos códigos de alerta emitidos pelo engine DSF.
// Fonte canônica: lib/domain/dsf/regras-sobreposicao.ts (campo `codigo`).
//
// Cada entrada explica em linguagem comum o problema detectado e sugere
// uma ação concreta. Códigos sem entrada caem num fallback genérico.

export type SeveridadeAlerta = "ERROR" | "WARNING" | "INFO";

export interface AlertaTraduzido {
  codigo: string;
  titulo: string;
  descricao: string;
  solucao: string;
  severidade: SeveridadeAlerta;
}

const TRADUCOES: Record<string, Omit<AlertaTraduzido, "codigo">> = {
  BLOCO_A_NON_EQUITY: {
    titulo: "Bloco A para sócio não-capital",
    descricao:
      "O Bloco A (institucional) é exclusivo para Sócios de Capital — quem detém quotas. Foi atribuído a alguém sem esse status.",
    solucao:
      "Reclassifique o sócio (Drawer Classificações) como Sócio de Capital, ou retire a participação no Bloco A.",
    severidade: "ERROR",
  },
  POOL_SEM_LIDERANCA: {
    titulo: "Pool de Unidade sem liderança formal",
    descricao:
      "O Pool de Unidade (divisão LL local) requer um líder designado. Foi aplicado a Sócio de Capital sem função de liderança.",
    solucao:
      "Designe o sócio como Líder de Unidade (público SOCIO_CAPITAL_LIDER_UNIDADE ou LIDER_UNIDADE_NON_EQUITY) ou tire o Pool deste sócio.",
    severidade: "ERROR",
  },
  BLOCO_B_POOL_DUPLO: {
    titulo: "Bloco B + Pool de Unidade",
    descricao:
      "Ambos foram aplicados sobre o mesmo resultado local. Risco de remunerar a mesma performance duas vezes.",
    solucao:
      "Confirme com a governança que a base do Bloco B exclui o resultado já distribuído pelo Pool. Documente a justificativa.",
    severidade: "WARNING",
  },
  BLOCO_B_CREDITO: {
    titulo: "Bloco B + créditos O/E/G",
    descricao:
      "Bloco B aplicado junto com créditos de Originação / Execução / Gestão. Pode haver dupla contagem.",
    solucao:
      "Verifique se a base do Bloco B já está líquida dos serviços que geraram crédito O/E/G. Ajuste a regra de cálculo se necessário.",
    severidade: "WARNING",
  },
  GESTAO_DUPLA: {
    titulo: "Gestão institucional + Gestão de cliente",
    descricao:
      "O sócio recebeu Remuneração de Administração e Crédito de Gestão CP. São coisas diferentes — gestão da firma vs. gestão do cliente — mas precisa estar separado.",
    solucao:
      "Confirme que cada parcela cobre escopo distinto. Se for o mesmo trabalho, escolha um dos dois.",
    severidade: "WARNING",
  },
  GESTAO_SEM_FUNCAO: {
    titulo: "Remuneração de Administração sem função formal",
    descricao:
      "O sócio recebeu Remuneração de Administração mas não tem público com função de gestão (Gestor ou Estratégico).",
    solucao:
      "Reclassifique o sócio para SOCIO_CAPITAL_GESTOR ou SOCIO_SERVICOS_ESTRATEGICO, ou remova a parcela.",
    severidade: "WARNING",
  },
  BLOCO_C_EXCEPCIONAL: {
    titulo: "Bloco C — uso excepcional",
    descricao:
      "O Bloco C (estratégico) foi aplicado. É um instrumento de exceção que requer deliberação formal dos sócios.",
    solucao:
      "Garanta que existe ata/deliberação formal autorizando o Bloco C neste cenário. Não bloqueia publicação.",
    severidade: "INFO",
  },
};

/**
 * Faz parse da string formato `[SEVERIDADE] CODIGO: mensagem` emitida pelo
 * engine e devolve o alerta traduzido. Strings em formato inesperado caem
 * num fallback genérico.
 */
export function parseAlerta(raw: string): AlertaTraduzido {
  const m = /^\[(ERROR|WARNING|INFO)\]\s*([A-Z_]+):\s*(.*)$/.exec(raw);
  if (!m) {
    return {
      codigo: "DESCONHECIDO",
      titulo: "Alerta do engine",
      descricao: raw,
      solucao: "Revise os parâmetros e classificações; se persistir, reporte ao suporte.",
      severidade: "WARNING",
    };
  }
  const severidade = m[1] as SeveridadeAlerta;
  const codigo = m[2];
  const mensagem = m[3];
  const t = TRADUCOES[codigo];
  if (t) return { codigo, ...t };
  return {
    codigo,
    titulo: codigo,
    descricao: mensagem,
    solucao: "Sem tradução cadastrada para este código. Veja a mensagem original e reporte ao suporte.",
    severidade,
  };
}

export function severidadePeso(s: SeveridadeAlerta): number {
  return s === "ERROR" ? 0 : s === "WARNING" ? 1 : 2;
}
