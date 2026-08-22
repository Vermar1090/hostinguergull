const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
const { authMiddleware, checkRole } = require('../middleware/auth');

// === RUTAS PROTEGIDAS (Usuario autenticado) ===
router.get('/my-points', authMiddleware, loyaltyController.getMyPoints);
router.get('/history', authMiddleware, loyaltyController.getPointsHistory);
router.get('/redeemable', authMiddleware, loyaltyController.getRedeemableProducts);
router.post('/redeem', authMiddleware, loyaltyController.redeemProduct);
router.post('/referral', authMiddleware, loyaltyController.processReferral);
router.get('/referral-status', authMiddleware, loyaltyController.getReferralStatus);

// === RUTAS PÚBLICAS ===
router.get('/ranking', loyaltyController.getRanking);

// === RUTAS PROTEGIDAS (Admin) ===
router.get('/stats', authMiddleware, checkRole('Administrador'), loyaltyController.getPointsStats);
router.post('/add', authMiddleware, checkRole('Administrador'), loyaltyController.addPointsManually);
router.post('/transfer', authMiddleware, checkRole('Administrador'), loyaltyController.transferPoints);

module.exports = router;