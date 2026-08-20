const db = require('../config/database');

class Category {
    // Obtener todas las categorías
    static async getAll(activo = null) {
        let query = `
            SELECT c.*, 
                   (SELECT COUNT(*) FROM subcategorias WHERE categoria_id = c.id AND activo = 1) as total_subcategorias,
                   (SELECT COUNT(*) FROM productos WHERE categoria_id = c.id AND activo = 1) as total_productos
            FROM categorias c
        `;
        
        const params = [];
        if (activo !== null) {
            query += ' WHERE c.activo = ?';
            params.push(activo);
        }
        
        query += ' ORDER BY c.orden ASC, c.nombre ASC';
        
        const [rows] = await db.execute(query, params);
        return rows;
    }

    // Obtener categoría por ID
    static async getById(id) {
        const query = `
            SELECT c.*, 
                   (SELECT COUNT(*) FROM subcategorias WHERE categoria_id = c.id AND activo = 1) as total_subcategorias,
                   (SELECT COUNT(*) FROM productos WHERE categoria_id = c.id AND activo = 1) as total_productos
            FROM categorias c
            WHERE c.id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0] || null;
    }

    // Crear categoría
    static async create(data) {
        const { nombre, descripcion, imagen_url, orden = 0, activo = 1 } = data;
        
        const query = `
            INSERT INTO categorias (nombre, descripcion, imagen_url, orden, activo)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [nombre, descripcion, imagen_url, orden, activo]);
        return result.insertId;
    }

    // Actualizar categoría
    static async update(id, data) {
        const fields = [];
        const values = [];
        
        const allowedFields = ['nombre', 'descripcion', 'imagen_url', 'orden', 'activo'];
        
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        
        if (fields.length === 0) return null;
        
        values.push(id);
        const query = `UPDATE categorias SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    // Eliminar categoría (soft delete o hard delete)
    static async delete(id, soft = true) {
        if (soft) {
            const query = 'UPDATE categorias SET activo = 0 WHERE id = ?';
            const [result] = await db.execute(query, [id]);
            return result.affectedRows > 0;
        } else {
            const query = 'DELETE FROM categorias WHERE id = ?';
            const [result] = await db.execute(query, [id]);
            return result.affectedRows > 0;
        }
    }

    // Verificar si existe categoría
    static async exists(nombre, excludeId = null) {
        let query = 'SELECT id FROM categorias WHERE nombre = ?';
        const params = [nombre];
        
        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }
        
        const [rows] = await db.execute(query, params);
        return rows.length > 0;
    }

    // Obtener categorías con sus subcategorías
    static async getWithSubcategories(activo = null) {
        let query = `
            SELECT c.*, 
                   (SELECT COUNT(*) FROM subcategorias WHERE categoria_id = c.id AND activo = 1) as total_subcategorias,
                   (SELECT COUNT(*) FROM productos WHERE categoria_id = c.id AND activo = 1) as total_productos
            FROM categorias c
        `;
        
        const params = [];
        if (activo !== null) {
            query += ' WHERE c.activo = ?';
            params.push(activo);
        }
        
        query += ' ORDER BY c.orden ASC, c.nombre ASC';
        
        const [categories] = await db.execute(query, params);
        
        // Obtener subcategorías para cada categoría
        for (const category of categories) {
            const subquery = `
                SELECT s.*, 
                       (SELECT COUNT(*) FROM productos WHERE subcategoria_id = s.id AND activo = 1) as total_productos
                FROM subcategorias s
                WHERE s.categoria_id = ? AND s.activo = 1
                ORDER BY s.orden ASC, s.nombre ASC
            `;
            const [subcategories] = await db.execute(subquery, [category.id]);
            category.subcategorias = subcategories;
        }
        
        return categories;
    }

    // Obtener categoría con sus productos
    static async getWithProducts(id, activo = true) {
        const category = await this.getById(id);
        if (!category) return null;
        
        let productQuery = `
            SELECT p.*,
                   (SELECT imagen_url FROM producto_imagenes WHERE producto_id = p.id AND activo = 1 ORDER BY orden LIMIT 1) as imagen_principal
            FROM productos p
            WHERE p.categoria_id = ? 
        `;
        
        const params = [id];
        if (activo !== null) {
            productQuery += ' AND p.activo = ?';
            params.push(activo);
        }
        
        productQuery += ' ORDER BY p.nombre ASC';
        
        const [products] = await db.execute(productQuery, params);
        category.productos = products;
        
        return category;
    }
}

module.exports = Category;