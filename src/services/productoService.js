const productoRepository = require('../repositories/productoRepository');
const { validate, schemas } = require('./validationService');
const { generateSyncHash, parsePagination } = require('../utils/helpers');
const logger = require('../utils/logger');

class ProductoService {
  async listProductos(tenantId, query) {
    const { skip, limit, page } = parsePagination(query);
    const [productos, total] = await Promise.all([
      productoRepository.findAll(tenantId, { skip, limit }),
      productoRepository.countAll(tenantId),
    ]);
    return { data: productos, total, page, limit };
  }

  async getProducto(tenantId, id) {
    const producto = await productoRepository.findById(tenantId, id);
    if (!producto) {
      const err = new Error('Producto no encontrado');
      err.status = 404;
      throw err;
    }
    return producto;
  }

  async searchProductos(tenantId, q) {
    if (!q || q.trim().length < 2) {
      const err = new Error('Búsqueda debe tener al menos 2 caracteres');
      err.status = 400;
      throw err;
    }
    return productoRepository.search(tenantId, q.trim());
  }

  async createProducto(tenantId, data) {
    const validated = validate(schemas.producto, data);

    // Check duplicate codigo
    if (validated.codigo) {
      const existing = await productoRepository.findByCodigo(tenantId, validated.codigo);
      if (existing) {
        const err = new Error('Ya existe un producto con ese código');
        err.status = 409;
        throw err;
      }
    }

    const producto = await productoRepository.create({
      tenantId,
      codigo: validated.codigo,
      nombre: validated.nombre,
      descripcion: validated.descripcion || null,
      precio: validated.precio,
      stock: validated.stock || 0,
      exento: validated.exento || false,
      categoria: validated.categoria || null,
      unidadMedida: validated.unidad_medida || 'UN',
      stockMinimo: validated.stock_minimo || 0,
      stockMaximo: validated.stock_maximo || null,
      costo: validated.costo || null,
      localId: validated.local_id || null,
      syncHash: generateSyncHash(validated),
    });

    logger.info(`[ProductoService] Created: ${validated.codigo} for tenant ${tenantId}`);
    return producto;
  }

  async updateProducto(tenantId, id, data) {
    await this.getProducto(tenantId, id);
    const validated = validate(schemas.productoUpdate, data);

    const updateData = {};
    if (validated.codigo !== undefined) updateData.codigo = validated.codigo;
    if (validated.nombre !== undefined) updateData.nombre = validated.nombre;
    if (validated.descripcion !== undefined) updateData.descripcion = validated.descripcion;
    if (validated.precio !== undefined) updateData.precio = validated.precio;
    if (validated.stock !== undefined) updateData.stock = validated.stock;
    if (validated.exento !== undefined) updateData.exento = validated.exento;
    if (validated.categoria !== undefined) updateData.categoria = validated.categoria;
    if (validated.unidad_medida !== undefined) updateData.unidadMedida = validated.unidad_medida;
    if (validated.stock_minimo !== undefined) updateData.stockMinimo = validated.stock_minimo;
    if (validated.stock_maximo !== undefined) updateData.stockMaximo = validated.stock_maximo;
    if (validated.costo !== undefined) updateData.costo = validated.costo;

    updateData.syncHash = generateSyncHash(updateData);
    updateData.lastSyncedAt = new Date();

    // Check codigo uniqueness if changed
    if (updateData.codigo) {
      const existing = await productoRepository.findByCodigo(tenantId, updateData.codigo);
      if (existing && existing.id !== id) {
        const err = new Error('Ya existe un producto con ese código');
        err.status = 409;
        throw err;
      }
    }

    return productoRepository.update(tenantId, id, updateData);
  }

  async updateStock(tenantId, id, data) {
    await this.getProducto(tenantId, id);
    const { stock } = data;
    if (typeof stock !== 'number' || stock < 0) {
      const err = new Error('Stock debe ser un número positivo');
      err.status = 400;
      throw err;
    }
    return productoRepository.update(tenantId, id, { stock });
  }

  async deleteProducto(tenantId, id) {
    await this.getProducto(tenantId, id);
    return productoRepository.delete(tenantId, id);
  }

  async syncProductos(tenantId, productos) {
    const resultados = { creados: 0, actualizados: 0, errores: [] };
    for (const productoData of productos) {
      try {
        if (productoData.id) {
          await this.updateProducto(tenantId, productoData.id, productoData);
          resultados.actualizados++;
        } else {
          await this.createProducto(tenantId, productoData);
          resultados.creados++;
        }
      } catch (err) {
        resultados.errores.push({
          producto: productoData.nombre || productoData.codigo || 'desconocido',
          error: err.message,
        });
      }
    }
    return resultados;
  }
}

module.exports = new ProductoService();
