const {
  limpiarRut, validarRut, formatearRut, hashToken, generateRefreshToken,
  generateSyncHash, sanitizeEmail, excludeFields, sanitizeUser, parsePagination,
} = require('../../src/utils/helpers');

describe('helpers: RUT (módulo 11)', () => {
  test('limpiarRut quita puntos y espacios', () => {
    expect(limpiarRut(' 12.345.678-5 ')).toBe('12345678-5');
  });

  test.each([
    ['11.111.111-1'],
    ['12345678-5'],
    ['76.086.428-5'],
    ['10000013-K'],
    ['10000013-k'],
    ['1-9'],
    ['1000013-0'],
    ['6-K'],
  ])('validarRut acepta RUT válido %s', (rut) => {
    expect(validarRut(rut)).toBe(true);
  });

  test.each([
    ['12345678-9'],   // DV incorrecto
    ['11111111-2'],
    ['123456789-0'],  // más de 8 dígitos
    ['12345678'],     // sin DV
    ['abc-1'],
    [''],
  ])('validarRut rechaza %s', (rut) => {
    expect(validarRut(rut)).toBe(false);
  });

  test('formatearRut devuelve formato limpio o el original si es inválido', () => {
    expect(formatearRut('12.345.678-5')).toBe('12345678-5');
    expect(formatearRut('no-es-rut')).toBe('no-es-rut');
  });
});

describe('helpers: tokens y hashes', () => {
  test('hashToken es sha256 determinista', () => {
    expect(hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  test('generateRefreshToken genera 128 hex distintos', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).toMatch(/^[0-9a-f]{128}$/);
    expect(a).not.toBe(b);
  });

  test('generateSyncHash acepta string u objeto', () => {
    expect(generateSyncHash({ a: 1 })).toBe(generateSyncHash('{"a":1}'));
    expect(generateSyncHash({ a: 1 })).not.toBe(generateSyncHash({ a: 2 }));
  });
});

describe('helpers: misc', () => {
  test('sanitizeEmail normaliza y tolera vacío', () => {
    expect(sanitizeEmail('  Foo@Bar.CL ')).toBe('foo@bar.cl');
    expect(sanitizeEmail(undefined)).toBe('');
  });

  test('excludeFields no muta el original', () => {
    const obj = { a: 1, b: 2 };
    expect(excludeFields(obj, ['b'])).toEqual({ a: 1 });
    expect(obj).toEqual({ a: 1, b: 2 });
  });

  test('sanitizeUser elimina todas las variantes de password', () => {
    expect(sanitizeUser({ id: 1, password: 'x', passwordHash: 'y', password_hash: 'z' })).toEqual({ id: 1 });
    expect(sanitizeUser(null)).toBeNull();
  });

  test('parsePagination aplica valores por defecto y límites', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(parsePagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10, skip: 20 });
    expect(parsePagination({ page: '-5', limit: '1000' })).toEqual({ page: 1, limit: 100, skip: 0 });
    expect(parsePagination({ page: 'x', limit: '0' })).toEqual({ page: 1, limit: 20, skip: 0 });
  });
});
