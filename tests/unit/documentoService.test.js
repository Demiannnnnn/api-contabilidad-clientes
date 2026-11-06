jest.mock('../../src/repositories/documentoRepository');

const repo = require('../../src/repositories/documentoRepository');
const service = require('../../src/services/documentoService');

const item = { numero_linea: 1, descripcion: 'Servicio', cantidad: 2, precio_unitario: 500, monto_item: 1000 };
const doc = (extra = {}) => ({ tipo_documento: 33, folio: 15, fecha_emision: '2026-02-01', subtotal: 1000, iva: 190, total: 1190, items: [item], ...extra });

beforeEach(() => {
  jest.resetAllMocks();
  repo.create.mockImplementation(async (d) => ({ id: 'd1', ...d }));
});

describe('createDocumento', () => {
  test('mapea a camelCase y aplica valores por defecto', async () => {
    repo.findByFolio.mockResolvedValue(null);
    await service.createDocumento(1, doc({ referencias: [{ tipo_documento_referencia: 33, folio_referencia: 3, fecha_referencia: '2026-01-01', razon_referencia: 'Anula' }] }));
    const [data, items, refs] = repo.create.mock.calls[0];
    expect(data).toMatchObject({ tenantId: 1, tipoDocumento: 33, folio: 15, formaPago: 'contado', estado: 'pendiente', montoExento: 0, clienteId: null });
    expect(data.fechaEmision).toBeInstanceOf(Date);
    expect(data.syncHash).toMatch(/^[0-9a-f]{64}$/);
    expect(items[0]).toMatchObject({ numeroLinea: 1, unidad: 'UN', precioUnitario: 500, montoItem: 1000, exento: false, descuento: 0 });
    expect(refs[0]).toMatchObject({ tipoDocumentoReferencia: 33, folioReferencia: 3, codigoReferencia: null });
  });

  test('tipo de documento SII desconocido -> 400', async () => {
    await expect(service.createDocumento(1, doc({ tipo_documento: 99 }))).rejects.toMatchObject({ status: 400, message: 'Tipo de documento inválido' });
    expect(repo.findByFolio).not.toHaveBeenCalled();
  });

  test('folio duplicado -> 409', async () => {
    repo.findByFolio.mockResolvedValue({ id: 'x' });
    await expect(service.createDocumento(1, doc())).rejects.toMatchObject({ status: 409 });
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('cambiarEstado (máquina de estados)', () => {
  test.each([
    ['borrador', 'pendiente'],
    ['pendiente', 'emitida'],
    ['emitida', 'parcial'],
    ['parcial', 'pagada'],
    ['pagada', 'anulada'],
    ['rechazada', 'pendiente'],
  ])('permite %s -> %s', async (desde, hacia) => {
    repo.findById.mockResolvedValue({ id: 'd1', estado: desde });
    repo.updateEstado.mockResolvedValue({ id: 'd1', estado: hacia });
    await service.cambiarEstado(1, 'd1', hacia);
    expect(repo.updateEstado).toHaveBeenCalledWith(1, 'd1', hacia);
  });

  test.each([
    ['anulada', 'pendiente'],
    ['pagada', 'emitida'],
    ['borrador', 'pagada'],
    ['pendiente', 'parcial'],
  ])('rechaza %s -> %s con 409', async (desde, hacia) => {
    repo.findById.mockResolvedValue({ id: 'd1', estado: desde });
    await expect(service.cambiarEstado(1, 'd1', hacia)).rejects.toMatchObject({ status: 409 });
    expect(repo.updateEstado).not.toHaveBeenCalled();
  });

  test('estado desconocido -> 400; documento inexistente -> 404', async () => {
    await expect(service.cambiarEstado(1, 'd1', 'perdida')).rejects.toMatchObject({ status: 400 });
    repo.findById.mockResolvedValue(null);
    await expect(service.cambiarEstado(1, 'd1', 'emitida')).rejects.toMatchObject({ status: 404 });
  });
});

describe('updateDocumento / deleteDocumento', () => {
  test.each(['emitida', 'anulada', 'rechazada'])('no permite modificar un documento %s', async (estado) => {
    repo.findById.mockResolvedValue({ id: 'd1', estado });
    await expect(service.updateDocumento(1, 'd1', { observaciones: 'x' })).rejects.toMatchObject({ status: 409 });
  });

  test('actualiza solo los campos enviados y convierte fechas', async () => {
    repo.findById.mockResolvedValue({ id: 'd1', estado: 'pendiente' });
    await service.updateDocumento(1, 'd1', { observaciones: 'nota', fecha_vencimiento: '2026-05-01' });
    const [, , data, items, refs] = repo.update.mock.calls[0];
    expect(data.observaciones).toBe('nota');
    expect(data.fechaVencimiento).toBeInstanceOf(Date);
    expect(data).not.toHaveProperty('estado');
    expect(items).toBeNull();
    expect(refs).toBeNull();
  });

  test.each(['emitida', 'pagada', 'parcial'])('no permite eliminar un documento %s', async (estado) => {
    repo.findById.mockResolvedValue({ id: 'd1', estado });
    await expect(service.deleteDocumento(1, 'd1')).rejects.toMatchObject({ status: 409 });
    expect(repo.remove).not.toHaveBeenCalled();
  });

  test('elimina borradores', async () => {
    repo.findById.mockResolvedValue({ id: 'd1', estado: 'borrador' });
    await service.deleteDocumento(1, 'd1');
    expect(repo.remove).toHaveBeenCalledWith(1, 'd1');
  });
});

describe('listDocumentos', () => {
  test('construye filtros y respeta el límite de paginación', async () => {
    repo.findAll.mockResolvedValue([]);
    repo.countAll.mockResolvedValue(45);
    const res = await service.listDocumentos(1, { page: '2', limit: '10', tipo_documento: '39', estado: 'emitida', desde: '2026-01-01' });
    const opts = repo.findAll.mock.calls[0][1];
    expect(opts.skip).toBe(10);
    expect(opts.take).toBe(10);
    expect(opts.where).toMatchObject({ tipoDocumento: 39, estado: 'emitida' });
    expect(opts.where.fechaEmision.gte).toBeInstanceOf(Date);
    expect(res.pagination).toEqual({ total: 45, page: 2, limit: 10, pages: 5 });
  });
});

describe('syncDocumentos', () => {
  test('crea los nuevos, actualiza los existentes y reporta errores', async () => {
    repo.findByFolio.mockImplementation(async (_t, _tipo, folio) => (folio === 2 ? { id: 'e2' } : null));
    repo.findById.mockResolvedValue({ id: 'e2', estado: 'pendiente' });
    repo.update.mockResolvedValue({ id: 'e2' });
    const res = await service.syncDocumentos(1, [doc({ folio: 1, local_id: 1 }), doc({ folio: 2, local_id: 2 }), doc({ folio: 3, local_id: 3, items: [] })]);
    expect(res[0]).toEqual({ local_id: 1, server_id: 'd1', status: 'created' });
    expect(res[1]).toEqual({ local_id: 2, server_id: 'e2', status: 'updated' });
    expect(res[2]).toMatchObject({ local_id: 3, status: 'error' });
  });
});
