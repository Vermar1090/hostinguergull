const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authMiddleware, checkRole } = require('../middleware/auth');

// Rutas públicas
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);

// Rutas protegidas (solo administradores)
router.post('/', authMiddleware, checkRole('Administrador'), categoryController.createCategory);
router.put('/:id', authMiddleware, checkRole('Administrador'), categoryController.updateCategory);
router.delete('/:id', authMiddleware, checkRole('Administrador'), categoryController.deleteCategory);

module.exports = router;