const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validateEmail, validatePhone, sanitize } = require('../utils/helpers');

// Generar token JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, rol: user.rol },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// Registro de usuario
const register = async (req, res) => {
    try {
        const {
            nombre,
            usuario,
            email,
            password,
            telefono,
            direccion,
            barrio,
            rol = 'Cliente',
            codigo_referido
        } = req.body;

        // Validaciones básicas
        if (!nombre || nombre.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'El nombre debe tener al menos 2 caracteres'
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        if (email && !validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email inválido'
            });
        }

        if (telefono && !validatePhone(telefono)) {
            return res.status(400).json({
                success: false,
                message: 'Teléfono inválido (debe ser 10 dígitos comenzando con 3)'
            });
        }

        // Verificar si email o usuario ya existen (solo si se proporcionan)
        const exists = await User.exists(email, usuario);
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'El email o nombre de usuario ya está registrado'
            });
        }

        // Crear usuario
        const userId = await User.create({
            nombre: sanitize(nombre.trim()),
            usuario: usuario ? sanitize(usuario.trim()) : null,
            email: email ? sanitize(email.trim()) : null,
            password: password,
            telefono: telefono ? sanitize(telefono.trim()) : null,
            direccion: direccion ? sanitize(direccion.trim()) : null,
            barrio: barrio ? sanitize(barrio.trim()) : null,
            rol: rol,
            codigo_referido: codigo_referido || null // <-- Asegurar que no sea undefined
        });

        // Obtener usuario creado
        const user = await User.findById(userId);

        if (!user) {
            return res.status(500).json({
                success: false,
                message: 'Error al obtener el usuario creado'
            });
        }

        // Generar token
        const token = generateToken(user);

        // Respuesta sin contraseña
        const { password: pwd, ...userWithoutPassword } = user;

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: userWithoutPassword,
                token
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar usuario',
            error: error.message
        });
    }
};

// Login
const login = async (req, res) => {
    try {
        const { email, usuario, password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña es requerida'
            });
        }

        const identifier = email || usuario;
        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: 'Email o usuario es requerido'
            });
        }

        // Buscar usuario
        const user = await User.findByEmailOrUsername(identifier);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar si está activo
        if (user.activo === 0) {
            return res.status(403).json({
                success: false,
                message: 'Usuario suspendido. Contacta al administrador'
            });
        }

        // Verificar contraseña
        const isValidPassword = await User.verifyPassword(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Generar token
        const token = generateToken(user);

        // Respuesta sin contraseña
        const { password: pwd, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: userWithoutPassword,
                token
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión',
            error: error.message
        });
    }
};


// Login con Google
const googleLogin = async (req, res) => {
    try {
        const { googleId, email, displayName, picture } = req.body;

        if (!googleId || !email) {
            return res.status(400).json({
                success: false,
                message: 'Datos de Google incompletos'
            });
        }

        // Buscar o crear usuario
        const user = await User.findOrCreateGoogleUser({
            id: googleId,
            email,
            displayName,
            picture
        });

        // Generar token
        const token = generateToken(user);

        // Respuesta sin contraseña
        const { password: pwd, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Login con Google exitoso',
            data: {
                user: userWithoutPassword,
                token
            }
        });

    } catch (error) {
        console.error('Error en login con Google:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión con Google',
            error: error.message
        });
    }
};

// Obtener perfil del usuario
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener perfil',
            error: error.message
        });
    }
};

// Actualizar perfil
const updateProfile = async (req, res) => {
    try {
        const { nombre, telefono, direccion, barrio, password } = req.body;
        
        const updates = {};
        
        if (nombre) updates.nombre = sanitize(nombre);
        if (telefono) {
            if (!validatePhone(telefono)) {
                return res.status(400).json({
                    success: false,
                    message: 'Teléfono inválido'
                });
            }
            updates.telefono = sanitize(telefono);
        }
        if (direccion) updates.direccion = sanitize(direccion);
        if (barrio) updates.barrio = sanitize(barrio);
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'La nueva contraseña debe tener al menos 6 caracteres'
                });
            }
            updates.password = password;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay datos para actualizar'
            });
        }

        const updated = await User.update(req.userId, updates);
        
        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar el perfil'
            });
        }

        const user = await User.findById(req.userId);
        
        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            data: user
        });

    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar perfil',
            error: error.message
        });
    }
};

// Cerrar sesión
const logout = async (req, res) => {
    // En JWT, el logout se maneja en el cliente eliminando el token
    res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
    });
};

// Cambiar contraseña
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña actual y nueva son requeridas'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        const user = await User.findById(req.userId);
        
        const isValidPassword = await User.verifyPassword(currentPassword, user.password);
        
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }

        const updated = await User.update(req.userId, { password: newPassword });
        
        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo cambiar la contraseña'
            });
        }

        res.json({
            success: true,
            message: 'Contraseña cambiada exitosamente'
        });

    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar contraseña',
            error: error.message
        });
    }
};

module.exports = {
    register,
    login,
    googleLogin,
    getProfile,
    updateProfile,
    logout,
    changePassword
};