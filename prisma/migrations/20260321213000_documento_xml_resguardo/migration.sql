-- Keep Documento table lean by storing XML backup in a dedicated table.
CREATE TABLE "DocumentoXmlResguardo" (
  "id" SERIAL NOT NULL,
  "documentoId" INTEGER NOT NULL,
  "xmlFirmado" TEXT NOT NULL,
  "xmlHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DocumentoXmlResguardo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentoXmlResguardo_documentoId_key" ON "DocumentoXmlResguardo"("documentoId");
CREATE INDEX "DocumentoXmlResguardo_createdAt_idx" ON "DocumentoXmlResguardo"("createdAt");

ALTER TABLE "DocumentoXmlResguardo"
  ADD CONSTRAINT "DocumentoXmlResguardo_documentoId_fkey"
  FOREIGN KEY ("documentoId") REFERENCES "Documento"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
