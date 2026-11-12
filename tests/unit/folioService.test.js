jest.mock('../../src/repositories/folioRepository');

const repo = require('../../src/repositories/folioRepository');
const service = require('../../src/services/folioService');

beforeEach(() => jest.resetAllMocks());

describe('uploadCaf', () => {
  test('crea el rango con actual = desde', async () => {
    repo.create.mockImplementation(async (d) => d);
    const res = await service.uploadCaf(1, { tipo_documento: 33, desde: 1, hasta: 100, caf_xml: '<CAF/>' });
    expect(res).toMatchObject({ tenantId: 1, tipoDocumento: 33, desde: 1, hasta: 100, actual: 1, estado: 'activo' });
  });

  test('faltan campos -> 400', async () => {
    await expect(service.uploadCaf(1, { tipo_documento: 33, desde: 1 })).rejects.toMatchObject({ status: 400 });
  });

  test('desde > hasta -> 400', async () => {
    await expect(service.uploadCaf(1, { tipo_documento: 33, desde: 50, hasta: 10, caf_xml: 'x' })).rejects.toMatchObject({ status: 400 });
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('getNextFolio', () => {
  test('entrega el folio actual y lo incrementa', async () => {
    repo.findActive.mockResolvedValue({ id: 'f1', desde: 1, hasta: 10, actual: 4 });
    const res = await service.getNextFolio(1, '33');
    expect(repo.findActive).toHaveBeenCalledWith(1, 33);
    expect(repo.incrementActual).toHaveBeenCalledWith('f1');
    expect(res).toEqual({ folio: 4, desde: 1, hasta: 10, restantes: 6 });
  });

  test('rango agotado: lo marca y pasa al siguiente CAF', async () => {
    repo.findActive
      .mockResolvedValueOnce({ id: 'f1', desde: 1, hasta: 10, actual: 11 })
      .mockResolvedValueOnce({ id: 'f2', desde: 11, hasta: 20, actual: 11 });
    const res = await service.getNextFolio(1, 33);
    expect(repo.update).toHaveBeenCalledWith('f1', { estado: 'agotado' });
    expect(repo.incrementActual).toHaveBeenCalledWith('f2');
    expect(res.folio).toBe(11);
  });

  test('sin CAF siguiente -> 404 indicando subir uno nuevo', async () => {
    repo.findActive.mockResolvedValueOnce({ id: 'f1', desde: 1, hasta: 10, actual: 11 }).mockResolvedValueOnce(null);
    await expect(service.getNextFolio(1, 33)).rejects.toMatchObject({ status: 404, message: expect.stringContaining('nuevo CAF') });
  });

  test('tipo inválido -> 400; sin folios -> 404', async () => {
    await expect(service.getNextFolio(1, 'abc')).rejects.toMatchObject({ status: 400 });
    repo.findActive.mockResolvedValue(null);
    await expect(service.getNextFolio(1, 39)).rejects.toMatchObject({ status: 404 });
  });
});
