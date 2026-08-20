const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { authMiddleware, checkRole } = require('../middleware/auth');

// === RUTAS PÚBLICAS ===
router.get('/active', bannerController.getActiveBanners);
router.get('/destacados', bannerController.getDestacados);

// === RUTAS PROTEGIDAS (Admin) ===
router.get('/all', authMiddleware, checkRole('Administrador'), bannerController.getAllBanners);
router.get('/by-date', authMiddleware, checkRole('Administrador'), bannerController.getBannersByDateRange);
router.get('/:id', authMiddleware, checkRole('Administrador'), bannerController.getBannerById);
router.post('/', authMiddleware, checkRole('Administrador'), bannerController.createBanner);
router.put('/:id', authMiddleware, checkRole('Administrador'), bannerController.updateBanner);
router.delete('/:id', authMiddleware, checkRole('Administrador'), bannerController.deleteBanner);
router.post('/reorder', authMiddleware, checkRole('Administrador'), bannerController.reorderBanners);

module.exports = router;