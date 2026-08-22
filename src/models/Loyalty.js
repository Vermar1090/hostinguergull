const db = require('../config/database');

const PUNTOS_BIENVENIDA = 20;
const PUNTOS_REFERIDO = 30;
const FACTOR_PUNTOS = 1000;
const MAX_PUNTOS_CANJE_POR_PEDIDO = 5000;

class Loyalty {
    static async getUserPoints(usuario_id) {
        const query = `
            SELECT puntos_acumulados, codigo_referido, activo
            FROM usuarios WHERE id = ? AND activo = 1
        `;
        const [rows] = await db.execute(query, [usuario_id]);
        return rows[0] || null;
    }

    static async addPoints(usuario_id, puntos, tipo, descripcion, pedido_id = null) {
        const user = await this.getUserPoints(usuario_id);
        if (!user || !user.activo) {
            throw new Error('Usuario no encontrado o inactivo');
        }
        if (puntos <= 0) {
            throw new Error('Los puntos deben ser mayores a 0');
        }

        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            await connection.execute(
                'UPDATE usuarios SET puntos_acumulados = puntos_acumulados + ? WHERE id = ? AND activo = 1',
                [puntos, usuario_id]
            );
            
            await connection.execute(`
                INSERT INTO historial_puntos (usuario_id, tipo, puntos, descripcion, pedido_id)
                VALUES (?, ?, ?, ?, ?)
            `, [usuario_id, tipo, puntos, descripcion, pedido_id]);
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async subtractPoints(usuario_id, puntos, tipo, descripcion, pedido_id = null) {
        const user = await this.getUserPoints(usuario_id);
        if (!user || !user.activo) {
            throw new Error('Usuario no encontrado o inactivo');
        }
        if (puntos <= 0) {
            throw new Error('Los puntos deben ser mayores a 0');
        }
        if (user.puntos_acumulados < puntos) {
            throw new Error(`Puntos insuficientes. Tienes ${user.puntos_acumulados} puntos, necesitas ${puntos}`);
        }

        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            await connection.execute(
                'UPDATE usuarios SET puntos_acumulados = puntos_acumulados - ? WHERE id = ? AND activo = 1',
                [puntos, usuario_id]
            );
            
            await connection.execute(`
                INSERT INTO historial_puntos (usuario_id, tipo, puntos, descripcion, pedido_id)
                VALUES (?, ?, ?, ?, ?)
            `, [usuario_id, tipo, -puntos, descripcion, pedido_id]);
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getPointsHistory(usuario_id, limit = 50) {
        const query = `
            SELECT hp.*, p.id as pedido_id, p.total_pedido, p.estado as pedido_estado
            FROM historial_puntos hp
            LEFT JOIN pedidos p ON hp.pedido_id = p.id
            WHERE hp.usuario_id = ?
            ORDER BY hp.fecha DESC LIMIT ?
        `;
        const [rows] = await db.execute(query, [usuario_id, limit]);
        return rows;
    }

    static calculatePoints(total_pedido) {
        return Math.floor(total_pedido / FACTOR_PUNTOS);
    }

    static async redeemPoints(usuario_id, puntos_a_usar, pedido_id = null) {
        if (puntos_a_usar > MAX_PUNTOS_CANJE_POR_PEDIDO) {
            throw new Error(`No puedes canjear más de ${MAX_PUNTOS_CANJE_POR_PEDIDO} puntos por pedido`);
        }
        return await this.subtractPoints(
            usuario_id, puntos_a_usar, 'canje',
            `Canje de puntos${pedido_id ? ` en pedido #${pedido_id}` : ''}`,
            pedido_id
        );
    }

    static async processReferral(codigo_referido, usuario_id) {
        const user = await this.getUserPoints(usuario_id);
        if (!user) throw new Error('Usuario no encontrado');

        const referente = await this.getUserByReferralCode(codigo_referido);
        if (!referente) throw new Error('Código de referido inválido');
        if (referente.id === usuario_id) throw new Error('No puedes referirte a ti mismo');

        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            const [existing] = await connection.execute(
                'SELECT id FROM referidos WHERE referido_id = ?',
                [usuario_id]
            );
            if (existing[0]) throw new Error('Este usuario ya fue referido');
            
            await connection.execute(`
                INSERT INTO referidos (referente_id, referido_id, codigo_usado, puntos_otorgados)
                VALUES (?, ?, ?, 0)
            `, [referente.id, usuario_id, codigo_referido]);
            
            await connection.commit();
            return { 
                referente_id: referente.id, 
                puntos_otorgados: 0, 
                pendiente: true,
                mensaje: 'Referido registrado. Los puntos se otorgarán cuando el referido haga su primera compra.'
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getUserByReferralCode(codigo) {
        if (!codigo) return null;
        const query = `
            SELECT id, nombre, email, puntos_acumulados, activo
            FROM usuarios WHERE codigo_referido = ? AND activo = 1
        `;
        const [rows] = await db.execute(query, [codigo]);
        return rows[0] || null;
    }

    static async getReferralStatus(usuario_id) {
        const query = `
            SELECT r.*,
                   u.nombre as referente_nombre,
                   u.email as referente_email,
                   (SELECT COUNT(*) FROM pedidos WHERE usuario_id = r.referido_id AND estado IN ('Pagado', 'Completado')) as compras_referido
            FROM referidos r
            JOIN usuarios u ON r.referente_id = u.id
            WHERE r.referido_id = ?
        `;
        const [rows] = await db.execute(query, [usuario_id]);
        return rows[0] || null;
    }

    static async getRedeemableProducts(usuario_id) {
        const user = await this.getUserPoints(usuario_id);
        if (!user) return [];
        
        const query = `
            SELECT p.*,
                   (SELECT imagen_url FROM producto_imagenes WHERE producto_id = p.id AND activo = 1 ORDER BY orden LIMIT 1) as imagen_principal
            FROM productos p
            WHERE p.puntos_canjeables > 0 
              AND p.puntos_canjeables <= ?
              AND p.activo = 1 
              AND p.disponible_tienda = 1
            ORDER BY p.puntos_canjeables ASC
        `;
        const [rows] = await db.execute(query, [user.puntos_acumulados]);
        return rows;
    }

    static async getRanking(limit = 10) {
        const query = `
            SELECT id, nombre, usuario, email, puntos_acumulados
            FROM usuarios WHERE activo = 1 AND rol = 'Cliente'
            ORDER BY puntos_acumulados DESC LIMIT ?
        `;
        const [rows] = await db.execute(query, [limit]);
        return rows;
    }

    static async getPointsStats(usuario_id) {
        const query = `
            SELECT 
                (SELECT puntos_acumulados FROM usuarios WHERE id = ? AND activo = 1) as puntos_actuales,
                (SELECT SUM(puntos) FROM historial_puntos WHERE usuario_id = ? AND puntos > 0) as puntos_ganados_total,
                (SELECT SUM(puntos) FROM historial_puntos WHERE usuario_id = ? AND puntos < 0) as puntos_usados_total,
                (SELECT COUNT(*) FROM historial_puntos WHERE usuario_id = ? AND tipo = 'compra') as total_compras,
                (SELECT COUNT(*) FROM historial_puntos WHERE usuario_id = ? AND tipo = 'canje') as total_canjes,
                (SELECT COUNT(*) FROM referidos WHERE referente_id = ?) as total_referidos,
                (SELECT COUNT(*) FROM referidos WHERE referente_id = ? AND puntos_otorgados > 0) as referidos_activos
        `;
        const [rows] = await db.execute(query, [
            usuario_id, usuario_id, usuario_id,
            usuario_id, usuario_id, usuario_id, usuario_id
        ]);
        return rows[0] || null;
    }

    static async transferPoints(from_usuario_id, to_usuario_id, puntos, motivo) {
        if (from_usuario_id === to_usuario_id) {
            throw new Error('No puedes transferir puntos a ti mismo');
        }
        if (puntos <= 0) throw new Error('Los puntos deben ser mayores a 0');

        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            const [fromUser] = await connection.execute(
                'SELECT puntos_acumulados, activo FROM usuarios WHERE id = ?',
                [from_usuario_id]
            );
            if (!fromUser[0] || fromUser[0].activo === 0) {
                throw new Error('Usuario origen no encontrado o inactivo');
            }
            if (fromUser[0].puntos_acumulados < puntos) {
                throw new Error(`Usuario origen tiene ${fromUser[0].puntos_acumulados} puntos, necesita ${puntos}`);
            }

            const [toUser] = await connection.execute(
                'SELECT activo FROM usuarios WHERE id = ?',
                [to_usuario_id]
            );
            if (!toUser[0] || toUser[0].activo === 0) {
                throw new Error('Usuario destino no encontrado o inactivo');
            }

            await connection.execute(
                'UPDATE usuarios SET puntos_acumulados = puntos_acumulados - ? WHERE id = ? AND activo = 1',
                [puntos, from_usuario_id]
            );
            await connection.execute(`
                INSERT INTO historial_puntos (usuario_id, tipo, puntos, descripcion)
                VALUES (?, 'manual', ?, ?)
            `, [from_usuario_id, -puntos, `Transferencia a usuario #${to_usuario_id}: ${motivo}`]);

            await connection.execute(
                'UPDATE usuarios SET puntos_acumulados = puntos_acumulados + ? WHERE id = ? AND activo = 1',
                [puntos, to_usuario_id]
            );
            await connection.execute(`
                INSERT INTO historial_puntos (usuario_id, tipo, puntos, descripcion)
                VALUES (?, 'manual', ?, ?)
            `, [to_usuario_id, puntos, `Transferencia de usuario #${from_usuario_id}: ${motivo}`]);
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async canRedeemProduct(usuario_id, producto_id, cantidad = 1) {
        const Product = require('./Product');
        const product = await Product.getById(producto_id);
        if (!product || product.activo === 0 || product.disponible_tienda === 0) {
            return { can: false, message: 'Producto no disponible' };
        }
        if (product.puntos_canjeables <= 0) {
            return { can: false, message: 'Este producto no es canjeable por puntos' };
        }

        const user = await this.getUserPoints(usuario_id);
        if (!user) return { can: false, message: 'Usuario no encontrado' };

        const puntos_necesarios = product.puntos_canjeables * cantidad;
        if (user.puntos_acumulados < puntos_necesarios) {
            return { 
                can: false, 
                message: `Puntos insuficientes. Necesitas ${puntos_necesarios} puntos, tienes ${user.puntos_acumulados}`,
                puntos_necesarios,
                puntos_disponibles: user.puntos_acumulados
            };
        }
        return { 
            can: true, 
            message: 'Puede canjear el producto',
            puntos_necesarios,
            puntos_restantes: user.puntos_acumulados - puntos_necesarios
        };
    }
}

module.exports = Loyalty;