const Subcategory = require('../models/Subcategory');
const Category = require('../models/Category');
const { sanitize } = require('../utils/helpers');

// Obtener todas las subcategorías
const getSubcategories = async (req, res) => {
    try {
        const { categoria_id, activo, productos } = req.query;
        
        let subcategories;
        if (productos === 'true' && categoria_id) {
            // Si se pide una subcategoría específica con productos
            const subcategory = await Subcategory.getWithProducts(categoria_id);
            if (subcategory) {
                subcategories = [subcategory];
            } else {
                subcategories = [];
            }
        } else {
            subcategories = await Subcategory.getAll(
                categoria_id ? parseInt(categoria_id) : null,
                activo !== undefined ? parseInt(activo) : null
            );
        }
        
        res.json({
            success: true,
            data: subcategories,
            total: subcategories.length
        });
    } catch (error) {
        console.error('Error al obtener subcategorías:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener subcategorías',
            error: error.message
        });
    }
};

// Obtener subcategoría por ID
const getSubcategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const { productos } = req.query;
        
        let subcategory;
        if (productos === 'true') {
            subcategory = await Subcategory.getWithProducts(id);
        } else {
            subcategory = await Subcategory.getById(id);
        }
        
        if (!subcategory) {
            return res.status(404).json({
                success: false,
                message: 'Subcategoría no encontrada'
            });
        }
        
        res.json({
            success: true,
            data: subcategory
        });
    } catch (error) {
        console.error('Error al obtener subcategoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener subcategoría',
            error: error.message
        });
    }
};

// Crear subcategoría
const createSubcategory = async (req, res) => {
    try {
        const { categoria_id, nombre, descripcion, orden, activo } = req.body;
        
        if (!categoria_id) {
            return res.status(400).json({
                success: false,
                message: 'La categoría es requerida'
            });
        }
        
        // Verificar que la categoría existe
        const category = await Category.getById(categoria_id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'La categoría especificada no existe'
            });
        }
        
        if (!nombre || nombre.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'El nombre debe tener al menos 2 caracteres'
            });
        }
        
        // Verificar si ya existe en la misma categoría
        const exists = await Subcategory.exists(nombre, categoria_id);
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una subcategoría con ese nombre en esta categoría'
            });
        }
        
        const subcategoryId = await Subcategory.create({
            categoria_id,
            nombre: sanitize(nombre),
            descripcion: descripcion ? sanitize(descripcion) : null,
            orden: orden || 0,
            activo: activo !== undefined ? activo : 1
        });
        
        const subcategory = await Subcategory.getById(subcategoryId);
        
        res.status(201).json({
            success: true,
            message: 'Subcategoría creada exitosamente',
            data: subcategory
        });
    } catch (error) {
        console.error('Error al crear subcategoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear subcategoría',
            error: error.message
        });
    }
};

// Actualizar subcategoría
const updateSubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoria_id, nombre, descripcion, orden, activo } = req.body;
        
        const subcategory = await Subcategory.getById(id);
        if (!subcategory) {
            return res.status(404).json({
                success: false,
                message: 'Subcategoría no encontrada'
            });
        }
        
        // Si se cambia la categoría, verificar que existe
        if (categoria_id && categoria_id !== subcategory.categoria_id) {
            const category = await Category.getById(categoria_id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'La categoría especificada no existe'
                });
            }
        }
        
        if (nombre) {
            const exists = await Subcategory.exists(nombre, categoria_id || subcategory.categoria_id, id);
            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe una subcategoría con ese nombre en esta categoría'
                });
            }
        }
        
        const updated = await Subcategory.update(id, {
            categoria_id: categoria_id !== undefined ? categoria_id : undefined,
            nombre: nombre ? sanitize(nombre) : undefined,
            descripcion: descripcion !== undefined ? sanitize(descripcion) : undefined,
            orden: orden !== undefined ? orden : undefined,
            activo: activo !== undefined ? activo : undefined
        });
        
        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar la subcategoría'
            });
        }
        
        const updatedSubcategory = await Subcategory.getById(id);
        
        res.json({
            success: true,
            message: 'Subcategoría actualizada exitosamente',
            data: updatedSubcategory
        });
    } catch (error) {
        console.error('Error al actualizar subcategoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar subcategoría',
            error: error.message
        });
    }
};

// Eliminar subcategoría
const deleteSubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { permanent } = req.query;
        
        const subcategory = await Subcategory.getById(id);
        if (!subcategory) {
            return res.status(404).json({
                success: false,
                message: 'Subcategoría no encontrada'
            });
        }
        
        const soft = permanent !== 'true';
        const deleted = await Subcategory.delete(id, soft);
        
        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo eliminar la subcategoría'
            });
        }
        
        res.json({
            success: true,
            message: soft ? 'Subcategoría desactivada exitosamente' : 'Subcategoría eliminada permanentemente'
        });
    } catch (error) {
        console.error('Error al eliminar subcategoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar subcategoría',
            error: error.message
        });
    }
};

// Cambiar categoría de subcategoría
const changeCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoria_id } = req.body;
        
        if (!categoria_id) {
            return res.status(400).json({
                success: false,
                message: 'La nueva categoría es requerida'
            });
        }
        
        const subcategory = await Subcategory.getById(id);
        if (!subcategory) {
            return res.status(404).json({
                success: false,
                message: 'Subcategoría no encontrada'
            });
        }
        
        const category = await Category.getById(categoria_id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'La categoría especificada no existe'
            });
        }
        
        const changed = await Subcategory.changeCategory(id, categoria_id);
        
        if (!changed) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo cambiar la categoría de la subcategoría'
            });
        }
        
        const updatedSubcategory = await Subcategory.getById(id);
        
        res.json({
            success: true,
            message: 'Categoría de subcategoría cambiada exitosamente',
            data: updatedSubcategory
        });
    } catch (error) {
        console.error('Error al cambiar categoría de subcategoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar categoría de subcategoría',
            error: error.message
        });
    }
};

module.exports = {
    getSubcategories,
    getSubcategoryById,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    changeCategory
};