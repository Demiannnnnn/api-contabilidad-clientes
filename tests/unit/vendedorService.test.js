jest.mock('../../src/repositories/vendedorRepository');

const repo = require('../../src/repositories/vendedorRepository');
const service = require('../../src/services/vendedorService');

beforeEach(() => jest.resetAllMocks());

describe('vendedorService', () => {
  test('listVendedores respeta el límite pedido y filtra por activo', async () => {
    repo.findAll.mockResolvedValue([]);
    repo.countAll.mockResolvedValue(21);
    const res = await service.listVendedores(1, { limit: '10', activo: 'false' });
    expect(repo.findAll).toHaveBeenCalledWith(1, { skip: 0, take: 10, where: { activo: false } });
    expect(res.pagination.pages).toBe(3);
  });

  test('createVendedor rechaza email duplicado', async () => {
    repo.findByEmail.mockResolvedValue({ id: 2 });
    await expect(service.createVendedor(1, { nombre: 'A', apellido: 'B', email: 'a@b.cl' })).rejects.toMatchObject({ status: 409 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('updateVendedor solo revisa email si cambia', async () => {
    repo.findById.mockResolvedValue({ id: 1, email: 'a@b.cl' });
    repo.update.mockResolvedValue({});
    await service.updateVendedor(1, 1, { email: 'a@b.cl', comision: 5 });
    expect(repo.findByEmail).not.toHaveBeenCalled();
    expect(repo.update.mock.calls[0][2]).toMatchObject({ email: 'a@b.cl', comision: 5 });
  });

  test('toggleActive invierte el estado', async () => {
    repo.findById.mockResolvedValue({ id: 1, activo: true });
    await service.toggleActive(1, 1);
    expect(repo.update).toHaveBeenCalledWith(1, 1, { activo: false });
  });

  test('deleteVendedor bloquea si tiene documentos', async () => {
    repo.findById.mockResolvedValue({ id: 1, _count: { documentos: 2 } });
    await expect(service.deleteVendedor(1, 1)).rejects.toMatchObject({ status: 409 });
    repo.findById.mockResolvedValue(null);
    await expect(service.deleteVendedor(1, 1)).rejects.toMatchObject({ status: 404 });
  });

  test('búsqueda corta -> 400', async () => {
    await expect(service.searchVendedores(1, 'a')).rejects.toMatchObject({ status: 400 });
  });
});
