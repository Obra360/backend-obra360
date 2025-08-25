/*
  Warnings:

  - You are about to drop the `Certificacion` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "estado_asistencia" AS ENUM ('PENDIENTE', 'COMPLETO', 'EDITADO', 'AUSENTE');

-- CreateEnum
CREATE TYPE "EstadoCertificacion" AS ENUM ('PENDIENTE', 'COMPLETA', 'APROBADA', 'RECHAZADA', 'PAGADA');

-- AlterTable
ALTER TABLE "Movimientos" ADD COLUMN     "Role" TEXT;

-- DropTable
DROP TABLE "Certificacion";

-- CreateTable
CREATE TABLE "Salarios" (
    "id_empleado" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "dni" INTEGER NOT NULL,
    "sexo" CHAR(1) NOT NULL,
    "obras_mensual" VARCHAR(100),
    "salario" REAL NOT NULL,
    "recibo" VARCHAR(100),

    CONSTRAINT "salarios_pkey" PRIMARY KEY ("id_empleado")
);

-- CreateTable
CREATE TABLE "personas_control_horas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "dni" VARCHAR(20) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personas_control_horas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_horas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "persona_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_entrada" TIME,
    "hora_salida" TIME,
    "horas_extra" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "control_horas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificaciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "obra" TEXT NOT NULL,
    "tipo_certificacion" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "estado" "EstadoCertificacion" NOT NULL DEFAULT 'PENDIENTE',
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "certificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_certificados" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "certificacion_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidad" DECIMAL(10,3) NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_certificados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo_interno" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "unidad" VARCHAR(50) NOT NULL,
    "cantidad" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "precio" DECIMAL(10,2),
    "precio_total" DECIMAL(12,2),
    "remito" VARCHAR(100),
    "fecha_ingreso" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "obra_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personas_control_horas_dni_key" ON "personas_control_horas"("dni");

-- CreateIndex
CREATE INDEX "control_horas_fecha_idx" ON "control_horas"("fecha");

-- CreateIndex
CREATE INDEX "control_horas_persona_id_idx" ON "control_horas"("persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "control_horas_persona_id_fecha_key" ON "control_horas"("persona_id", "fecha");

-- CreateIndex
CREATE INDEX "certificaciones_created_at_idx" ON "certificaciones"("created_at");

-- CreateIndex
CREATE INDEX "certificaciones_created_by_idx" ON "certificaciones"("created_by");

-- CreateIndex
CREATE INDEX "certificaciones_estado_idx" ON "certificaciones"("estado");

-- CreateIndex
CREATE INDEX "certificaciones_fecha_idx" ON "certificaciones"("fecha");

-- CreateIndex
CREATE INDEX "certificaciones_obra_idx" ON "certificaciones"("obra");

-- CreateIndex
CREATE INDEX "items_certificados_certificacion_id_idx" ON "items_certificados"("certificacion_id");

-- CreateIndex
CREATE INDEX "items_certificados_codigo_idx" ON "items_certificados"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "materiales_codigo_interno_key" ON "materiales"("codigo_interno");

-- CreateIndex
CREATE INDEX "idx_materiales_codigo_interno" ON "materiales"("codigo_interno");

-- CreateIndex
CREATE INDEX "idx_materiales_created_at" ON "materiales"("created_at");

-- CreateIndex
CREATE INDEX "idx_materiales_obra_id" ON "materiales"("obra_id");

-- AddForeignKey
ALTER TABLE "control_horas" ADD CONSTRAINT "control_horas_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas_control_horas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_horas" ADD CONSTRAINT "control_horas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificaciones" ADD CONSTRAINT "certificaciones_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_certificados" ADD CONSTRAINT "items_certificados_certificacion_id_fkey" FOREIGN KEY ("certificacion_id") REFERENCES "certificaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiales" ADD CONSTRAINT "materiales_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
