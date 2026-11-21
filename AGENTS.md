# Contexto para Agentes de IA — api-contabilidad-clientes

## Propósito del Proyecto
API REST para el backend de un sistema multi-tenant de contabilidad, gestión de clientes, emisión de documentos tributarios (facturas, boletas, notas de crédito/débito), control de licencias, usuarios y sincronización de datos con aplicaciones cliente (desktop/móvil).

## Stack Tecnológico
- **Runtime:** Node.js (CommonJS)
- **Framework Web:** Express.js v5
- **ORM & Base de Datos:** Prisma v5 con PostgreSQL
- **Autenticación & Seguridad:** JWT (`jsonwebtoken`), contraseñas con `bcryptjs`, `helmet`, `cors`, `express-rate-limit`
- **Validación:** Zod
- **Logs:** Logger personalizado con registro en consola y archivos (`logs/`)

## Estructura del Directorio
```
├── docs/                 # Diagramas y especificaciones (ERD, etc.)
├── prisma/               # Esquema de Prisma (schema.prisma) y migraciones SQL
├── src/
│   ├── server.js         # Punto de entrada de la aplicación Express
│   ├── config/           # Instancia y configuración de base de datos (PrismaClient)
│   ├── controllers/      # Controladores HTTP (gestión de request/response)
│   ├── middleware/       # Autenticación JWT, control de roles/permisos, rate limiting
│   ├── repositories/     # Capa de acceso a datos usando PrismaClient
│   ├── routes/           # Definición y enrutamiento de endpoints por recurso
│   ├── services/         # Lógica de negocio y reglas de validación
│   └── utils/            # Helpers de formato (RUT, tokens), parseo y logger
├── .env.example          # Plantilla de variables de entorno documentadas
└── package.json          # Dependencias y scripts de ejecución
```

## Comandos Verificados
- **Instalación:** `npm install`
- **Generar cliente Prisma:** `npm run prisma:generate` (o `npx prisma generate`)
- **Migraciones de base de datos:** `npm run prisma:migrate` (o `npx prisma migrate dev`)
- **Desarrollo:** `npm run dev`
- **Producción:** `npm start`
- **Verificación de sintaxis:** `node --check src/server.js`

## Convenciones de Código
- **Módulos:** CommonJS estricto (`require` / `module.exports`).
- **Arquitectura en capas:** Ruta (`routes/`) ➔ Controlador (`controllers/`) ➔ Servicio (`services/`) ➔ Repositorio (`repositories/`).
- **Validación:** Todas las entradas deben ser validadas en la capa de servicios con esquemas Zod (`src/services/validationService.js`).
- **Nombres de variables y funciones:** CamelCase para funciones y variables (`validarRut`, `generateTokenPair`).
- **RUT chileno:** Sanitización con `limpiarRut` y validación con Módulo 11 (`validarRut`).

## Reglas de Seguridad
- **Secretos:** NUNCA quemar credenciales, passwords, JWT secrets ni connection strings en código ni configuración.
- **Variables de Entorno:** Toda credencial se inyecta mediante variables de entorno en mayúsculas (`process.env.JWT_SECRET`, `process.env.DATABASE_URL`).
- **Archivos Sensibles:** `.env`, `.env.local` y claves privadas NUNCA se versionan; deben mantenerse en `.gitignore`.
- **Sanitización:** En respuestas HTTP y logs, nunca devolver ni escribir hashes de contraseñas (`passwordHash`), tokens sensibles ni claves privadas.

## Flujo Git
- Las ramas de desarrollo deben seguir el patrón `dev/*`.
- Los Pull Requests e integraciones van dirigidos hacia `develop-AGENTS`.
- NUNCA commitear ni hacer merge directo contra `main` ni `develop`.
