const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const prisma = require('../config/database');

const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await userRepository.createUser({
            email,
            password: hashedPassword,
            name
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, error: 'Error al registrar usuario' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Error al iniciar sesión' });
    }
};

const changePassword = (req, res) => {
    // Lógica para cambiar la contraseña de un usuario
    res.json({ message: 'Contraseña cambiada exitosamente' });
}

const getProfile = (req, res) => {
    res.json({ success: true, data: req.user });
}

module.exports = {
    register,
    login,
    changePassword,
    getProfile
};