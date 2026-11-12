# api-contabilidad-clientes

[![CI](https://github.com/Demiannnnnn/api-contabilidad-clientes/actions/workflows/ci.yml/badge.svg?branch=tests/unitarios-y-ci)](https://github.com/Demiannnnnn/api-contabilidad-clientes/actions/workflows/ci.yml)

Server API REST para sistema propio de contabilidad y clientes.

> [!WARNING]
> **Estado:** La capa de servicios y repositorios no coincide actualmente con el esquema de base de datos Prisma (`prisma/schema.prisma`). Para el diagnóstico detallado, inventario de desajustes y opciones de solución, consulta el [Plan de Alineación con Prisma](docs/PLAN_ALINEACION_PRISMA.md).

## 🛠️ Tecnologías y Herramientas

### Backend
- **[Node.js](https://nodejs.org/)** - Entorno de ejecución para JavaScript
- **[Express](https://expressjs.com/)** v5.2.1 - Framework web minimalista y rápido
- **[Prisma](https://www.prisma.io/)** v5.22.0 - ORM moderno para Node.js y TypeScript
- **[PostgreSQL](https://www.postgresql.org/)** - Sistema de gestión de base de datos relacional

### Validación y Parseo
- **[Zod](https://zod.dev/)** v4.3.6 - Validación de esquemas con TypeScript-first
- **[fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)** v5.3.3 - Parser de XML de alto rendimiento

### Seguridad y Middleware
- **[jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)** v9.0.3 - Manejo y verificación de tokens JWT
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** v3.0.3 - Hasheo de contraseñas
- **[helmet](https://helmetjs.github.io/)** v8.1.0 - Seguridad para cabeceras HTTP
- **[CORS](https://www.npmjs.com/package/cors)** v2.8.6 - Middleware para habilitar CORS
- **[dotenv](https://github.com/motdotla/dotenv)** v17.2.3 - Carga variables de entorno desde archivos .env

### Desarrollo y Testing
- **[Jest](https://jestjs.io/)** v29.7.0 - Framework de pruebas unitarias
- **[Nodemon](https://nodemon.io/)** v3.1.11 - Reinicio automático del servidor en desarrollo

## 📦 Instalación

```bash
# Instalar dependencias
npm ci

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales

# Generar cliente Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate
```

## 🚀 Uso

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

## 📁 Estructura del Proyecto

```
├── prisma/
│   ├── migrations/            # Migraciones de base de datos
│   └── schema.prisma          # Esquema de base de datos Prisma
├── src/
│   ├── server.js              # Punto de entrada de la aplicación
│   ├── config/                # Configuraciones (base de datos)
│   ├── controllers/           # Controladores de rutas
│   ├── middleware/            # Middlewares personalizados
│   ├── repositories/          # Capa de acceso a datos Prisma
│   ├── routes/                # Definición de rutas
│   ├── services/              # Lógica de negocio
│   └── utils/                 # Utilidades y helpers
├── docs/                      # Documentación
│   └── PLAN_ALINEACION_PRISMA.md
└── tests/                     # Tests unitarios con Jest
```

## 🧪 Tests y CI

Variables requeridas para build y tests:
```bash
export DATABASE_URL="postgresql://ci:ci@localhost:5432/ci?schema=public"
export JWT_SECRET="ci-secret"
export PUPPETEER_SKIP_DOWNLOAD="true"
```

Ejecutar build y pruebas:
```bash
npm run build   # prisma validate + generación del cliente Prisma
npm test        # tests unitarios con Jest (repositorios mockeados)
npm test -- --ci # tests en entorno CI
```

Los tests están en `tests/unit/` y cubren validaciones (Zod, RUT módulo 11), servicios (auth, documentos, pagos, folios, clientes, productos, vendedores) y middleware de autenticación. El workflow `.github/workflows/ci.yml` ejecuta build + tests en cada push y pull request.

## 📝 Licencia

ISC
