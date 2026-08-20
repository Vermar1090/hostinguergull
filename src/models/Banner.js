const db = require('../config/database');

class Banner {
    // Crear banner
    static async create(data) {
        const {
            titulo,
            imagen_url,
            descripcion,
            enlace,
            activo = 1,
            orden = 0,
            fecha_inicio,
            fecha_fin
        } = data;

        const query = `
            INSERT INTO banners (
                titulo, imagen_url, descripcion, enlace,
                activo, orden, fecha_inicio, fecha_fin
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(query, [
            titulo,
            imagen_url,
            descripcion || null,
            enlace || null,
            activo,
            orden,
            fecha_inicio || null,
            fecha_fin || null
        ]);

        return result.insertId;
    }

    // Obtener banner por ID
    static async getById(id) {
        const query = 'SELECT * FROM banners WHERE id = ?';
        const [rows] = await db.execute(query, [id]);
        return rows[0] || null;
    }

    // Obtener todos los banners activos (para la tienda)
    static async getActive(limit = 10) {
        const query = `
            SELECT * FROM banners
            WHERE activo = 1
              AND (fecha_inicio IS NULL OR fecha_inicio <= CURDATE())
              AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
            ORDER BY orden ASC, id DESC
            LIMIT ?
        `;
        const [rows] = await db.execute(query, [limit]);
        return rows;
    }

    // Obtener todos los banners (admin)
    static async getAll(filters = {}) {
        let query = 'SELECT * FROM banners';
        const conditions = [];
        const params = [];

        if (filters.activo !== undefined) {
            conditions.push('activo = ?');
            params.push(filters.activo);
        }

        if (filters.search) {
            conditions.push('(titulo LIKE ? OR descripcion LIKE ?)');
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY orden ASC, id DESC';

        if (filters.limit) {
            const limit = parseInt(filters.limit) || 20;
            const offset = parseInt(filters.offset) || 0;
            query += ` LIMIT ${limit} OFFSET ${offset}`;
        }

        const [rows] = await db.execute(query, params);
        return rows;
    }

    // Actualizar banner
    static async update(id, data) {
        const fields = [];
        const values = [];

        const allowedFields = [
            'titulo', 'imagen_url', 'descripcion', 'enlace',
            'activo', 'orden', 'fecha_inicio', 'fecha_fin'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const query = `UPDATE banners SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    // Eliminar banner (soft delete)
    static async delete(id) {
        const query = 'UPDATE banners SET activo = 0 WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    // Eliminar banner permanentemente
    static async deletePermanent(id) {
        const query = 'DELETE FROM banners WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    // Reordenar banners
    static async reorder(ids) {
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            for (let i = 0; i < ids.length; i++) {
                await connection.execute(
                    'UPDATE banners SET orden = ? WHERE id = ?',
                    [i, ids[i]]
                );
            }
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Contar banners
    static async count(filters = {}) {
        let query = 'SELECT COUNT(*) as total FROM banners';
        const conditions = [];
        const params = [];

        if (filters.activo !== undefined) {
            conditions.push('activo = ?');
            params.push(filters.activo);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        const [rows] = await db.execute(query, params);
        return rows[0].total;
    }

    // Obtener banners destacados (primeros 3)
    static async getDestacados() {
        const query = `
            SELECT * FROM banners
            WHERE activo = 1
              AND (fecha_inicio IS NULL OR fecha_inicio <= CURDATE())
              AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
            ORDER BY orden ASC, id DESC
            LIMIT 3
        `;
        const [rows] = await db.execute(query);
        return rows;
    }

    // Verificar si existe banner con mismo orden
    static async existsOrder(orden, excludeId = null) {
        let query = 'SELECT id FROM banners WHERE orden = ?';
        const params = [orden];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const [rows] = await db.execute(query, params);
        return rows.length > 0;
    }

    // Obtener banners por rango de fechas
    static async getByDateRange(fecha_inicio, fecha_fin) {
        const query = `
            SELECT * FROM banners
            WHERE (fecha_inicio BETWEEN ? AND ?)
               OR (fecha_fin BETWEEN ? AND ?)
               OR (fecha_inicio <= ? AND fecha_fin >= ?)
            ORDER BY orden ASC
        `;
        const [rows] = await db.execute(query, [
            fecha_inicio, fecha_fin,
            fecha_inicio, fecha_fin,
            fecha_inicio, fecha_fin
        ]);
        return rows;
    }
}

module.exports = Banner;