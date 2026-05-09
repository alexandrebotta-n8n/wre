-- CreateEnum
CREATE TYPE "UsuarioRole" AS ENUM ('ADMIN', 'CONSULTOR', 'SOCIO', 'LEITOR');

-- CreateEnum
CREATE TYPE "NivelCargo" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "FaixaSalarial" AS ENUM ('INICIAL', 'PLENO', 'EXPERT');

-- CreateEnum
CREATE TYPE "Publico" AS ENUM ('SOCIO_CAPITAL', 'SOCIO_CAPITAL_GESTOR', 'SOCIO_CAPITAL_LIDER_UNIDADE', 'SOCIO_SERVICOS', 'SOCIO_SERVICOS_ESTRATEGICO', 'LIDER_UNIDADE_NON_EQUITY', 'LIDER_TECNICO', 'FUNDADOR');

-- CreateEnum
CREATE TYPE "TipoPeriodo" AS ENUM ('TRIMESTRE', 'ANO');

-- CreateEnum
CREATE TYPE "ModeloRegra" AS ENUM ('ATUAL', 'NOVO');

-- CreateEnum
CREATE TYPE "CenarioStatus" AS ENUM ('DRAFT', 'APPLIED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT,
    "imagem" TEXT,
    "senhaHash" TEXT,
    "senhaProvisoria" BOOLEAN NOT NULL DEFAULT false,
    "roles" "UsuarioRole"[] DEFAULT ARRAY['LEITOR']::"UsuarioRole"[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoLogin" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "socioId" TEXT,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "usuarioId" TEXT,
    "sucesso" BOOLEAN NOT NULL,
    "motivo" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "ocorridoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "meta" JSONB,
    "ocorridoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "isMatriz" BOOLEAN NOT NULL DEFAULT false,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabelaSalario" (
    "id" TEXT NOT NULL,
    "nivel" "NivelCargo" NOT NULL,
    "faixa" "FaixaSalarial" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TabelaSalario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Socio" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "pontuacaoCargo" INTEGER,
    "nivelCargo" "NivelCargo",
    "faixaSalarial" "FaixaSalarial",
    "percentualQuotasDefault" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFundador" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,

    CONSTRAINT "Socio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periodo" (
    "id" TEXT NOT NULL,
    "tipo" "TipoPeriodo" NOT NULL,
    "ano" INTEGER NOT NULL,
    "trimestre" INTEGER,
    "rotulo" TEXT NOT NULL,

    CONSTRAINT "Periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultadoPeriodo" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "lucroLiquido" DOUBLE PRECISION NOT NULL,
    "fundingVariavel" DOUBLE PRECISION,
    "ehReal" BOOLEAN NOT NULL DEFAULT true,
    "fonte" TEXT,
    "importadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultadoPeriodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Premissa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "modelo" "ModeloRegra" NOT NULL,
    "parametros" JSONB NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Premissa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cenario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ano" INTEGER NOT NULL,
    "modelo" "ModeloRegra" NOT NULL,
    "status" "CenarioStatus" NOT NULL DEFAULT 'DRAFT',
    "premissaId" TEXT NOT NULL,
    "snapshot" JSONB,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aplicadoEm" TIMESTAMP(3),

    CONSTRAINT "Cenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificacaoSocio" (
    "id" TEXT NOT NULL,
    "cenarioId" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "publico" "Publico" NOT NULL,
    "unidadeId" TEXT,
    "percentualQuotas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "originacaoEsperada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nivelCargoOverride" "NivelCargo",
    "faixaSalarialOverride" "FaixaSalarial",
    "observacoes" TEXT,

    CONSTRAINT "ClassificacaoSocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemuneracaoCalculada" (
    "id" TEXT NOT NULL,
    "cenarioId" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "proLabore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remuneracaoGestao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remuneracaoFundador" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blocoA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blocoB" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blocoC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "poolUnidade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditoOriginacao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditoExecucao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditoGestaoCP" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ajustes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alertas" JSONB,
    "trace" JSONB,
    "calculadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemuneracaoCalculada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_socioId_key" ON "Usuario"("socioId");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "LoginEvent_email_idx" ON "LoginEvent"("email");

-- CreateIndex
CREATE INDEX "LoginEvent_usuarioId_idx" ON "LoginEvent"("usuarioId");

-- CreateIndex
CREATE INDEX "LoginEvent_ocorridoEm_idx" ON "LoginEvent"("ocorridoEm");

-- CreateIndex
CREATE INDEX "AuditLog_ocorridoEm_idx" ON "AuditLog"("ocorridoEm");

-- CreateIndex
CREATE INDEX "AuditLog_acao_idx" ON "AuditLog"("acao");

-- CreateIndex
CREATE UNIQUE INDEX "Unidade_codigo_key" ON "Unidade"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "TabelaSalario_nivel_faixa_key" ON "TabelaSalario"("nivel", "faixa");

-- CreateIndex
CREATE UNIQUE INDEX "Socio_nome_key" ON "Socio"("nome");

-- CreateIndex
CREATE INDEX "Socio_nome_idx" ON "Socio"("nome");

-- CreateIndex
CREATE INDEX "Periodo_ano_idx" ON "Periodo"("ano");

-- CreateIndex
CREATE UNIQUE INDEX "Periodo_tipo_ano_trimestre_key" ON "Periodo"("tipo", "ano", "trimestre");

-- CreateIndex
CREATE INDEX "ResultadoPeriodo_periodoId_idx" ON "ResultadoPeriodo"("periodoId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultadoPeriodo_unidadeId_periodoId_key" ON "ResultadoPeriodo"("unidadeId", "periodoId");

-- CreateIndex
CREATE UNIQUE INDEX "Premissa_nome_key" ON "Premissa"("nome");

-- CreateIndex
CREATE INDEX "Cenario_ano_status_idx" ON "Cenario"("ano", "status");

-- CreateIndex
CREATE INDEX "Cenario_modelo_ano_idx" ON "Cenario"("modelo", "ano");

-- CreateIndex
CREATE INDEX "ClassificacaoSocio_cenarioId_idx" ON "ClassificacaoSocio"("cenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassificacaoSocio_cenarioId_socioId_key" ON "ClassificacaoSocio"("cenarioId", "socioId");

-- CreateIndex
CREATE INDEX "RemuneracaoCalculada_cenarioId_periodoId_idx" ON "RemuneracaoCalculada"("cenarioId", "periodoId");

-- CreateIndex
CREATE UNIQUE INDEX "RemuneracaoCalculada_cenarioId_socioId_periodoId_key" ON "RemuneracaoCalculada"("cenarioId", "socioId", "periodoId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoPeriodo" ADD CONSTRAINT "ResultadoPeriodo_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoPeriodo" ADD CONSTRAINT "ResultadoPeriodo_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cenario" ADD CONSTRAINT "Cenario_premissaId_fkey" FOREIGN KEY ("premissaId") REFERENCES "Premissa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cenario" ADD CONSTRAINT "Cenario_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificacaoSocio" ADD CONSTRAINT "ClassificacaoSocio_cenarioId_fkey" FOREIGN KEY ("cenarioId") REFERENCES "Cenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificacaoSocio" ADD CONSTRAINT "ClassificacaoSocio_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificacaoSocio" ADD CONSTRAINT "ClassificacaoSocio_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemuneracaoCalculada" ADD CONSTRAINT "RemuneracaoCalculada_cenarioId_fkey" FOREIGN KEY ("cenarioId") REFERENCES "Cenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemuneracaoCalculada" ADD CONSTRAINT "RemuneracaoCalculada_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemuneracaoCalculada" ADD CONSTRAINT "RemuneracaoCalculada_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
