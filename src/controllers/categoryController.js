const Category = require('../models/Category');
const { sanitize } = require('../utils/helpers');

// Obtener todas las categorías
const getCategories = async (req, res) => {
    try {
        const { activo, subcategorias } = req.query;
        
        let categories;
        if (subcategorias === 'true') {
            categories = await Category.getWithSubcategories(activo !== undefined ? parseInt(activo) : null);
        } else {
            categories = await Category.getAll(activo !== undefined ? parseInt(activo) : null);
        }
        
        res.json({
            success: true,
            data: categories,
            total: categories.length
        });
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener categorías',
            error: error.message
        });
    }
};

// Obtener categoría por ID
const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const { productos } = req.query;
        
        let category;
        if (productos === 'true') {
            category = await Category.getWithProducts(id);
        } else {
            category = await Category.getById(id);
        }
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Categoría no encontrada'
            });
        }
        
        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error('Error al obtener categoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener categoría',
            error: error.message
        });
    }
};

// Crear categoría
const createCategory = async (req, res) => {
    try {
        const { nombre, descripcion, imagen_url, orden, activo } = req.body;
        
        if (!nombre || nombre.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'El nombre debe tener al menos 2 caracteres'
            });
        }
        
        // Verificar si ya existe
        const exists = await Category.exists(nombre);
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una categoría con ese nombre'
            });
        }
        
        const categoryId = await Category.create({
            nombre: sanitize(nombre),
            descripcion: descripcion ? sanitize(descripcion) : null,
            imagen_url: imagen_url || null,
            orden: orden || 0,
            activo: activo !== undefined ? activo : 1
        });
        
        const category = await Category.getById(categoryId);
        
        res.status(201).json({
            success: true,
            message: 'Categoría creada exitosamente',
            data: category
        });
    } catch (error) {
        console.error('Error al crear categoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear categoría',
            error: error.message
        });
    }
};

// Actualizar categoría
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, imagen_url, orden, activo } = req.body;
        
        // Verificar si existe
        const category = await Category.getById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Categoría no encontrada'
            });
        }
        
        if (nombre) {
            const exists = await Category.exists(nombre, id);
            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe una categoría con ese nombre'
                });
            }
        }
        
        const updated = await Category.update(id, {
            nombre: nombre ? sanitize(nombre) : undefined,
            descripcion: descripcion !== undefined ? sanitize(descripcion) : undefined,
            imagen_url: imagen_url !== undefined ? imagen_url : undefined,
            orden: orden !== undefined ? orden : undefined,
            activo: activo !== undefined ? activo : undefined
        });
        
        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar la categoría'
            });
        }
        
        const updatedCategory = await Category.getById(id);
        
        res.json({
            success: true,
            message: 'Categoría actualizada exitosamente',
            data: updatedCategory
        });
    } catch (error) {
        console.error('Error al actualizar categoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar categoría',
            error: error.message
        });
    }
};

// Eliminar categoría
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { permanent } = req.query;
        
        const category = await Category.getById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Categoría no encontrada'
            });
        }
        
        const soft = permanent !== 'true';
        const deleted = await Category.delete(id, soft);
        
        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo eliminar la categoría'
            });
        }
        
        res.json({
            success: true,
            message: soft ? 'Categoría desactivada exitosamente' : 'Categoría eliminada permanentemente'
        });
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar categoría',
            error: error.message
        });
    }
};

module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};