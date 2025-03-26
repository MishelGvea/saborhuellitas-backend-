const express = require('express');
const router = express.Router();
const Nosotros = require('../models/Nosotros');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB límite
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  }
});

// Obtener configuración actual
router.get('/configuracion', async (req, res) => {
  try {
    // Buscar el primer documento o crear uno si no existe
    let configuracion = await Nosotros.findOne();
    
    if (!configuracion) {
      configuracion = new Nosotros({
        // Valores por defecto
        titulo: 'Sabor y Huellitas',
        descripcion: 'Descripción por defecto',
        footer: {
          politicas: {
            privacidad: {
              titulo: "Política de Privacidad",
              contenido: "Contenido de privacidad por defecto"
            },
            terminosCondiciones: {
              titulo: "Términos y Condiciones",
              contenido: "Contenido de términos por defecto"
            }
          },
          redesSociales: {
            facebook: {
              url: "https://www.facebook.com/SaboryHuellitas",
              nombrePagina: "SaboryHuellitas"
            },
            instagram: {
              url: "https://www.instagram.com/SaboryHuellitas100",
              nombrePagina: "SaboryHuellitas100"
            },
            twitter: {
              url: "https://twitter.com/SaborYHuellitas",
              nombrePagina: "@SaborYHuellitas"
            }
          },
          soporte: {
            contacto: {
              telefono: "7717492349",
              email: "saboryhuellitasproyectointegra@gmail.com"
            }
          },
          misionVision: {
            mision: {
              titulo: "Misión",
              contenido: "Ofrecer productos y servicios de calidad para la nutrición y bienestar de las mascotas."
            },
            vision: {
              titulo: "Visión",
              contenido: "Convertirnos en la marca líder en innovación y cuidado de mascotas."
            },
            valores: [
              {
                titulo: "Compromiso",
                contenido: "Compromiso con el bienestar animal."
              },
              {
                titulo: "Innovación",
                contenido: "Aplicación de tecnología en productos de mascotas."
              },
              {
                titulo: "Calidad",
                contenido: "Productos de alta calidad y confianza."
              }
            ]
          }
        }
      });
      await configuracion.save();
    }
    
    res.json(configuracion);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ message: 'Error al obtener configuración', error: error.message });
  }
});

// Actualizar configuración
router.put('/configuracion', async (req, res) => {
  try {
    // Eliminar el documento existente
    await Nosotros.deleteMany({});
    
    // Extraer _id y __v del body (si existen)
    const { _id, __v, ...datosActualizados } = req.body;
    
    console.log("Creando nuevo documento con datos limpios");
    
    // Crear uno nuevo con la estructura correcta
    const nuevoDocumento = new Nosotros(datosActualizados);
    const resultado = await nuevoDocumento.save();
    
    console.log("Configuración creada correctamente");
    res.json(resultado);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ message: 'Error al actualizar configuración', error: error.message });
  }
});

// Subir imagen
router.post('/upload', upload.single('imagen'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ninguna imagen' });
    }
    
    // Generar URL relativa para la imagen
    const url = `/uploads/${req.file.filename}`;
    
    res.json({ 
      message: 'Imagen subida exitosamente', 
      url: url 
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ message: 'Error al subir imagen', error: error.message });
  }
});

module.exports = router;