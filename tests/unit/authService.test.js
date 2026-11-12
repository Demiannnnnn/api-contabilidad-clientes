jest.mock('../../src/repositories/authRepository');
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('../../src/repositories/authRepository');
const authService = require('../../src/services/authService');
const { hashToken } = require('../../src/utils/helpers');

const SECRET = 'test-secret';

beforeAll(() => { process.env.JWT_SECRET = SECRET; });
beforeEach(() => {
  jest.resetAllMocks();
  authRepository.createRefreshToken.mockResolvedValue({});
});

describe('AuthService.register', () => {
  const input = { email: 'Nuevo@Mail.CL', password: 'secreto123', rut: '11.111.111-1', nombre: 'Ana' };

  test('crea al usuario como dueño con password hasheada y devuelve tokens', async () => {
    authRepository.findUserByEmailGlobal.mockResolvedValue(null);
    authRepository.findUserByRut.mockResolvedValue(null);
    authRepository.createUser.mockImplementation(async (d) => ({ id: 1, ...d }));

    const res = await authService.register(input);

    const created = authRepository.createUser.mock.calls[0][0];
    expect(created.email).toBe('nuevo@mail.cl');
    expect(created.rut).toBe('11111111-1');
    expect(created.rol).toBe('dueño');
    expect(await bcrypt.compare('secreto123', created.passwordHash)).toBe(true);
    expect(JSON.parse(created.permisos).facturas.emitir).toBe(true);

    expect(res.user.passwordHash).toBeUndefined();
    expect(jwt.verify(res.accessToken, SECRET)).toMatchObject({ sub: 1, rol: 'dueño' });
    const rt = authRepository.createRefreshToken.mock.calls[0][0];
    expect(rt.tokenHash).toBe(hashToken(res.refreshToken));
    expect(rt.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);
  });

  test('rechaza email duplicado', async () => {
    authRepository.findUserByEmailGlobal.mockResolvedValue({ id: 9 });
    await expect(authService.register(input)).rejects.toMatchObject({ status: 400, message: 'El email ya está registrado' });
    expect(authRepository.createUser).not.toHaveBeenCalled();
  });

  test('rechaza RUT duplicado', async () => {
    authRepository.findUserByEmailGlobal.mockResolvedValue(null);
    authRepository.findUserByRut.mockResolvedValue({ id: 9 });
    await expect(authService.register(input)).rejects.toMatchObject({ status: 400 });
  });

  test('datos inválidos -> 400 sin tocar el repositorio', async () => {
    await expect(authService.register({ email: 'x' })).rejects.toMatchObject({ status: 400 });
    expect(authRepository.findUserByEmailGlobal).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  let user;
  beforeAll(async () => {
    user = { id: 5, email: 'a@b.cl', rol: 'vendedor', activo: true, passwordHash: await bcrypt.hash('correcta', 4) };
  });

  test('login correcto actualiza último acceso y no expone el hash', async () => {
    authRepository.findUserByEmailGlobal.mockResolvedValue(user);
    const res = await authService.login({ email: 'A@B.cl', password: 'correcta', machineId: 'pc1' });
    expect(authRepository.findUserByEmailGlobal).toHaveBeenCalledWith('a@b.cl');
    expect(authRepository.updateUserLastAccess).toHaveBeenCalledWith(5);
    expect(res.user.passwordHash).toBeUndefined();
    expect(jwt.verify(res.accessToken, SECRET).machineId).toBe('pc1');
  });

  test('usuario inexistente o password incorrecta -> 401 con el mismo mensaje', async () => {
    authRepository.findUserByEmailGlobal.mockResolvedValue(null);
    await expect(authService.login({ email: 'a@b.cl', password: 'x' })).rejects.toMatchObject({ status: 401, message: 'Credenciales inválidas' });
    authRepository.findUserByEmailGlobal.mockResolvedValue(user);
    await expect(authService.login({ email: 'a@b.cl', password: 'x' })).rejects.toMatchObject({ status: 401, message: 'Credenciales inválidas' });
  });

  test('cuenta desactivada -> 403', async () => {
    authRepository.findUserByEmailGlobal.mockResolvedValue({ ...user, activo: false });
    await expect(authService.login({ email: 'a@b.cl', password: 'correcta' })).rejects.toMatchObject({ status: 403 });
  });
});

describe('AuthService.refresh', () => {
  test('sin token -> 400', async () => {
    await expect(authService.refresh()).rejects.toMatchObject({ status: 400 });
  });

  test('token desconocido -> 401', async () => {
    authRepository.findRefreshTokenByHash.mockResolvedValue(null);
    await expect(authService.refresh('abc')).rejects.toMatchObject({ status: 401, message: 'Refresh token inválido' });
    expect(authRepository.findRefreshTokenByHash).toHaveBeenCalledWith(hashToken('abc'));
  });

  test('token expirado se revoca y responde 401', async () => {
    authRepository.findRefreshTokenByHash.mockResolvedValue({ id: 3, expiresAt: new Date(Date.now() - 1000) });
    await expect(authService.refresh('abc')).rejects.toMatchObject({ status: 401, message: 'Refresh token expirado' });
    expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith(3);
  });

  test('rota el token: revoca el anterior y emite uno nuevo', async () => {
    authRepository.findRefreshTokenByHash.mockResolvedValue({
      id: 3, machineId: 'pc', expiresAt: new Date(Date.now() + 60000), user: { id: 5, activo: true, passwordHash: 'h' },
    });
    const res = await authService.refresh('viejo');
    expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith(3);
    expect(res.refreshToken).not.toBe('viejo');
    expect(res.user.passwordHash).toBeUndefined();
    expect(authRepository.createRefreshToken.mock.calls[0][0].machineId).toBe('pc');
  });

  test('usuario inactivo -> 403', async () => {
    authRepository.findRefreshTokenByHash.mockResolvedValue({ id: 3, expiresAt: new Date(Date.now() + 60000), user: { id: 5, activo: false } });
    await expect(authService.refresh('x')).rejects.toMatchObject({ status: 403 });
  });
});

describe('AuthService.changePassword / getProfile', () => {
  test('cambia password y revoca todas las sesiones', async () => {
    authRepository.findUserById.mockResolvedValue({ id: 5, passwordHash: await bcrypt.hash('vieja', 4) });
    await authService.changePassword(5, { oldPassword: 'vieja', newPassword: 'nueva12345' });
    const newHash = authRepository.updateUserPassword.mock.calls[0][1];
    expect(await bcrypt.compare('nueva12345', newHash)).toBe(true);
    expect(authRepository.revokeAllUserTokens).toHaveBeenCalledWith(5);
  });

  test('password actual incorrecta -> 400', async () => {
    authRepository.findUserById.mockResolvedValue({ id: 5, passwordHash: await bcrypt.hash('vieja', 4) });
    await expect(authService.changePassword(5, { oldPassword: 'otra', newPassword: 'nueva12345' })).rejects.toMatchObject({ status: 400 });
    expect(authRepository.updateUserPassword).not.toHaveBeenCalled();
  });

  test('perfil inexistente -> 404; existente sin hash', async () => {
    authRepository.findUserById.mockResolvedValue(null);
    await expect(authService.getProfile(1)).rejects.toMatchObject({ status: 404 });
    authRepository.findUserById.mockResolvedValue({ id: 1, passwordHash: 'h' });
    expect(await authService.getProfile(1)).toEqual({ id: 1 });
  });
});
