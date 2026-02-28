require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const register = async (req, res) => {
    try {
        const { email, password, name, rut, razonSocial, giro, direccion } = req.body;

        const normalizedEmail = email ? email.trim().toLowerCase() : '';

        const existingUser = await userRepository.findByEmail(normalizedEmail);
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await userRepository.createUser({
            email: normalizedEmail,
            password: hashedPassword,
            name,
            rut,
            razonSocial,
            giro,
            direccion
        });

        // On registration we create the user but do not issue an auth token.
        res.status(201).json({
            success: true,
            data: {
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

        const identifier = email ? email.trim() : '';

        // `identifier` may be an email or a username. Use case-insensitive search.
        const user = await userRepository.findByEmailOrName(identifier);
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

const changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    
    const user = await userRepository.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Contraseña antigua incorrecta' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.updatePassword(user.id, hashedNewPassword);

    res.json({ success: true, message: 'Contraseña cambiada exitosamente' });
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