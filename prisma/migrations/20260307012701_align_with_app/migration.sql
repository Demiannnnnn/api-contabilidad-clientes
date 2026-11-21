/*
  Warnings:

  - You are about to drop the column `condicion_pago` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `desc_auto` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `dias_credito` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `email_contacto` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `limite_credito` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `nombre_contacto` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `nombre_fantasia` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `razon_social` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `giro` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `razonSocial` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - Added the required column `razonSocial` to the `Cliente` table without a default value. This is not possible if the table is not empty.
  - Made the column `rut` on table `Cliente` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "condicion_pago",
DROP COLUMN "desc_auto",
DROP COLUMN "dias_credito",
DROP COLUMN "email_contacto",
DROP COLUMN "limite_credito",
DROP COLUMN "nombre",
DROP COLUMN "nombre_contacto",
DROP COLUMN "nombre_fantasia",
DROP COLUMN "razon_social",
DROP COLUMN "tipo",
ADD COLUMN     "condicionPago" TEXT NOT NULL DEFAULT 'contado',
ADD COLUMN     "contactoCargo" TEXT,
ADD COLUMN     "contactoEmail" TEXT,
ADD COLUMN     "contactoNombre" TEXT,
ADD COLUMN     "contactoTelefono" TEXT,
ADD COLUMN     "descuentoAutomatico" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "diasCredito" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "limiteCredito" DECIMAL(12,0) NOT NULL DEFAULT 0,
ADD COLUMN     "listaPrecios" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN     "nombreFantasia" TEXT,
ADD COLUMN     "razonSocial" TEXT NOT NULL,
ADD COLUMN     "tipoDocumento" TEXT NOT NULL DEFAULT 'rut_empresa',
ADD COLUMN     "vendedorId" INTEGER,
ADD COLUMN     "zona" TEXT,
ALTER COLUMN "rut" SET NOT NULL;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "costo" DECIMAL(10,0),
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "localId" INTEGER,
ADD COLUMN     "stockMaximo" INTEGER,
ADD COLUMN     "stockMinimo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "syncHash" TEXT,
ADD COLUMN     "syncStatus" TEXT DEFAULT 'synced',
ADD COLUMN     "unidadMedida" TEXT DEFAULT 'UN';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "direccion",
DROP COLUMN "giro",
DROP COLUMN "name",
DROP COLUMN "password",
DROP COLUMN "razonSocial",
DROP COLUMN "role",
ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nombre" TEXT,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "permisos" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "requiereAutorizacion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rol" TEXT NOT NULL DEFAULT 'vendedor',
ADD COLUMN     "ultimoAcceso" TIMESTAMP(3),
ALTER COLUMN "rut" DROP NOT NULL;

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "TipoCliente";
