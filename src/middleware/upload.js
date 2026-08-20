const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const storage = multer.memoryStorage();

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

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});

const processImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }

        const { originalname, buffer, mimetype } = req.file;
        const timestamp = Date.now();
        const filename = `${timestamp}-${originalname.replace(/\s+/g, '_')}`;
        
        let outputPath;
        let processedBuffer;

        if (mimetype === 'image/gif') {
            outputPath = path.join(__dirname, '../../public/uploads', filename);
            fs.writeFileSync(outputPath, buffer);
            processedBuffer = buffer;
        } else {
            const image = sharp(buffer);
            const metadata = await image.metadata();

            let transform = image.resize(
                metadata.width > 1200 ? 1200 : metadata.width,
                metadata.height > 1200 ? 1200 : metadata.height,
                { fit: 'inside' }
            );

            if (mimetype !== 'image/png') {
                transform = transform.jpeg({ quality: 80, progressive: true });
            } else {
                transform = transform.png({ quality: 80, progressive: true });
            }

            processedBuffer = await transform.toBuffer();
            outputPath = path.join(__dirname, '../../public/uploads', filename);
            fs.writeFileSync(outputPath, processedBuffer);
        }

        const webpPath = path.join(__dirname, '../../public/uploads', `${path.parse(filename).name}.webp`);
        await sharp(processedBuffer)
            .webp({ quality: 75 })
            .toFile(webpPath);

        req.file.path = `/uploads/${filename}`;
        req.file.webpPath = `/uploads/${path.parse(filename).name}.webp`;
        req.file.processed = true;

        next();
    } catch (error) {
        console.error('Error procesando imagen:', error);
        res.status(500).json({
            success: false,
            message: 'Error procesando la imagen'
        });
    }
};

const uploadMultiple = upload.fields([
    { name: 'imagen', maxCount: 1 },
    { name: 'imagenes', maxCount: 10 }
]);

const processMultipleImages = async (req, res, next) => {
    try {
        const processedImages = [];
        const files = req.files;

        if (!files || (!files.imagen && !files.imagenes)) {
            return next();
        }

        const allFiles = [...(files.imagen || []), ...(files.imagenes || [])];

        for (const file of allFiles) {
            const timestamp = Date.now() + Math.random();
            const filename = `${timestamp}-${file.originalname.replace(/\s+/g, '_')}`;
            
            let processedBuffer;
            let outputPath;

            if (file.mimetype === 'image/gif') {
                outputPath = path.join(__dirname, '../../public/uploads', filename);
                fs.writeFileSync(outputPath, file.buffer);
                processedBuffer = file.buffer;
            } else {
                const image = sharp(file.buffer);
                const metadata = await image.metadata();

                let transform = image.resize(
                    metadata.width > 1200 ? 1200 : metadata.width,
                    metadata.height > 1200 ? 1200 : metadata.height,
                    { fit: 'inside' }
                );

                if (file.mimetype !== 'image/png') {
                    transform = transform.jpeg({ quality: 80, progressive: true });
                } else {
                    transform = transform.png({ quality: 80, progressive: true });
                }

                processedBuffer = await transform.toBuffer();
                outputPath = path.join(__dirname, '../../public/uploads', filename);
                fs.writeFileSync(outputPath, processedBuffer);
            }

            const webpPath = path.join(__dirname, '../../public/uploads', `${path.parse(filename).name}.webp`);
            await sharp(processedBuffer)
                .webp({ quality: 75 })
                .toFile(webpPath);

            processedImages.push({
                original: `/uploads/${filename}`,
                webp: `/uploads/${path.parse(filename).name}.webp`,
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

const deleteImage = (imagePath) => {
    try {
        const fullPath = path.join(__dirname, '../../public', imagePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        const webpPath = fullPath.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
        if (fs.existsSync(webpPath)) {
            fs.unlinkSync(webpPath);
        }
    } catch (error) {
        console.error('Error eliminando imagen:', error);
    }
};

module.exports = {
    upload,
    processImage,
    uploadMultiple,
    processMultipleImages,
    deleteImage
};
