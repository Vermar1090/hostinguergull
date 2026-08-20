const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const { initializeSocket } = require('./src/config/socket');
const passport = require('./src/config/passport');
const session = require('express-session');
const authRoutes = require('./src/routes/authRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const subcategoryRoutes = require('./src/routes/subcategoryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const loyaltyRoutes = require('./src/routes/loyaltyRoutes');
const bannerRoutes = require('./src/routes/bannerRoutes');
const configNegocioRoutes = require('./src/routes/configNegocioRoutes');
const adminRoutes = require('./src/routes/adminRoutes');


// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://magenta-rat-781378.hostingersite.com'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Origen no permitido por CORS'));
        }
    },
    credentials: true
}));

// Session middleware para Passport
app.use(session({
    secret: process.env.JWT_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true en producción con HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public' (build de React)
app.use(express.static(path.join(__dirname, 'public')));

// Servir archivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/config', configNegocioRoutes);
app.use('/api/admin', adminRoutes);


// Ruta base - API info
app.get('/api', (req, res) => {
    res.json({
        name: 'GULLA API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                googleLogin: 'POST /api/auth/google-login',
                profile: 'GET /api/auth/profile',
                updateProfile: 'PUT /api/auth/profile',
                changePassword: 'POST /api/auth/change-password',
                logout: 'POST /api/auth/logout'
            },
            categories: {
                list: 'GET /api/categories',
                get: 'GET /api/categories/:id',
                create: 'POST /api/categories (Admin)',
                update: 'PUT /api/categories/:id (Admin)',
                delete: 'DELETE /api/categories/:id (Admin)'
            },
            subcategories: {
                list: 'GET /api/subcategories',
                get: 'GET /api/subcategories/:id',
                create: 'POST /api/subcategories (Admin)',
                update: 'PUT /api/subcategories/:id (Admin)',
                delete: 'DELETE /api/subcategories/:id (Admin)',
                changeCategory: 'PUT /api/subcategories/:id/change-category (Admin)'
            },
            products: {
                list: 'GET /api/products',
                get: 'GET /api/products/:id',
                ofertas: 'GET /api/products/ofertas',
                byPoints: 'GET /api/products/puntos',
                related: 'GET /api/products/:id/related',
                create: 'POST /api/products (Admin/Empleado)',
                update: 'PUT /api/products/:id (Admin/Empleado)',
                delete: 'DELETE /api/products/:id (Admin)',
                images: 'POST /api/products/:id/images | DELETE /api/products/images/:id',
                options: 'POST /api/products/:id/options | POST /api/products/options/:option_id/values',
                extras: 'POST /api/products/:id/extras',
                stock: 'POST /api/products/:id/stock'
            }
        }
    });
});

// Fallback para React Router - servir index.html para todas las rutas no API
app.get('*', (req, res) => {
    // No manejar rutas de API
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error('Error global:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Crear servidor HTTP
const server = http.createServer(app);

// Inicializar Socket.io
initializeSocket(server);

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`🚀 Servidor GULLA API corriendo en http://localhost:${PORT}`);
    console.log(`📝 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📄 Documentación: http://localhost:${PORT}/`);
    console.log(`🔌 Socket.io habilitado para tiempo real`);
});

// Manejar señales de terminación
process.on('SIGTERM', () => {
    console.log('SIGTERM recibido, cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT recibido, cerrando servidor...');
    process.exit(0);
});
