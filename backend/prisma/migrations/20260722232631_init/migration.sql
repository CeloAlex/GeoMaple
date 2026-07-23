-- CreateTable
CREATE TABLE "Imovel" (
    "id" SERIAL NOT NULL,
    "insc" TEXT NOT NULL,
    "cod" TEXT,
    "prop" TEXT NOT NULL,
    "log" TEXT,
    "nr" TEXT,
    "bai" TEXT,
    "cep" TEXT,
    "uso" TEXT NOT NULL DEFAULT 'terreno',
    "tp" TEXT,
    "st" TEXT NOT NULL DEFAULT 'regular',
    "at_cad" DOUBLE PRECISION,
    "at_geo" DOUBLE PRECISION,
    "ac_cad" DOUBLE PRECISION,
    "ac_geo" DOUBLE PRECISION,
    "num_pav" INTEGER,
    "frac_ideal" TEXT,
    "obs" TEXT,
    "geo_dt" TIMESTAMP(3),
    "geom" geometry(Polygon, 4326),
    "geom_bld" geometry(Polygon, 4326),
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER,

    CONSTRAINT "Imovel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "perm" TEXT NOT NULL DEFAULT 'viewer',
    "email" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quadra" (
    "id" SERIAL NOT NULL,
    "di" TEXT NOT NULL,
    "se" TEXT NOT NULL,
    "qu" TEXT NOT NULL,
    "cod" TEXT,
    "obs" TEXT,
    "geom" geometry(Polygon, 4326),

    CONSTRAINT "Quadra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provisorio" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "obs" TEXT,
    "geom" geometry(Polygon, 4326),

    CONSTRAINT "Provisorio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Imovel_insc_key" ON "Imovel"("insc");

-- CreateIndex
CREATE INDEX "Imovel_parentId_idx" ON "Imovel"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Quadra_di_se_qu_key" ON "Quadra"("di", "se", "qu");

-- AddForeignKey
ALTER TABLE "Imovel" ADD CONSTRAINT "Imovel_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Imovel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Imovel" ADD CONSTRAINT "Imovel_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
