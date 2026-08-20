const Banner = require('../models/Banner');
const { sanitize } = require('../utils/helpers');

// Obtener banners activos (público)
const getActiveBanners = async (req, res) => {
    try {
        const { limit } = req.query;
        const banners = await Banner.getActive(limit || 10);

        res.json({
            success: true,
            data: banners,
            total: banners.length
        });
    } catch (error) {
        console.error('Error al obtener banners:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener banners',
            error: error.message
        });
    }
};

// Obtener banners destacados (público)
const getDestacados = async (req, res) => {
    try {
        const banners = await Banner.getDestacados();

        res.json({
            success: true,
            data: banners,
            total: banners.length
        });
    } catch (error) {
        console.error('Error al obtener banners destacados:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener banners destacados',
            error: error.message
        });
    }
};

// Obtener todos los banners (Admin)
const getAllBanners = async (req, res) => {
    try {
        const filters = {
            activo: req.query.activo !== undefined ? parseInt(req.query.activo) : undefined,
            search: req.query.search,
            limit: req.query.limit || 20,
            offset: req.query.offset || 0
        };

        const banners = await Banner.getAll(filters);
        const total = await Banner.count(filters);

        res.json({
            success: true,
            data: banners,
            pagination: {
                total,
                limit: parseInt(filters.limit),
                offset: parseInt(filters.offset),
                current_page: Math.floor(parseInt(filters.offset) / parseInt(filters.limit)) + 1,
                total_pages: Math.ceil(total / parseInt(filters.limit))
            }
        });
    } catch (error) {
        console.error('Error al obtener banners:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener banners',
            error: error.message
        });
    }
};

// Obtener banner por ID (Admin)
const getBannerById = async (req, res) => {
    try {
        const { id } = req.params;

        const banner = await Banner.getById(id);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner no encontrado'
            });
        }

        res.json({
            success: true,
            data: banner
        });
    } catch (error) {
        console.error('Error al obtener banner:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener banner',
            error: error.message
        });
    }
};

// Crear banner (Admin)
const createBanner = async (req, res) => {
    try {
        const {
            titulo,
            imagen_url,
            descripcion,
            enlace,
            activo,
            orden,
            fecha_inicio,
            fecha_fin
        } = req.body;

        // Validaciones
        if (!titulo || titulo.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'El título debe tener al menos 3 caracteres'
            });
        }

        if (!imagen_url) {
            return res.status(400).json({
                success: false,
                message: 'La URL de la imagen es requerida'
            });
        }

        // Verificar orden único
        if (orden !== undefined && orden !== null) {
            const exists = await Banner.existsOrder(orden);
            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: `Ya existe un banner con el orden ${orden}`
                });
            }
        }

        const bannerId = await Banner.create({
            titulo: sanitize(titulo),
            imagen_url: imagen_url,
            descripcion: descripcion ? sanitize(descripcion) : null,
            enlace: enlace || null,
            activo: activo !== undefined ? activo : 1,
            orden: orden || 0,
            fecha_inicio: fecha_inicio || null,
            fecha_fin: fecha_fin || null
        });

        const banner = await Banner.getById(bannerId);

        res.status(201).json({
            success: true,
            message: 'Banner creado exitosamente',
            data: banner
        });
    } catch (error) {
        console.error('Error al crear banner:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear banner',
            error: error.message
        });
    }
};

// Actualizar banner (Admin)
const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            titulo,
            imagen_url,
            descripcion,
            enlace,
            activo,
            orden,
            fecha_inicio,
            fecha_fin
        } = req.body;

        const banner = await Banner.getById(id);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner no encontrado'
            });
        }

        // Verificar orden único
        if (orden !== undefined && orden !== null) {
            const exists = await Banner.existsOrder(orden, id);
            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: `Ya existe un banner con el orden ${orden}`
                });
            }
        }

        const updated = await Banner.update(id, {
            titulo: titulo ? sanitize(titulo) : undefined,
            imagen_url: imagen_url !== undefined ? imagen_url : undefined,
            descripcion: descripcion !== undefined ? sanitize(descripcion) : undefined,
            enlace: enlace !== undefined ? enlace : undefined,
            activo: activo !== undefined ? activo : undefined,
            orden: orden !== undefined ? orden : undefined,
            fecha_inicio: fecha_inicio !== undefined ? fecha_inicio : undefined,
            fecha_fin: fecha_fin !== undefined ? fecha_fin : undefined
        });

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar el banner'
            });
        }

        const updatedBanner = await Banner.getById(id);

        res.json({
            success: true,
            message: 'Banner actualizado exitosamente',
            data: updatedBanner
        });
    } catch (error) {
        console.error('Error al actualizar banner:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar banner',
            error: error.message
        });
    }
};

// Eliminar banner (soft delete) (Admin)
const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const { permanent } = req.query;

        const banner = await Banner.getById(id);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner no encontrado'
            });
        }

        let deleted;
        if (permanent === 'true') {
            deleted = await Banner.deletePermanent(id);
        } else {
            deleted = await Banner.delete(id);
        }

        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo eliminar el banner'
            });
        }

        res.json({
            success: true,
            message: permanent === 'true' 
                ? 'Banner eliminado permanentemente' 
                : 'Banner desactivado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar banner:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar banner',
            error: error.message
        });
    }
};

// Reordenar banners (Admin)
const reorderBanners = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere un array de IDs'
            });
        }

        // Verificar que todos los banners existen
        for (const id of ids) {
            const banner = await Banner.getById(id);
            if (!banner) {
                return res.status(404).json({
                    success: false,
                    message: `Banner con ID ${id} no encontrado`
                });
            }
        }

        const reordered = await Banner.reorder(ids);

        if (!reordered) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo reordenar los banners'
            });
        }

        res.json({
            success: true,
            message: 'Banners reordenados exitosamente'
        });
    } catch (error) {
        console.error('Error al reordenar banners:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reordenar banners',
            error: error.message
        });
    }
};

// Obtener banners por rango de fechas (Admin)
const getBannersByDateRange = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                success: false,
                message: 'Fecha de inicio y fin son requeridas'
            });
        }

        const banners = await Banner.getByDateRange(fecha_inicio, fecha_fin);

        res.json({
            success: true,
            data: banners,
            total: banners.length
        });
    } catch (error) {
        console.error('Error al obtener banners por fecha:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener banners por fecha',
            error: error.message
        });
    }
};

module.exports = {
    getActiveBanners,
    getDestacados,
    getAllBanners,
    getBannerById,
    createBanner,
    updateBanner,
    deleteBanner,
    reorderBanners,
    getBannersByDateRange
};