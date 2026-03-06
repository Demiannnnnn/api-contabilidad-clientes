const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

// ============================================
// Bearer token authentication
// ============================================
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token de autenticación no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info from token
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      tenantId: decoded.tenantId,
      rol: decoded.rol,
      machineId: decoded.machineId,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }
    console.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, error: 'Error interno de autenticación' });
  }
};

// ============================================
// Role-based authorization
// ============================================
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }
    // Dueño has full access
    if (req.user.rol === 'dueño') return next();
    
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

// ============================================
// Permission-based authorization
// ============================================
function requirePermission(recurso, accion) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }
    // Dueño has full access
    if (req.user.rol === 'dueño') return next();
    // Admin has most access
    if (req.user.rol === 'administrador') return next();

    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) {
        return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
      }

      const permisos = typeof user.permisos === 'string' ? JSON.parse(user.permisos) : user.permisos;
      if (!permisos?.[recurso]?.[accion]) {
        return res.status(403).json({ success: false, error: `Permiso denegado: ${recurso}.${accion}` });
      }
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ success: false, error: 'Error verificando permisos' });
    }
  };
}

// ============================================
// Tenant scope — injects tenantId
// ============================================
function tenantScope(req, res, next) {
  if (!req.user || !req.user.tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant no identificado' });
  }
  req.tenantId = req.user.tenantId;
  next();
}

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  tenantScope,
};
