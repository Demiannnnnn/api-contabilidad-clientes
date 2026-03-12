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
    // Administrador has most access
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
// User scope — injects userId from token
// ============================================
function userScope(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, error: 'Usuario no identificado' });
  }
  req.userId = req.user.id;
  req.tenantId = req.user.id; // backward compat — maps to userId in Prisma
  next();
}

// ============================================
// Validate Machine Access — ensures user belongs to machineId
// ============================================
async function validateMachineAccess(req, res, next) {
  if (!req.user || !req.user.machineId) {
    // No machineId in token, skip validation (backward compatibility)
    return next();
  }

  try {
    const binding = await prisma.machineBinding.findUnique({
      where: { machineId: req.user.machineId },
    });

    if (!binding) {
      return res.status(403).json({
        success: false,
        error: 'Instancia no vinculada',
        code: 'MACHINE_NOT_BOUND',
      });
    }

    if (!binding.activo) {
      return res.status(403).json({
        success: false,
        error: 'Instancia desactivada',
        code: 'MACHINE_BINDING_INACTIVE',
      });
    }

    // Verificar que el usuario del token pertenece a esta máquina
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, duenoId: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
    }

    const perteneceAMaquina =
      user.id === binding.ownerId ||
      user.duenoId === binding.ownerId;

    if (!perteneceAMaquina) {
      return res.status(403).json({
        success: false,
        error: 'No autorizado para esta instancia',
        code: 'USER_NOT_AUTHORIZED_FOR_MACHINE',
      });
    }

    next();
  } catch (err) {
    console.error('Machine access validation error:', err);
    return res.status(500).json({ success: false, error: 'Error validando acceso' });
  }
}

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  userScope,
  tenantScope: userScope, // backward compat alias
  validateMachineAccess,
};
