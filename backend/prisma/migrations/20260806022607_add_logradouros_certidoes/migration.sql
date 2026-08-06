-- CreateTable
CREATE TABLE "Logradouro" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "bairros" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cep" TEXT,
    "distrito" TEXT,
    "leiNumero" TEXT,
    "leiData" TIMESTAMP(3),
    "leiLink" TEXT,
    "situacao" TEXT NOT NULL DEFAULT 'sem_denominacao',
    "obs" TEXT,
    "geom" geometry(LineString, 4326),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Logradouro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certidao" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "codigoVerificacao" TEXT NOT NULL,
    "logradouroId" INTEGER,
    "nomeConsultado" TEXT,
    "emitidoPorId" INTEGER NOT NULL,
    "emitidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certidao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Logradouro_ativo_idx" ON "Logradouro"("ativo");

-- CreateIndex
CREATE INDEX "Logradouro_geom_idx" ON "Logradouro" USING GIST ("geom");

-- CreateIndex
CREATE UNIQUE INDEX "Certidao_codigoVerificacao_key" ON "Certidao"("codigoVerificacao");

-- CreateIndex
CREATE UNIQUE INDEX "Certidao_tipo_ano_seq_key" ON "Certidao"("tipo", "ano", "seq");

-- AddForeignKey
ALTER TABLE "Certidao" ADD CONSTRAINT "Certidao_logradouroId_fkey" FOREIGN KEY ("logradouroId") REFERENCES "Logradouro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certidao" ADD CONSTRAINT "Certidao_emitidoPorId_fkey" FOREIGN KEY ("emitidoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
