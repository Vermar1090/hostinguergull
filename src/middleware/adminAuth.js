const jwt = require('jsonwebtoken');
const db = require('../config/database');

const adminAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No se proporcionó token de autenticación'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const [users] = await db.query(
            'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ?',
            [decoded.id]
        );
        
        const user = users[0];
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (user.activo === 0) {
            return res.status(403).json({
                success: false,
                message: 'Usuario suspendido'
            });
        }

        if (user.rol !== 'Administrador' && user.rol !== 'Empleado') {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Se requieren privilegios de administrador'
            });
        }

        req.user = user;
        req.userId = user.id;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado'
            });
        }
        
        console.error('Error en Auth middleware:', error);
        res.status(500).json({
            success: false,
            message: 'Error en autenticación'
        });
    }
};

const checkAdminRole = (req, res, next) => {
    if (req.user.rol !== 'Administrador') {
        return res.status(403).json({
            success: false,
            message: 'Solo los administradores pueden realizar esta acción'
        });
    }
    next();
};

module.exports = {
    adminAuthMiddleware,
    checkAdminRole
};