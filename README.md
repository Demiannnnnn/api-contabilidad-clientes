# Server-Sistema-Contabiliadad-Clientes
Server API REST para sistema propio de contabilidad y clientes

## 🛠️ Tecnologías y Herramientas

### Backend
- **[Node.js](https://nodejs.org/)** - Entorno de ejecución para JavaScript
- **[Express](https://expressjs.com/)** v5.2.1 - Framework web minimalista y rápido
- **[Prisma](https://www.prisma.io/)** v7.3.0 - ORM moderno para Node.js y TypeScript
- **[PostgreSQL](https://www.postgresql.org/)** - Sistema de gestión de base de datos relacional

### Validación y Parseo
- **[Zod](https://zod.dev/)** v4.3.6 - Validación de esquemas con TypeScript-first
- **[fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)** v5.3.3 - Parser de XML de alto rendimiento

### Seguridad y Middleware
- **[CORS](https://www.npmjs.com/package/cors)** v2.8.6 - Middleware para habilitar CORS
- **[dotenv](https://github.com/motdotla/dotenv)** v17.2.3 - Carga variables de entorno desde archivos .env

### Desarrollo
- **[Nodemon](https://nodemon.io/)** v3.1.11 - Reinicio automático del servidor en desarrollo

## 📦 Instalación

```bash
# Instalar dependencias
npm install

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
│   └── schema.prisma          # Esquema de base de datos
├── src/
│   ├── server.js              # Punto de entrada
│   ├── config/                # Configuraciones
│   ├── controllers/           # Controladores de rutas
│   ├── middleware/            # Middlewares personalizados
│   ├── routes/                # Definición de rutas
│   ├── services/              # Lógica de negocio
│   └── utils/                 # Utilidades y helpers
└── tests/                     # Tests unitarios e integración
```

## 📝 Licencia

ISC
