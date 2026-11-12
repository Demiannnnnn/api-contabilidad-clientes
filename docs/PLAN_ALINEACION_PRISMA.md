# Plan de Alineación: Capa de Servicios vs Esquema Prisma

## 1. Resumen del Problema
Actualmente la API no puede operar contra una base de datos real PostgreSQL porque existe una discrepancia arquitectónica estructural entre el esquema Prisma (`prisma/schema.prisma`) y la lógica implementada en `src/` (~250 referencias en ~25 archivos).

### Causa raíz
El esquema Prisma fue alineado previamente con las tablas SQLite de la aplicación de escritorio Electron (`prisma/migrations/20260307012701_align_with_app`), adoptando identificadores enteros autoincrementales (`Int`) y un modelo centrado en un único usuario (`userId`). Sin embargo, los servicios y controladores fueron programados bajo un modelo SaaS multi-tenant (`tenantId`), esperando identificadores UUID y modelos extendidos inexistentes en la base de datos.

### Ejemplos concretos de fallas en ejecución
- **`src/services/documentoService.js:88-106` vs `prisma/schema.prisma:137-170`**: `createDocumento` envía a Prisma campos como `tenantId`, `tipoDocumento`, `folio`, `clienteRut`, `subtotal`, `montoExento`, `descuentoGlobal`, `fechaEmision` y `formaPago`. Prisma falla de inmediato porque el modelo `Documento` no posee esos campos (espera `userId`, `tipo`, `numero`, `neto`, `fecha`).
- **`src/repositories/documentoRepository.js:50,58,61` vs `prisma/schema.prisma:189-201`**: Invoca `tx.referenciaDocumento.createMany` (modelo inexistente en Prisma), ordena items por `numeroLinea` (campo inexistente) e incluye la relación `vendedor` (inexistente en el esquema).
- **`src/services/validationService.js:205,229,246,269`**: Valida `producto_id`, `cliente_id`, `vendedor_id` y `documento_id` como UUID (`.uuid()`), provocando rechazos o incompatibilidad con las claves foráneas de Prisma (`Int`).
- **`src/repositories/pagoRepository.js:4,12` y `folioRepository.js:4,16`**: Métodos no implementados (stubs que retornan `[]` o `null`) debido a que los modelos `Pago` y `FolioCaf` no existen en `schema.prisma`.
- **`src/services/tenantService.js:19-29` vs `prisma/schema.prisma:20-49`**: Intenta actualizar en `prisma.user` campos de empresa (`razonSocial`, `giro`, `direccion`, etc.) que fueron eliminados de `User` en la migración `align_with_app`.

## 2. Inventario de Desajustes por Módulo

| Módulo / Archivo | Lo que usa el código (`src/`) | Estado real en `schema.prisma` |
|---|---|---|
| **Documentos** (`documentoService.js:88`, `documentoRepository.js:50`) | `tenantId`, `tipoDocumento`, `folio`, `subtotal`, snapshot cliente, `referenciaDocumento`, items con `numeroLinea` | `userId`, enum `tipo`, `numero`, `neto`. Sin modelo Referencia, sin snapshot cliente, `DocumentoItem` con campos básicos |
| **Pagos** (`pagoService.js:38`, `pagoRepository.js:4`) | Modelo `Pago`, `documento_id` UUID, relación `doc.pagos`, estados `'pagada'/'parcial'` | Modelo `Pago` **no existe**. Enum `EstadoDocumento` solo admite `BORRADOR`, `EMITIDO`, `ANULADO` |
| **Folios** (`folioService.js:23`, `folioRepository.js:4`) | Modelo `FolioCaf` (`tenantId`, `tipoDocumento`, `desde`, `hasta`, `actual`, `cafXml`) | Modelo `FolioCaf` / `Folio` **no existe** |
| **Vendedores** (`vendedorService.js:84`, `vendedorRepository.js:4`) | Modelo `Vendedor` (`apellido`, `telefono`, `comision`, `syncHash`) | Mapeado a `Trabajador` (`id Int`, `userId`, `nombre`, `rut`, `cargo`, `email`). Sin apellido ni comisiones |
| **Clientes** (`clienteService.js:42`, `validationService.js:229`) | `cliente_id` UUID en documentos, `userId` mixto | `id Int @default(autoincrement())`, `userId Int` |
| **Productos** (`productoService.js:49`, `validationService.js:205`) | `producto_id` UUID en items | `id Int @default(autoincrement())`, `userId Int` |
| **Tenant** (`tenantService.js:19`, `tenantRepository.js:10`) | Modelo `Tenant` o `User` con datos de facturación (`razonSocial`, `giro`, SII config) | `User` solo contiene datos de usuario/auth (`email`, `passwordHash`, `rol`, `permisos`). Sin datos tributarios |
| **Validación** (`validationService.js:205-269`) | Validaciones Zod estrictas `.uuid()` para IDs foráneos | Todos los identificadores en Prisma son de tipo entero (`Int`) |

## 3. Opciones de Solución

> [!NOTE]
> La decisión arquitectónica entre la Opción A y la Opción B queda **pendiente de definición por parte del dueño del proyecto**.

### Opción A: Adaptar el código de `src/` al esquema Prisma actual
- **Descripción**: Refactorizar controladores, servicios, repositorios y validaciones Zod para usar IDs enteros (`Int`), reemplazar `tenantId` por `userId`, mapear enums (`TipoDocumento`) y desactivar/desacoplar endpoints sin soporte de BD (pagos, folios).
- **Ventajas**:
  - Mantiene compatibilidad total con la base SQLite del cliente Electron sin alterar su contrato.
  - Cero riesgo de migraciones destructivas o pérdida de datos en PostgreSQL.
- **Contras y Riesgos**:
  - Requiere refactorizar ~25 archivos en la API.
  - Pérdida de capacidades de negocio avanzadas: los módulos de Pagos, Folios CAF y datos fiscales de empresa quedarían sin persistencia en BD.

### Opción B: Migrar el esquema Prisma al modelo SaaS multi-tenant con UUIDs
- **Descripción**: Actualizar `schema.prisma` agregando modelos `Tenant`, `Pago`, `FolioCaf`, `ReferenciaDocumento`, cambiando claves primarias a UUID y añadiendo campos de snapshot fiscal.
- **Ventajas**:
  - API SaaS completa y robusta acorde al diseño funcional de negocio.
  - Minimiza los cambios requeridos en la capa de servicios de `src/`.
- **Contras y Riesgos**:
  - Rompe la sincronización directa con el cliente Electron: requeriría actualizar el esquema SQLite y la lógica local de la aplicación Electron.
  - Migración compleja y potencialmente destructiva en PostgreSQL, descartando la migración `align_with_app`.

## 4. Plan por Fases y Criterios de Aceptación

### Fases de Implementación
1. **Fase 1 (Definición de Arquitectura)**: Decisión por parte del dueño sobre el alcance con el cliente Electron (Opción A vs Opción B).
2. **Fase 2 (Alineación Estructural)**:
   - *Si Opción A*: reemplazar `.uuid()` por `z.coerce.number().int()` en Zod, unificar a `userId`/`Int` y limpiar stubs.
   - *Si Opción B*: diseñar nueva migración Prisma con tablas `Tenant`, `Pago`, `FolioCaf`, claves UUID y relaciones completas.
3. **Fase 3 (Persistencia en Repositorios)**: Implementar queries reales en `pagoRepository`, `folioRepository` y `tenantRepository`.
4. **Fase 4 (Verificación Automatizada)**: Ejecutar suite de integración contra PostgreSQL en CI.

### Criterios de Aceptación
- Cero discrepancias de tipos o argumentos desconocidos al invocar Prisma Client desde servicios y repositorios.
- Todos los repositorios activos operan contra la base de datos sin retornar stubs vacíos.
- Suite completa de tests unitarios y de integración pasando en verde en CI.

### Tests a Añadir
- **Tests de Integración (Prisma + PostgreSQL)**:
  - Repositorios con base de datos real: `documentoRepository.test.js`, `pagoRepository.test.js`, `folioRepository.test.js`.
  - Verificación de integridad referencial y unicidad (`tipo + numero` o folios CAF).
- **Tests de Endpoints (Supertest)**:
  - Flujo de emisión y almacenamiento: POST `/documentos`.
  - Registro de pago y actualización de estados: POST `/pagos`.
  - Pruebas de sincronización con cliente Electron: POST `/sync/push` y GET `/sync/pull`.
