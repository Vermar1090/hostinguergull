const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware, checkRole } = require('../middleware/auth');

// Rutas públicas (crear pedido)
router.post('/guest', orderController.createOrder);

// Rutas protegidas (usuario autenticado)
router.post('/', authMiddleware, orderController.createOrder);
router.post('/paid', authMiddleware, orderController.createPaidOrder);
router.get('/my-orders', authMiddleware, orderController.getMyOrders);

// Rutas Admin/Empleado
router.get('/', authMiddleware, checkRole('Administrador', 'Empleado'), orderController.getOrders);
router.get('/stats', authMiddleware, checkRole('Administrador', 'Empleado'), orderController.getOrderStats);
router.get('/:id', authMiddleware, checkRole('Administrador', 'Empleado'), orderController.getOrderById);
router.put('/:id/status', authMiddleware, checkRole('Administrador', 'Empleado'), orderController.updateOrderStatus);
router.put('/:id/pay', authMiddleware, checkRole('Administrador', 'Empleado'), orderController.markAsPaid);
router.post('/:id/cancel', authMiddleware, checkRole('Administrador', 'Empleado'), orderController.cancelOrder);

module.exports = router;