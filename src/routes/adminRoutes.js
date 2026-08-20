const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuthMiddleware, checkAdminRole } = require('../middleware/adminAuth');
const { upload, processImage, uploadMultiple, processMultipleImages } = require('../middleware/upload');

router.get('/dashboard', adminAuthMiddleware, adminController.getDashboardStats);
router.get('/orders/recent', adminAuthMiddleware, adminController.getRecentOrders);
router.put('/orders/:id/status', adminAuthMiddleware, adminController.updateOrderStatus);

router.post('/categories', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.createCategory);
router.put('/categories/:id', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.updateCategory);

router.post('/subcategories', adminAuthMiddleware, adminController.createSubcategory);
router.put('/subcategories/:id', adminAuthMiddleware, adminController.updateSubcategory);

router.post('/products', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.createProduct);
router.put('/products/:id', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.updateProduct);
router.post('/products/:id/images', adminAuthMiddleware, uploadMultiple, processMultipleImages, adminController.addProductImages);
router.delete('/products/images/:id', adminAuthMiddleware, adminController.deleteProductImage);

router.post('/banners', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.createBanner);
router.put('/banners/:id', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.updateBanner);
router.delete('/banners/:id', adminAuthMiddleware, adminController.deleteBanner);

router.post('/promos', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.createPromo);
router.put('/promos/:id', adminAuthMiddleware, upload.single('imagen'), processImage, adminController.updatePromo);
router.delete('/promos/:id', adminAuthMiddleware, adminController.deletePromo);

module.exports = router;
