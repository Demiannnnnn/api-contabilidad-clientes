# Especificación Completa de la API — Sistema de Facturación e Inventario

> **Versión:** 2.0  
> **Fecha:** Marzo 2026  
> **Stack Backend (API):** Node.js + Express + PostgreSQL + JWT  
> **Stack Cliente (Electron):** SQLite local + IPC + React  

---

## Tabla de Contenidos

1. [Arquitectura General](#1-arquitectura-general)
2. [Modelo de Datos (Tablas PostgreSQL para la API)](#2-modelo-de-datos-tablas-postgresql-para-la-api)
3. [Autenticación y Tokens](#3-autenticación-y-tokens)
4. [Endpoints de la API](#4-endpoints-de-la-api)
5. [Análisis Offline vs Online](#5-análisis-offline-vs-online)
6. [Sistema de Cola de Sincronización](#6-sistema-de-cola-de-sincronización)
7. [Flujo Completo del Ciclo de Vida](#7-flujo-completo-del-ciclo-de-vida)
8. [Manejo de Conflictos](#8-manejo-de-conflictos)
9. [Seguridad](#9-seguridad)
10. [Pagos con Flow](#10-pagos-con-flow)
11. [Integración SII](#11-integración-sii)
12. [Licencias](#12-licencias)
13. [Estado Actual vs Pendiente](#13-estado-actual-vs-pendiente)

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        ELECTRON APP                             │
│                                                                 │
│  ┌──────────┐    IPC     ┌─────────────┐    SQLite    ┌──────┐ │
│  │ Renderer │◄──────────►│ Main Process│◄────────────►│ .db  │ │
│  │ (React)  │            │ (Node.js)   │              └──────┘ │
│  └──────────┘            └──────┬──────┘                       │
│                                 │                               │
│                            HTTP/HTTPS                           │
│                            (cuando hay                          │
│                             conexión)                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API REST (Servidor)                      │
│                                                                 │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ Express  │  │ JWT Auth  │  │ Postgres │  │ Servicios     │ │
│  │ Router   │──│ Middleware│──│ (DB)     │  │ Externos:     │ │
│  └──────────┘  └───────────┘  └──────────┘  │ - SII         │ │
│                                              │ - Flow (pagos)│ │
│                                              │ - Email       │ │
│                                              └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Principio Fundamental: **Offline-First**

La aplicación Electron funciona de forma autónoma con SQLite. La API es un respaldo en la nube, canal de sincronización y puerta a servicios externos (SII, Flow, licencias). Si no hay internet, la app sigue funcionando al 100% en operaciones locales. Lo que requiera internet se encola y se procesa cuando vuelva la conexión.

---

## 2. Modelo de Datos (Tablas PostgreSQL para la API)

> Estas son las tablas que la API necesita en PostgreSQL. Son un espejo enriquecido de las tablas locales de SQLite, con campos adicionales para multi-tenancy y sincronización.

### 2.1 `tenants` — Cuentas/Empresas (multi-tenant)

```sql
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rut           VARCHAR(20) UNIQUE NOT NULL,
  razon_social  VARCHAR(255) NOT NULL,
  nombre_fantasia VARCHAR(255),
  giro          VARCHAR(255),
  direccion     VARCHAR(500),
  comuna        VARCHAR(100),
  ciudad        VARCHAR(100),
  region        VARCHAR(100),
  telefono      VARCHAR(50),
  email         VARCHAR(255),
  logo_url      TEXT,
  
  -- SII
  resolucion_sii     VARCHAR(100),
  numero_resolucion  VARCHAR(50),
  fecha_resolucion   DATE,
  certificado_digital BYTEA,          -- Certificado .pfx encriptado
  clave_certificado  TEXT,             -- Clave del certificado, encriptada con AES-256
  ambiente_sii       VARCHAR(20) DEFAULT 'certificacion', -- 'certificacion' | 'produccion'
  
  -- Suscripción / Licencia
  plan              VARCHAR(50) DEFAULT 'free',  -- 'free', 'basic', 'pro', 'enterprise'
  licencia_key      VARCHAR(100) UNIQUE,
  licencia_estado   VARCHAR(20) DEFAULT 'trial', -- 'trial', 'active', 'expired', 'suspended'
  licencia_expira   TIMESTAMP,
  max_usuarios      INTEGER DEFAULT 3,
  max_documentos_mes INTEGER DEFAULT 50,
  
  -- Flow (pagos)
  flow_api_key      TEXT,
  flow_secret_key   TEXT,
  
  -- Metadata
  activo         BOOLEAN DEFAULT true,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_rut ON tenants(rut);
CREATE INDEX idx_tenants_licencia ON tenants(licencia_key);
```

### 2.2 `users` — Usuarios

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  rut             VARCHAR(20),
  nombre          VARCHAR(255),
  rol             VARCHAR(50) NOT NULL DEFAULT 'vendedor', 
                  -- 'dueño', 'administrador', 'vendedor', 'cajero', 'contador'
  permisos        JSONB DEFAULT '{}',
  activo          BOOLEAN DEFAULT true,
  requiere_autorizacion BOOLEAN DEFAULT false,
  ultimo_acceso   TIMESTAMP,
  
  -- Para sincronización
  local_id        INTEGER,                -- ID local en SQLite del cliente
  machine_id      VARCHAR(64),            -- ID de la máquina que registró
  
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
```

### 2.3 `refresh_tokens` — Tokens de Refresco

```sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,   -- Hash SHA-256 del token
  device_info TEXT,                     -- Info del dispositivo
  machine_id  VARCHAR(64),
  expires_at  TIMESTAMP NOT NULL,
  revoked     BOOLEAN DEFAULT false,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

### 2.4 `clientes` — Clientes del Tenant

```sql
CREATE TABLE clientes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  local_id            INTEGER,          -- ID local en SQLite
  rut                 VARCHAR(20) NOT NULL,
  razon_social        VARCHAR(255) NOT NULL,
  nombre_fantasia     VARCHAR(255),
  giro                VARCHAR(255),
  direccion           VARCHAR(500),
  region              VARCHAR(100),
  comuna              VARCHAR(100),
  ciudad              VARCHAR(100),
  telefono            VARCHAR(50),
  email               VARCHAR(255),
  
  -- Tipo de documento
  tipo_documento      VARCHAR(50) DEFAULT 'rut_empresa',
  
  -- Contacto
  contacto_nombre     VARCHAR(255),
  contacto_cargo      VARCHAR(100),
  contacto_email      VARCHAR(255),
  contacto_telefono   VARCHAR(50),
  
  -- Condiciones comerciales
  condicion_pago      VARCHAR(50) DEFAULT 'contado',
  dias_credito        INTEGER DEFAULT 0,
  limite_credito      NUMERIC(15,2) DEFAULT 0,
  vendedor_id         UUID REFERENCES users(id),
  zona                VARCHAR(100),
  descuento_automatico NUMERIC(5,2) DEFAULT 0,
  lista_precios       VARCHAR(50) DEFAULT 'normal',
  
  -- Sincronización
  sync_status         VARCHAR(20) DEFAULT 'synced', -- 'synced', 'pending', 'conflict'
  last_synced_at      TIMESTAMP,
  sync_hash           VARCHAR(64),                   -- Hash del contenido para detectar cambios
  
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(tenant_id, rut)
);

CREATE INDEX idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX idx_clientes_rut ON clientes(tenant_id, rut);
```

### 2.5 `productos` — Productos del Tenant

```sql
CREATE TABLE productos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  local_id        INTEGER,
  codigo          VARCHAR(100),
  nombre          VARCHAR(255) NOT NULL,
  descripcion     TEXT,
  precio          NUMERIC(15,2) NOT NULL,
  stock           INTEGER DEFAULT 0,
  exento          BOOLEAN DEFAULT false,    -- true = exento de IVA
  
  -- Campos adicionales para la API
  categoria       VARCHAR(100),
  unidad_medida   VARCHAR(20) DEFAULT 'UN',
  stock_minimo    INTEGER DEFAULT 0,
  stock_maximo    INTEGER,
  costo           NUMERIC(15,2),             -- Costo unitario (no expuesto localmente aún)
  imagen_url      TEXT,
  
  -- Sincronización
  sync_status     VARCHAR(20) DEFAULT 'synced',
  last_synced_at  TIMESTAMP,
  sync_hash       VARCHAR(64),
  
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(tenant_id, codigo)
);

CREATE INDEX idx_productos_tenant ON productos(tenant_id);
CREATE INDEX idx_productos_codigo ON productos(tenant_id, codigo);
```

### 2.6 `vendedores` — Vendedores del Tenant

```sql
CREATE TABLE vendedores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  local_id    INTEGER,
  nombre      VARCHAR(255) NOT NULL,
  apellido    VARCHAR(255) NOT NULL,
  email       VARCHAR(255),
  telefono    VARCHAR(50),
  comision    NUMERIC(5,2) DEFAULT 0,
  activo      BOOLEAN DEFAULT true,
  
  -- Sincronización
  sync_status     VARCHAR(20) DEFAULT 'synced',
  last_synced_at  TIMESTAMP,
  sync_hash       VARCHAR(64),
  
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendedores_tenant ON vendedores(tenant_id);
```

### 2.7 `documentos` — Documentos Tributarios Electrónicos (Facturas, Boletas, NC, ND, Guías)

```sql
CREATE TABLE documentos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  local_id              INTEGER,
  
  -- Identificación del documento
  tipo_documento        INTEGER NOT NULL,  -- 33=Factura, 34=Factura Exenta, 39=Boleta, 
                                           -- 52=Guía, 56=Nota Débito, 61=Nota Crédito
  folio                 INTEGER NOT NULL,
  
  -- Receptor (cliente)
  cliente_id            UUID REFERENCES clientes(id),
  cliente_rut           VARCHAR(20),           -- Desnormalizado para documentos ya emitidos
  cliente_razon_social  VARCHAR(255),
  cliente_giro          VARCHAR(255),
  cliente_direccion     VARCHAR(500),
  cliente_comuna        VARCHAR(100),
  
  -- Fechas
  fecha_emision         DATE NOT NULL,
  fecha_vencimiento     DATE,
  
  -- Montos
  subtotal              NUMERIC(15,2) NOT NULL,
  monto_exento          NUMERIC(15,2) DEFAULT 0,
  descuento_global      NUMERIC(15,2) DEFAULT 0,
  iva                   NUMERIC(15,2) NOT NULL DEFAULT 0,
  total                 NUMERIC(15,2) NOT NULL,
  
  -- Pago
  forma_pago            VARCHAR(50) DEFAULT 'contado',
  forma_pago_detalle    VARCHAR(50),    -- efectivo, transferencia, cheque, tarjeta
  condiciones_pago      TEXT,
  orden_compra          VARCHAR(100),
  
  -- Vendedor
  vendedor_id           UUID REFERENCES vendedores(id),
  
  -- Estado
  estado                VARCHAR(20) DEFAULT 'pendiente',
                        -- 'borrador', 'pendiente', 'emitida', 'pagada', 'parcial', 
                        -- 'anulada', 'rechazada'
  
  -- SII
  sii_track_id          VARCHAR(100),
  sii_estado            VARCHAR(50),    -- 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'REPARO'
  sii_glosa             TEXT,           -- Detalle del estado SII
  sii_fecha_envio       TIMESTAMP,
  sii_fecha_respuesta   TIMESTAMP,
  
  -- XML y PDF
  xml_content           TEXT,            -- DTE XML completo firmado
  pdf_url               TEXT,            -- URL del PDF en storage
  
  -- Guía de despacho específico
  direccion_despacho    VARCHAR(500),
  fecha_despacho        DATE,
  transportista         VARCHAR(255),
  patente               VARCHAR(20),
  
  -- Observaciones
  observaciones         TEXT,
  
  -- Sincronización
  sync_status           VARCHAR(20) DEFAULT 'pending',
  last_synced_at        TIMESTAMP,
  sync_hash             VARCHAR(64),
  queued_at             TIMESTAMP,       -- Cuándo se encoló para sincronizar
  
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(tenant_id, tipo_documento, folio)
);

CREATE INDEX idx_documentos_tenant ON documentos(tenant_id);
CREATE INDEX idx_documentos_tipo_folio ON documentos(tenant_id, tipo_documento, folio);
CREATE INDEX idx_documentos_cliente ON documentos(cliente_id);
CREATE INDEX idx_documentos_fecha ON documentos(tenant_id, fecha_emision);
CREATE INDEX idx_documentos_estado ON documentos(tenant_id, estado);
CREATE INDEX idx_documentos_sii ON documentos(sii_track_id);
CREATE INDEX idx_documentos_sync ON documentos(tenant_id, sync_status);
```

### 2.8 `documento_items` — Líneas de Detalle

```sql
CREATE TABLE documento_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id      UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  numero_linea      INTEGER NOT NULL,
  producto_id       UUID REFERENCES productos(id),
  codigo_item       VARCHAR(100),
  descripcion       VARCHAR(500) NOT NULL,
  cantidad          NUMERIC(15,4) NOT NULL,
  unidad            VARCHAR(20) DEFAULT 'UN',
  precio_unitario   NUMERIC(15,2) NOT NULL,
  descuento         NUMERIC(5,2) DEFAULT 0,        -- Porcentaje
  descuento_monto   NUMERIC(15,2) DEFAULT 0,        -- En pesos
  monto_item        NUMERIC(15,2) NOT NULL,
  exento            BOOLEAN DEFAULT false,
  
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_items_documento ON documento_items(documento_id);
```

### 2.9 `referencias_documentos` — Referencias entre Documentos

```sql
CREATE TABLE referencias_documentos (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id                UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  tipo_documento_referencia   INTEGER NOT NULL,
  folio_referencia            INTEGER NOT NULL,
  fecha_referencia            DATE NOT NULL,
  razon_referencia            TEXT NOT NULL,
  codigo_referencia           INTEGER,
  detalle                     TEXT,
  created_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ref_docs_documento ON referencias_documentos(documento_id);
```

### 2.10 `pagos` — Pagos de Documentos

```sql
CREATE TABLE pagos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  local_id        INTEGER,
  documento_id    UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  monto           NUMERIC(15,2) NOT NULL,
  fecha_pago      DATE NOT NULL,
  forma_pago      VARCHAR(50) NOT NULL,    -- efectivo, transferencia, cheque, tarjeta, flow
  referencia      VARCHAR(255),
  observaciones   TEXT,
  
  -- Flow
  flow_order_id   VARCHAR(100),
  flow_status     VARCHAR(50),
  
  -- Sincronización
  sync_status     VARCHAR(20) DEFAULT 'synced',
  last_synced_at  TIMESTAMP,
  
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pagos_tenant ON pagos(tenant_id);
CREATE INDEX idx_pagos_documento ON pagos(documento_id);
```

### 2.11 `folios_caf` — CAF (Código de Autorización de Folios) del SII

```sql
CREATE TABLE folios_caf (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo_documento    INTEGER NOT NULL,
  desde             INTEGER NOT NULL,
  hasta             INTEGER NOT NULL,
  actual            INTEGER NOT NULL,
  caf_xml           TEXT NOT NULL,           -- XML del CAF firmado por el SII
  estado            VARCHAR(20) DEFAULT 'activo', -- 'activo', 'agotado', 'revocado'
  
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(tenant_id, tipo_documento, desde)
);

CREATE INDEX idx_folios_tenant ON folios_caf(tenant_id, tipo_documento);
```

### 2.12 `sync_queue` — Cola de Sincronización Persistente

```sql
CREATE TABLE sync_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Operación
  entity_type     VARCHAR(50) NOT NULL,  -- 'cliente', 'producto', 'documento', 'vendedor', 'pago'
  entity_local_id INTEGER NOT NULL,       -- ID local en SQLite
  operation       VARCHAR(20) NOT NULL,   -- 'create', 'update', 'delete'
  payload         JSONB NOT NULL,          -- Datos completos de la entidad
  
  -- Estado
  status          VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed', 'conflict'
  attempts        INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 5,
  last_error      TEXT,
  
  -- Timestamps
  queued_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMP,
  next_retry_at   TIMESTAMP
);

CREATE INDEX idx_sync_queue_tenant ON sync_queue(tenant_id, status);
CREATE INDEX idx_sync_queue_status ON sync_queue(status, next_retry_at);
```

### 2.13 `audit_log` — Auditoría General

```sql
CREATE TABLE audit_log (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id                 UUID REFERENCES users(id),
  accion                  VARCHAR(100) NOT NULL,
  entidad                 VARCHAR(50) NOT NULL,     -- 'usuario', 'cliente', 'documento', etc.
  entidad_id              VARCHAR(100),
  datos_anteriores        JSONB,
  datos_nuevos            JSONB,
  ip_address              VARCHAR(45),
  user_agent              TEXT,
  detalles                TEXT,
  timestamp               TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_timestamp ON audit_log(tenant_id, timestamp);
```

### 2.14 `subscriptions` — Historial de Suscripciones/Pagos

```sql
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan            VARCHAR(50) NOT NULL,
  monto           NUMERIC(10,2) NOT NULL,
  moneda          VARCHAR(3) DEFAULT 'CLP',
  estado          VARCHAR(20) NOT NULL,     -- 'pending', 'active', 'expired', 'cancelled'
  
  -- Flow
  flow_order_id   VARCHAR(100),
  flow_payment_id VARCHAR(100),
  flow_status     VARCHAR(50),
  
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE NOT NULL,
  
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
```

---

## 3. Autenticación y Tokens

### 3.1 Flujo de Registro (ONLINE OBLIGATORIO)

```
┌──────────┐         ┌──────────┐         ┌───────────┐
│ Electron │         │   API    │         │ PostgreSQL│
└────┬─────┘         └────┬─────┘         └─────┬─────┘
     │ POST /auth/register│                     │
     │ {email, password,  │                     │
     │  rut, nombre}      │                     │
     │───────────────────►│ Crear tenant        │
     │                    │────────────────────►│
     │                    │ Crear user (dueño)  │
     │                    │────────────────────►│
     │                    │                     │
     │ {accessToken,      │                     │
     │  refreshToken,     │                     │
     │  user, tenant}     │                     │
     │◄───────────────────│                     │
     │                    │                     │
     │ Guardar tokens     │                     │
     │ localmente         │                     │
     │ (keytar + memory)  │                     │
     │                    │                     │
     │ Guardar user en    │                     │
     │ SQLite local       │                     │
```

**¿Por qué online obligatorio?**  
- La API crea el `tenant` (empresa) en PostgreSQL
- Genera los tokens JWT
- Valida que el email/RUT no estén duplicados globalmente
- Sin esto, no hay identidad en el servidor ni posibilidad de sincronizar después

### 3.2 Flujo de Login

#### Caso A: CON internet (preferido)

```
Electron ──► POST /auth/login {email, password}
         ◄── {accessToken (15min), refreshToken (30d), user}
         ──► Guardar tokens
         ──► Actualizar user local si cambió
```

#### Caso B: SIN internet (offline login)

```
Electron ──► Verificar password_hash local (bcrypt)
         ──► Si coincide → iniciar sesión localmente
         ──► Marcar sesión como "offline"
         ──► Cuando vuelva internet:
             ──► POST /auth/login → obtener tokens frescos
             ──► Adjuntar tokens a las operaciones en cola
```

**Lógica del login:**

```javascript
// Pseudocódigo del flujo de login
async function login(email, password) {
  // 1. INTENTAR login online
  try {
    const apiResult = await api.auth.login(email, password);
    if (apiResult.success) {
      saveTokens(apiResult.accessToken, apiResult.refreshToken);
      updateLocalUser(apiResult.user);
      return { success: true, mode: 'online', user: apiResult.user };
    }
  } catch (networkError) {
    // Sin conexión, pasar a modo offline
  }
  
  // 2. FALLBACK: login offline contra SQLite local
  const localUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!localUser) return { success: false, error: 'Usuario no encontrado' };
  
  const match = await bcrypt.compare(password, localUser.password_hash);
  if (!match) return { success: false, error: 'Contraseña incorrecta' };
  
  return { 
    success: true, 
    mode: 'offline', 
    user: localUser,
    needsSync: true  // Indicar que hay que sincronizar cuando haya internet
  };
}
```

### 3.3 Estructura de los Tokens

**Access Token (JWT)** — 15 minutos

```json
{
  "sub": "uuid-user-id",
  "email": "user@example.com",
  "tenantId": "uuid-tenant-id",
  "rol": "dueño",
  "machineId": "abc123...",
  "iat": 1709700000,
  "exp": 1709700900
}
```

**Refresh Token** — 30 días
- Almacenado en `keytar` (Keychain en macOS, Credential Vault en Windows)
- En el servidor se guarda hasheado (SHA-256) en la tabla `refresh_tokens`

### 3.4 Renovación de Token

```
Electron ──► POST /auth/refresh {refreshToken}
         ◄── {accessToken (nuevo, 15min), refreshToken (rotado, 30d)}
```

La renovación se ejecuta automáticamente:
- Antes de cada request a la API si el access token está a punto de expirar
- Al volver de modo offline
- Al abrir la aplicación si hay refresh token almacenado

---

## 4. Endpoints de la API

### 4.1 Auth — Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Registro inicial (crea tenant + user dueño) | No |
| `POST` | `/api/auth/login` | Iniciar sesión | No |
| `POST` | `/api/auth/refresh` | Renovar access token | Refresh Token |
| `POST` | `/api/auth/logout` | Cerrar sesión (revocar refresh) | Bearer |
| `GET`  | `/api/auth/me` | Obtener perfil actual | Bearer |
| `POST` | `/api/auth/change-password` | Cambiar contraseña | Bearer |
| `POST` | `/api/auth/forgot-password` | Solicitar reset (envía email) | No |
| `POST` | `/api/auth/reset-password` | Ejecutar reset con token | No |

**Registro — `POST /api/auth/register`**

```json
// Request
{
  "email": "admin@empresa.cl",
  "password": "m1Clave$egura",
  "rut": "76.543.210-K",
  "nombre": "Juan Pérez",
  "razon_social": "Empresa SpA",       // Opcional en registro inicial
  "giro": "Venta de software"          // Opcional en registro inicial
}

// Response 201
{
  "success": true,
  "accessToken": "eyJhbG...",
  "refreshToken": "dGhpcyB...",
  "user": {
    "id": "uuid",
    "email": "admin@empresa.cl",
    "nombre": "Juan Pérez",
    "rol": "dueño"
  },
  "tenant": {
    "id": "uuid",
    "rut": "76.543.210-K",
    "razon_social": "Empresa SpA",
    "plan": "trial"
  }
}
```

### 4.2 Users — Gestión de Usuarios del Tenant

| Método | Endpoint | Descripción | Auth | Rol Mínimo |
|--------|----------|-------------|------|------------|
| `GET`    | `/api/users` | Listar usuarios del tenant | Bearer | admin |
| `GET`    | `/api/users/:id` | Obtener usuario | Bearer | admin |
| `POST`   | `/api/users` | Crear usuario | Bearer | dueño/admin |
| `PUT`    | `/api/users/:id` | Actualizar usuario | Bearer | dueño/admin |
| `PATCH`  | `/api/users/:id/toggle-active` | Activar/desactivar | Bearer | dueño/admin |
| `PATCH`  | `/api/users/:id/password` | Cambiar contraseña de otro | Bearer | dueño |
| `PATCH`  | `/api/users/:id/permissions` | Actualizar permisos | Bearer | dueño |
| `DELETE` | `/api/users/:id` | Eliminar usuario | Bearer | dueño |

**Crear usuario — `POST /api/users`**

```json
// Request
{
  "email": "vendedor1@empresa.cl",
  "password": "vendedor123!",
  "nombre": "María González",
  "rut": "12.345.678-9",
  "rol": "vendedor",
  "permisos": {}  // Opcional, usa los del rol si no se especifican
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "vendedor1@empresa.cl",
    "nombre": "María González",
    "rol": "vendedor",
    "permisos": { "facturas": {"crear": true, "ver": true, ...}, ... }
  }
}
```

### 4.3 Clientes

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET`    | `/api/clientes` | Listar clientes | Bearer |
| `GET`    | `/api/clientes/:id` | Obtener cliente | Bearer |
| `GET`    | `/api/clientes/search?q=term` | Buscar clientes | Bearer |
| `POST`   | `/api/clientes` | Crear cliente | Bearer |
| `PUT`    | `/api/clientes/:id` | Actualizar cliente | Bearer |
| `DELETE` | `/api/clientes/:id` | Eliminar cliente | Bearer |
| `GET`    | `/api/clientes/:id/estado-cuenta` | Estado de cuenta | Bearer |
| `POST`   | `/api/clientes/sync` | Sincronización batch | Bearer |

**Crear cliente — `POST /api/clientes`**

```json
// Request
{
  "rut": "98.765.432-1",
  "razon_social": "Cliente SA",
  "giro": "Venta al detalle",
  "direccion": "Av. Principal 123",
  "comuna": "Santiago",
  "ciudad": "Santiago",
  "region": "Metropolitana",
  "telefono": "+56912345678",
  "email": "contacto@cliente.cl",
  "tipo_documento": "rut_empresa",
  "condicion_pago": "credito_30",
  "dias_credito": 30,
  "limite_credito": 5000000,
  "local_id": 15       // ID local en SQLite para mapeo de sincronización
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid-server",
    "local_id": 15,
    "rut": "98.765.432-1",
    "razon_social": "Cliente SA",
    "...": "..."
  }
}
```

### 4.4 Productos

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET`    | `/api/productos` | Listar productos | Bearer |
| `GET`    | `/api/productos/:id` | Obtener producto | Bearer |
| `GET`    | `/api/productos/search?q=term` | Buscar productos | Bearer |
| `POST`   | `/api/productos` | Crear producto | Bearer |
| `PUT`    | `/api/productos/:id` | Actualizar producto | Bearer |
| `PATCH`  | `/api/productos/:id/stock` | Actualizar stock | Bearer |
| `DELETE` | `/api/productos/:id` | Eliminar producto | Bearer |
| `POST`   | `/api/productos/sync` | Sincronización batch | Bearer |

### 4.5 Vendedores

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET`    | `/api/vendedores` | Listar vendedores | Bearer |
| `GET`    | `/api/vendedores/:id` | Obtener vendedor | Bearer |
| `POST`   | `/api/vendedores` | Crear vendedor | Bearer |
| `PUT`    | `/api/vendedores/:id` | Actualizar vendedor | Bearer |
| `DELETE` | `/api/vendedores/:id` | Eliminar vendedor | Bearer |
| `POST`   | `/api/vendedores/sync` | Sincronización batch | Bearer |

### 4.6 Documentos Tributarios

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET`    | `/api/documentos` | Listar documentos (filtros: tipo, fecha, estado) | Bearer |
| `GET`    | `/api/documentos/:id` | Obtener documento con items | Bearer |
| `POST`   | `/api/documentos` | Crear/sincronizar documento | Bearer |
| `PUT`    | `/api/documentos/:id` | Actualizar documento | Bearer |
| `PATCH`  | `/api/documentos/:id/estado` | Cambiar estado | Bearer |
| `POST`   | `/api/documentos/:id/emitir` | Emitir al SII | Bearer |
| `GET`    | `/api/documentos/:id/pdf` | Descargar PDF | Bearer |
| `GET`    | `/api/documentos/:id/xml` | Descargar XML | Bearer |
| `POST`   | `/api/documentos/sync` | Sincronización batch | Bearer |

**Crear documento — `POST /api/documentos`**

```json
// Request
{
  "tipo_documento": 33,
  "folio": 125,
  "cliente_id": "uuid",
  "cliente_rut": "98.765.432-1",
  "cliente_razon_social": "Cliente SA",
  "fecha_emision": "2026-03-06",
  "fecha_vencimiento": "2026-04-05",
  "forma_pago": "credito",
  "subtotal": 100000,
  "monto_exento": 0,
  "descuento_global": 0,
  "iva": 19000,
  "total": 119000,
  "observaciones": "Factura de marzo",
  "items": [
    {
      "numero_linea": 1,
      "codigo_item": "PROD-001",
      "descripcion": "Producto A",
      "cantidad": 10,
      "unidad": "UN",
      "precio_unitario": 10000,
      "descuento": 0,
      "monto_item": 100000,
      "exento": false
    }
  ],
  "local_id": 45
}
```

### 4.7 Pagos

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET`    | `/api/pagos/documento/:docId` | Pagos de un documento | Bearer |
| `POST`   | `/api/pagos` | Registrar pago | Bearer |
| `DELETE` | `/api/pagos/:id` | Eliminar pago | Bearer |
| `GET`    | `/api/pagos/cuentas-por-cobrar` | Reporte cuentas por cobrar | Bearer |
| `POST`   | `/api/pagos/sync` | Sincronización batch | Bearer |

### 4.8 Folios (SII)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET`    | `/api/folios` | Listar folios activos | Bearer |
| `POST`   | `/api/folios/upload-caf` | Subir CAF del SII | Bearer |
| `GET`    | `/api/folios/:tipo/next` | Obtener siguiente folio | Bearer |

### 4.9 SII — Integración con el Servicio de Impuestos Internos

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST`   | `/api/sii/enviar-dte` | Enviar DTE al SII | Bearer |
| `GET`    | `/api/sii/consultar/:trackId` | Consultar estado DTE | Bearer |
| `POST`   | `/api/sii/generar-pdf/:folio` | Generar PDF timbrado | Bearer |
| `POST`   | `/api/sii/firmar-xml` | Firmar XML con certificado digital | Bearer |
| `POST`   | `/api/sii/obtener-token` | Obtener token SII (semilla) | Bearer |

### 4.10 Sincronización

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST`   | `/api/sync/push` | Enviar operaciones en cola | Bearer |
| `GET`    | `/api/sync/pull?since=timestamp` | Descargar cambios desde timestamp | Bearer |
| `POST`   | `/api/sync/resolve-conflict` | Resolver conflicto manualmente | Bearer |
| `GET`    | `/api/sync/status` | Estado de sincronización | Bearer |

**Push batch — `POST /api/sync/push`**

```json
// Request — Enviar todas las operaciones en cola
{
  "operations": [
    {
      "id": "local-queue-uuid",
      "entity_type": "cliente",
      "entity_local_id": 15,
      "operation": "create",
      "payload": { "rut": "12.345.678-9", "razon_social": "Nuevo Cliente", "..." : "..." },
      "queued_at": "2026-03-06T10:30:00Z"
    },
    {
      "id": "local-queue-uuid-2",
      "entity_type": "documento",
      "entity_local_id": 45,
      "operation": "create",
      "payload": { "tipo_documento": 33, "folio": 125, "...": "..." },
      "queued_at": "2026-03-06T10:31:00Z"
    }
  ]
}

// Response
{
  "success": true,
  "results": [
    { "local_id": 15, "server_id": "uuid", "status": "created" },
    { "local_id": 45, "server_id": "uuid", "status": "created" }
  ],
  "conflicts": [],
  "failed": []
}
```

### 4.11 Reportes

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/reportes/ventas?desde=&hasta=` | Reporte de ventas | Bearer |
| `GET` | `/api/reportes/tributario?periodo=` | Reporte tributario (IVA) | Bearer |
| `GET` | `/api/reportes/productos/mas-vendidos` | Top productos | Bearer |
| `GET` | `/api/reportes/clientes/ranking` | Ranking clientes | Bearer |
| `GET` | `/api/reportes/caja?fecha=` | Resumen de caja | Bearer |
| `GET` | `/api/reportes/dashboard` | Datos para dashboard | Bearer |

### 4.12 Licencias y Suscripciones

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST`   | `/api/licencias/validate` | Validar licencia | Bearer |
| `GET`    | `/api/licencias/status` | Estado de la licencia | Bearer |
| `POST`   | `/api/licencias/activate` | Activar licencia con key | Bearer |

### 4.13 Flow — Pagos de Suscripción

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST`   | `/api/flow/create-order` | Crear orden de pago | Bearer |
| `GET`    | `/api/flow/status/:orderId` | Consultar estado | Bearer |
| `POST`   | `/api/flow/webhook` | Webhook de Flow (confirmación) | Flow signature |
| `GET`    | `/api/flow/return` | Página de retorno post-pago | - |

### 4.14 Tenant (Empresa)

| Método | Endpoint | Descripción | Auth | Rol Mínimo |
|--------|----------|-------------|------|------------|
| `GET`    | `/api/tenant` | Obtener datos del tenant | Bearer | cualquiera |
| `PUT`    | `/api/tenant` | Actualizar datos empresa | Bearer | dueño |
| `PUT`    | `/api/tenant/sii-config` | Configurar datos SII | Bearer | dueño |
| `POST`   | `/api/tenant/upload-certificado` | Subir certificado digital | Bearer | dueño |
| `POST`   | `/api/tenant/upload-logo` | Subir logo | Bearer | dueño |

### 4.15 Backup en la Nube

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST`   | `/api/backup/upload` | Subir backup SQLite | Bearer |
| `GET`    | `/api/backup/list` | Listar backups en la nube | Bearer |
| `GET`    | `/api/backup/download/:id` | Descargar backup | Bearer |
| `DELETE` | `/api/backup/:id` | Eliminar backup | Bearer |

---

## 5. Análisis Offline vs Online

### 5.1 Clasificación de Operaciones

#### 🔴 ONLINE OBLIGATORIO (sin internet = bloqueado)

| Operación | Razón |
|-----------|-------|
| **Registro inicial** (primer usuario) | Crea el tenant en la API, genera tokens, valida email/RUT globalmente. Sin esto no hay identidad. |
| **Pago de suscripción (Flow)** | Flow requiere conexión al gateway de pagos. No tiene modo offline. |
| **Subir certificado digital SII** | Se almacena encriptado en el servidor para firmar DTEs. |
| **Solicitar CAF (folios) al SII** | El SII solo entrega folios por internet. |
| **Emitir DTE al SII** | El envío al SII requiere conexión. Sin embargo, el documento se puede *crear* offline y *emitir* cuando vuelva la conexión. |
| **Consultar estado DTE en el SII** | API del SII solo funciona online. |
| **Validar licencia** (primera vez) | Requiere verificar contra la API que la licencia es válida. |
| **Recuperar contraseña** | Envía email, requiere acceso al servidor de correo. |

#### 🟡 OFFLINE CON COLA (funciona offline, se sincroniza después)

| Operación | Comportamiento Offline | Al Reconectar |
|-----------|----------------------|---------------|
| **Login** | Verifica contra hash local (bcrypt). Inicia sesión marcada como "offline". | Autentica contra API, obtiene tokens frescos, adjunta tokens a operaciones en cola. |
| **Crear/editar clientes** | Se guarda en SQLite local. Se encola operación de sync. | Se envía a la API vía `/api/sync/push`. Si hay conflicto (otro dispositivo editó), se resuelve. |
| **Crear/editar productos** | Igual que clientes. SQLite local + cola. | Sync push al servidor. |
| **Crear/editar vendedores** | Igual. Solo local + cola. | Sync push. |
| **Crear facturas/boletas/NC/ND/guías** | Se crean localmente con folio local. Se marca `sync_status = 'pending'`. | Se envía documento completo a la API. Si necesita emitirse al SII, la API lo hace en ese momento. |
| **Registrar pagos** | Se registra en SQLite. Se actualiza estado de factura local. | Se sincroniza pago con la API. |
| **Crear usuarios** (por el dueño) | Se crea el usuario en SQLite local. Se encola para crear en la API. | Se crea el usuario en PostgreSQL. Si el email ya existe (creado desde otro dispositivo), se maneja como conflicto. |
| **Generar PDF** | Se genera localmente (sin timbre SII). | Si requiere timbre, se regenera con timbre una vez que el SII acepte. |
| **Exportar a Excel** | 100% local, no necesita API. | N/A |
| **Importar desde Excel** | 100% local, datos van a SQLite. | Los datos importados se encolan para sincronizar. |
| **Backups locales** | Se crean localmente en disco. | Opcionalmente se puede subir el backup a la nube. |
| **Reportes** | Se generan desde SQLite local. | N/A (los reportes son de lectura). |

#### 🟢 100% OFFLINE (nunca necesitan internet)

| Operación | Razón |
|-----------|-------|
| **Ver dashboard** | Datos locales de SQLite. |
| **Buscar clientes/productos** | Búsqueda local. |
| **Ver facturas/documentos** | Datos locales. |
| **Gestión de caja** | Aperturas, cierres, movimientos — todo local. |
| **Configuración local** | Cambiar tema, módulos habilitados, etc. |
| **Ver/generar reportes** | Consultas sobre SQLite local. |
| **Cambiar contraseña** (offline) | Se actualiza hash bcrypt local. Se encola el cambio para la API. |
| **Punto de venta (POS)** | Funciona 100% offline con SQLite. |

### 5.2 Diagrama de Modo Offline

```
┌─────────────────────────── FLUJO OFFLINE ───────────────────────────┐
│                                                                      │
│  Usuario trabaja normalmente                                         │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────────────┐                                                │
│  │ Crear factura     │──── Se guarda en SQLite                       │
│  │ (offline)         │──── Se agrega a sync_queue local              │
│  └──────────────────┘──── Se marca sync_status = 'pending'          │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────────────┐                                                │
│  │ Crear cliente     │──── Se guarda en SQLite                       │
│  │ (offline)         │──── Se agrega a sync_queue local              │
│  └──────────────────┘                                                │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────────────┐   ¡INTERNET VUELVE!                           │
│  │ Se detecta        │◄─── Monitor de conectividad (cada 30s)       │
│  │ conexión          │                                               │
│  └──────────────────┘                                                │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────────────┐                                                │
│  │ 1. POST /auth/   │──── Obtener tokens frescos                    │
│  │    login          │                                               │
│  └──────────────────┘                                                │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────────────┐                                                │
│  │ 2. POST /sync/   │──── Enviar TODAS las operaciones en cola      │
│  │    push           │     con el token recién obtenido              │
│  └──────────────────┘                                                │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────────────┐                                                │
│  │ 3. Procesar       │──── Documentos se crean en PostgreSQL        │
│  │    respuestas     │──── Si necesitan SII, la API los emite       │
│  └──────────────────┘──── Se actualiza sync_status = 'synced'       │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────────────┐                                                │
│  │ 4. GET /sync/pull │──── Descargar cambios hechos en otros        │
│  │    ?since=...     │     dispositivos (si aplica)                  │
│  └──────────────────┘                                                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. Sistema de Cola de Sincronización

### 6.1 Cola Local (SQLite)

Se necesita agregar esta tabla al SQLite local de la app Electron:

```sql
-- Agregar a connection.js
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,        -- 'cliente', 'producto', 'documento', 'vendedor', 'pago', 'usuario'
  entity_local_id INTEGER NOT NULL, -- ID local de la entidad
  operation TEXT NOT NULL,          -- 'create', 'update', 'delete'
  payload TEXT NOT NULL,            -- JSON completo de la entidad
  status TEXT DEFAULT 'pending',    -- 'pending', 'processing', 'completed', 'failed'
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  queued_at TEXT NOT NULL,
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabla para mapeo de IDs locales ↔ servidor
CREATE TABLE IF NOT EXISTS id_map (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  local_id INTEGER NOT NULL,
  server_id TEXT NOT NULL,          -- UUID del servidor
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(entity_type, local_id)
);
```

### 6.2 Flujo de Encolamiento

```javascript
// Al crear un cliente sin internet:
async function crearClienteOffline(cliente) {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  // 1. Guardar en SQLite local
  const result = db.prepare('INSERT INTO clientes (...) VALUES (...)').run(...);
  
  // 2. Encolar para sincronización
  db.prepare(`
    INSERT INTO sync_queue (entity_type, entity_local_id, operation, payload, status, queued_at, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `).run('cliente', result.lastInsertRowid, 'create', JSON.stringify(cliente), now, now);
  
  return { success: true, data: { id: result.lastInsertRowid, ...cliente }, queued: true };
}
```

### 6.3 Procesamiento de la Cola

```javascript
async function procesarColaSync() {
  const db = getDatabase();
  const queue = db.prepare(
    "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY queued_at ASC"
  ).all();
  
  if (queue.length === 0) return { processed: 0 };
  
  // Primero obtener token fresco
  const tokens = await refreshTokens();
  if (!tokens) return { error: 'No se pudo autenticar' };
  
  // Agrupar por tipo para batch más eficiente
  const operations = queue.map(item => ({
    id: item.id,
    entity_type: item.entity_type,
    entity_local_id: item.entity_local_id,
    operation: item.operation,
    payload: JSON.parse(item.payload),
    queued_at: item.queued_at
  }));
  
  // Enviar batch al servidor
  const result = await fetch(`${API_BASE}/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.access}`
    },
    body: JSON.stringify({ operations })
  });
  
  const response = await result.json();
  
  // Procesar resultados
  for (const res of response.results) {
    // Actualizar sync_queue
    db.prepare("UPDATE sync_queue SET status = 'completed', processed_at = ? WHERE entity_local_id = ? AND entity_type = ?")
      .run(new Date().toISOString(), res.local_id, res.entity_type);
    
    // Guardar mapeo de IDs
    if (res.server_id) {
      db.prepare("INSERT OR REPLACE INTO id_map (entity_type, local_id, server_id, created_at) VALUES (?, ?, ?, ?)")
        .run(res.entity_type, res.local_id, res.server_id, new Date().toISOString());
    }
  }
  
  // Manejar conflictos
  for (const conflict of response.conflicts) {
    db.prepare("UPDATE sync_queue SET status = 'conflict', last_error = ? WHERE entity_local_id = ? AND entity_type = ?")
      .run(JSON.stringify(conflict), conflict.local_id, conflict.entity_type);
  }
  
  return { 
    processed: response.results.length,
    conflicts: response.conflicts.length,
    failed: response.failed.length
  };
}
```

### 6.4 Monitor de Conectividad

```javascript
// En el proceso principal de Electron
let isOnline = false;
let syncInterval = null;

function startConnectivityMonitor() {
  // Verificar cada 30 segundos
  syncInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE}/health`, { timeout: 5000 });
      const wasOffline = !isOnline;
      isOnline = response.ok;
      
      if (wasOffline && isOnline) {
        console.log('[SYNC] Conexión restaurada, procesando cola...');
        
        // 1. Re-autenticar
        await refreshTokensFromStore();
        
        // 2. Procesar cola
        const result = await procesarColaSync();
        console.log('[SYNC] Cola procesada:', result);
        
        // 3. Notificar al renderer
        mainWindow?.webContents.send('sync:status-changed', { 
          online: true, 
          synced: result 
        });
      }
    } catch {
      isOnline = false;
    }
  }, 30000);
}
```

---

## 7. Flujo Completo del Ciclo de Vida

### 7.1 Primera Vez (Setup)

```
1. Usuario descarga e instala la app Electron
2. Abre la app → ve RegisterPage
3. REQUIERE INTERNET ► Se registra con email + contraseña + RUT
4. La API crea:
   - tenant (empresa) en PostgreSQL
   - user con rol "dueño" en PostgreSQL
   - Devuelve accessToken + refreshToken
5. La app Electron:
   - Guarda tokens (keytar + memoria)
   - Crea user en SQLite local con rol "dueño"
   - Inicia base de datos local (tablas, folios iniciales)
6. Redirige al usuario al flujo de configuración inicial (perfil, módulos)
7. Usuario llega al Dashboard
```

### 7.2 Uso Normal Diario (Online)

```
1. Abre la app → LoginPage
2. Login: verifica contra API + actualiza local
3. Trabaja normalmente:
   - Crea clientes → local + API simultáneo
   - Crea facturas → local + API simultáneo
   - Genera PDFs → local
   - Emite al SII → API hace la comunicación con SII
4. Todo se guarda en SQLite Y en PostgreSQL en tiempo real
```

### 7.3 Uso Normal Diario (Sin Internet)

```
1. Abre la app → LoginPage
2. Login: verifica contra hash local (bcrypt)
3. Trabaja normalmente:
   - Crea clientes → solo local + encola
   - Crea facturas → solo local + encola (sin emitir al SII)
   - Genera PDFs → local (sin timbre SII)
   - Punto de Venta → funciona 100%
4. Indicador visual: 🔴 "Sin conexión — X operaciones pendientes"
5. Cuando vuelve internet:
   - La app detecta automáticamente
   - Obtiene tokens frescos
   - Envía toda la cola al servidor
   - Emite al SII los documentos pendientes
   - Indicador cambia: 🟢 "Conectado — Todo sincronizado"
```

### 7.4 Cierre de Sesión y Multi-Usuario

```
1. Dueño inicia sesión → crea vendedores desde "👥 Usuarios"
2. Dueño cierra sesión → aparece LoginPage
3. Vendedor inicia sesión con sus credenciales
4. Vendedor ve solo lo que sus permisos permiten:
   - SÍ: Crear facturas, ver productos
   - NO: Eliminar facturas, gestionar usuarios, configuración
5. Al cerrar sesión → otro usuario puede entrar
```

---

## 8. Manejo de Conflictos

### 8.1 Estrategia: Last Write Wins + Detección

```
Regla principal: El timestamp más reciente gana.
Excepción: Si ambos cambios ocurrieron dentro de una ventana de 5 minutos,
           se marca como conflicto para resolución manual.
```

### 8.2 Detección de Conflictos

```javascript
// En el servidor, al recibir un sync/push:
function detectConflict(serverEntity, incomingEntity) {
  if (!serverEntity) return null; // No hay conflicto, es nuevo
  
  const serverUpdated = new Date(serverEntity.updated_at);
  const incomingQueued = new Date(incomingEntity.queued_at);
  
  // Si el servidor fue actualizado DESPUÉS de que se encoló la operación
  if (serverUpdated > incomingQueued) {
    const diffMs = serverUpdated - incomingQueued;
    const diffMinutes = diffMs / 60000;
    
    if (diffMinutes < 5) {
      // Conflicto: ambos editaron casi al mismo tiempo
      return {
        type: 'concurrent_edit',
        server_version: serverEntity,
        local_version: incomingEntity.payload,
        resolution_needed: true
      };
    } else {
      // El servidor es más reciente, el cambio local se descarta
      return {
        type: 'stale_update',
        server_version: serverEntity,
        resolution_needed: false
      };
    }
  }
  
  return null; // Sin conflicto, la versión local es más reciente
}
```

### 8.3 Resolución

- **Documentos tributarios (facturas, boletas, NC, ND):** NUNCA se sobreescriben. Si hay duplicado de folio, se rechaza y se notifica.
- **Clientes y productos:** Last Write Wins por defecto. Conflictos dentro de 5 min se muestran al usuario para que elija.
- **Stock:** Se suman/restan los deltas, no se sobreescribe el valor absoluto.

---

## 9. Seguridad

### 9.1 Autenticación

| Capa | Mecanismo |
|------|-----------|
| Contraseñas | bcrypt con 10 salt rounds |
| Access Token | JWT RS256, expira en 15 minutos |
| Refresh Token | Token opaco (random bytes), hasheado en DB, expira en 30 días |
| Almacenamiento (Electron) | Access token en memoria, refresh token en keytar (Keychain/Credential Vault) |
| Certificado SII | Encriptado con AES-256-GCM en DB, clave derivada con PBKDF2 |

### 9.2 Autorización

```javascript
// Middleware de la API
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

function requirePermission(recurso, accion) {
  return (req, res, next) => {
    const permisos = req.user.permisos;
    if (req.user.rol === 'dueño') return next(); // Dueño = todo
    if (!permisos?.[recurso]?.[accion]) {
      return res.status(403).json({ error: `Permiso denegado: ${recurso}.${accion}` });
    }
    next();
  };
}

// Uso:
router.delete('/clientes/:id', requirePermission('clientes', 'eliminar'), deleteCliente);
router.post('/users', requireRole('dueño', 'administrador'), createUser);
```

### 9.3 Multi-Tenancy

```javascript
// Middleware que inyecta tenant_id en cada query
function tenantScope(req, res, next) {
  // El tenant_id viene del JWT
  req.tenantId = req.user.tenantId;
  next();
}

// Uso en queries:
const clientes = await db.query(
  'SELECT * FROM clientes WHERE tenant_id = $1',
  [req.tenantId]
);
```

### 9.4 Rate Limiting

```
- Auth endpoints: 5 intentos / 15 minutos por IP
- API general: 100 requests / minuto por tenant
- Sync push: 10 requests / minuto por tenant
- Upload: 5 MB máximo por archivo
```

---

## 10. Pagos con Flow

### 10.1 Flujo de Pago de Suscripción (ONLINE OBLIGATORIO)

```
┌──────────┐     ┌───────┐     ┌──────┐
│ Electron │     │  API  │     │ Flow │
└────┬─────┘     └───┬───┘     └──┬───┘
     │                │            │
     │ POST /flow/    │            │
     │ create-order   │            │
     │───────────────►│            │
     │                │ createOrder│
     │                │───────────►│
     │                │            │
     │                │ {url,      │
     │                │  orderNumber}
     │                │◄───────────│
     │ {paymentUrl}   │            │
     │◄───────────────│            │
     │                │            │
     │ Abrir browser  │            │
     │ con paymentUrl │            │
     │─────────────────────────────►│
     │                │            │
     │                │  Webhook   │
     │                │  /flow/    │
     │                │  webhook   │
     │                │◄───────────│
     │                │            │
     │                │ Activar    │
     │                │ licencia   │
     │                │            │
     │ (polling o     │            │
     │  push)         │            │
     │◄───────────────│            │
```

### 10.2 Planes y Precios

```javascript
const PLANES = {
  free: {
    nombre: 'Gratuito',
    precio: 0,
    max_usuarios: 1,
    max_documentos_mes: 20,
    backup_nube: false,
    soporte: 'comunidad'
  },
  basic: {
    nombre: 'Básico',
    precio: 9990,  // CLP/mes
    max_usuarios: 3,
    max_documentos_mes: 200,
    backup_nube: true,
    soporte: 'email'
  },
  pro: {
    nombre: 'Profesional',
    precio: 24990,  // CLP/mes
    max_usuarios: 10,
    max_documentos_mes: 1000,
    backup_nube: true,
    soporte: 'prioritario'
  },
  enterprise: {
    nombre: 'Empresarial',
    precio: 49990,  // CLP/mes
    max_usuarios: -1,  // Ilimitado
    max_documentos_mes: -1,
    backup_nube: true,
    soporte: 'dedicado'
  }
};
```

---

## 11. Integración SII

### 11.1 Flujo de Emisión de DTE

```
1. Documento creado localmente (con folio del CAF)
2. Si hay internet:
   a. POST /api/sii/firmar-xml → API firma el XML con certificado digital
   b. POST /api/sii/enviar-dte → API envía al SII
   c. SII responde con trackId
   d. Se actualiza el documento con sii_track_id
   e. Se consulta periódicamente GET /api/sii/consultar/:trackId
   f. Cuando el SII responde (ACEPTADO/RECHAZADO), se actualiza el estado
3. Si NO hay internet:
   a. Documento se marca como "pendiente_emision"
   b. Se encola para emitir cuando vuelva la conexión
   c. El PDF local se genera sin timbre electrónico
   d. Al reconectar → se firma, emite y actualiza
```

### 11.2 Ambientes SII

| Ambiente | URL | Uso |
|----------|-----|-----|
| Certificación | `https://maullin.sii.cl/` | Desarrollo y pruebas |
| Producción | `https://palena.sii.cl/` | Documentos reales |

---

## 12. Licencias

### 12.1 Validación

```
1. Primera apertura de la app (post-registro)
2. POST /api/licencias/validate con machine_id
3. API verifica:
   - ¿Licencia activa?
   - ¿No excede max dispositivos?
   - ¿No expirada?
4. Si válida → app funciona normalmente
5. Si expirada → modo read-only (puede ver pero no crear)
6. Si inválida → redirigir a página de compra/activación
```

### 12.2 Modo Trial

```
- 30 días gratis desde el registro
- Límite: 20 documentos, 1 usuario
- Al expirar: se necesita plan pago para seguir creando documentos
- Los datos locales NUNCA se pierden
```

---

## 13. Estado Actual vs Pendiente

### ✅ Implementado (funcional en Electron local)

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth (registro/login local) | ✅ | bcrypt, SQLite |
| Sistema de usuarios y roles | ✅ | 5 roles, permisos JSONB |
| CRUD Clientes | ✅ | Local + API parcial |
| CRUD Productos | ✅ | Local + API parcial |
| CRUD Vendedores | ✅ | Solo local |
| Facturas electrónicas (tipo 33) | ✅ | Local |
| Boletas | ✅ | Local |
| Guías de despacho | ✅ | Local |
| Notas de crédito/débito | ✅ | Local |
| Pagos / Cuentas por cobrar | ✅ | Local |
| Punto de Venta (POS) | ✅ | Local |
| Caja | ✅ | Local |
| Reportes | ✅ | Local |
| Exportar/Importar Excel | ✅ | Local |
| Backups locales | ✅ | Local |
| Configuración emisor | ✅ | Local |
| Folios (gestión local) | ✅ | Local |

### ⚠️ Parcialmente Implementado

| Módulo | Estado | Pendiente |
|--------|--------|-----------|
| API Auth (`services/api/auth.js`) | ⚠️ | register, login, changePassword, me — falta refresh token |
| API Clientes (`services/api/clientes.js`) | ⚠️ | CRUD básico — falta sync batch, delete |
| API Productos (`services/api/productos.js`) | ⚠️ | CRUD completo — **BUG: usa `getToken()` que no existe, debería ser `getAccessToken()`** |
| Sync Service (`services/sync-service.js`) | ⚠️ | Estructura creada pero todo es simulación |
| Sync IPC (`ipc/sync.js`) | ⚠️ | Handlers registrados pero apuntan a simulación |
| Token Store (`utils/tokenStore.js`) | ⚠️ | Funcional con keytar — falta auto-refresh |

### 🔴 No Implementado (pendiente para la API)

| Módulo | Prioridad | Descripción |
|--------|-----------|-------------|
| **Backend API REST (Express + PostgreSQL)** | 🔴 ALTA | El servidor completo no existe aún. Solo hay stubs del lado del cliente. |
| Cola de sincronización persistente | 🔴 ALTA | La tabla `sync_queue` local no existe. La cola actual es in-memory y se pierde. |
| Tabla `id_map` local | 🔴 ALTA | Mapeo de IDs locales ↔ servidor no existe. |
| API Documentos (`services/api/documentos.js`) | 🔴 ALTA | Archivo vacío |
| API Vendedores (`services/api/trabajadores.js`) | 🔴 ALTA | Archivo vacío |
| API Licencias (`services/api/licencias.js`) | 🔴 MEDIA | Archivo vacío |
| Refresh token automático | 🔴 ALTA | No hay interceptor que renueve el token |
| Login offline con fallback | 🔴 ALTA | El login actual falla si la API no responde |
| Monitor de conectividad | 🔴 MEDIA | No existe detección automática de conexión |
| Integración SII real | 🔴 MEDIA | Los handlers existen pero apuntan a un `api-client` no implementado |
| Integración Flow (pagos) | 🔴 MEDIA | No existe |
| Backups en la nube | 🟡 BAJA | No implementado |
| Multi-tenancy en API | 🔴 ALTA | La tabla `tenants` no existe |
| Manejo de conflictos | 🟡 MEDIA | No implementado |
| Rate limiting | 🟡 BAJA | No implementado |

### 🐛 Bugs Conocidos

| Bug | Archivo | Detalle |
|-----|---------|---------|
| `getToken()` no existe | `services/api/productos.js` | Debería ser `getAccessToken()`. Dos métodos (getProductos, getProductoById, updateProducto, deleteProducto) usan `tokenStore.getToken()` que retorna `undefined`. |
| CommonJS vs ESM | `ipc/sii.js`, `ipc/licenses.js` | Usan `require()` mientras el resto del proyecto usa `import`. Esto puede causar errores en runtime. |
| Sync queue en memoria | `services/sync-service.js` | La cola se pierde al cerrar la app. Debe ser persistente en SQLite. |

---

> **Próximo paso:** Implementar el servidor API REST (Express + PostgreSQL) siguiendo esta especificación, priorizando: Auth → Tenants → Users → Clientes → Productos → Documentos → Sync.
