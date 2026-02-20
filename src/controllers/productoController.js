const { success } = require('zod');
const productoService = require('../services/productoService');

const getProductosBackup = (req, res) => {
    try{
        const {userId, codigo, nombre, descripcion, precio, stock, exento, activo} = req.body;


    }catch(error){
        const status = error.status || 500;
        res.status(status).json({success: false, error: error.message  ||  'Error al obtener backup de productos'})
    }
}

const syncProductos = (req, res) => {
    // Lógica para sincronizar productos locales
    res.json({ message: 'Productos sincronizados' });
}

const getAllProductos = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId es requerido' });
        }
        const productos = await productoService.getAllProductos(userId);
        res.json({ success: true, productos });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, error: error.message || 'Error al obtener productos' });
    }
}

const createProducto = async (req, res) => {
    try {
        const { userId, codigo, nombre, descripcion, precio, stock, exento, activo } = req.body;
        // Validación básica
        if (!userId || !codigo || !nombre) {
            return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
        }
        const productoCreado = await productoService.createProducto(userId, codigo, nombre, descripcion, precio, stock, exento, activo);
        res.status(201).json({ success: true, message: 'Producto creado exitosamente', producto: productoCreado });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, error: error.message || 'Error al crear producto' });
    }
}

const updateProducto = (req, res) => {
    // Lógica para actualizar un producto existente
    res.json({ message: `Producto con ID ${req.params.id} actualizado` });
}

const deleteProducto = (req, res) => {
    // Lógica para eliminar un producto por ID
    res.json({ message: `Producto con ID ${req.params.id} eliminado` });
}

module.exports = {
    getProductosBackup,
    syncProductos,
    getAllProductos,
    createProducto,
    updateProducto,
    deleteProducto
};