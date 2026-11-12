// Verifica que todos los módulos de la API cargan sin errores (imports rotos,
// typos de exports, etc.). Requiere el cliente Prisma generado
// (`npm run build`) pero no conecta a la base de datos.
const fs = require('fs');
const path = require('path');

jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const src = path.resolve(__dirname, '../../src');
const carpetas = ['routes', 'controllers', 'services', 'repositories', 'middleware'];
const archivos = carpetas.flatMap((c) =>
  fs.readdirSync(path.join(src, c)).filter((f) => f.endsWith('.js')).map((f) => `${c}/${f}`));

test.each(archivos)('%s carga correctamente', (archivo) => {
  expect(() => require(path.join(src, archivo))).not.toThrow();
});

test('cada archivo de rutas exporta un router de Express', () => {
  for (const f of archivos.filter((a) => a.startsWith('routes/'))) {
    const router = require(path.join(src, f));
    expect(typeof router).toBe('function');
    expect(Array.isArray(router.stack)).toBe(true);
  }
});
