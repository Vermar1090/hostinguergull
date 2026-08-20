const db = require('../config/database');

class Subcategory {
    // Obtener todas las subcategorías
    static async getAll(categoria_id = null, activo = null) {
        let query = `
            SELECT s.*, c.nombre as categoria_nombre,
                   (SELECT COUNT(*) FROM productos WHERE subcategoria_id = s.id AND activo = 1) as total_productos
            FROM subcategorias s
            INNER JOIN categorias c ON s.categoria_id = c.id
        `;
        
        const conditions = [];
        const params = [];
        
        if (categoria_id !== null) {
            conditions.push('s.categoria_id = ?');
            params.push(categoria_id);
        }
        
        if (activo !== null) {
            conditions.push('s.activo = ?');
            params.push(activo);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY s.orden ASC, s.nombre ASC';
        
        const [rows] = await db.execute(query, params);
        return rows;
    }

    // Obtener subcategoría por ID
    static async getById(id) {
        const query = `
            SELECT s.*, c.nombre as categoria_nombre,
                   (SELECT COUNT(*) FROM productos WHERE subcategoria_id = s.id AND activo = 1) as total_productos
            FROM subcategorias s
            INNER JOIN categorias c ON s.categoria_id = c.id
            WHERE s.id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0] || null;
    }

    // Crear subcategoría
    static async create(data) {
        const { categoria_id, nombre, descripcion, orden = 0, activo = 1 } = data;
        
        const query = `
            INSERT INTO subcategorias (categoria_id, nombre, descripcion, orden, activo)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [categoria_id, nombre, descripcion, orden, activo]);
        return result.insertId;
    }

    // Actualizar subcategoría
    static async update(id, data) {
        const fields = [];
        const values = [];
        
        const allowedFields = ['categoria_id', 'nombre', 'descripcion', 'orden', 'activo'];
        
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        
        if (fields.length === 0) return null;
        
        values.push(id);
        const query = `UPDATE subcategorias SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    // Eliminar subcategoría (soft delete o hard delete)
    static async delete(id, soft = true) {
        if (soft) {
            const query = 'UPDATE subcategorias SET activo = 0 WHERE id = ?';
            const [result] = await db.execute(query, [id]);
            return result.affectedRows > 0;
        } else {
            const query = 'DELETE FROM subcategorias WHERE id = ?';
            const [result] = await db.execute(query, [id]);
            return result.affectedRows > 0;
        }
    }

    // Verificar si existe subcategoría
    static async exists(nombre, categoria_id, excludeId = null) {
        let query = 'SELECT id FROM subcategorias WHERE nombre = ? AND categoria_id = ?';
        const params = [nombre, categoria_id];
        
        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }
        
        const [rows] = await db.execute(query, params);
        return rows.length > 0;
    }

    // Obtener subcategorías con sus productos
    static async getWithProducts(id, activo = true) {
        const subcategory = await this.getById(id);
        if (!subcategory) return null;
        
        let productQuery = `
            SELECT p.*,
                   (SELECT imagen_url FROM producto_imagenes WHERE producto_id = p.id AND activo = 1 ORDER BY orden LIMIT 1) as imagen_principal
            FROM productos p
            WHERE p.subcategoria_id = ? 
        `;
        
        const params = [id];
        if (activo !== null) {
            productQuery += ' AND p.activo = ?';
            params.push(activo);
        }
        
        productQuery += ' ORDER BY p.nombre ASC';
        
        const [products] = await db.execute(productQuery, params);
        subcategory.productos = products;
        
        return subcategory;
    }

    // Cambiar categoría de una subcategoría
    static async changeCategory(id, new_categoria_id) {
        const query = 'UPDATE subcategorias SET categoria_id = ? WHERE id = ?';
        const [result] = await db.execute(query, [new_categoria_id, id]);
        return result.affectedRows > 0;
    }
}

module.exports = Subcategory;