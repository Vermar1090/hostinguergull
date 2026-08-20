const db = require('../config/database');
const Loyalty = require('./Loyalty');

class Order {
    static async create(data) {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            const {
                usuario_id,
                cliente_nombre,
                cliente_telefono,
                cliente_direccion,
                estado = 'Pendiente',
                total_pedido,
                puntos_usados = 0,
                observaciones = null
            } = data;

            const puntos_ganados = Loyalty.calculatePoints(total_pedido);

            const [result] = await connection.execute(`
                INSERT INTO pedidos (
                    usuario_id, cliente_nombre, cliente_telefono, cliente_direccion,
                    estado, total_pedido, puntos_usados, puntos_ganados, observaciones
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                usuario_id || null,
                cliente_nombre,
                cliente_telefono,
                cliente_direccion,
                estado,
                total_pedido,
                puntos_usados || 0,
                puntos_ganados,
                observaciones || null
            ]);

            const orderId = result.insertId;

            // Si el pedido es Pagado, otorgar puntos inmediatamente
            if (estado === 'Pagado' || estado === 'Completado') {
                await this._awardPointsTransaction(connection, orderId);
            }

            await connection.commit();
            return orderId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async _awardPointsTransaction(connection, orderId) {
        const [order] = await connection.execute(
            'SELECT usuario_id, puntos_ganados, puntos_usados FROM pedidos WHERE id = ?',
            [orderId]
        );

        if (!order[0] || !order[0].usuario_id) return;

        const { usuario_id, puntos_ganados } = order[0];

        const [user] = await connection.execute(
            'SELECT id, activo FROM usuarios WHERE id = ? AND activo = 1',
            [usuario_id]
        );
        if (!user[0]) return;

        // 1. Agregar puntos de compra
        if (puntos_ganados > 0) {
            await connection.execute(
                'UPDATE usuarios SET puntos_acumulados = puntos_acumulados + ? WHERE id = ? AND activo = 1',
                [puntos_ganados, usuario_id]
            );
            await connection.execute(`
                INSERT INTO historial_puntos (usuario_id, tipo, puntos, descripcion, pedido_id)
                VALUES (?, 'compra', ?, ?, ?)
            `, [usuario_id, puntos_ganados, `Compra en pedido #${orderId}`, orderId]);
        }

        // 2. Verificar primera compra para puntos de referido
        const [compras] = await connection.execute(
            `SELECT COUNT(*) as total FROM pedidos 
             WHERE usuario_id = ? AND estado IN ("Pagado", "Completado") AND id <= ?`,
            [usuario_id, orderId]
        );

        if (compras[0].total === 1) {
            const [referral] = await connection.execute(`
                SELECT id, referente_id FROM referidos 
                WHERE referido_id = ? AND puntos_otorgados = 0
            `, [usuario_id]);

            if (referral[0]) {
                const [referente] = await connection.execute(
                    'SELECT id, activo FROM usuarios WHERE id = ? AND activo = 1',
                    [referral[0].referente_id]
                );

                if (referente[0]) {
                    const PUNTOS_REFERIDO = 30;
                    await connection.execute(
                        'UPDATE usuarios SET puntos_acumulados = puntos_acumulados + ? WHERE id = ? AND activo = 1',
                        [PUNTOS_REFERIDO, referral[0].referente_id]
                    );
                    await connection.execute(`
                        INSERT INTO historial_puntos (usuario_id, tipo, puntos, descripcion, pedido_id)
                        VALUES (?, 'referido', ?, ?, ?)
                    `, [
                        referral[0].referente_id,
                        PUNTOS_REFERIDO,
                        `Puntos por referido #${usuario_id} (primera compra)`,
                        orderId
                    ]);
                    await connection.execute(`
                        UPDATE referidos 
                        SET puntos_otorgados = ?, fecha_compra_referido = NOW()
                        WHERE id = ?
                    `, [PUNTOS_REFERIDO, referral[0].id]);
                }
            }
        }
    }

    static async awardPoints(orderId) {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            await this._awardPointsTransaction(connection, orderId);
            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getById(id) {
        const [rows] = await db.execute(`
            SELECT p.*, u.nombre as usuario_nombre, u.email as usuario_email
            FROM pedidos p LEFT JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.id = ?
        `, [id]);
        if (rows.length === 0) return null;
        
        const order = rows[0];
        const [detalles] = await db.execute(`
            SELECT pd.*,
                   (SELECT COUNT(*) FROM pedido_personalizaciones WHERE pedido_detalle_id = pd.id) as total_personalizaciones,
                   (SELECT COUNT(*) FROM pedido_extras WHERE pedido_detalle_id = pd.id) as total_extras
            FROM pedido_detalles pd WHERE pd.pedido_id = ?
        `, [id]);
        
        order.detalles = detalles;
        for (const detalle of detalles) {
            const [personalizaciones] = await db.execute(`
                SELECT pp.*, ov.valor as valor_texto, op.nombre_grupo
                FROM pedido_personalizaciones pp
                JOIN opciones_valores ov ON pp.opcion_valor_id = ov.id
                JOIN opciones_personalizacion op ON pp.opcion_grupo_id = op.id
                WHERE pp.pedido_detalle_id = ?
            `, [detalle.id]);
            const [extras] = await db.execute(`
                SELECT pe.*, ep.extra_nombre
                FROM pedido_extras pe JOIN extras_producto ep ON pe.extra_id = ep.id
                WHERE pe.pedido_detalle_id = ?
            `, [detalle.id]);
            detalle.personalizaciones = personalizaciones;
            detalle.extras = extras;
        }
        return order;
    }

    static async getAll(filters = {}) {
        let query = `
            SELECT p.*, u.nombre as usuario_nombre, u.email as usuario_email
            FROM pedidos p LEFT JOIN usuarios u ON p.usuario_id = u.id
        `;
        const conditions = [], params = [];
        if (filters.estado) { conditions.push('p.estado = ?'); params.push(filters.estado); }
        if (filters.usuario_id) { conditions.push('p.usuario_id = ?'); params.push(filters.usuario_id); }
        if (filters.fecha_desde) { conditions.push('p.fecha_pedido >= ?'); params.push(filters.fecha_desde); }
        if (filters.fecha_hasta) { conditions.push('p.fecha_pedido <= ?'); params.push(filters.fecha_hasta); }
        if (filters.search) {
            conditions.push('(p.cliente_nombre LIKE ? OR p.cliente_telefono LIKE ?)');
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm);
        }
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY p.fecha_pedido DESC';
        if (filters.limit) {
            const limit = parseInt(filters.limit) || 20;
            const offset = parseInt(filters.offset) || 0;
            query += ` LIMIT ${limit} OFFSET ${offset}`;
        }
        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async updateStatus(id, estado, observaciones = null) {
        const [result] = await db.execute(
            'UPDATE pedidos SET estado = ?, observaciones = COALESCE(?, observaciones) WHERE id = ?',
            [estado, observaciones, id]
        );
        return result.affectedRows > 0;
    }

    static async update(id, data) {
        const fields = [], values = [];
        const allowedFields = ['estado', 'total_pedido', 'puntos_usados', 'puntos_ganados',
            'cliente_nombre', 'cliente_telefono', 'cliente_direccion', 'observaciones', 'fecha_pago'];
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        if (fields.length === 0) return null;
        values.push(id);
        const [result] = await db.execute(`UPDATE pedidos SET ${fields.join(', ')} WHERE id = ?`, values);
        return result.affectedRows > 0;
    }

    static async addDetail(orderId, data) {
        const { producto_id, producto_nombre, cantidad, precio_unitario, subtotal,
                es_canje = 0, precio_base = 0, precio_extra_total = 0, 
                es_personalizado = 0, observaciones = null } = data;
        const [result] = await db.execute(`
            INSERT INTO pedido_detalles (
                pedido_id, producto_id, producto_nombre, cantidad,
                precio_unitario, subtotal, es_canje, precio_base,
                precio_extra_total, es_personalizado, observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [orderId, producto_id, producto_nombre, cantidad, precio_unitario,
            subtotal, es_canje, precio_base, precio_extra_total, es_personalizado, observaciones]);
        return result.insertId;
    }

    static async addPersonalization(detalleId, data) {
        const { opcion_grupo_id, opcion_valor_id, opcion_texto = null, precio_extra_aplicado = 0 } = data;
        const [result] = await db.execute(`
            INSERT INTO pedido_personalizaciones (
                pedido_detalle_id, opcion_grupo_id, opcion_valor_id,
                opcion_texto, precio_extra_aplicado
            ) VALUES (?, ?, ?, ?, ?)
        `, [detalleId, opcion_grupo_id, opcion_valor_id, opcion_texto, precio_extra_aplicado]);
        return result.insertId;
    }

    static async addExtra(detalleId, data) {
        const { extra_id, cantidad = 1, precio_unitario } = data;
        const [result] = await db.execute(`
            INSERT INTO pedido_extras (pedido_detalle_id, extra_id, cantidad, precio_unitario)
            VALUES (?, ?, ?, ?)
        `, [detalleId, extra_id, cantidad, precio_unitario]);
        return result.insertId;
    }

    static async markAsPaid(id) {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            const [order] = await connection.execute('SELECT estado FROM pedidos WHERE id = ?', [id]);
            if (!order[0]) throw new Error('Pedido no encontrado');
            if (order[0].estado === 'Pagado') throw new Error('El pedido ya está pagado');

            await connection.execute(
                'UPDATE pedidos SET estado = "Pagado", fecha_pago = NOW() WHERE id = ?',
                [id]
            );
            await connection.commit();
            
            const result = await this.awardPoints(id);
            return { success: true, ...result };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async cancel(id, motivo, tipo = 'no_preparado') {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            const [order] = await connection.execute(
                'SELECT usuario_id, puntos_usados, estado FROM pedidos WHERE id = ?',
                [id]
            );
            if (!order[0]) throw new Error('Pedido no encontrado');
            if (order[0].estado === 'Completado' || order[0].estado === 'Cancelado') {
                throw new Error('No se puede cancelar un pedido completado o ya cancelado');
            }

            if (order[0].usuario_id && order[0].puntos_usados > 0) {
                const [user] = await connection.execute(
                    'SELECT id, activo FROM usuarios WHERE id = ? AND activo = 1',
                    [order[0].usuario_id]
                );
                if (user[0]) {
                    await connection.execute(
                        'UPDATE usuarios SET puntos_acumulados = puntos_acumulados + ? WHERE id = ? AND activo = 1',
                        [order[0].puntos_usados, order[0].usuario_id]
                    );
                    await connection.execute(`
                        INSERT INTO historial_puntos (usuario_id, tipo, puntos, descripcion, pedido_id)
                        VALUES (?, 'manual', ?, ?, ?)
                    `, [order[0].usuario_id, order[0].puntos_usados, 
                        `Devolución de puntos por cancelación de pedido #${id}`, id]);
                }
            }

            await connection.execute('UPDATE pedidos SET estado = "Cancelado" WHERE id = ?', [id]);
            await connection.execute(`
                INSERT INTO cancelaciones_pedidos (pedido_id, tipo, descripcion)
                VALUES (?, ?, ?)
            `, [id, tipo, motivo]);
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getUserOrders(usuario_id, limit = 20) {
        const [rows] = await db.execute(`
            SELECT p.*, (SELECT COUNT(*) FROM pedido_detalles WHERE pedido_id = p.id) as total_productos
            FROM pedidos p WHERE p.usuario_id = ?
            ORDER BY p.fecha_pedido DESC LIMIT ?
        `, [usuario_id, limit]);
        return rows;
    }

    static async getStats(filters = {}) {
        let whereClause = '', params = [];
        if (filters.fecha_desde) {
            whereClause = ' WHERE fecha_pedido >= ?';
            params.push(filters.fecha_desde);
        }
        if (filters.fecha_hasta) {
            whereClause += whereClause ? ' AND fecha_pedido <= ?' : ' WHERE fecha_pedido <= ?';
            params.push(filters.fecha_hasta);
        }
        const [rows] = await db.execute(`
            SELECT 
                COUNT(*) as total_pedidos,
                SUM(total_pedido) as total_ventas,
                AVG(total_pedido) as promedio_venta,
                SUM(puntos_ganados) as total_puntos_ganados,
                SUM(puntos_usados) as total_puntos_usados,
                COUNT(CASE WHEN estado = 'Pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN estado = 'En Proceso' THEN 1 END) as en_proceso,
                COUNT(CASE WHEN estado = 'Completado' THEN 1 END) as completados,
                COUNT(CASE WHEN estado = 'Cancelado' THEN 1 END) as cancelados,
                COUNT(CASE WHEN estado = 'Pagado' THEN 1 END) as pagados
            FROM pedidos ${whereClause}
        `, params);
        return rows[0];
    }

    static async getDetailById(detalleId) {
        const [rows] = await db.execute('SELECT * FROM pedido_detalles WHERE id = ?', [detalleId]);
        return rows[0] || null;
    }

    static async count(filters = {}) {
        let query = 'SELECT COUNT(*) as total FROM pedidos';
        const conditions = [], params = [];
        if (filters.estado) { conditions.push('estado = ?'); params.push(filters.estado); }
        if (filters.usuario_id) { conditions.push('usuario_id = ?'); params.push(filters.usuario_id); }
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        const [rows] = await db.execute(query, params);
        return rows[0].total;
    }
}

module.exports = Order;