const Product = require('../models/Product');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const { sanitize } = require('../utils/helpers');

// Obtener todos los productos con filtros
const getProducts = async (req, res) => {
    try {
        const filters = {
            categoria_id: req.query.categoria_id,
            subcategoria_id: req.query.subcategoria_id,
            activo: req.query.activo !== undefined ? req.query.activo : 1,
            disponible_tienda: req.query.disponible_tienda,
            es_oferta: req.query.es_oferta,
            search: req.query.search,
            min_price: req.query.min_price,
            max_price: req.query.max_price,
            puntos_canjeables: req.query.puntos_canjeables,
            sort_by: req.query.sort_by,
            limit: req.query.limit || 20,
            offset: req.query.offset || 0,
            include_zero_price: req.query.include_zero_price === 'true'
        };
        
        const products = await Product.getAll(filters);
        const total = await Product.count(filters);
        
        res.json({
            success: true,
            data: products,
            pagination: {
                total,
                limit: parseInt(filters.limit),
                offset: parseInt(filters.offset),
                current_page: Math.floor(parseInt(filters.offset) / parseInt(filters.limit)) + 1,
                total_pages: Math.ceil(total / parseInt(filters.limit))
            },
            filters: filters
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener productos',
            error: error.message
        });
    }
};

// Obtener producto por ID
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const product = await Product.getById(id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener producto',
            error: error.message
        });
    }
};

// Crear producto
const createProduct = async (req, res) => {
    try {
        const {
            nombre,
            categoria_id,
            subcategoria_id,
            unidad_medida,
            precio_venta,
            puntos_canjeables,
            imagen_url,
            descripcion,
            es_oferta,
            precio_oferta,
            disponible_tienda,
            activo
        } = req.body;
        
        // Validaciones
        if (!nombre || nombre.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'El nombre debe tener al menos 2 caracteres'
            });
        }
        
        if (precio_venta !== undefined && precio_venta < 0) {
            return res.status(400).json({
                success: false,
                message: 'El precio de venta no puede ser negativo'
            });
        }
        
        // Verificar si ya existe
        const exists = await Product.exists(nombre);
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un producto con ese nombre'
            });
        }
        
        // Verificar categoría si se proporciona
        if (categoria_id) {
            const category = await Category.getById(categoria_id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'La categoría especificada no existe'
                });
            }
        }
        
        // Verificar subcategoría si se proporciona
        if (subcategoria_id) {
            const subcategory = await Subcategory.getById(subcategoria_id);
            if (!subcategory) {
                return res.status(404).json({
                    success: false,
                    message: 'La subcategoría especificada no existe'
                });
            }
            // Verificar que la subcategoría pertenece a la categoría
            if (categoria_id && subcategory.categoria_id !== parseInt(categoria_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'La subcategoría no pertenece a la categoría especificada'
                });
            }
        }
        
        // Crear producto
        const productId = await Product.create({
            nombre: sanitize(nombre),
            categoria_id: categoria_id || null,
            subcategoria_id: subcategoria_id || null,
            unidad_medida: unidad_medida || null,
            precio_venta: precio_venta || 0,
            puntos_canjeables: puntos_canjeables || 0,
            imagen_url: imagen_url || null,
            descripcion: descripcion ? sanitize(descripcion) : null,
            es_oferta: es_oferta || 0,
            precio_oferta: precio_oferta || null,
            disponible_tienda: disponible_tienda !== undefined ? disponible_tienda : 1,
            activo: activo !== undefined ? activo : 1
        });
        
        const product = await Product.getById(productId);
        
        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            data: product
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear producto',
            error: error.message
        });
    }
};

// Actualizar producto
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
            imagen_url,
            descripcion,
            es_oferta,
            precio_oferta,
            disponible_tienda,
            activo
        } = req.body;
        
        // Verificar si existe
        const product = await Product.getById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        // Verificar nombre duplicado
        if (nombre) {
            const exists = await Product.exists(nombre, id);
            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe un producto con ese nombre'
                });
            }
        }
        
        // Verificar categoría
        if (categoria_id !== undefined && categoria_id !== null) {
            const category = await Category.getById(categoria_id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'La categoría especificada no existe'
                });
            }
        }
        
        // Verificar subcategoría
        if (subcategoria_id !== undefined && subcategoria_id !== null) {
            const subcategory = await Subcategory.getById(subcategoria_id);
            if (!subcategory) {
                return res.status(404).json({
                    success: false,
                    message: 'La subcategoría especificada no existe'
                });
            }
            if (categoria_id && subcategory.categoria_id !== parseInt(categoria_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'La subcategoría no pertenece a la categoría especificada'
                });
            }
        }
        
        const updated = await Product.update(id, {
            nombre: nombre ? sanitize(nombre) : undefined,
            categoria_id: categoria_id !== undefined ? categoria_id : undefined,
            subcategoria_id: subcategoria_id !== undefined ? subcategoria_id : undefined,
            unidad_medida: unidad_medida !== undefined ? unidad_medida : undefined,
            precio_venta: precio_venta !== undefined ? precio_venta : undefined,
            puntos_canjeables: puntos_canjeables !== undefined ? puntos_canjeables : undefined,
            imagen_url: imagen_url !== undefined ? imagen_url : undefined,
            descripcion: descripcion !== undefined ? sanitize(descripcion) : undefined,
            es_oferta: es_oferta !== undefined ? es_oferta : undefined,
            precio_oferta: precio_oferta !== undefined ? precio_oferta : undefined,
            disponible_tienda: disponible_tienda !== undefined ? disponible_tienda : undefined,
            activo: activo !== undefined ? activo : undefined
        });
        
        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar el producto'
            });
        }
        
        const updatedProduct = await Product.getById(id);
        
        res.json({
            success: true,
            message: 'Producto actualizado exitosamente',
            data: updatedProduct
        });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar producto',
            error: error.message
        });
    }
};

// Eliminar producto
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { permanent } = req.query;
        
        const product = await Product.getById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        const soft = permanent !== 'true';
        const deleted = await Product.delete(id, soft);
        
        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo eliminar el producto'
            });
        }
        
        res.json({
            success: true,
            message: soft ? 'Producto desactivado exitosamente' : 'Producto eliminado permanentemente'
        });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar producto',
            error: error.message
        });
    }
};

// === GESTIÓN DE IMÁGENES ===
const addProductImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { imagen_url, orden } = req.body;
        
        if (!imagen_url) {
            return res.status(400).json({
                success: false,
                message: 'La URL de la imagen es requerida'
            });
        }
        
        const product = await Product.getById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        const imageId = await Product.addImage(id, imagen_url, orden || 0);
        
        res.status(201).json({
            success: true,
            message: 'Imagen agregada exitosamente',
            data: { id: imageId }
        });
    } catch (error) {
        console.error('Error al agregar imagen:', error);
        res.status(500).json({
            success: false,
            message: 'Error al agregar imagen',
            error: error.message
        });
    }
};

const removeProductImage = async (req, res) => {
    try {
        const { id } = req.params;
        
        const removed = await Product.removeImage(id);
        
        if (!removed) {
            return res.status(404).json({
                success: false,
                message: 'Imagen no encontrada'
            });
        }
        
        res.json({
            success: true,
            message: 'Imagen eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar imagen',
            error: error.message
        });
    }
};

const updateProductImageOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { orden } = req.body;
        
        if (orden === undefined) {
            return res.status(400).json({
                success: false,
                message: 'El orden es requerido'
            });
        }
        
        const updated = await Product.updateImageOrder(id, orden);
        
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Imagen no encontrada'
            });
        }
        
        res.json({
            success: true,
            message: 'Orden de imagen actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar orden de imagen:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar orden de imagen',
            error: error.message
        });
    }
};

// === GESTIÓN DE OPCIONES ===
const addProductOption = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_grupo, tipo, obligatorio, max_selecciones, orden } = req.body;
        
        if (!nombre_grupo) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del grupo es requerido'
            });
        }
        
        const product = await Product.getById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        const optionId = await Product.addOption(id, {
            nombre_grupo,
            tipo: tipo || 'opcion_unica',
            obligatorio: obligatorio !== undefined ? obligatorio : 1,
            max_selecciones: max_selecciones || 1,
            orden: orden || 0
        });
        
        res.status(201).json({
            success: true,
            message: 'Opción agregada exitosamente',
            data: { id: optionId }
        });
    } catch (error) {
        console.error('Error al agregar opción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al agregar opción',
            error: error.message
        });
    }
};

const updateProductOption = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_grupo, tipo, obligatorio, max_selecciones, orden, activo } = req.body;
        
        const updated = await Product.updateOption(id, {
            nombre_grupo,
            tipo,
            obligatorio,
            max_selecciones,
            orden,
            activo
        });
        
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Opción no encontrada o no se pudo actualizar'
            });
        }
        
        res.json({
            success: true,
            message: 'Opción actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar opción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar opción',
            error: error.message
        });
    }
};

const removeProductOption = async (req, res) => {
    try {
        const { id } = req.params;
        
        const removed = await Product.removeOption(id);
        
        if (!removed) {
            return res.status(404).json({
                success: false,
                message: 'Opción no encontrada'
            });
        }
        
        res.json({
            success: true,
            message: 'Opción eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar opción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar opción',
            error: error.message
        });
    }
};

const addOptionValue = async (req, res) => {
    try {
        const { option_id } = req.params;
        const { valor, precio_extra, stock_disponible, orden } = req.body;
        
        if (!valor) {
            return res.status(400).json({
                success: false,
                message: 'El valor de la opción es requerido'
            });
        }
        
        const valueId = await Product.addOptionValue(option_id, {
            valor,
            precio_extra: precio_extra || 0,
            stock_disponible: stock_disponible || 999,
            orden: orden || 0
        });
        
        res.status(201).json({
            success: true,
            message: 'Valor de opción agregado exitosamente',
            data: { id: valueId }
        });
    } catch (error) {
        console.error('Error al agregar valor de opción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al agregar valor de opción',
            error: error.message
        });
    }
};

const updateOptionValue = async (req, res) => {
    try {
        const { id } = req.params;
        const { valor, precio_extra, stock_disponible, orden, activo } = req.body;
        
        const updated = await Product.updateOptionValue(id, {
            valor,
            precio_extra,
            stock_disponible,
            orden,
            activo
        });
        
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Valor de opción no encontrado o no se pudo actualizar'
            });
        }
        
        res.json({
            success: true,
            message: 'Valor de opción actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar valor de opción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar valor de opción',
            error: error.message
        });
    }
};

const removeOptionValue = async (req, res) => {
    try {
        const { id } = req.params;
        
        const removed = await Product.removeOptionValue(id);
        
        if (!removed) {
            return res.status(404).json({
                success: false,
                message: 'Valor de opción no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Valor de opción eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar valor de opción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar valor de opción',
            error: error.message
        });
    }
};

// === GESTIÓN DE EXTRAS ===
const addProductExtra = async (req, res) => {
    try {
        const { id } = req.params;
        const { extra_nombre, precio_extra, max_por_pedido } = req.body;
        
        if (!extra_nombre || precio_extra === undefined) {
            return res.status(400).json({
                success: false,
                message: 'El nombre y precio del extra son requeridos'
            });
        }
        
        const product = await Product.getById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        const extraId = await Product.addExtra(id, {
            extra_nombre,
            precio_extra,
            max_por_pedido: max_por_pedido || 3
        });
        
        res.status(201).json({
            success: true,
            message: 'Extra agregado exitosamente',
            data: { id: extraId }
        });
    } catch (error) {
        console.error('Error al agregar extra:', error);
        res.status(500).json({
            success: false,
            message: 'Error al agregar extra',
            error: error.message
        });
    }
};

const updateProductExtra = async (req, res) => {
    try {
        const { id } = req.params;
        const { extra_nombre, precio_extra, max_por_pedido, activo } = req.body;
        
        const updated = await Product.updateExtra(id, {
            extra_nombre,
            precio_extra,
            max_por_pedido,
            activo
        });
        
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Extra no encontrado o no se pudo actualizar'
            });
        }
        
        res.json({
            success: true,
            message: 'Extra actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar extra:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar extra',
            error: error.message
        });
    }
};

const removeProductExtra = async (req, res) => {
    try {
        const { id } = req.params;
        
        const removed = await Product.removeExtra(id);
        
        if (!removed) {
            return res.status(404).json({
                success: false,
                message: 'Extra no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Extra eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar extra:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar extra',
            error: error.message
        });
    }
};

// === GESTIÓN DE STOCK ===
const updateStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad, tipo_movimiento, precio_unitario } = req.body;
        
        if (!cantidad || cantidad <= 0) {
            return res.status(400).json({
                success: false,
                message: 'La cantidad debe ser mayor a 0'
            });
        }
        
        if (!tipo_movimiento || !['Entrada', 'Salida'].includes(tipo_movimiento)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de movimiento inválido. Debe ser "Entrada" o "Salida"'
            });
        }
        
        const product = await Product.getById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        await Product.updateStock(id, cantidad, tipo_movimiento, req.userId, precio_unitario || 0);
        
        res.json({
            success: true,
            message: `Movimiento de ${tipo_movimiento} registrado exitosamente`
        });
    } catch (error) {
        console.error('Error al actualizar stock:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar stock',
            error: error.message
        });
    }
};

const getKardex = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit } = req.query;
        
        const product = await Product.getById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        const kardex = await Product.getKardex(id, limit || 50);
        
        res.json({
            success: true,
            data: kardex,
            total: kardex.length
        });
    } catch (error) {
        console.error('Error al obtener kardex:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener kardex',
            error: error.message
        });
    }
};

// === PRODUCTOS RELACIONADOS Y OFERTAS ===
const getRelatedProducts = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit } = req.query;
        
        const product = await Product.getById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        const related = await Product.getRelated(id, limit ? parseInt(limit) : 4);
        
        res.json({
            success: true,
            data: related,
            total: related.length
        });
    } catch (error) {
        console.error('Error al obtener productos relacionados:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener productos relacionados',
            error: error.message
        });
    }
};

const getOfertas = async (req, res) => {
    try {
        const { limit } = req.query;
        const ofertas = await Product.getOfertas(limit ? parseInt(limit) : 10);
        
        res.json({
            success: true,
            data: ofertas,
            total: ofertas.length
        });
    } catch (error) {
        console.error('Error al obtener ofertas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ofertas',
            error: error.message
        });
    }
};

const getProductsByPoints = async (req, res) => {
    try {
        const { min_points, limit } = req.query;
        const products = await Product.getByPoints(
            min_points ? parseInt(min_points) : 0,
            limit ? parseInt(limit) : 20
        );
        
        res.json({
            success: true,
            data: products,
            total: products.length
        });
    } catch (error) {
        console.error('Error al obtener productos por puntos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener productos por puntos',
            error: error.message
        });
    }
};

// === CATEGORÍAS CON CONTEO ===
const getCategoriesWithCount = async (req, res) => {
    try {
        const categories = await Product.getCategoriesWithCount();
        
        res.json({
            success: true,
            data: categories,
            total: categories.length
        });
    } catch (error) {
        console.error('Error al obtener categorías con conteo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener categorías con conteo',
            error: error.message
        });
    }
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    addProductImage,
    removeProductImage,
    updateProductImageOrder,
    addProductOption,
    updateProductOption,
    removeProductOption,
    addOptionValue,
    updateOptionValue,
    removeOptionValue,
    addProductExtra,
    updateProductExtra,
    removeProductExtra,
    updateStock,
    getKardex,
    getRelatedProducts,
    getOfertas,
    getProductsByPoints,
    getCategoriesWithCount
};