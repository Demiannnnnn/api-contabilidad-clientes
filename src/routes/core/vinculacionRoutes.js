const express = require('express');
const router = express.Router();
const vinculacionController = require('../../controllers/core/vinculacionController');
const { authenticate, requireRole } = require('../../middleware/authMiddleware');

// Todas las rutas requieren autenticación + rol contador o dueño
router.use(authenticate, requireRole('contador'));

// Buscar usuarios para vincular (por nombre/rut)
router.get('/buscar', vinculacionController.buscarUsuarios);

// Solicitudes
router.post('/solicitud', vinculacionController.enviarSolicitud);
router.get('/pendientes', vinculacionController.getPendientesRecibidas);
router.get('/enviadas', vinculacionController.getPendientesEnviadas);

// Responder solicitudes
router.put('/:id/aceptar', vinculacionController.aceptarSolicitud);
router.put('/:id/rechazar', vinculacionController.rechazarSolicitud);

// Vínculos activos
router.get('/activas', vinculacionController.getVinculosActivos);

// Eliminar vínculo
router.delete('/:id', vinculacionController.eliminarVinculo);

module.exports = router;
