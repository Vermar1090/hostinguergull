const db = require('../config/database');
const { emitToAdmins, emitToAll } = require('../config/socket');

const getDashboardStats = async (req, res) => {
    try {
        const [ventas] = await db.query(`
            SELECT 
                COUNT(*) as total_pedidos,
                COALESCE(SUM(total_pedido), 0) as total_ventas,
                COALESCE(AVG(total_pedido), 0) as ticket_promedio
            FROM pedidos 
            WHERE fecha_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        const [productos] = await db.query('SELECT COUNT(*) as total FROM productos WHERE activo = 1');
        const [categorias] = await db.query('SELECT COUNT(*) as total FROM categorias WHERE activo = 1');
        const [usuarios] = await db.query('SELECT COUNT(*) as total FROM usuarios WHERE rol = "Cliente"');

        const [pedidos_hoy] = await db.query(`
            SELECT COUNT(*) as total 
            FROM pedidos 
            WHERE DATE(fecha_pedido) = CURDATE()
        `);

        const [pedidos_pendientes] = await db.query(`
            SELECT COUNT(*) as total 
            FROM pedidos 
            WHERE estado = 'Pendiente'
        `);

        res.json({
            success: true,
            data: {
                ventas: ventas[0],
                productos: productos[0].total,
                categorias: categorias[0].total,
                usuarios: usuarios[0].total,
                pedidos_hoy: pedidos_hoy[0].total,
                pedidos_pendientes: pedidos_pendientes[0].total
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo estadísticas' });
    }
};

const getRecentOrders = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const [orders] = await db.query(`
            SELECT p.*, u.nombre as cliente_nombre, u.telefono as cliente_telefono
            FROM pedidos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY p.fecha_pedido DESC
            LIMIT ?
        `, [limit]);

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Error obteniendo pedidos recientes:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo pedidos' });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        await db.query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, id]);

        const [order] = await db.query('SELECT usuario_id FROM pedidos WHERE id = ?', [id]);
        
        if (order[0]?.usuario_id) {
            emitToUser(order[0].usuario_id, 'order_update', {
                pedido_id: id,
                estado,
                message: `Tu pedido #${id} ahora está: ${estado}`
            });
        }

        emitToAdmins('order_status_updated', { pedido_id: id, estado, usuario_id: order[0]?.usuario_id });

        res.json({ success: true, message: 'Estado actualizado' });
    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({ success: false, message: 'Error actualizando estado' });
    }
};

const createCategory = async (req, res) => {
    try {
        const { nombre, descripcion, orden } = req.body;
        const imagen_url = req.file?.path || null;

        const [result] = await db.query(
            'INSERT INTO categorias (nombre, descripcion, imagen_url, orden) VALUES (?, ?, ?, ?)',
            [nombre, descripcion, imagen_url, orden || 0]
        );

        emitToAll('category_created', { id: result.insertId, nombre, imagen_url });

        res.json({ success: true, data: { id: result.insertId, nombre, descripcion, imagen_url, orden } });
    } catch (error) {
        console.error('Error creando categoría:', error);
        res.status(500).json({ success: false, message: 'Error creando categoría' });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, orden, activo } = req.body;
        const imagen_url = req.file?.path || null;

        let query = 'UPDATE categorias SET nombre = ?, descripcion = ?, orden = ?, activo = ?';
        const params = [nombre, descripcion, orden || 0, activo !== undefined ? activo : 1];

        if (imagen_url) {
            query += ', imagen_url = ?';
            params.push(imagen_url);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);

        emitToAll('category_updated', { id, nombre, imagen_url });

        res.json({ success: true, message: 'Categoría actualizada' });
    } catch (error) {
        console.error('Error actualizando categoría:', error);
        res.status(500).json({ success: false, message: 'Error actualizando categoría' });
    }
};

const createSubcategory = async (req, res) => {
    try {
        const { categoria_id, nombre, descripcion, orden } = req.body;

        const [result] = await db.query(
            'INSERT INTO subcategorias (categoria_id, nombre, descripcion, orden) VALUES (?, ?, ?, ?)',
            [categoria_id, nombre, descripcion, orden || 0]
        );

        emitToAll('subcategory_created', { id: result.insertId, categoria_id, nombre });

        res.json({ success: true, data: { id: result.insertId, categoria_id, nombre, descripcion, orden } });
    } catch (error) {
        console.error('Error creando subcategoría:', error);
        res.status(500).json({ success: false, message: 'Error creando subcategoría' });
    }
};

const updateSubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoria_id, nombre, descripcion, orden, activo } = req.body;

        await db.query(
            'UPDATE subcategorias SET categoria_id = ?, nombre = ?, descripcion = ?, orden = ?, activo = ? WHERE id = ?',
            [categoria_id, nombre, descripcion, orden || 0, activo !== undefined ? activo : 1, id]
        );

        emitToAll('subcategory_updated', { id, categoria_id, nombre });

        res.json({ success: true, message: 'Subcategoría actualizada' });
    } catch (error) {
        console.error('Error actualizando subcategoría:', error);
        res.status(500).json({ success: false, message: 'Error actualizando subcategoría' });
    }
};

const createProduct = async (req, res) => {
    try {
        const {
            nombre,
            categoria_id,
            subcategoria_id,
            unidad_medida,
            precio_venta,
            puntos_canjeables,
            descripcion,
            es_oferta,
            precio_oferta,
            disponible_tienda
        } = req.body;

        const imagen_url = req.file?.path || null;

        const [result] = await db.query(
            `INSERT INTO productos 
            (nombre, categoria_id, subcategoria_id, unidad_medida, precio_venta, puntos_canjeables, imagen_url, descripcion, es_oferta, precio_oferta, disponible_tienda) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                categoria_id || null,
                subcategoria_id || null,
                unidad_medida || null,
                precio_venta || 0,
                puntos_canjeables || 0,
                imagen_url,
                descripcion || null,
                es_oferta || 0,
                precio_oferta || null,
                disponible_tienda !== undefined ? disponible_tienda : 1
            ]
        );

        emitToAll('product_created', { id: result.insertId, nombre, imagen_url, precio_venta });

        res.json({ success: true, data: { id: result.insertId, nombre, imagen_url, precio_venta } });
    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({ success: false, message: 'Error creando producto' });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            categoria_id,
            subcategoria_id,
            unidad_medida,
            precio_venta,
            puntos_canjeables,
            descripcion,
            es_oferta,
            precio_oferta,
            disponible_tienda,
            activo
        } = req.body;

        const imagen_url = req.file?.path || null;

        let query = `UPDATE productos SET 
            nombre = ?, 
            categoria_id = ?, 
            subcategoria_id = ?, 
            unidad_medida = ?, 
            precio_venta = ?, 
            puntos_canjeables = ?, 
            descripcion = ?, 
            es_oferta = ?, 
            precio_oferta = ?, 
            disponible_tienda = ?, 
            activo = ?`;
        
        const params = [
            nombre,
            categoria_id || null,
            subcategoria_id || null,
            unidad_medida || null,
            precio_venta || 0,
            puntos_canjeables || 0,
            descripcion || null,
            es_oferta || 0,
            precio_oferta || null,
            disponible_tienda !== undefined ? disponible_tienda : 1,
            activo !== undefined ? activo : 1
        ];

        if (imagen_url) {
            query += ', imagen_url = ?';
            params.push(imagen_url);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);

        emitToAll('product_updated', { id, nombre, imagen_url, precio_venta });

        res.json({ success: true, message: 'Producto actualizado' });
    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(500).json({ success: false, message: 'Error actualizando producto' });
    }
};

const addProductImages = async (req, res) => {
    try {
        const { id } = req.params;
        const images = req.processedImages || [];

        for (const img of images) {
            await db.query(
                'INSERT INTO producto_imagenes (producto_id, imagen_url, orden) VALUES (?, ?, 0)',
                [id, img.original]
            );
        }

        emitToAll('product_images_added', { producto_id: id, count: images.length });

        res.json({ success: true, message: 'Imágenes agregadas', count: images.length });
    } catch (error) {
        console.error('Error agregando imágenes:', error);
        res.status(500).json({ success: false, message: 'Error agregando imágenes' });
    }
};

const deleteProductImage = async (req, res) => {
    try {
        const { id } = req.params;

        const [images] = await db.query('SELECT imagen_url FROM producto_imagenes WHERE id = ?', [id]);
        
        if (images[0]) {
            const { deleteImage } = require('../middleware/upload');
            deleteImage(images[0].imagen_url);
            
            await db.query('DELETE FROM producto_imagenes WHERE id = ?', [id]);

            emitToAll('product_image_deleted', { id });

            res.json({ success: true, message: 'Imagen eliminada' });
        } else {
            res.status(404).json({ success: false, message: 'Imagen no encontrada' });
        }
    } catch (error) {
        console.error('Error eliminando imagen:', error);
        res.status(500).json({ success: false, message: 'Error eliminando imagen' });
    }
};

const createBanner = async (req, res) => {
    try {
        const { titulo, descripcion, enlace, orden, fecha_inicio, fecha_fin } = req.body;
        const imagen_url = req.file?.path || null;

        const [result] = await db.query(
            'INSERT INTO banners (titulo, imagen_url, descripcion, enlace, orden, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [titulo, imagen_url, descripcion, enlace, orden || 0, fecha_inicio || null, fecha_fin || null]
        );

        emitToAll('banner_created', { id: result.insertId, titulo, imagen_url });

        res.json({ success: true, data: { id: result.insertId, titulo, imagen_url, descripcion, enlace } });
    } catch (error) {
        console.error('Error creando banner:', error);
        res.status(500).json({ success: false, message: 'Error creando banner' });
    }
};

const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion, enlace, orden, activo, fecha_inicio, fecha_fin } = req.body;
        const imagen_url = req.file?.path || null;

        let query = 'UPDATE banners SET titulo = ?, descripcion = ?, enlace = ?, orden = ?, activo = ?, fecha_inicio = ?, fecha_fin = ?';
        const params = [titulo, descripcion, enlace, orden || 0, activo !== undefined ? activo : 1, fecha_inicio || null, fecha_fin || null];

        if (imagen_url) {
            query += ', imagen_url = ?';
            params.push(imagen_url);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);

        emitToAll('banner_updated', { id, titulo, imagen_url });

        res.json({ success: true, message: 'Banner actualizado' });
    } catch (error) {
        console.error('Error actualizando banner:', error);
        res.status(500).json({ success: false, message: 'Error actualizando banner' });
    }
};

const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;

        const [banners] = await db.query('SELECT imagen_url FROM banners WHERE id = ?', [id]);
        
        if (banners[0]) {
            const { deleteImage } = require('../middleware/upload');
            deleteImage(banners[0].imagen_url);
            
            await db.query('DELETE FROM banners WHERE id = ?', [id]);

            emitToAll('banner_deleted', { id });

            res.json({ success: true, message: 'Banner eliminado' });
        } else {
            res.status(404).json({ success: false, message: 'Banner no encontrado' });
        }
    } catch (error) {
        console.error('Error eliminando banner:', error);
        res.status(500).json({ success: false, message: 'Error eliminando banner' });
    }
};

const createPromo = async (req, res) => {
    try {
        const { titulo, descripcion, precio_original, precio_promo, puntos_requeridos, puntos_regalo, productos_incluidos, fecha_inicio, fecha_fin } = req.body;
        const imagen_url = req.file?.path || null;

        const [result] = await db.query(
            'INSERT INTO promos_dia (titulo, descripcion, precio_original, precio_promo, puntos_requeridos, puntos_regalo, imagen_url, productos_incluidos, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [titulo, descripcion, precio_original, precio_promo, puntos_requeridos || 0, puntos_regalo || 0, imagen_url, productos_incluidos || null, fecha_inicio || null, fecha_fin || null]
        );

        emitToAll('promo_created', { id: result.insertId, titulo, imagen_url, precio_promo });

        res.json({ success: true, data: { id: result.insertId, titulo, imagen_url, precio_promo } });
    } catch (error) {
        console.error('Error creando promoción:', error);
        res.status(500).json({ success: false, message: 'Error creando promoción' });
    }
};

const updatePromo = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion, precio_original, precio_promo, puntos_requeridos, puntos_regalo, productos_incluidos, activo, fecha_inicio, fecha_fin } = req.body;
        const imagen_url = req.file?.path || null;

        let query = 'UPDATE promos_dia SET titulo = ?, descripcion = ?, precio_original = ?, precio_promo = ?, puntos_requeridos = ?, puntos_regalo = ?, productos_incluidos = ?, activo = ?, fecha_inicio = ?, fecha_fin = ?';
        const params = [titulo, descripcion, precio_original, precio_promo, puntos_requeridos || 0, puntos_regalo || 0, productos_incluidos || null, activo !== undefined ? activo : 1, fecha_inicio || null, fecha_fin || null];

        if (imagen_url) {
            query += ', imagen_url = ?';
            params.push(imagen_url);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);

        emitToAll('promo_updated', { id, titulo, imagen_url, precio_promo });

        res.json({ success: true, message: 'Promoción actualizada' });
    } catch (error) {
        console.error('Error actualizando promoción:', error);
        res.status(500).json({ success: false, message: 'Error actualizando promoción' });
    }
};

const deletePromo = async (req, res) => {
    try {
        const { id } = req.params;

        const [promos] = await db.query('SELECT imagen_url FROM promos_dia WHERE id = ?', [id]);
        
        if (promos[0] && promos[0].imagen_url) {
            const { deleteImage } = require('../middleware/upload');
            deleteImage(promos[0].imagen_url);
        }
        
        await db.query('DELETE FROM promos_dia WHERE id = ?', [id]);

        emitToAll('promo_deleted', { id });

        res.json({ success: true, message: 'Promoción eliminada' });
    } catch (error) {
        console.error('Error eliminando promoción:', error);
        res.status(500).json({ success: false, message: 'Error eliminando promoción' });
    }
};

module.exports = {
    getDashboardStats,
    getRecentOrders,
    updateOrderStatus,
    createCategory,
    updateCategory,
    createSubcategory,
    updateSubcategory,
    createProduct,
    updateProduct,
    addProductImages,
    deleteProductImage,
    createBanner,
    updateBanner,
    deleteBanner,
    createPromo,
    updatePromo,
    deletePromo
};
