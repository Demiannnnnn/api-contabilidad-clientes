const authMiddleware = (req, res, next) => {
    // Lógica para autenticar la solicitud
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    // Aquí se podría agregar lógica para verificar el token
    next();
}

module.exports = authMiddleware;

