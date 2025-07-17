/*
  Warnings:

  - You are about to drop the `Prueba` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Prueba";

-- CreateTable
CREATE TABLE "Obra" (
    "id" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("id")
);
