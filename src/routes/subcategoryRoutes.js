const express = require('express');
const router = express.Router();
const subcategoryController = require('../controllers/subcategoryController');
const { authMiddleware, checkRole } = require('../middleware/auth');

// Rutas públicas
router.get('/', subcategoryController.getSubcategories);
router.get('/:id', subcategoryController.getSubcategoryById);

// Rutas protegidas (solo administradores)
router.post('/', authMiddleware, checkRole('Administrador'), subcategoryController.createSubcategory);
router.put('/:id', authMiddleware, checkRole('Administrador'), subcategoryController.updateSubcategory);
router.delete('/:id', authMiddleware, checkRole('Administrador'), subcategoryController.deleteSubcategory);
router.put('/:id/change-category', authMiddleware, checkRole('Administrador'), subcategoryController.changeCategory);

module.exports = router;