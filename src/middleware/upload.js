// src/middleware/upload.js
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento
const storage = multer.memoryStorage();

// Validar tipo de archivo
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp, gif)'));
    }
};

// Configuración de multer
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});

// ✅ FUNCIÓN: Procesar imagen - AHORA GUARDA EN backendv1/uploads (SIN public)
const processImage = async (req, res, next) => {
    try {
        if (!req.file) return next();

        const { originalname, buffer, mimetype } = req.file;
        const timestamp = Date.now();
        const baseName = `${timestamp}-${originalname.replace(/\s+/g, '_')}`;
        const nameWithoutExt = path.parse(baseName).name;

        // ✅ RUTA CORREGIDA: backendv1/uploads (SIN public)
        const uploadDir = path.join(__dirname, '../uploads');
        const thumbDir = path.join(uploadDir, 'thumbs');
        const mediumDir = path.join(uploadDir, 'medium');

        // ✅ Crear directorios si no existen
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
        if (!fs.existsSync(mediumDir)) fs.mkdirSync(mediumDir, { recursive: true });

        let originalPath, thumbPath, mediumPath;

        // Procesar según tipo de imagen
        if (mimetype === 'image/gif') {
            originalPath = path.join(uploadDir, baseName);
            fs.writeFileSync(originalPath, buffer);
            thumbPath = originalPath;
            mediumPath = originalPath;
        } else {
            const image = sharp(buffer);
            const metadata = await image.metadata();

            // ✅ IMAGEN ORIGINAL (máx 1200px)
            const originalBuffer = await image
                .resize(
                    metadata.width > 1200 ? 1200 : metadata.width,
                    metadata.height > 1200 ? 1200 : metadata.height,
                    { fit: 'inside' }
                )
                .jpeg({ quality: 80, progressive: true })
                .toBuffer();
            
            originalPath = path.join(uploadDir, `${nameWithoutExt}.jpg`);
            fs.writeFileSync(originalPath, originalBuffer);

            // ✅ IMAGEN MEDIANA (400x400)
            const mediumBuffer = await image
                .resize(400, 400, { fit: 'inside' })
                .jpeg({ quality: 70 })
                .toBuffer();
            
            mediumPath = path.join(mediumDir, `${nameWithoutExt}.jpg`);
            fs.writeFileSync(mediumPath, mediumBuffer);

            // ✅ IMAGEN MINIATURA (150x150)
            const thumbBuffer = await image
                .resize(150, 150, { fit: 'cover' })
                .jpeg({ quality: 60 })
                .toBuffer();
            
            thumbPath = path.join(thumbDir, `${nameWithoutExt}.jpg`);
            fs.writeFileSync(thumbPath, thumbBuffer);
        }

        // ✅ Generar versiones WebP
        try {
            await sharp(buffer)
                .resize(1200, 1200, { fit: 'inside' })
                .webp({ quality: 70 })
                .toFile(path.join(uploadDir, `${nameWithoutExt}.webp`));
            
            await sharp(buffer)
                .resize(400, 400, { fit: 'inside' })
                .webp({ quality: 65 })
                .toFile(path.join(mediumDir, `${nameWithoutExt}.webp`));
            
            await sharp(buffer)
                .resize(150, 150, { fit: 'cover' })
                .webp({ quality: 60 })
                .toFile(path.join(thumbDir, `${nameWithoutExt}.webp`));
        } catch (error) {
            console.warn('Error generando WebP:', error.message);
        }

        // ✅ Devolver rutas de todos los tamaños
        req.file.path = `/uploads/${nameWithoutExt}.jpg`;
        req.file.thumbnail = `/uploads/thumbs/${nameWithoutExt}.jpg`;
        req.file.medium = `/uploads/medium/${nameWithoutExt}.jpg`;
        req.file.webpPath = `/uploads/${nameWithoutExt}.webp`;
        req.file.webpThumbnail = `/uploads/thumbs/${nameWithoutExt}.webp`;
        req.file.webpMedium = `/uploads/medium/${nameWithoutExt}.webp`;
        req.file.processed = true;

        console.log('✅ Imagen procesada:', {
            original: req.file.path,
            thumbnail: req.file.thumbnail,
            medium: req.file.medium
        });

        next();
    } catch (error) {
        console.error('Error procesando imagen:', error);
        res.status(500).json({
            success: false,
            message: 'Error procesando la imagen'
        });
    }
};

// ✅ FUNCIÓN: Procesar múltiples imágenes
const processMultipleImages = async (req, res, next) => {
    try {
        const processedImages = [];
        const files = req.files;

        if (!files || (!files.imagen && !files.imagenes)) return next();

        const allFiles = [...(files.imagen || []), ...(files.imagenes || [])];

        for (const file of allFiles) {
            const timestamp = Date.now() + Math.random();
            const baseName = `${timestamp}-${file.originalname.replace(/\s+/g, '_')}`;
            const nameWithoutExt = path.parse(baseName).name;

            // ✅ RUTA CORREGIDA: backendv1/uploads (SIN public)
            const uploadDir = path.join(__dirname, '../uploads');
            const thumbDir = path.join(uploadDir, 'thumbs');
            const mediumDir = path.join(uploadDir, 'medium');

            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
            if (!fs.existsSync(mediumDir)) fs.mkdirSync(mediumDir, { recursive: true });

            let originalPath, thumbPath, mediumPath;

            if (file.mimetype === 'image/gif') {
                originalPath = path.join(uploadDir, baseName);
                fs.writeFileSync(originalPath, file.buffer);
                thumbPath = originalPath;
                mediumPath = originalPath;
            } else {
                const image = sharp(file.buffer);
                const metadata = await image.metadata();

                const originalBuffer = await image
                    .resize(
                        metadata.width > 1200 ? 1200 : metadata.width,
                        metadata.height > 1200 ? 1200 : metadata.height,
                        { fit: 'inside' }
                    )
                    .jpeg({ quality: 80, progressive: true })
                    .toBuffer();
                
                originalPath = path.join(uploadDir, `${nameWithoutExt}.jpg`);
                fs.writeFileSync(originalPath, originalBuffer);

                const mediumBuffer = await image
                    .resize(400, 400, { fit: 'inside' })
                    .jpeg({ quality: 70 })
                    .toBuffer();
                
                mediumPath = path.join(mediumDir, `${nameWithoutExt}.jpg`);
                fs.writeFileSync(mediumPath, mediumBuffer);

                const thumbBuffer = await image
                    .resize(150, 150, { fit: 'cover' })
                    .jpeg({ quality: 60 })
                    .toBuffer();
                
                thumbPath = path.join(thumbDir, `${nameWithoutExt}.jpg`);
                fs.writeFileSync(thumbPath, thumbBuffer);
            }

            // Generar WebP
            try {
                await sharp(file.buffer)
                    .resize(1200, 1200, { fit: 'inside' })
                    .webp({ quality: 70 })
                    .toFile(path.join(uploadDir, `${nameWithoutExt}.webp`));
                
                await sharp(file.buffer)
                    .resize(400, 400, { fit: 'inside' })
                    .webp({ quality: 65 })
                    .toFile(path.join(mediumDir, `${nameWithoutExt}.webp`));
                
                await sharp(file.buffer)
                    .resize(150, 150, { fit: 'cover' })
                    .webp({ quality: 60 })
                    .toFile(path.join(thumbDir, `${nameWithoutExt}.webp`));
            } catch (error) {
                console.warn('Error generando WebP:', error.message);
            }

            processedImages.push({
                original: `/uploads/${nameWithoutExt}.jpg`,
                thumbnail: `/uploads/thumbs/${nameWithoutExt}.jpg`,
                medium: `/uploads/medium/${nameWithoutExt}.jpg`,
                webp: `/uploads/${nameWithoutExt}.webp`,
                webpThumbnail: `/uploads/thumbs/${nameWithoutExt}.webp`,
                webpMedium: `/uploads/medium/${nameWithoutExt}.webp`,
                mimetype: file.mimetype
            });
        }

        req.processedImages = processedImages;
        next();
    } catch (error) {
        console.error('Error procesando imágenes múltiples:', error);
        res.status(500).json({
            success: false,
            message: 'Error procesando las imágenes'
        });
    }
};

// ✅ FUNCIÓN: Eliminar todas las versiones de una imagen
const deleteImage = (imagePath) => {
    try {
        // ✅ RUTA CORREGIDA: backendv1/uploads (SIN public)
        const fullPath = path.join(__dirname, '../uploads', imagePath.replace('/uploads/', ''));
        
        // Eliminar imagen original
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

        // Eliminar versión WebP
        const webpPath = fullPath.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
        if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);

        // Eliminar miniatura
        const thumbName = path.basename(imagePath);
        const thumbPath = path.join(__dirname, '../uploads/thumbs', thumbName);
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);

        // Eliminar WebP miniatura
        const thumbWebpPath = thumbPath.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
        if (fs.existsSync(thumbWebpPath)) fs.unlinkSync(thumbWebpPath);

        // Eliminar mediana
        const mediumPath = path.join(__dirname, '../uploads/medium', thumbName);
        if (fs.existsSync(mediumPath)) fs.unlinkSync(mediumPath);

        // Eliminar WebP mediana
        const mediumWebpPath = mediumPath.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
        if (fs.existsSync(mediumWebpPath)) fs.unlinkSync(mediumWebpPath);

    } catch (error) {
        console.error('Error eliminando versiones de imagen:', error);
    }
};

module.exports = {
    upload,
    processImage,
    processMultipleImages,
    deleteImage
};