// config/multer.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que los directorios existen
const UPLOAD_DIR = path.join(__dirname, '../uploads/anuncios');
const CAROUSEL_DIR = path.join(__dirname, '../uploads/carousels');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('📁 Directorio creado:', UPLOAD_DIR);
}

if (!fs.existsSync(CAROUSEL_DIR)) {
  fs.mkdirSync(CAROUSEL_DIR, { recursive: true });
  console.log('📁 Directorio creado:', CAROUSEL_DIR);
}

// Configuración de almacenamiento para anuncios
const anunciosStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 11);
    const filename = `anuncio-${timestamp}-${randomStr}${ext}`;
    cb(null, filename);
  }
});

// Configuración de almacenamiento para carousels
const carouselStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CAROUSEL_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 11);
    const filename = `slide-${timestamp}-${randomStr}${ext}`;
    cb(null, filename);
  }
});

// Filtro de tipos de archivo
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('❌ Tipo de archivo no permitido. Solo JPEG, PNG y GIF.'), false);
  }
};

// Configuración final de Multer para anuncios normales
const anunciosUpload = multer({
  storage: anunciosStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Configuración de Multer para carousels (múltiples archivos)
const carouselUpload = multer({
  storage: carouselStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB por imagen
  }
});

module.exports = { anunciosUpload, carouselUpload, UPLOAD_DIR, CAROUSEL_DIR };
 
// Multer unificado con almacenamiento mixto según fieldname
const mixedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Enviar 'carousel_images' al directorio de carousels, resto a anuncios
    if (file.fieldname === 'carousel_images') {
      cb(null, CAROUSEL_DIR);
    } else {
      cb(null, UPLOAD_DIR);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 11);
    const prefix = file.fieldname === 'carousel_images' ? 'slide' : 'anuncio';
    const filename = `${prefix}-${timestamp}-${randomStr}${ext}`;
    cb(null, filename);
  }
});

const unifiedUpload = multer({
  storage: mixedStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports.unifiedUpload = unifiedUpload;

