const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const passport = require('../config/passport');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Generar JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, rol: req.user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    // Almacenar token en cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // true en producción con HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });
    
    // Redirigir al home del frontend
    res.redirect('/');
  }
);

// Endpoint temporal para crear admin (eliminar después de usar)
router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, nombre } = req.body;
    
    if (!email || !password || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Email, password y nombre son requeridos'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO usuarios (nombre, email, password, rol, activo, codigo_referido) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, email, hashedPassword, 'Administrador', 1, 'ADMIN' + Date.now()]
    );

    res.json({
      success: true,
      message: 'Administrador creado exitosamente',
      data: { id: result.insertId, email, nombre, rol: 'Administrador' }
    });
  } catch (error) {
    console.error('Error creando admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando administrador',
      error: error.message
    });
  }
});

// Rutas protegidas
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/logout', authMiddleware, authController.logout);
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;