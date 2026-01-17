-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'OPERARIO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ingreso', 'venta');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERARIO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obra" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userid" UUID NOT NULL,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Articulos" (
    "ID_Producto" SERIAL NOT NULL,
    "Nombre" TEXT NOT NULL,
    "Unidad" TEXT NOT NULL,
    "Cantidad" INTEGER NOT NULL,
    "ObraID" UUID NOT NULL,

    CONSTRAINT "Articulos_pkey" PRIMARY KEY ("ID_Producto")
);

-- CreateTable
CREATE TABLE "Movimientos" (
    "ID_transaccion" SERIAL NOT NULL,
    "ID_producto" INTEGER NOT NULL,
    "Producto" TEXT NOT NULL,
    "Cantidad" INTEGER NOT NULL,
    "Tipo_movimiento" "TipoMovimiento" NOT NULL,
    "Fecha_transaccion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Obra_destino" TEXT,
    "Remito" TEXT,
    "Observacion" TEXT,
    "Precio" DECIMAL(10,2) NOT NULL,
    "Tipo_unidad" TEXT NOT NULL,
    "Precio_total_disponible" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "Movimientos_pkey" PRIMARY KEY ("ID_transaccion")
);

-- CreateTable
CREATE TABLE "Certificacion" (
    "Codigo" SERIAL NOT NULL,
    "Tipo_certificaion" TEXT NOT NULL,
    "Fecha" TIMESTAMP(3) NOT NULL,
    "Precio" DOUBLE PRECISION NOT NULL,
    "Estado" TEXT NOT NULL,
    "Obra" INTEGER NOT NULL,
    "Cantidad" INTEGER NOT NULL,
    "Descripcion" TEXT,
    "Auto_fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificacion_pkey" PRIMARY KEY ("Codigo")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "Movimientos_ID_producto_idx" ON "Movimientos"("ID_producto");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Articulos" ADD CONSTRAINT "Articulos_ObraID_fkey" FOREIGN KEY ("ObraID") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimientos" ADD CONSTRAINT "Movimientos_ID_producto_fkey" FOREIGN KEY ("ID_producto") REFERENCES "Articulos"("ID_Producto") ON DELETE RESTRICT ON UPDATE CASCADE;
