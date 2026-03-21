-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rut" TEXT,
    "nombre" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'dueno',
    "permisos" TEXT NOT NULL DEFAULT '{}',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "requiereAutorizacion" BOOLEAN NOT NULL DEFAULT false,
    "ultimoAcceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContadorCliente" (
    "id" SERIAL NOT NULL,
    "contadorId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "solicitadoPor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContadorCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rut" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreFantasia" TEXT,
    "giro" TEXT,
    "direccion" TEXT,
    "region" TEXT,
    "comuna" TEXT,
    "ciudad" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "tipoDocumento" TEXT NOT NULL DEFAULT 'rut_empresa',
    "contactoNombre" TEXT,
    "contactoCargo" TEXT,
    "contactoEmail" TEXT,
    "contactoTelefono" TEXT,
    "condicionPago" TEXT NOT NULL DEFAULT 'contado',
    "diasCredito" INTEGER NOT NULL DEFAULT 0,
    "limiteCredito" DECIMAL(12,0) NOT NULL DEFAULT 0,
    "descuentoAutomatico" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "trabajadorId" INTEGER,
    "zona" TEXT,
    "listaPrecios" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(10,0) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "exento" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "unidadMedida" TEXT DEFAULT 'UN',
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "stockMaximo" INTEGER,
    "costo" DECIMAL(10,0),
    "localId" INTEGER,
    "syncHash" TEXT,
    "syncStatus" TEXT DEFAULT 'synced',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoriaId" INTEGER,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "localId" INTEGER,
    "tipoDocumento" INTEGER NOT NULL,
    "folio" INTEGER NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "clienteId" INTEGER,
    "clienteRut" TEXT,
    "clienteRazonSocial" TEXT,
    "clienteGiro" TEXT,
    "clienteDireccion" TEXT,
    "clienteComuna" TEXT,
    "subtotal" DECIMAL(12,0) NOT NULL,
    "montoExento" DECIMAL(12,0) NOT NULL DEFAULT 0,
    "descuentoGlobal" DECIMAL(12,0) NOT NULL DEFAULT 0,
    "iva" DECIMAL(12,0) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,0) NOT NULL,
    "formaPago" TEXT NOT NULL DEFAULT 'contado',
    "formaPagoDetalle" TEXT,
    "condicionesPago" TEXT,
    "ordenCompra" TEXT,
    "direccionDespacho" TEXT,
    "fechaDespacho" TIMESTAMP(3),
    "transportista" TEXT,
    "patente" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "observaciones" TEXT,
    "trackIdSII" TEXT,
    "estadoSII" TEXT,
    "fechaEnvioSII" TIMESTAMP(3),
    "xmlEnviado" TEXT,
    "syncStatus" TEXT DEFAULT 'synced',
    "syncHash" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trabajadorId" INTEGER,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenciaDocumento" (
    "id" SERIAL NOT NULL,
    "documentoId" INTEGER NOT NULL,
    "tipoDocumentoReferencia" INTEGER NOT NULL,
    "folioReferencia" INTEGER NOT NULL,
    "fechaReferencia" TIMESTAMP(3) NOT NULL,
    "razonReferencia" TEXT NOT NULL,
    "codigoReferencia" TEXT,
    "detalle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenciaDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoItem" (
    "id" SERIAL NOT NULL,
    "documentoId" INTEGER NOT NULL,
    "numeroLinea" INTEGER NOT NULL,
    "productoId" INTEGER,
    "codigoItem" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'UN',
    "precioUnitario" DECIMAL(12,0) NOT NULL,
    "descuento" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "descuentoMonto" DECIMAL(12,0) NOT NULL DEFAULT 0,
    "montoItem" DECIMAL(12,0) NOT NULL,
    "exento" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trabajador" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'trabajador',
    "permisos" TEXT NOT NULL DEFAULT '{}',
    "rut" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "machineId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Licence" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "licenceKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Licence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineBinding" (
    "id" SERIAL NOT NULL,
    "machineId" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ContadorCliente_contadorId_clienteId_key" ON "ContadorCliente"("contadorId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_userId_rut_key" ON "Cliente"("userId", "rut");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_userId_codigo_key" ON "Producto"("userId", "codigo");

-- CreateIndex
CREATE INDEX "Documento_userId_fechaEmision_idx" ON "Documento"("userId", "fechaEmision");

-- CreateIndex
CREATE INDEX "Documento_userId_estado_idx" ON "Documento"("userId", "estado");

-- CreateIndex
CREATE INDEX "Documento_trackIdSII_idx" ON "Documento"("trackIdSII");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_userId_tipoDocumento_folio_key" ON "Documento"("userId", "tipoDocumento", "folio");

-- CreateIndex
CREATE UNIQUE INDEX "Trabajador_userId_email_key" ON "Trabajador"("userId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_userId_nombre_key" ON "Categoria"("userId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Licence_userId_key" ON "Licence"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Licence_licenceKey_key" ON "Licence"("licenceKey");

-- CreateIndex
CREATE UNIQUE INDEX "MachineBinding_machineId_key" ON "MachineBinding"("machineId");

-- AddForeignKey
ALTER TABLE "ContadorCliente" ADD CONSTRAINT "ContadorCliente_contadorId_fkey" FOREIGN KEY ("contadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContadorCliente" ADD CONSTRAINT "ContadorCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenciaDocumento" ADD CONSTRAINT "ReferenciaDocumento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoItem" ADD CONSTRAINT "DocumentoItem_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoItem" ADD CONSTRAINT "DocumentoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trabajador" ADD CONSTRAINT "Trabajador_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licence" ADD CONSTRAINT "Licence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineBinding" ADD CONSTRAINT "MachineBinding_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
