# Campos pendientes para integración completa con SII

## Schema Prisma - Modelo Documento

Para completar la integración con el SII, se deben agregar los siguientes campos al modelo `Documento` en `prisma/schema.prisma`:

```prisma
model Documento {
  // ... campos existentes ...
  
  // Campos para integración SII
  trackIdSII      String?   // ID de seguimiento del SII
  estadoSII       String?   // Estado en el SII: ENVIADO, ACEPTADO, RECHAZADO, ERROR
  fechaEnvioSII   DateTime? // Fecha de envío al SII
  xmlEnviado      String?   @db.Text // XML del DTE enviado
  
  // Campos adicionales recomendados
  tenantId        Int       // ID del tenant/usuario propietario
  localId         Int?      // ID local de la app para sincronización
  
  // Cliente (extender datos)
  clienteRut           String?
  clienteRazonSocial   String?
  clienteGiro          String?
  clienteDireccion     String?
  clienteComuna        String?
  
  // Fechas y detalles
  fechaEmision         DateTime  @default(now())
  fechaVencimiento     DateTime?
  
  // Montos extendidos
  subtotal             Decimal   @db.Decimal(12, 0)
  montoExento          Decimal   @db.Decimal(12, 0) @default(0)
  descuentoGlobal      Decimal   @db.Decimal(12, 0) @default(0)
  
  // Forma de pago
  formaPago            String    @default("contado")
  formaPagoDetalle     String?
  condicionesPago      String?
  ordenCompra          String?
  
  // Despacho (para guías)
  direccionDespacho    String?
  fechaDespacho        DateTime?
  transportista        String?
  patente              String?
  
  // Observaciones
  observaciones        String?   @db.Text
  
  // Sincronización
  syncStatus           String?   @default("synced")
  syncHash             String?
  lastSyncedAt         DateTime?
  
  // ... relaciones existentes ...
}
```

## Pasos para migración

1. Modificar `prisma/schema.prisma` con los campos indicados
2. Generar migración: `npx prisma migrate dev --name add_sii_fields`
3. Descomentar código en:
   - `src/services/facturacion/documentoService.js` (líneas con TODO)
   - `src/controllers/sistema/siiController.js` (líneas con TODO)

## Estado actual

- ✅ Arquitectura reestructurada: documentos → SII (interno)
- ✅ siiService creado como servicio interno
- ✅ Rutas SII simplificadas (solo consultas)
- ✅ documentoService integra envío automático al SII
- ⏳ Campos del schema pendientes de agregar
- ⏳ Implementación real de comunicación con SII (stubs actualmente)

## Flujo actual

```
App → POST /api/documentos { ..., emitir: true }
      ↓
  documentoService.createDocumento()
      ↓
  1. Crea documento en DB
  2. Si emitir === true:
     - Llama siiService.enviarDocumento()
     - Transforma JSON → XML
     - Firma XML (stub)
     - Envía al SII (stub)
     - Retorna trackId
  3. Actualiza documento (cuando se agreguen campos)
```

## API disponible para la app

### Crear documento (con emisión automática)
```
POST /api/documentos
Body: {
  tipo_documento: 33,
  folio: 1,
  cliente_id: 5,
  items: [...],
  emitir: true  ← Flag para enviar al SII
}
```

### Consultar estado SII de un documento
```
GET /api/sii/documento/:documentoId/estado
```

### Reenviar documento al SII
```
POST /api/sii/documento/:documentoId/reenviar
```

### Ver logs SII
```
GET /api/sii/logs
```
