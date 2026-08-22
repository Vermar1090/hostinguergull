const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware, checkRole } = require('../middleware/auth');

// === RUTAS PÚBLICAS ===
router.get('/', productController.getProducts);
router.get('/ofertas', productController.getOfertas);
router.get('/puntos', productController.getProductsByPoints);
router.get('/categories-with-count', productController.getCategoriesWithCount);
router.get('/:id', productController.getProductById);
router.get('/:id/related', productController.getRelatedProducts);

// === RUTAS PROTEGIDAS (Admin y Empleado) ===
// Productos
router.post('/', authMiddleware, checkRole('Administrador', 'Empleado'), productController.createProduct);
router.put('/:id', authMiddleware, checkRole('Administrador', 'Empleado'), productController.updateProduct);
router.delete('/:id', authMiddleware, checkRole('Administrador'), productController.deleteProduct);

// Imágenes
router.post('/:id/images', authMiddleware, checkRole('Administrador', 'Empleado'), productController.addProductImage);
router.put('/images/:id/order', authMiddleware, checkRole('Administrador', 'Empleado'), productController.updateProductImageOrder);
router.delete('/images/:id', authMiddleware, checkRole('Administrador', 'Empleado'), productController.removeProductImage);

// Opciones de personalización
router.post('/:id/options', authMiddleware, checkRole('Administrador', 'Empleado'), productController.addProductOption);
router.put('/options/:id', authMiddleware, checkRole('Administrador', 'Empleado'), productController.updateProductOption);
router.delete('/options/:id', authMiddleware, checkRole('Administrador', 'Empleado'), productController.removeProductOption);

// Valores de opciones
router.post('/options/:option_id/values', authMiddleware, checkRole('Administrador', 'Empleado'), productController.addOptionValue);
router.put('/options-values/:id', authMiddleware, checkRole('Administrador', 'Empleado'), productController.updateOptionValue);
router.delete('/options-values/:id', authMiddleware, checkRole('Administrador', 'Empleado'), productController.removeOptionValue);

// Extras
router.post('/:id/extras', authMiddleware, checkRole('Administrador', 'Empleado'), productController.addProductExtra);
router.put('/extras/:id', authMiddleware, checkRole('Administrador', 'Empleado'), productController.updateProductExtra);
router.delete('/extras/:id', authMiddleware, checkRole('Administrador', 'Empleado'), productController.removeProductExtra);

// Stock / Kardex
router.post('/:id/stock', authMiddleware, checkRole('Administrador', 'Empleado'), productController.updateStock);
router.get('/:id/kardex', authMiddleware, checkRole('Administrador', 'Empleado'), productController.getKardex);

module.exports = router;