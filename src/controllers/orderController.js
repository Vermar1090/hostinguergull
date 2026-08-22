const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// Crear pedido normal
const createOrder = async (req, res) => {
    try {
        const {
            usuario_id, cliente_nombre, cliente_telefono, cliente_direccion,
            detalles, puntos_usados = 0, observaciones = null
        } = req.body;

        if (!cliente_nombre || !cliente_telefono || !cliente_direccion) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, teléfono y dirección del cliente son requeridos'
            });
        }

        if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El pedido debe tener al menos un producto'
            });
        }

        let total_pedido = 0;
        for (const detalle of detalles) {
            const product = await Product.getById(detalle.producto_id);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Producto con ID ${detalle.producto_id} no encontrado`
                });
            }
            const precio = product.es_oferta && product.precio_oferta ? product.precio_oferta : product.precio_venta;
            total_pedido += (precio + (detalle.precio_extra_total || 0)) * detalle.cantidad;
        }

        if (puntos_usados > 0) {
            if (req.userId) {
                const user = await User.findById(req.userId);
                if (!user || user.puntos_acumulados < puntos_usados) {
                    return res.status(400).json({
                        success: false,
                        message: 'Puntos insuficientes'
                    });
                }
            }
            total_pedido = Math.max(0, total_pedido - (puntos_usados * 1000));
        }

        const orderId = await Order.create({
            usuario_id: req.userId || usuario_id || null,
            cliente_nombre, cliente_telefono, cliente_direccion,
            estado: 'Pendiente',
            total_pedido,
            puntos_usados,
            observaciones
        });

        for (const detalle of detalles) {
            const product = await Product.getById(detalle.producto_id);
            const precio = product.es_oferta && product.precio_oferta ? product.precio_oferta : product.precio_venta;
            const subtotal = (precio + (detalle.precio_extra_total || 0)) * detalle.cantidad;

            const detalleId = await Order.addDetail(orderId, {
                producto_id: detalle.producto_id,
                producto_nombre: product.nombre,
                cantidad: detalle.cantidad,
                precio_unitario: precio,
                subtotal: subtotal,
                es_canje: detalle.es_canje || 0,
                precio_base: precio,
                precio_extra_total: detalle.precio_extra_total || 0,
                es_personalizado: detalle.personalizaciones ? 1 : 0,
                observaciones: detalle.observaciones || null
            });

            if (detalle.personalizaciones && Array.isArray(detalle.personalizaciones)) {
                for (const pers of detalle.personalizaciones) {
                    await Order.addPersonalization(detalleId, {
                        opcion_grupo_id: pers.opcion_grupo_id,
                        opcion_valor_id: pers.opcion_valor_id,
                        opcion_texto: pers.opcion_texto || null,
                        precio_extra_aplicado: pers.precio_extra_aplicado || 0
                    });
                }
            }

            if (detalle.extras && Array.isArray(detalle.extras)) {
                for (const extra of detalle.extras) {
                    await Order.addExtra(detalleId, {
                        extra_id: extra.extra_id,
                        cantidad: extra.cantidad || 1,
                        precio_unitario: extra.precio_unitario
                    });
                }
            }
        }

        const order = await Order.getById(orderId);
        res.status(201).json({
            success: true,
            message: 'Pedido creado exitosamente',
            data: order
        });
    } catch (error) {
        console.error('Error al crear pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear pedido',
            error: error.message
        });
    }
};

// Crear pedido pagado directamente
const createPaidOrder = async (req, res) => {
    try {
        const {
            usuario_id, cliente_nombre, cliente_telefono, cliente_direccion,
            detalles, puntos_usados = 0, observaciones = null
        } = req.body;

        if (!cliente_nombre || !cliente_telefono || !cliente_direccion) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, teléfono y dirección del cliente son requeridos'
            });
        }

        if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El pedido debe tener al menos un producto'
            });
        }

        let total_pedido = 0;
        for (const detalle of detalles) {
            const product = await Product.getById(detalle.producto_id);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Producto con ID ${detalle.producto_id} no encontrado`
                });
            }
            const precio = product.es_oferta && product.precio_oferta ? product.precio_oferta : product.precio_venta;
            total_pedido += (precio + (detalle.precio_extra_total || 0)) * detalle.cantidad;
        }

        if (puntos_usados > 0) {
            if (req.userId) {
                const user = await User.findById(req.userId);
                if (!user || user.puntos_acumulados < puntos_usados) {
                    return res.status(400).json({
                        success: false,
                        message: 'Puntos insuficientes'
                    });
                }
            }
            total_pedido = Math.max(0, total_pedido - (puntos_usados * 1000));
        }

        const puntos_ganados = Math.floor(total_pedido / 1000);

        const orderId = await Order.create({
            usuario_id: req.userId || usuario_id || null,
            cliente_nombre, cliente_telefono, cliente_direccion,
            estado: 'Pagado',
            total_pedido,
            puntos_usados,
            puntos_ganados,
            observaciones
        });

        for (const detalle of detalles) {
            const product = await Product.getById(detalle.producto_id);
            const precio = product.es_oferta && product.precio_oferta ? product.precio_oferta : product.precio_venta;
            const subtotal = (precio + (detalle.precio_extra_total || 0)) * detalle.cantidad;

            const detalleId = await Order.addDetail(orderId, {
                producto_id: detalle.producto_id,
                producto_nombre: product.nombre,
                cantidad: detalle.cantidad,
                precio_unitario: precio,
                subtotal: subtotal,
                es_canje: detalle.es_canje || 0,
                precio_base: precio,
                precio_extra_total: detalle.precio_extra_total || 0,
                es_personalizado: detalle.personalizaciones ? 1 : 0,
                observaciones: detalle.observaciones || null
            });

            if (detalle.personalizaciones && Array.isArray(detalle.personalizaciones)) {
                for (const pers of detalle.personalizaciones) {
                    await Order.addPersonalization(detalleId, {
                        opcion_grupo_id: pers.opcion_grupo_id,
                        opcion_valor_id: pers.opcion_valor_id,
                        opcion_texto: pers.opcion_texto || null,
                        precio_extra_aplicado: pers.precio_extra_aplicado || 0
                    });
                }
            }

            if (detalle.extras && Array.isArray(detalle.extras)) {
                for (const extra of detalle.extras) {
                    await Order.addExtra(detalleId, {
                        extra_id: extra.extra_id,
                        cantidad: extra.cantidad || 1,
                        precio_unitario: extra.precio_unitario
                    });
                }
            }
        }

        const order = await Order.getById(orderId);
        res.status(201).json({
            success: true,
            message: 'Pedido creado y pagado exitosamente',
            data: order
        });
    } catch (error) {
        console.error('Error al crear pedido pagado:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear pedido',
            error: error.message
        });
    }
};

const getOrders = async (req, res) => {
    try {
        const filters = {
            estado: req.query.estado,
            usuario_id: req.query.usuario_id,
            fecha_desde: req.query.fecha_desde,
            fecha_hasta: req.query.fecha_hasta,
            search: req.query.search,
            limit: req.query.limit || 20,
            offset: req.query.offset || 0
        };
        const orders = await Order.getAll(filters);
        const total = await Order.count(filters);
        res.json({
            success: true,
            data: orders,
            pagination: {
                total,
                limit: parseInt(filters.limit),
                offset: parseInt(filters.offset),
                current_page: Math.floor(parseInt(filters.offset) / parseInt(filters.limit)) + 1,
                total_pages: Math.ceil(total / parseInt(filters.limit))
            }
        });
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener pedidos',
            error: error.message
        });
    }
};

const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.getById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }
        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error al obtener pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener pedido',
            error: error.message
        });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, observaciones } = req.body;
        if (!estado || !['Pendiente', 'En Proceso', 'Completado', 'Cancelado', 'Pagado'].includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido'
            });
        }
        const order = await Order.getById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }
        const updated = await Order.updateStatus(id, estado, observaciones);
        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar el estado del pedido'
            });
        }
        const updatedOrder = await Order.getById(id);
        res.json({
            success: true,
            message: 'Estado del pedido actualizado exitosamente',
            data: updatedOrder
        });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar estado',
            error: error.message
        });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo, tipo = 'no_preparado' } = req.body;
        if (!motivo) {
            return res.status(400).json({
                success: false,
                message: 'El motivo de cancelación es requerido'
            });
        }
        const order = await Order.getById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }
        if (order.estado === 'Completado' || order.estado === 'Cancelado') {
            return res.status(400).json({
                success: false,
                message: 'No se puede cancelar un pedido completado o ya cancelado'
            });
        }
        const cancelled = await Order.cancel(id, motivo, tipo);
        if (!cancelled) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo cancelar el pedido'
            });
        }
        res.json({
            success: true,
            message: 'Pedido cancelado exitosamente'
        });
    } catch (error) {
        console.error('Error al cancelar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cancelar pedido',
            error: error.message
        });
    }
};

const markAsPaid = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.user || !['Administrador', 'Empleado'].includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para realizar esta acción'
            });
        }
        const order = await Order.getById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }
        if (order.estado === 'Pagado') {
            return res.status(400).json({
                success: false,
                message: 'El pedido ya está pagado'
            });
        }
        const result = await Order.markAsPaid(id);
        if (!result || !result.success) {
            return res.status(400).json({
                success: false,
                message: result?.message || 'No se pudo marcar el pedido como pagado'
            });
        }
        const updatedOrder = await Order.getById(id);
        res.json({
            success: true,
            message: 'Pedido marcado como pagado exitosamente',
            data: updatedOrder
        });
    } catch (error) {
        console.error('Error al marcar como pagado:', error);
        res.status(500).json({
            success: false,
            message: 'Error al marcar como pagado',
            error: error.message
        });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const { limit } = req.query;
        const orders = await Order.getUserOrders(req.userId, limit || 20);
        res.json({
            success: true,
            data: orders,
            total: orders.length
        });
    } catch (error) {
        console.error('Error al obtener pedidos del usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener pedidos del usuario',
            error: error.message
        });
    }
};

const getOrderStats = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;
        const stats = await Order.getStats({ fecha_desde, fecha_hasta });
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

module.exports = {
    createOrder,
    createPaidOrder,
    getOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    markAsPaid,
    getMyOrders,
    getOrderStats
};