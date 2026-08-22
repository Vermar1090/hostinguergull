const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

// ==========================================
// MIDDLEWARE BÁSICO
// ==========================================

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));

app.use(session({
    secret: process.env.JWT_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// ARCHIVOS ESTÁTICOS - ¡DEBEN IR ANTES DEL FALLBACK DE REACT!
// ==========================================

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// CONFIGURACIÓN DE UPLOADS - SERVIDOR DE IMÁGENES
// ==========================================

const uploadsPath = path.join(__dirname, 'src', 'uploads');

console.log('📁 Carpeta de uploads:', uploadsPath);

// Verificar existencia de la carpeta uploads
try {
    if (fs.existsSync(uploadsPath)) {
        console.log('✅ La carpeta uploads existe');
        const contenido = fs.readdirSync(uploadsPath);
        console.log('📁 Contenido de uploads:', contenido);
        
        const subfolders = ['thumbs', 'medium', 'small', 'products', 'categories', 'banners', 'profiles'];
        subfolders.forEach(folder => {
            const folderPath = path.join(uploadsPath, folder);
            if (fs.existsSync(folderPath)) {
                const files = fs.readdirSync(folderPath);
                console.log(`📁 ${folder}: ${files.length} archivos`);
                if (files.length > 0) {
                    console.log(`   Ejemplos: ${files.slice(0, 3).join(', ')}`);
                }
            }
        });
    } else {
        console.log('❌ La carpeta uploads NO existe en:', uploadsPath);
        fs.mkdirSync(uploadsPath, { recursive: true });
        console.log('✅ Carpeta uploads creada');
    }
} catch (error) {
    console.error('❌ Error al verificar carpeta uploads:', error.message);
}

// ==========================================
// ¡IMPORTANTE! Servir imágenes ANTES del fallback de React
// ==========================================

// Servir toda la carpeta uploads
app.use('/uploads', express.static(uploadsPath, {
    fallthrough: false,
    setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
}));

// Middleware para manejar imágenes en subcarpetas
app.use('/uploads/:subfolder/:filename', (req, res, next) => {
    const { subfolder, filename } = req.params;
    
    // Prevenir path traversal
    const safeSubfolder = path.normalize(subfolder).replace(/^(\.\.[\/\\])+/, '');
    const safeFilename = path.normalize(filename).replace(/^(\.\.[\/\\])+/, '');
    
    const filePath = path.join(uploadsPath, safeSubfolder, safeFilename);
    
    console.log(`🔍 Buscando: ${safeSubfolder}/${safeFilename}`);
    
    if (fs.existsSync(filePath)) {
        console.log(`✅ Imagen encontrada en: ${safeSubfolder}`);
        return res.sendFile(filePath);
    }
    
    // Buscar en otras carpetas
    const alternativeFolders = ['thumbs', 'medium', 'small', 'products', 'categories', 'banners', 'profiles'];
    for (const altFolder of alternativeFolders) {
        if (altFolder === safeSubfolder) continue;
        const altPath = path.join(uploadsPath, altFolder, safeFilename);
        if (fs.existsSync(altPath)) {
            console.log(`✅ Imagen encontrada en: ${altFolder}`);
            return res.sendFile(altPath);
        }
    }
    
    const rootPath = path.join(uploadsPath, safeFilename);
    if (fs.existsSync(rootPath)) {
        console.log('✅ Imagen encontrada en la raíz');
        return res.sendFile(rootPath);
    }
    
    console.log(`❌ Imagen no encontrada: ${safeFilename}`);
    res.status(404).json({
        success: false,
        message: 'Imagen no encontrada',
        requestedFile: `/${safeSubfolder}/${safeFilename}`
    });
});

// ==========================================
// RUTAS API - ANTES del fallback de React
// ==========================================

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/config', configNegocioRoutes);
app.use('/api/admin', adminRoutes);

// Ruta base API
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

// ==========================================
// FALLBACK DE REACT - DEBE IR AL FINAL
// ==========================================

// Este middleware SOLO se ejecuta si ninguna ruta anterior coincidió
app.get('*', (req, res) => {
    // Excluir rutas de API, socket.io y uploads (ya deberían haber sido manejadas)
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return res.status(404).json({
            success: false,
            message: 'Not found'
        });
    }
    
    console.log(`📄 Sirviendo index.html para: ${req.path}`);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// MANEJADOR DE ERRORES GLOBAL
// ==========================================

app.use((err, req, res, next) => {
    console.error('❌ Error global:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==========================================
// CREAR SERVIDOR HTTP
// ==========================================

const server = http.createServer(app);

// Inicializar Socket.io
initializeSocket(server);

// ==========================================
// INICIAR SERVIDOR
// ==========================================

server.listen(PORT, () => {
    console.log('========================================');
    console.log(`🚀 Servidor GULLA API corriendo en http://localhost:${PORT}`);
    console.log(`📝 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📄 Documentación: http://localhost:${PORT}/api`);
    console.log(`🔌 Socket.io habilitado para tiempo real`);
    console.log(`📁 Uploads: ${uploadsPath}`);
    console.log('========================================');
});

// Manejo de señales
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM recibido, cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT recibido, cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
});

process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});