const crypto = require('crypto');

// ============================================
// RUT validation (Módulo 11)
// ============================================
const rutRegex = /^\d{1,8}-[\dkK]$/;

function limpiarRut(rut) {
  return rut.replace(/\./g, '').replace(/\s/g, '').trim();
}

function validarRut(rut) {
  const limpio = limpiarRut(rut);
  if (!rutRegex.test(limpio)) return false;
  const [cuerpo, dv] = limpio.split('-');
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const dvEsperado = 11 - (suma % 11);
  const dvFinal = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'k' : String(dvEsperado);
  return dv.toLowerCase() === dvFinal;
}

function formatearRut(rut) {
  const limpio = limpiarRut(rut);
  if (!rutRegex.test(limpio)) return rut;
  return limpio; // Returns clean format: 12345678-9
}

// ============================================
// Token helpers
// ============================================
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

// ============================================
// Sync hash
// ============================================
function generateSyncHash(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ============================================
// Misc
// ============================================
function sanitizeEmail(email) {
  return email ? email.trim().toLowerCase() : '';
}

function excludeFields(obj, fields) {
  const result = { ...obj };
  for (const field of fields) {
    delete result[field];
  }
  return result;
}

// Remove password fields from user objects
function sanitizeUser(user) {
  if (!user) return null;
  return excludeFields(user, ['passwordHash', 'password_hash']);
}

// Pagination helper
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

module.exports = {
  limpiarRut,
  validarRut,
  formatearRut,
  hashToken,
  generateRefreshToken,
  generateSyncHash,
  sanitizeEmail,
  excludeFields,
  sanitizeUser,
  parsePagination,
};
