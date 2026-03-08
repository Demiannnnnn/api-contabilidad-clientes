/*
  Warnings:

  - Renaming column `vendedorId` to `trabajadorId` on the `Cliente` table.

*/
-- AlterTable: rename column (preserves data)
ALTER TABLE "Cliente" RENAME COLUMN "vendedorId" TO "trabajadorId";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "rol" SET DEFAULT 'trabajador';

-- Update existing role values
UPDATE "User" SET "rol" = 'trabajador' WHERE "rol" = 'vendedor';
