const cloudinary = require('../config/cloudinary');
const fs = require('fs');

/**
 * Sube una imagen a Cloudinary desde un archivo local
 * @param {string} filePath - Ruta al archivo temporal
 * @param {string} folder - Carpeta en Cloudinary donde guardar la imagen
 * @returns {Promise<Object>} - Objeto con información de la imagen subida
 */
const uploadImage = async (filePath, folder = 'general') => {
  try {
    // Subir la imagen a Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto'
    });
    
    // Eliminar el archivo temporal
    fs.unlinkSync(filePath);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      success: true
    };
  } catch (error) {
    // Si hay un error, intentamos eliminar el archivo temporal
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (unlinkError) {
      console.error('Error al eliminar archivo temporal:', unlinkError);
    }
    
    // Relanzar el error original
    throw error;
  }
};

/**
 * Elimina una imagen de Cloudinary
 * @param {string} publicId - ID público de la imagen en Cloudinary
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
const deleteImage = async (publicId) => {
  if (!publicId) return false;
  
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error al eliminar imagen de Cloudinary:', error);
    return false;
  }
};

// Añade esto a tu utils/cloudinaryUtils.js
const testConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('Conexión a Cloudinary exitosa:', result);
    return true;
  } catch (error) {
    console.error('Error al conectar con Cloudinary:', error);
    return false;
  }
};

// Exporta también esta función
module.exports = {
  uploadImage,
  deleteImage,
  testConnection
};
