const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuthMiddleware } = require('../middleware/adminAuth');
const { upload, processImage } = require('../middleware/upload');

// ✅ Dashboard - FUNCIONA
router.get('/dashboard', adminAuthMiddleware, adminController.getDashboardStats);

// ✅ Pedidos - FUNCIONA
router.get('/orders/recent', adminAuthMiddleware, adminController.getRecentOrders);
router.put('/orders/:id/status', adminAuthMiddleware, adminController.updateOrderStatus);

// ✅ Categorías - FUNCIONA
router.post('/categories', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.createCategory);
router.put('/categories/:id', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.updateCategory);

// ✅ Subcategorías - FUNCIONA
router.post('/subcategories', adminAuthMiddleware, adminController.createSubcategory);
router.put('/subcategories/:id', adminAuthMiddleware, adminController.updateSubcategory);

// ✅ Productos - FUNCIONA
router.post('/products', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.createProduct);
router.put('/products/:id', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.updateProduct);
router.post('/products/:id/images', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.addProductImages);
router.delete('/products/images/:id', adminAuthMiddleware, adminController.deleteProductImage);

// ✅ Banners - FUNCIONA
router.post('/banners', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.createBanner);
router.put('/banners/:id', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.updateBanner);
router.delete('/banners/:id', adminAuthMiddleware, adminController.deleteBanner);

// ❌ ELIMINADAS TODAS LAS RUTAS DE PROMOS - NO EXISTEN EN EL CONTROLADOR

module.exports = router;