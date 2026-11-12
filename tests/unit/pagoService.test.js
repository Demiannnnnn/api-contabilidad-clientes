jest.mock('../../src/repositories/pagoRepository');
jest.mock('../../src/repositories/documentoRepository');

const pagoRepository = require('../../src/repositories/pagoRepository');
const documentoRepository = require('../../src/repositories/documentoRepository');
const pagoService = require('../../src/services/pagoService');

const DOC_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const pago = (monto, extra = {}) => ({ documento_id: DOC_ID, monto, fecha_pago: '2026-03-01', forma_pago: 'transferencia', ...extra });

beforeEach(() => {
  jest.resetAllMocks();
  pagoRepository.create.mockImplementation(async (d) => ({ id: 'p1', ...d }));
});

describe('createPago', () => {
  test('pago parcial deja el documento en "parcial"', async () => {
    documentoRepository.findById.mockResolvedValue({ id: DOC_ID, total: '1000', estado: 'emitida' });
    pagoRepository.sumByDocumento.mockResolvedValue('200');
    await pagoService.createPago(1, pago(300));
    expect(pagoRepository.create).toHaveBeenCalledWith(expect.objectContaining({ monto: 300, documentoId: DOC_ID, tenantId: 1 }));
    expect(documentoRepository.updateEstado).toHaveBeenCalledWith(1, DOC_ID, 'parcial');
  });

  test('pago que completa el saldo deja el documento en "pagada"', async () => {
    documentoRepository.findById.mockResolvedValue({ id: DOC_ID, total: 1000, estado: 'parcial' });
    pagoRepository.sumByDocumento.mockResolvedValue(400);
    await pagoService.createPago(1, pago(600));
    expect(documentoRepository.updateEstado).toHaveBeenCalledWith(1, DOC_ID, 'pagada');
  });

  test('monto mayor al saldo -> 400 sin crear el pago', async () => {
    documentoRepository.findById.mockResolvedValue({ id: DOC_ID, total: 1000, estado: 'emitida' });
    pagoRepository.sumByDocumento.mockResolvedValue(900);
    await expect(pagoService.createPago(1, pago(101))).rejects.toMatchObject({ status: 400 });
    expect(pagoRepository.create).not.toHaveBeenCalled();
  });

  test.each(['anulada', 'rechazada', 'borrador'])('documento %s -> 409', async (estado) => {
    documentoRepository.findById.mockResolvedValue({ id: DOC_ID, total: 1000, estado });
    await expect(pagoService.createPago(1, pago(1))).rejects.toMatchObject({ status: 409 });
  });

  test('documento inexistente -> 404; datos inválidos -> 400', async () => {
    documentoRepository.findById.mockResolvedValue(null);
    await expect(pagoService.createPago(1, pago(10))).rejects.toMatchObject({ status: 404 });
    await expect(pagoService.createPago(1, pago(-5))).rejects.toMatchObject({ status: 400 });
  });
});

describe('deletePago', () => {
  test.each([
    [0, 'emitida'],
    [500, 'parcial'],
    [1000, 'pagada'],
  ])('recalcula estado con total pagado restante %p -> %s', async (restante, esperado) => {
    pagoRepository.findById.mockResolvedValue({ id: 'p1', documentoId: DOC_ID });
    pagoRepository.sumByDocumento.mockResolvedValue(restante);
    documentoRepository.findById.mockResolvedValue({ id: DOC_ID, total: 1000, estado: 'pagada' });
    await pagoService.deletePago(1, 'p1');
    expect(pagoRepository.remove).toHaveBeenCalledWith(1, 'p1');
    expect(documentoRepository.updateEstado).toHaveBeenCalledWith(1, DOC_ID, esperado);
  });

  test('no cambia el estado de documentos anulados', async () => {
    pagoRepository.findById.mockResolvedValue({ id: 'p1', documentoId: DOC_ID });
    pagoRepository.sumByDocumento.mockResolvedValue(0);
    documentoRepository.findById.mockResolvedValue({ id: DOC_ID, total: 1000, estado: 'anulada' });
    await pagoService.deletePago(1, 'p1');
    expect(documentoRepository.updateEstado).not.toHaveBeenCalled();
  });

  test('pago inexistente -> 404', async () => {
    pagoRepository.findById.mockResolvedValue(null);
    await expect(pagoService.deletePago(1, 'x')).rejects.toMatchObject({ status: 404 });
  });
});

describe('consultas', () => {
  test('getPagosByDocumento calcula total pagado y saldo', async () => {
    documentoRepository.findById.mockResolvedValue({ id: DOC_ID, folio: 10, tipoDocumento: 33, total: '1000', estado: 'parcial' });
    pagoRepository.findByDocumento.mockResolvedValue([{ monto: '250' }, { monto: 100 }]);
    const res = await pagoService.getPagosByDocumento(1, DOC_ID);
    expect(res.totalPagado).toBe(350);
    expect(res.saldo).toBe(650);
  });

  test('getCuentasPorCobrar marca vencidos', async () => {
    pagoRepository.findCuentasPorCobrar.mockResolvedValue([
      { id: 'a', total: 100, pagos: [{ monto: 40 }], fechaVencimiento: '2000-01-01', cliente: {} },
      { id: 'b', total: 100, pagos: [], fechaVencimiento: '2999-01-01', cliente: {} },
      { id: 'c', total: 100, pagos: [], fechaVencimiento: null, cliente: {} },
    ]);
    const res = await pagoService.getCuentasPorCobrar(1);
    expect(res.map(r => r.vencido)).toEqual([true, false, false]);
    expect(res[0].saldo).toBe(60);
  });

  test('syncPagos reporta éxitos y errores por item', async () => {
    documentoRepository.findById.mockResolvedValue({ id: DOC_ID, total: 1000, estado: 'emitida' });
    pagoRepository.sumByDocumento.mockResolvedValue(0);
    const res = await pagoService.syncPagos(1, [pago(10, { local_id: 1 }), pago(5000, { local_id: 2 })]);
    expect(res[0]).toEqual({ local_id: 1, server_id: 'p1', status: 'created' });
    expect(res[1]).toMatchObject({ local_id: 2, status: 'error' });
  });
});
