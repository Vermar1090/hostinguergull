// src/models/Product.js - CORREGIDO PARA SIEMPRE TRAER IMAGEN

const db = require('../config/database');

class Product {
    // Obtener todos los productos con filtros
    static async getAll(filters = {}) {
        let query = `
            SELECT p.*,
                   c.nombre as categoria_nombre,
                   s.nombre as subcategoria_nombre,
                   (SELECT imagen_url FROM producto_imagenes WHERE producto_id = p.id ORDER BY orden LIMIT 1) as imagen_principal,
                   (SELECT thumbnail FROM producto_imagenes WHERE producto_id = p.id ORDER BY orden LIMIT 1) as imagen_miniatura,
                   (SELECT medium FROM producto_imagenes WHERE producto_id = p.id ORDER BY orden LIMIT 1) as imagen_mediana
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN subcategorias s ON p.subcategoria_id = s.id
        `;
        
        const conditions = [];
        const params = [];
        
        // Filtro activo
        if (filters.activo !== undefined && filters.activo !== null) {
            const activoValue = parseInt(filters.activo);
            if (!isNaN(activoValue)) {
                conditions.push('p.activo = ?');
                params.push(activoValue);
            }
        }
        
        // Filtro disponible_tienda
        if (filters.disponible_tienda !== undefined && filters.disponible_tienda !== null) {
            const disponibleValue = parseInt(filters.disponible_tienda);
            if (!isNaN(disponibleValue)) {
                conditions.push('p.disponible_tienda = ?');
                params.push(disponibleValue);
            }
        }
        
        // Filtro categoria
        if (filters.categoria_id !== undefined && filters.categoria_id !== null && filters.categoria_id !== '') {
            conditions.push('p.categoria_id = ?');
            params.push(parseInt(filters.categoria_id));
        }
        
        // Filtro subcategoria
        if (filters.subcategoria_id !== undefined && filters.subcategoria_id !== null && filters.subcategoria_id !== '') {
            conditions.push('p.subcategoria_id = ?');
            params.push(parseInt(filters.subcategoria_id));
        }
        
        // Búsqueda
        if (filters.search && filters.search.trim() !== '') {
            conditions.push('(p.nombre LIKE ? OR p.descripcion LIKE ?)');
            const searchTerm = `%${filters.search.trim()}%`;
            params.push(searchTerm, searchTerm);
        }
        
        // Rango de precios
        if (filters.min_price !== undefined && filters.min_price !== null && filters.min_price !== '') {
            conditions.push('p.precio_venta >= ?');
            params.push(parseFloat(filters.min_price));
        }
        
        if (filters.max_price !== undefined && filters.max_price !== null && filters.max_price !== '') {
            conditions.push('p.precio_venta <= ?');
            params.push(parseFloat(filters.max_price));
        }
        
        // Puntos canjeables
        if (filters.puntos_canjeables !== undefined && filters.puntos_canjeables !== null && filters.puntos_canjeables !== '') {
            conditions.push('p.puntos_canjeables >= ?');
            params.push(parseInt(filters.puntos_canjeables));
        }
        
        // Precio > 0
        if (!filters.include_zero_price) {
            conditions.push('p.precio_venta > 0');
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        // Ordenamiento
        let orderBy = 'p.nombre ASC';
        if (filters.sort_by) {
            const sortMap = {
                'nombre': 'p.nombre',
                'precio_asc': 'p.precio_venta ASC',
                'precio_desc': 'p.precio_venta DESC',
                'popularidad': 'p.id DESC',
                'nuevos': 'p.id DESC'
            };
            orderBy = sortMap[filters.sort_by] || orderBy;
        }
        
        query += ` ORDER BY ${orderBy}`;
        
        // Paginación
        if (filters.limit) {
            const limit = parseInt(filters.limit) || 20;
            const offset = parseInt(filters.offset) || 0;
            query += ` LIMIT ${limit} OFFSET ${offset}`;
        }
        
        try {
            console.log('📝 Query:', query);
            console.log('📝 Params:', params);
            const [rows] = await db.execute(query, params);
            return rows;
        } catch (error) {
            console.error('❌ Error en getAll:', error);
            throw error;
        }
    }

    // Obtener producto por ID con todos los detalles
    static async getById(id) {
        try {
            const query = `
                SELECT p.*,
                       c.nombre as categoria_nombre,
                       s.nombre as subcategoria_nombre,
                       (SELECT imagen_url FROM producto_imagenes WHERE producto_id = p.id ORDER BY orden LIMIT 1) as imagen_principal,
                       (SELECT thumbnail FROM producto_imagenes WHERE producto_id = p.id ORDER BY orden LIMIT 1) as imagen_miniatura,
                       (SELECT medium FROM producto_imagenes WHERE producto_id = p.id ORDER BY orden LIMIT 1) as imagen_mediana
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                LEFT JOIN subcategorias s ON p.subcategoria_id = s.id
                WHERE p.id = ?
            `;
            const [rows] = await db.execute(query, [id]);
            
            if (rows.length === 0) return null;
            
            const product = rows[0];
            
            // Obtener imágenes del producto (sin filtro activo)
            const [images] = await db.execute(
                'SELECT * FROM producto_imagenes WHERE producto_id = ? ORDER BY orden',
                [id]
            );
            product.imagenes = images;
            
            // Obtener opciones de personalización
            const [opciones] = await db.execute(
                `SELECT o.*, 
                        (SELECT COUNT(*) FROM opciones_valores WHERE opcion_grupo_id = o.id AND activo = 1) as total_valores
                 FROM opciones_personalizacion o
                 WHERE o.producto_id = ? AND o.activo = 1
                 ORDER BY o.orden`,
                [id]
            );
            
            // Obtener valores de cada opción
            for (const opcion of opciones) {
                const [valores] = await db.execute(
                    'SELECT * FROM opciones_valores WHERE opcion_grupo_id = ? AND activo = 1 ORDER BY orden',
                    [opcion.id]
                );
                opcion.valores = valores;
            }
            product.opciones_personalizacion = opciones;
            
            // Obtener extras
            const [extras] = await db.execute(
                'SELECT * FROM extras_producto WHERE producto_id = ? AND activo = 1 ORDER BY extra_nombre',
                [id]
            );
            product.extras = extras;
            
            return product;
        } catch (error) {
            console.error('Error en getById:', error);
            throw error;
        }
    }

    // Crear producto
    static async create(data) {
        const {
            nombre,
            categoria_id,
            subcategoria_id,
            unidad_medida,
            precio_venta = 0,
            puntos_canjeables = 0,
            imagen_url,
            descripcion,
            es_oferta = 0,
            precio_oferta,
            disponible_tienda = 1,
            activo = 1
        } = data;
        
        const query = `
            INSERT INTO productos (
                nombre, categoria_id, subcategoria_id, unidad_medida,
                precio_venta, puntos_canjeables, imagen_url, descripcion,
                es_oferta, precio_oferta, disponible_tienda, activo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.execute(query, [
            nombre.trim(),
            categoria_id || null,
            subcategoria_id || null,
            unidad_medida || null,
            precio_venta,
            puntos_canjeables,
            imagen_url || null,
            descripcion || null,
            es_oferta,
            precio_oferta || null,
            disponible_tienda,
            activo
        ]);
        
        return result.insertId;
    }

    // Actualizar producto
    static async update(id, data) {
        const fields = [];
        const values = [];
        
        const allowedFields = [
            'nombre', 'categoria_id', 'subcategoria_id', 'unidad_medida',
            'precio_venta', 'puntos_canjeables', 'imagen_url', 'descripcion',
            'es_oferta', 'precio_oferta', 'disponible_tienda', 'activo'
        ];
        
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        
        if (fields.length === 0) return null;
        
        values.push(id);
        const query = `UPDATE productos SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    // Eliminar producto
    static async delete(id, soft = true) {
        if (soft) {
            const query = 'UPDATE productos SET activo = 0 WHERE id = ?';
            const [result] = await db.execute(query, [id]);
            return result.affectedRows > 0;
        } else {
            const query = 'DELETE FROM productos WHERE id = ?';
            const [result] = await db.execute(query, [id]);
            return result.affectedRows > 0;
        }
    }

    // Verificar si existe producto
    static async exists(nombre, excludeId = null) {
        let query = 'SELECT id FROM productos WHERE nombre = ?';
        const params = [nombre.trim()];
        
        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }
        
        const [rows] = await db.execute(query, params);
        return rows.length > 0;
    }

    // Obtener productos en oferta
    static async getOfertas(limit = 10) {
        const query = `
            SELECT p.*,
                   (SELECT imagen_url FROM producto_imagenes WHERE producto_id = p.id ORDER BY orden LIMIT 1) as imagen_principal
            FROM productos p
            WHERE p.es_oferta = 1 AND p.activo = 1 AND p.disponible_tienda = 1
            ORDER BY p.id DESC
            LIMIT ?
        `;
        const [rows] = await db.execute(query, [limit]);
        return rows;
    }

    // Obtener productos por puntos
    static async getByPoints(puntos_min = 0, limit = 20) {
        const query = `
            SELECT p.*,
                   (SELECT imagen_url FROM producto_imagenes WHERE producto_id = p.id ORDER BY orden LIMIT 1) as imagen_principal
            FROM productos p
            WHERE p.puntos_canjeables >= ? AND p.activo = 1 AND p.disponible_tienda = 1
            ORDER BY p.puntos_canjeables ASC
            LIMIT ?
        `;
        const [rows] = await db.execute(query, [puntos_min, limit]);
        return rows;
    }

    // === GESTIÓN DE IMÁGENES ===
    static async addImage(producto_id, data) {
        const { imagen_url, thumbnail, medium, orden = 0 } = data;
        
        const query = `
            INSERT INTO producto_imagenes (producto_id, imagen_url, thumbnail, medium, orden)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [producto_id, imagen_url, thumbnail, medium, orden]);
        return result.insertId;
    }

    static async removeImage(id) {
        const query = 'DELETE FROM producto_imagenes WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    static async getImages(producto_id) {
        const query = 'SELECT * FROM producto_imagenes WHERE producto_id = ? ORDER BY orden';
        const [rows] = await db.execute(query, [producto_id]);
        return rows;
    }

    static async updateImageOrder(id, orden) {
        const query = 'UPDATE producto_imagenes SET orden = ? WHERE id = ?';
        const [result] = await db.execute(query, [orden, id]);
        return result.affectedRows > 0;
    }

    // === GESTIÓN DE OPCIONES DE PERSONALIZACIÓN ===
    static async addOption(producto_id, data) {
        const { nombre_grupo, tipo = 'opcion_unica', obligatorio = 1, max_selecciones = 1, orden = 0 } = data;
        
        const query = `
            INSERT INTO opciones_personalizacion (producto_id, nombre_grupo, tipo, obligatorio, max_selecciones, orden)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [producto_id, nombre_grupo, tipo, obligatorio, max_selecciones, orden]);
        return result.insertId;
    }

    static async updateOption(id, data) {
        const fields = [];
        const values = [];
        
        const allowedFields = ['nombre_grupo', 'tipo', 'obligatorio', 'max_selecciones', 'orden', 'activo'];
        
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        
        if (fields.length === 0) return null;
        
        values.push(id);
        const query = `UPDATE opciones_personalizacion SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    static async removeOption(id) {
        const query = 'DELETE FROM opciones_personalizacion WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    static async addOptionValue(opcion_grupo_id, data) {
        const { valor, precio_extra = 0, stock_disponible = 999, orden = 0 } = data;
        
        const query = `
            INSERT INTO opciones_valores (opcion_grupo_id, valor, precio_extra, stock_disponible, orden)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [opcion_grupo_id, valor, precio_extra, stock_disponible, orden]);
        return result.insertId;
    }

    static async updateOptionValue(id, data) {
        const fields = [];
        const values = [];
        
        const allowedFields = ['valor', 'precio_extra', 'stock_disponible', 'orden', 'activo'];
        
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        
        if (fields.length === 0) return null;
        
        values.push(id);
        const query = `UPDATE opciones_valores SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    static async removeOptionValue(id) {
        const query = 'DELETE FROM opciones_valores WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    // === GESTIÓN DE EXTRAS ===
    static async addExtra(producto_id, data) {
        const { extra_nombre, precio_extra, max_por_pedido = 3 } = data;
        
        const query = `
            INSERT INTO extras_producto (producto_id, extra_nombre, precio_extra, max_por_pedido)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [producto_id, extra_nombre, precio_extra, max_por_pedido]);
        return result.insertId;
    }

    static async updateExtra(id, data) {
        const fields = [];
        const values = [];
        
        const allowedFields = ['extra_nombre', 'precio_extra', 'max_por_pedido', 'activo'];
        
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        
        if (fields.length === 0) return null;
        
        values.push(id);
        const query = `UPDATE extras_producto SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    static async removeExtra(id) {
        const query = 'DELETE FROM extras_producto WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    // === GESTIÓN DE STOCK (KARDEX) ===
    static async updateStock(id, cantidad, tipo_movimiento, usuario_id, precio_unitario = 0) {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            const kardexQuery = `
                INSERT INTO kardex (producto_id, usuario_id, tipo_movimiento, cantidad, precio_unitario)
                VALUES (?, ?, ?, ?, ?)
            `;
            await connection.execute(kardexQuery, [id, usuario_id, tipo_movimiento, cantidad, precio_unitario]);
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Obtener historial de kardex
    static async getKardex(producto_id, limit = 50) {
        const query = `
            SELECT k.*, u.nombre as usuario_nombre
            FROM kardex k
            LEFT JOIN usuarios u ON k.usuario_id = u.id
            WHERE k.producto_id = ?
            ORDER BY k.fecha DESC
            LIMIT ?
        `;
        const [rows] = await db.execute(query, [producto_id, limit]);
        return rows;
    }

    // === PRODUCTOS RELACIONADOS ===
    static async getRelated(producto_id, limit = 4) {
        const product = await this.getById(producto_id);
        if (!product) return [];
        
        const query = `
            SELECT p.*,
                   (SELECT imagen_url FROM producto_imagenes WHERE producto_id = p.id ORDER BY orden LIMIT 1) as imagen_principal
            FROM productos p
            WHERE p.categoria_id = ? AND p.id != ? AND p.activo = 1 AND p.disponible_tienda = 1
            ORDER BY RAND()
            LIMIT ?
        `;
        const [rows] = await db.execute(query, [product.categoria_id, producto_id, limit]);
        return rows;
    }

    // === CONTADORES ===
    static async count(filters = {}) {
        let query = 'SELECT COUNT(*) as total FROM productos p';
        
        const conditions = [];
        const params = [];
        
        if (filters.categoria_id !== undefined && filters.categoria_id !== null && filters.categoria_id !== '') {
            conditions.push('p.categoria_id = ?');
            params.push(parseInt(filters.categoria_id));
        }
        
        if (filters.subcategoria_id !== undefined && filters.subcategoria_id !== null && filters.subcategoria_id !== '') {
            conditions.push('p.subcategoria_id = ?');
            params.push(parseInt(filters.subcategoria_id));
        }
        
        if (filters.activo !== undefined && filters.activo !== null && filters.activo !== '') {
            conditions.push('p.activo = ?');
            params.push(parseInt(filters.activo));
        }
        
        if (filters.search && filters.search.trim() !== '') {
            conditions.push('(p.nombre LIKE ? OR p.descripcion LIKE ?)');
            const searchTerm = `%${filters.search.trim()}%`;
            params.push(searchTerm, searchTerm);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        const [rows] = await db.execute(query, params);
        return rows[0].total;
    }

    // === OBTENER TODAS LAS CATEGORÍAS CON CONTEO ===
    static async getCategoriesWithCount() {
        const query = `
            SELECT c.*,
                   (SELECT COUNT(*) FROM productos WHERE categoria_id = c.id AND activo = 1) as total_productos
            FROM categorias c
            WHERE c.activo = 1
            ORDER BY c.orden ASC, c.nombre ASC
        `;
        const [rows] = await db.execute(query);
        return rows;
    }
}

module.exports = Product;