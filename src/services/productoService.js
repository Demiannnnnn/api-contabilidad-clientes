const ProductoRepository = require('../repositories/productoRepository');
const productoRepository = new ProductoRepository();

async function getAllProductos(userId) {
	return await productoRepository.findAll(userId);
}

module.exports = {
	getAllProductos,
	// Puedes agregar aquí otros métodos como createProducto, updateProducto, etc.
};
