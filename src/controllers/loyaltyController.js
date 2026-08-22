const Loyalty = require('../models/Loyalty');
const User = require('../models/User');
const Order = require('../models/Order');

// Obtener mis puntos
const getMyPoints = async (req, res) => {
    try {
        const points = await Loyalty.getUserPoints(req.userId);
        
        if (!points) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const stats = await Loyalty.getPointsStats(req.userId);

        res.json({
            success: true,
            data: {
                puntos_actuales: points.puntos_acumulados,
                codigo_referido: points.codigo_referido,
                stats: stats
            }
        });
    } catch (error) {
        console.error('Error al obtener puntos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener puntos',
            error: error.message
        });
    }
};

// Obtener historial de puntos
const getPointsHistory = async (req, res) => {
    try {
        const { limit } = req.query;
        const history = await Loyalty.getPointsHistory(req.userId, limit || 50);

        res.json({
            success: true,
            data: history,
            total: history.length
        });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener historial',
            error: error.message
        });
    }
};

// Obtener productos canjeables
const getRedeemableProducts = async (req, res) => {
    try {
        const products = await Loyalty.getRedeemableProducts(req.userId);

        res.json({
            success: true,
            data: products,
            total: products.length
        });
    } catch (error) {
        console.error('Error al obtener productos canjeables:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener productos canjeables',
            error: error.message
        });
    }
};

// Canjear producto por puntos (con validación)
const redeemProduct = async (req, res) => {
    try {
        const { producto_id, cantidad = 1 } = req.body;
        
        if (!producto_id) {
            return res.status(400).json({
                success: false,
                message: 'ID del producto es requerido'
            });
        }

        // Validar canje
        const validation = await Loyalty.canRedeemProduct(req.userId, producto_id, cantidad);
        
        if (!validation.can) {
            return res.status(400).json({
                success: false,
                message: validation.message,
                data: {
                    puntos_necesarios: validation.puntos_necesarios,
                    puntos_disponibles: validation.puntos_disponibles
                }
            });
        }

        const Product = require('../models/Product');
        const product = await Product.getById(producto_id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        const puntos_necesarios = product.puntos_canjeables * cantidad;

        // Crear pedido de canje
        const user = await User.findById(req.userId);
        const orderId = await Order.create({
            usuario_id: req.userId,
            cliente_nombre: user.nombre,
            cliente_telefono: user.telefono || 'No especificado',
            cliente_direccion: user.direccion || 'No especificada',
            total_pedido: 0,
            puntos_usados: puntos_necesarios,
            puntos_ganados: 0,
            observaciones: `Canje de producto: ${product.nombre} x${cantidad}`
        });

        // Agregar detalle del canje
        await Order.addDetail(orderId, {
            producto_id: product.id,
            producto_nombre: product.nombre,
            cantidad: cantidad,
            precio_unitario: 0,
            subtotal: 0,
            es_canje: 1,
            precio_base: 0,
            precio_extra_total: 0,
            es_personalizado: 0,
            observaciones: 'Canjeado por puntos'
        });

        // Restar puntos
        await Loyalty.redeemPoints(
            req.userId,
            puntos_necesarios,
            orderId
        );

        // Marcar como pagado automáticamente (canje)
        await Order.markAsPaid(orderId);

        const order = await Order.getById(orderId);

        res.json({
            success: true,
            message: `Producto canjeado exitosamente`,
            data: {
                producto: product.nombre,
                cantidad: cantidad,
                puntos_usados: puntos_necesarios,
                puntos_restantes: validation.puntos_restantes,
                pedido: order
            }
        });
    } catch (error) {
        console.error('Error al canjear producto:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al canjear producto'
        });
    }
};

// Procesar código de referido
const processReferral = async (req, res) => {
    try {
        const { codigo_referido } = req.body;
        
        if (!codigo_referido) {
            return res.status(400).json({
                success: false,
                message: 'Código de referido es requerido'
            });
        }

        const result = await Loyalty.processReferral(codigo_referido, req.userId);

        res.json({
            success: true,
            message: result.mensaje || 'Código de referido aplicado exitosamente',
            data: {
                referente_id: result.referente_id,
                pendiente: result.pendiente
            }
        });
    } catch (error) {
        console.error('Error al procesar referido:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error al procesar código de referido'
        });
    }
};

// Obtener estado del referido
const getReferralStatus = async (req, res) => {
    try {
        const status = await Loyalty.getReferralStatus(req.userId);

        res.json({
            success: true,
            data: status || { mensaje: 'No has sido referido por nadie' }
        });
    } catch (error) {
        console.error('Error al obtener estado del referido:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estado del referido',
            error: error.message
        });
    }
};

// Obtener ranking de puntos
const getRanking = async (req, res) => {
    try {
        const { limit } = req.query;
        const ranking = await Loyalty.getRanking(limit || 10);

        res.json({
            success: true,
            data: ranking,
            total: ranking.length
        });
    } catch (error) {
        console.error('Error al obtener ranking:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ranking',
            error: error.message
        });
    }
};

// Obtener estadísticas de puntos (Admin)
const getPointsStats = async (req, res) => {
    try {
        const { usuario_id } = req.query;
        
        if (!usuario_id) {
            return res.status(400).json({
                success: false,
                message: 'ID de usuario es requerido'
            });
        }

        const stats = await Loyalty.getPointsStats(usuario_id);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

// Agregar puntos manualmente (Admin)
const addPointsManually = async (req, res) => {
    try {
        const { usuario_id, puntos, descripcion } = req.body;
        
        if (!usuario_id || !puntos || puntos <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y puntos (mayor a 0) son requeridos'
            });
        }

        await Loyalty.addPoints(
            usuario_id,
            puntos,
            'manual',
            descripcion || 'Ajuste manual de puntos'
        );

        const user = await User.findById(usuario_id);

        res.json({
            success: true,
            message: 'Puntos agregados exitosamente',
            data: {
                usuario: user ? user.nombre : null,
                puntos_agregados: puntos,
                puntos_totales: user ? user.puntos_acumulados : null
            }
        });
    } catch (error) {
        console.error('Error al agregar puntos:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al agregar puntos'
        });
    }
};

// Transferir puntos (Admin)
const transferPoints = async (req, res) => {
    try {
        const { from_usuario_id, to_usuario_id, puntos, motivo } = req.body;
        
        if (!from_usuario_id || !to_usuario_id || !puntos || puntos <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Usuario origen, usuario destino y puntos son requeridos'
            });
        }

        await Loyalty.transferPoints(
            from_usuario_id,
            to_usuario_id,
            puntos,
            motivo || 'Transferencia administrativa'
        );

        res.json({
            success: true,
            message: 'Puntos transferidos exitosamente',
            data: {
                from_usuario: from_usuario_id,
                to_usuario: to_usuario_id,
                puntos_transferidos: puntos
            }
        });
    } catch (error) {
        console.error('Error al transferir puntos:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al transferir puntos'
        });
    }
};

module.exports = {
    getMyPoints,
    getPointsHistory,
    getRedeemableProducts,
    redeemProduct,
    processReferral,
    getReferralStatus,
    getRanking,
    getPointsStats,
    addPointsManually,
    transferPoints
};