-- AlterTable
ALTER TABLE "Imovel" ADD COLUMN     "ano_constr" INTEGER,
ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cadurb_tipo" INTEGER,
ADD COLUMN     "cib" TEXT,
ADD COLUMN     "cib_dt" TIMESTAMP(3),
ADD COLUMN     "cib_status" TEXT,
ADD COLUMN     "dest" INTEGER,
ADD COLUMN     "padrao" INTEGER,
ADD COLUMN     "tp_arq" INTEGER,
ADD COLUMN     "valor_venal" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Imovel_ativo_idx" ON "Imovel"("ativo");
