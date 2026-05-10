// Conteúdo canônico da ajuda da página /simulacao.
// Cada seção é um componente — fácil de evoluir sem mexer no Drawer.
// Cross-linka para /como-funciona quando o tema é mais profundo.
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type SecaoAjudaId =
  | "visao-geral"
  | "fluxo"
  | "cenarios"
  | "parametros"
  | "anual"
  | "publicar"
  | "reabrir"
  | "alertas"
  | "classificar"
  | "glossario";

export interface SecaoAjuda {
  id: SecaoAjudaId;
  titulo: string;
  componente: () => React.ReactNode;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-700 leading-relaxed">{children}</p>;
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-navy-900">{children}</strong>;
}

function Lista({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="text-sm text-neutral-700 leading-relaxed space-y-1.5 pl-5 list-disc marker:text-peri-500">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function LinkExterno({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-peri-700 hover:text-peri-900 hover:underline font-medium"
    >
      {children}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

const Conteudo: Record<SecaoAjudaId, () => React.ReactNode> = {
  "visao-geral": () => (
    <div className="space-y-3">
      <P>
        A <Strong>Simulação</Strong> é onde você compara cenários de remuneração lado a lado: a
        <Strong> coluna A</Strong> normalmente carrega o sistema vigente (modelo <em>Atual</em>) e a
        <Strong> coluna B</Strong> a proposta nova (modelo <em>Novo</em>). As duas colunas, porém, aceitam
        qualquer modelo — você pode comparar Atual×Atual ou Novo×Novo se quiser.
      </P>
      <P>
        Cada cenário é do <Strong>ano inteiro</Strong>. A página mostra o total <Strong>anual</Strong> e,
        ao expandir um sócio, abre o detalhamento por trimestre.
      </P>
    </div>
  ),

  fluxo: () => (
    <div className="space-y-3">
      <P>
        O fluxo da simulação tem 4 etapas, refletidas no stepper de cada coluna:
      </P>
      <Lista
        items={[
          <>
            <Strong>Classificar</Strong> — define cada sócio (público SC/SServiço/Líder, % de quotas, peso no Bloco B,
            originação esperada). Base do cálculo.
          </>,
          <>
            <Strong>Calcular</Strong> — roda o engine DSF nos 4 trimestres do ano com os parâmetros atuais.
            Gera o pacote por sócio.
          </>,
          <>
            <Strong>Revisar</Strong> — confere alertas e valores. Erros bloqueiam Publicar; warnings só avisam.
          </>,
          <>
            <Strong>Publicar</Strong> — congela o cenário como snapshot imutável (status APPLIED).
          </>,
        ]}
      />
    </div>
  ),

  cenarios: () => (
    <div className="space-y-3">
      <P>
        <Strong>Cenário</Strong> é uma simulação completa: ano + modelo (Atual ou Novo) + premissa-template +
        eventuais ajustes (override) de parâmetros + classificações de sócios + cálculo dos pacotes.
      </P>
      <P>
        Use o botão <Strong>Cenários (N)</Strong> no header para abrir o drawer com todos os cenários
        existentes. Lá você cria, escolhe qual abrir em cada coluna (A ou B), filtra por modelo/status, busca
        por nome.
      </P>
      <P>
        Status possíveis:
      </P>
      <Lista
        items={[
          <>
            <Strong>Rascunho</Strong> — editável (parâmetros, classificações, recálculo).
          </>,
          <>
            <Strong>Publicado</Strong> — congelado, snapshot imutável. Para iterar, use <em>Reabrir como rascunho</em>.
          </>,
          <>
            <Strong>Arquivado</Strong> — fora da lista padrão; histórico preservado.
          </>,
        ]}
      />
    </div>
  ),

  parametros: () => (
    <div className="space-y-3">
      <P>
        Cada cenário começa com os parâmetros da <Strong>premissa-template</Strong> selecionada (Sistema 1T2026
        para Atual; Política DSF v1 para Novo). Você pode ajustar inline na coluna sem alterar a premissa
        (que é compartilhada entre cenários).
      </P>
      <P>
        Há dois passos separados:
      </P>
      <Lista
        items={[
          <>
            <Strong>Aplicar parâmetros</Strong> — salva o override no cenário. Não roda o engine. Marca o
            cenário como <em>alterado</em> (badge laranja).
          </>,
          <>
            <Strong>Recalcular</Strong> — roda o engine DSF nos 4 trimestres com os parâmetros atuais
            (override ou premissa) e regrava os pacotes por sócio.
          </>,
        ]}
      />
      <P>
        O ciclo permite ajustar 10 parâmetros e calcular uma vez só — mais rápido que recalcular a cada
        mudança.
      </P>
      <P>
        Validações no Aplicar: blocos A+B+C devem somar 1.00; pool e chave também; faixas com min ≤ max.
        Se algo falhar, um toast vermelho lista os problemas e nada é salvo.
      </P>
    </div>
  ),

  anual: () => (
    <div className="space-y-3">
      <P>
        Cada cenário é do <Strong>ano</Strong>. O engine roda <em>trimestre a trimestre</em> (porque o
        ResultadoPeriodo da DRE é trimestral) e a UI agrega no anual.
      </P>
      <P>
        Na tabela <Strong>Pacotes por sócio</Strong>, cada linha mostra o total anual de cada lado (A e B).
        Clique na seta ao lado do nome para abrir o drill-down: mini-tabela com{" "}
        <code>Q1 | Q2 | Q3 | Q4 | Anual</code> e botões para escolher qual trimestre o waterfall abaixo
        detalha.
      </P>
      <P>
        Recalcular processa os 4 trimestres em sequência. Trimestres sem ResultadoPeriodo importado são
        silenciosamente ignorados — o cálculo não bloqueia se 1T2026 estiver pronto e 4T2026 ainda não.
      </P>
    </div>
  ),

  publicar: () => (
    <div className="space-y-3">
      <P>
        <Strong>Publicar</Strong> congela o cenário como registro formal:
      </P>
      <Lista
        items={[
          <>Status muda <code>DRAFT → APPLIED</code>.</>,
          <>Grava um snapshot JSON imutável (cópia do cenário, premissa, parâmetros efetivos, classificações, remunerações).</>,
          <>
            Outros cenários <Strong>APPLIED do mesmo modelo+ano</Strong> são <em>arquivados automaticamente</em>{" "}
            (status <code>ARCHIVED</code>). Garante que existe sempre um único <em>oficial</em>.
          </>,
          <>
            Se o cenário não tem cobertura dos 4 trimestres, o sistema <Strong>calcula primeiro</Strong> (você verá o
            botão como &ldquo;Calcular & Publicar&rdquo;) — depois congela.
          </>,
        ]}
      />
      <P>
        Restrições: alertas <code>[ERROR]</code> bloqueiam (precisa resolver antes); warnings não. Cenário publicado
        não pode ser excluído — só arquivado.
      </P>
    </div>
  ),

  reabrir: () => (
    <div className="space-y-3">
      <P>
        Cenários <Strong>publicados</Strong> ou <Strong>arquivados</Strong> não voltam a Rascunho diretamente — o
        snapshot é registro formal e não deve ser alterado.
      </P>
      <P>
        Para iterar em cima de um já publicado, use <Strong>Reabrir como rascunho</Strong> no menu ⋮ da coluna ou
        do drawer. Cria um novo DRAFT clonando premissa, override e classificações; o original fica intacto. O
        novo rascunho começa sem cálculo — recalcule e ajuste à vontade.
      </P>
    </div>
  ),

  alertas: () => (
    <div className="space-y-3">
      <P>
        O engine DSF emite alertas quando detecta inconsistências durante o cálculo. Aparecem no KPI
        <Strong> Alertas</Strong> da coluna e nos detalhes do sócio (drill-down).
      </P>
      <Lista
        items={[
          <>
            <Strong>[ERROR]</Strong> — bloqueia Publicar. Exemplo: soma de % de quotas dos sócios de capital ≠ 100%.
          </>,
          <>
            <Strong>[WARNING]</Strong> — não bloqueia, só avisa. Exemplo: sócio sem originação esperada quando o
            cenário usa distribuição POR_AREA.
          </>,
        ]}
      />
      <P>
        Em breve: clicar no KPI Alertas abre uma janela com tradução de cada código em português + ação sugerida.
      </P>
    </div>
  ),

  classificar: () => (
    <div className="space-y-3">
      <P>
        <Strong>Classificar</Strong> é o que define quem é cada sócio dentro do cenário. Use o botão{" "}
        <Strong>Classificações (N)</Strong> na coluna para abrir o drawer.
      </P>
      <P>Campos por sócio:</P>
      <Lista
        items={[
          <>
            <Strong>Público</Strong> — Sócio de Capital (SC), Sócio de Serviço (SServiço) ou Líder de Unidade.
            Define quais blocos da remuneração ele recebe.
          </>,
          <>
            <Strong>% Quotas</Strong> — participação societária neste cenário. Soma dos SC deve ser 100%.
          </>,
          <>
            <Strong>Peso Bloco B</Strong> — peso individual quando a distribuição do Bloco B é{" "}
            <code>PESO_INDIVIDUAL</code>. Default 1.0.
          </>,
          <>
            <Strong>Originação esperada</Strong> — BRL anual estimado (usado nas chaves O/E/G).
          </>,
        ]}
      />
      <P>
        Mais detalhes sobre cada público e como impactam o cálculo:{" "}
        <LinkExterno href="/como-funciona/glossario">Glossário</LinkExterno>.
      </P>
    </div>
  ),

  glossario: () => (
    <div className="space-y-3">
      <P>Termos que aparecem na tela:</P>
      <Lista
        items={[
          <>
            <Strong>RDA</Strong> — Resultado Distribuível Ajustado. Base de cálculo do modelo Novo.
          </>,
          <>
            <Strong>Blocos A/B/C</Strong> — divisão do RDA: A institucional (capital), B performance, C estratégica.
            Devem somar 1.0.
          </>,
          <>
            <Strong>Pool de unidade</Strong> — divisão do LL local quando há líder: Sociedade / Líder /
            Equipe-Reserva. Soma 1.0.
          </>,
          <>
            <Strong>Chave-padrão O/E/G</Strong> — rateio em serviços interunidades: Originação / Execução / Gestão.
            Soma 1.0.
          </>,
          <>
            <Strong>Premissa-template</Strong> — conjunto de parâmetros default reutilizável entre cenários.
          </>,
          <>
            <Strong>Override</Strong> — ajuste de parâmetros aplicado a um cenário específico (não afeta a premissa).
          </>,
        ]}
      />
      <P>
        Glossário completo:{" "}
        <LinkExterno href="/como-funciona/glossario">Como funciona › Glossário</LinkExterno>
      </P>
      <P>
        Documentação integral da Política DSF:{" "}
        <LinkExterno href="/politica">Política</LinkExterno>
      </P>
    </div>
  ),
};

export const SECOES_AJUDA: SecaoAjuda[] = [
  { id: "visao-geral", titulo: "Visão geral", componente: Conteudo["visao-geral"] },
  { id: "fluxo", titulo: "O fluxo em 4 etapas", componente: Conteudo.fluxo },
  { id: "cenarios", titulo: "Cenários: criar, comparar, trocar", componente: Conteudo.cenarios },
  { id: "parametros", titulo: "Parâmetros: Aplicar vs Recalcular", componente: Conteudo.parametros },
  { id: "anual", titulo: "Visão anual + drill-down por trimestre", componente: Conteudo.anual },
  { id: "publicar", titulo: "Publicar: o que significa", componente: Conteudo.publicar },
  { id: "reabrir", titulo: "Reabrir como rascunho", componente: Conteudo.reabrir },
  { id: "alertas", titulo: "Erros e avisos", componente: Conteudo.alertas },
  { id: "classificar", titulo: "Classificações de sócios", componente: Conteudo.classificar },
  { id: "glossario", titulo: "Glossário rápido", componente: Conteudo.glossario },
];
