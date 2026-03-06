const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
  keyGenerator: (req) => {
    // Rate limit per tenant if authenticated, otherwise per IP
    return req.user?.tenantId || 'anonymous';
  },
});

// Auth endpoints rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados intentos de autenticación. Intenta en 15 minutos.' },
});

// Sync push rate limiter
const syncLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: 'Demasiadas operaciones de sincronización.' },
  keyGenerator: (req) => req.user?.tenantId || 'anonymous',
});

module.exports = { apiLimiter, authLimiter, syncLimiter };
