// SII Client - Estructura lista para integración futura
// Aquí irá la lógica de conexión con el SII (Servicio de Impuestos Internos)
const SiiClient = require ("./xmlGenerate")

const SiiClient = new FlowClient(
  process.env.SII_API_KEY,
  process.env.SII_SECRET_KEY,
  process.env.SII_API_URL || 'https://www.flow.cl/api'
);
module.exports = {};
