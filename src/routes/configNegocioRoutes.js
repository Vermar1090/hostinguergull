const express = require('express');
const router = express.Router();
const configNegocioController = require('../controllers/configNegocioController');
const { authMiddleware, checkRole } = require('../middleware/auth');

// === RUTAS PÚBLICAS ===
router.get('/public', configNegocioController.getConfigPublic);

// === RUTAS PROTEGIDAS (Admin) ===
router.get('/full', authMiddleware, checkRole('Administrador'), configNegocioController.getConfigFull);
router.put('/', authMiddleware, checkRole('Administrador'), configNegocioController.updateConfig);
router.put('/whatsapp', authMiddleware, checkRole('Administrador'), configNegocioController.updateWhatsapp);
router.put('/logo', authMiddleware, checkRole('Administrador'), configNegocioController.updateLogo);
router.post('/reset', authMiddleware, checkRole('Administrador'), configNegocioController.resetConfig);

module.exports = router;