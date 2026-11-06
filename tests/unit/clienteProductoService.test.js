jest.mock('../../src/repositories/clienteRepository');
jest.mock('../../src/repositories/productoRepository');
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const clienteRepo = require('../../src/repositories/clienteRepository');
const productoRepo = require('../../src/repositories/productoRepository');
const clienteService = require('../../src/services/clienteService');
const productoService = require('../../src/services/productoService');

beforeEach(() => {
  jest.resetAllMocks();
  clienteRepo.create.mockImplementation(async (d) => ({ id: 1, ...d }));
  productoRepo.create.mockImplementation(async (d) => ({ id: 1, ...d }));
});

describe('ClienteService', () => {
  test('createCliente limpia el RUT y aplica valores comerciales por defecto', async () => {
    clienteRepo.findByRut.mockResolvedValue(null);
    const res = await clienteService.createCliente(3, { rut: '76.086.428-5', razonSocial: 'ACME SpA' });
    expect(clienteRepo.findByRut).toHaveBeenCalledWith(3, '76086428-5');
    expect(res).toMatchObject({ userId: 3, rut: '76086428-5', condicionPago: 'contado', listaPrecios: 'normal', tipoDocumento: 'rut_empresa', diasCredito: 0, email: null });
  });

  test('RUT duplicado -> 409', async () => {
    clienteRepo.findByRut.mockResolvedValue({ id: 2 });
    await expect(clienteService.createCliente(3, { rut: '76086428-5', razonSocial: 'X' })).rejects.toMatchObject({ status: 409 });
  });

  test('updateCliente permite conservar su propio RUT pero no el de otro', async () => {
    clienteRepo.findById.mockResolvedValue({ id: 1 });
    clienteRepo.findByRut.mockResolvedValue({ id: 1 });
    await clienteService.updateCliente(3, 1, { rut: '76086428-5' });
    expect(clienteRepo.update).toHaveBeenCalledWith(3, 1, { rut: '76086428-5' });

    clienteRepo.findByRut.mockResolvedValue({ id: 2 });
    await expect(clienteService.updateCliente(3, 1, { rut: '76086428-5' })).rejects.toMatchObject({ status: 409 });
  });

  test('deleteCliente bloquea clientes con documentos', async () => {
    clienteRepo.findById.mockResolvedValue({ id: 1, documentos: [{ id: 9 }] });
    await expect(clienteService.deleteCliente(3, 1)).rejects.toMatchObject({ status: 400 });
    clienteRepo.findById.mockResolvedValue({ id: 1, documentos: [] });
    await clienteService.deleteCliente(3, 1);
    expect(clienteRepo.delete).toHaveBeenCalledWith(3, 1);
  });

  test('búsqueda exige 2 caracteres y recorta espacios', async () => {
    await expect(clienteService.searchClientes(3, ' a ')).rejects.toMatchObject({ status: 400 });
    await clienteService.searchClientes(3, '  ac ');
    expect(clienteRepo.search).toHaveBeenCalledWith(3, 'ac');
  });

  test('syncClientes cuenta creados, actualizados y errores', async () => {
    clienteRepo.findByRut.mockResolvedValue(null);
    clienteRepo.findById.mockResolvedValue({ id: 5 });
    const res = await clienteService.syncClientes(3, [
      { rut: '76086428-5', razonSocial: 'Nuevo' },
      { id: 5, razonSocial: 'Editado' },
      { rut: '1-1', razonSocial: 'Malo' },
    ]);
    expect(res.creados).toBe(1);
    expect(res.actualizados).toBe(1);
    expect(res.errores).toEqual([expect.objectContaining({ cliente: 'Malo' })]);
  });
});

describe('ProductoService', () => {
  test('createProducto normaliza campos y valores por defecto', async () => {
    productoRepo.findByCodigo.mockResolvedValue(null);
    const res = await productoService.createProducto(3, { codigo: 'A1', nombre: 'Tornillo', precio: 50, unidad_medida: 'CJ' });
    expect(res).toMatchObject({ userId: 3, unidadMedida: 'CJ', stock: 0, activo: true, exento: false, stockMinimo: 0 });
  });

  test('código duplicado -> 409', async () => {
    productoRepo.findByCodigo.mockResolvedValue({ id: 2 });
    await expect(productoService.createProducto(3, { codigo: 'A1', nombre: 'x', precio: 1 })).rejects.toMatchObject({ status: 409 });
  });

  test('updateProducto: solo campos enviados y unicidad de código', async () => {
    productoRepo.findById.mockResolvedValue({ id: 1 });
    productoRepo.findByCodigo.mockResolvedValue({ id: 2 });
    await expect(productoService.updateProducto(3, 1, { codigo: 'B' })).rejects.toMatchObject({ status: 409 });

    await productoService.updateProducto(3, 1, { precio: 99 });
    const data = productoRepo.update.mock.calls[0][2];
    expect(data.precio).toBe(99);
    expect(data).not.toHaveProperty('codigo');
    expect(data.syncHash).toBeDefined();
  });

  test('updateStock rechaza negativos y no numéricos', async () => {
    productoRepo.findById.mockResolvedValue({ id: 1 });
    await expect(productoService.updateStock(3, 1, { stock: -1 })).rejects.toMatchObject({ status: 400 });
    await expect(productoService.updateStock(3, 1, { stock: '5' })).rejects.toMatchObject({ status: 400 });
    await productoService.updateStock(3, 1, { stock: 0 });
    expect(productoRepo.update).toHaveBeenCalledWith(3, 1, { stock: 0 });
  });

  test('getProducto inexistente -> 404', async () => {
    productoRepo.findById.mockResolvedValue(null);
    await expect(productoService.deleteProducto(3, 1)).rejects.toMatchObject({ status: 404 });
    expect(productoRepo.delete).not.toHaveBeenCalled();
  });

  test('listProductos pasa skip/limit de la paginación', async () => {
    productoRepo.findAll.mockResolvedValue([]);
    productoRepo.countAll.mockResolvedValue(0);
    const res = await productoService.listProductos(3, { page: '3', limit: '5' });
    expect(productoRepo.findAll).toHaveBeenCalledWith(3, { skip: 10, limit: 5 });
    expect(res).toMatchObject({ page: 3, limit: 5, total: 0 });
  });
});
