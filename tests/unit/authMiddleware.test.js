jest.mock('../../src/config/database', () => ({ user: { findUnique: jest.fn() } }));

const jwt = require('jsonwebtoken');
const prisma = require('../../src/config/database');
const { authenticate, requireRole, requirePermission, userScope } = require('../../src/middleware/authMiddleware');

const SECRET = 'mw-secret';
beforeAll(() => { process.env.JWT_SECRET = SECRET; });
beforeEach(() => jest.clearAllMocks());

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('authenticate', () => {
  test('sin header -> 401', async () => {
    const res = mockRes(); const next = jest.fn();
    await authenticate({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('token válido adjunta req.user', async () => {
    const token = jwt.sign({ sub: 7, email: 'a@b.cl', rol: 'cajero', machineId: 'm' }, SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();
    await authenticate(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 7, email: 'a@b.cl', rol: 'cajero', machineId: 'm' });
  });

  test('token expirado -> 401 TOKEN_EXPIRED', async () => {
    const token = jwt.sign({ sub: 7, exp: Math.floor(Date.now() / 1000) - 10 }, SECRET);
    const res = mockRes();
    await authenticate({ headers: { authorization: `Bearer ${token}` } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].code).toBe('TOKEN_EXPIRED');
  });

  test('firma inválida -> 401', async () => {
    const token = jwt.sign({ sub: 7 }, 'otro-secreto');
    const res = mockRes();
    await authenticate({ headers: { authorization: `Bearer ${token}` } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error).toBe('Token inválido');
  });
});

describe('requireRole', () => {
  test('dueño siempre pasa', () => {
    const next = jest.fn();
    requireRole('contador')({ user: { rol: 'dueño' } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('rol permitido pasa, otro -> 403, sin user -> 401', () => {
    const next = jest.fn();
    requireRole('cajero', 'vendedor')({ user: { rol: 'cajero' } }, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);

    const res = mockRes();
    requireRole('cajero')({ user: { rol: 'vendedor' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);

    const res2 = mockRes();
    requireRole('cajero')({}, res2, next);
    expect(res2.status).toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('requirePermission', () => {
  test('dueño y administrador no consultan la BD', async () => {
    const next = jest.fn();
    await requirePermission('facturas', 'emitir')({ user: { rol: 'administrador' } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test('permiso presente en JSON string -> next', async () => {
    prisma.user.findUnique.mockResolvedValue({ permisos: JSON.stringify({ facturas: { emitir: true } }) });
    const next = jest.fn();
    await requirePermission('facturas', 'emitir')({ user: { id: 1, rol: 'vendedor' } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('permiso ausente -> 403', async () => {
    prisma.user.findUnique.mockResolvedValue({ permisos: { facturas: { ver: true } } });
    const res = mockRes();
    await requirePermission('facturas', 'emitir')({ user: { id: 1, rol: 'vendedor' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('usuario borrado -> 401; error de BD -> 500', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await requirePermission('a', 'b')({ user: { id: 1, rol: 'cajero' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    prisma.user.findUnique.mockRejectedValue(new Error('db down'));
    const res2 = mockRes();
    await requirePermission('a', 'b')({ user: { id: 1, rol: 'cajero' } }, res2, jest.fn());
    expect(res2.status).toHaveBeenCalledWith(500);
  });
});

describe('userScope', () => {
  test('copia el id del usuario a userId y tenantId', () => {
    const req = { user: { id: 4 } }; const next = jest.fn();
    userScope(req, mockRes(), next);
    expect(req.userId).toBe(4);
    expect(req.tenantId).toBe(4);
    expect(next).toHaveBeenCalled();
  });

  test('sin usuario -> 401', () => {
    const res = mockRes();
    userScope({}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
