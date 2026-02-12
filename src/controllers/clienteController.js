const clienteService = require('../services/clienteService.js');

const getClientesBackup = async (req, res) => {
    try {
        const userId = req.user.id;
        const clientes = await clienteService.obtenerTodos(userId);
        res.json({ success: true, data: clientes, total: clientes.length });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, error: error.message || 'Error al obtener backup de clientes' });
    }
};

const syncClientes = async (req, res) => {
    try {
        const userId = req.user.id;
        const { clientes } = req.body;

        if (!Array.isArray(clientes)) {
            return res.status(400).json({ success: false, error: 'Se esperaba un array de clientes' });
        }

        const resultados = { creados: 0, actualizados: 0, errores: [] };

        for (const clienteData of clientes) {
            try {
                if (clienteData.id) {
                    await clienteService.actualizar(userId, clienteData.id, clienteData);
                    resultados.actualizados++;
                } else {
                    await clienteService.crear(userId, clienteData);
                    resultados.creados++;
                }
            } catch (err) {
                resultados.errores.push({
                    cliente: clienteData.nombre || clienteData.rut || 'desconocido',
                    error: err.message
                });
            }
        }

        res.json({ success: true, data: resultados });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, error: error.message || 'Error al sincronizar clientes' });
    }
};

const getAllClientes = async (req, res) => {
    try {
        const userId = req.user.id;
        const clientes = await clienteService.obtenerTodos(userId);
        res.json({ success: true, data: clientes });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, error: error.message || 'Error al obtener clientes' });
    }
};

const createCliente = async (req, res) => {
    try {
        const userId = req.user.id;
        const cliente = await clienteService.crear(userId, req.body);
        res.status(201).json({ success: true, data: cliente });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, error: error.message || 'Error al crear cliente' });
    }
};

const updateCliente = async (req, res) => {
    try {
        const userId = req.user.id;
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID de cliente inválido' });
        }

        const cliente = await clienteService.actualizar(userId, id, req.body);
        res.json({ success: true, data: cliente });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, error: error.message || 'Error al actualizar cliente' });
    }
};

const deleteCliente = async (req, res) => {
    try {
        const userId = req.user.id;
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID de cliente inválido' });
        }

        await clienteService.eliminar(userId, id);
        res.json({ success: true, message: 'Cliente eliminado correctamente' });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, error: error.message || 'Error al eliminar cliente' });
    }
};

module.exports = {
    getClientesBackup,
    syncClientes,
    getAllClientes,
    createCliente,
    updateCliente,
    deleteCliente
};