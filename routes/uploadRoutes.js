const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadImage, deleteImage } = require('../utils/cloudinaryUtils');

// Configurar almacenamiento para multer (seguimos usando almacenamiento local temporal)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/temp';
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Filtro para tipos de archivo
const fileFilter = (req, file, cb) => {
  // Aceptar solo imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

// Inicializar multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limitar a 5MB
});

// Ruta para subir imágenes - mantiene compatibilidad con el código existente
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    // El tipo de recurso es opcional y determina la carpeta en Cloudinary
    const folder = req.body.tipo || 'general';
    
    // Subir a Cloudinary
    const result = await uploadImage(req.file.path, folder);
    
    // Devolver URL de la imagen cargada (misma estructura que antes)
    res.json({
      url: result.url,
      publicId: result.publicId, // Añadimos el publicId aunque el código antiguo no lo use
      success: true,
      message: 'Imagen cargada exitosamente'
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ error: 'Error al procesar la imagen' });
  }
});

// Ruta específica para subir imágenes de usuario
router.post('/usuario', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }
    
    // Subir a Cloudinary en la carpeta 'usuarios'
    const result = await uploadImage(req.file.path, 'usuarios');
    
    // Devolver URL de la imagen cargada
    res.json({
      url: result.url,
      publicId: result.publicId,
      success: true,
      message: 'Imagen de usuario cargada exitosamente'
    });
  } catch (error) {
    console.error('Error al subir imagen de usuario:', error);
    res.status(500).json({ error: 'Error al procesar la imagen' });
  }
});

// Ruta específica para subir imágenes de productos
router.post('/producto', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }
    
    // Subir a Cloudinary en la carpeta 'products'
    const result = await uploadImage(req.file.path, 'products');
    
    // Devolver URL de la imagen cargada
    res.json({
      url: result.url,
      publicId: result.publicId,
      success: true,
      message: 'Imagen de producto cargada exitosamente'
    });
  } catch (error) {
    console.error('Error al subir imagen de producto:', error);
    res.status(500).json({ error: 'Error al procesar la imagen' });
  }
});

// Ruta para eliminar imágenes de Cloudinary
router.delete('/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // Eliminar imagen de Cloudinary
    const success = await deleteImage(publicId);
    
    if (success) {
      res.json({ success: true, mensaje: 'Imagen eliminada correctamente' });
    } else {
      res.status(400).json({ error: 'No se pudo eliminar la imagen' });
    }
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({ error: 'Error al eliminar la imagen' });
  }
});

module.exports = router;