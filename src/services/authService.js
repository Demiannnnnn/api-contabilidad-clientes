const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/authRepository');
const { validate, schemas } = require('./validationService');
const { sanitizeEmail, hashToken, generateRefreshToken, sanitizeUser, limpiarRut } = require('../utils/helpers');
const logger = require('../utils/logger');

const SALT_ROUNDS = 10;

class AuthService {
  // ============================================
  // Register — creates user
  // ============================================
  async register(data) {
    const validated = validate(schemas.register, data);
    const email = sanitizeEmail(validated.email);
    const rut = limpiarRut(validated.rut);

    // Check if email is already used
    const existingUser = await authRepository.findUserByEmailGlobal(email);
    if (existingUser) {
      const err = new Error('El email ya está registrado');
      err.status = 400;
      throw err;
    }

    // Check if RUT already exists
    const existingRut = await authRepository.findUserByRut(rut);
    if (existingRut) {
      const err = new Error('Ya existe un usuario registrado con ese RUT');
      err.status = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(validated.password, SALT_ROUNDS);

    // Create user — first user is dueño (owner/admin)
    const user = await authRepository.createUser({
      email,
      passwordHash,
      rut,
      nombre: validated.nombre,
      rol: 'dueño',
      permisos: JSON.stringify({
        facturas: { crear: true, ver: true, editar: true, eliminar: true, emitir: true, anular: true },
        boletas: { crear: true, ver: true, editar: true, eliminar: true, emitir: true, anular: true },
        clientes: { crear: true, ver: true, editar: true, eliminar: true },
        productos: { crear: true, ver: true, editar: true, eliminar: true },
        vendedores: { crear: true, ver: true, editar: true, eliminar: true },
        caja: { acceder: true, abrir: true, cerrar: true, ver_movimientos: true },
        reportes: { ver: true, exportar: true, financieros: true },
        configuracion: { acceder: true, empresa: true, folios: true, usuarios: true },
        documentos: { ver: true, anular: true, reenviar: true },
      }),
      activo: true,
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this._generateTokenPair(user, validated.machineId);

    logger.info(`[Auth] User registered: ${email}, id: ${user.id}`);

    return {
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
    };
  }

  // ============================================
  // Login
  // ============================================
  async login(data) {
    const validated = validate(schemas.login, data);
    const email = sanitizeEmail(validated.email);

    const user = await authRepository.findUserByEmailGlobal(email);
    if (!user) {
      const err = new Error('Credenciales inválidas');
      err.status = 401;
      throw err;
    }

    if (!user.activo) {
      const err = new Error('Cuenta desactivada. Contacta al administrador.');
      err.status = 403;
      throw err;
    }

    const isMatch = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isMatch) {
      const err = new Error('Credenciales inválidas');
      err.status = 401;
      throw err;
    }

    // Update last access
    await authRepository.updateUserLastAccess(user.id);

    // Generate tokens
    const { accessToken, refreshToken } = await this._generateTokenPair(user, validated.machineId);

    logger.info(`[Auth] User logged in: ${email}`);

    return {
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
    };
  }

  // ============================================
  // Refresh token
  // ============================================
  async refresh(refreshTokenValue) {
    if (!refreshTokenValue) {
      const err = new Error('Refresh token requerido');
      err.status = 400;
      throw err;
    }

    const tokenHash = hashToken(refreshTokenValue);
    const storedToken = await authRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      const err = new Error('Refresh token inválido');
      err.status = 401;
      throw err;
    }

    if (storedToken.expiresAt < new Date()) {
      await authRepository.revokeRefreshToken(storedToken.id);
      const err = new Error('Refresh token expirado');
      err.status = 401;
      throw err;
    }

    // Revoke old token (rotation)
    await authRepository.revokeRefreshToken(storedToken.id);

    const user = storedToken.user;
    if (!user || !user.activo) {
      const err = new Error('Usuario no activo');
      err.status = 403;
      throw err;
    }

    // Generate new pair
    const { accessToken, refreshToken } = await this._generateTokenPair(user, storedToken.machineId);

    return {
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
    };
  }

  // ============================================
  // Logout — revoke refresh token
  // ============================================
  async logout(userId) {
    await authRepository.revokeAllUserTokens(userId);
    logger.info(`[Auth] User logged out: ${userId}`);
  }

  // ============================================
  // Get profile
  // ============================================
  async getProfile(userId) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      const err = new Error('Usuario no encontrado');
      err.status = 404;
      throw err;
    }
    return sanitizeUser(user);
  }

  // ============================================
  // Change password
  // ============================================
  async changePassword(userId, data) {
    const validated = validate(schemas.changePassword, data);

    const user = await authRepository.findUserById(userId);
    if (!user) {
      const err = new Error('Usuario no encontrado');
      err.status = 404;
      throw err;
    }

    const isMatch = await bcrypt.compare(validated.oldPassword, user.passwordHash);
    if (!isMatch) {
      const err = new Error('Contraseña actual incorrecta');
      err.status = 400;
      throw err;
    }

    const newHash = await bcrypt.hash(validated.newPassword, SALT_ROUNDS);
    await authRepository.updateUserPassword(userId, newHash);

    // Revoke all refresh tokens (security)
    await authRepository.revokeAllUserTokens(userId);

    logger.info(`[Auth] Password changed for user: ${userId}`);
  }

  // ============================================
  // Internal: Generate access + refresh tokens
  // ============================================
  async _generateTokenPair(user, machineId) {
    // Access token (15min)
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        rol: user.rol,
        machineId: machineId || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
    );

    // Refresh token (30 days)
    const refreshTokenRaw = generateRefreshToken();
    const tokenHash = hashToken(refreshTokenRaw);
    const refreshDays = parseInt(process.env.REFRESH_TOKEN_DAYS) || 30;

    await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash,
      machineId: machineId || null,
      expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken: refreshTokenRaw };
  }
}

module.exports = new AuthService();
