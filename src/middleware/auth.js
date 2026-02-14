const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, error: 'Token de autenticación no proporcionado' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, error: 'Token de autenticación expirado' });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, error: 'Token de autenticación inválido' });
        } else {
            console.error('Error en middleware de autenticación:', err);
            return res.status(500).json({
                success: false,
                error: 'Error interno del servidor en la autenticación',
            });
        }
    }
};

module.exports = authMiddleware;

