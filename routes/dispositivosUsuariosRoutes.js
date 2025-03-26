// routes/dispositivosUsuariosRoutes.js
const express = require('express');
const router = express.Router();

// Importar el controlador desde la misma carpeta routes
const dispositivoController = require('./dispositivoController');

// Middleware de autenticación (puedes reutilizar el que ya tienes en AuthRoutes)
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    // Obtener token del header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No hay token de autenticación, acceso denegado'
      });
    }
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuario en la base de datos
    const usuario = await User.findById(decoded.id).select('-password');
    
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o usuario no encontrado'
      });
    }
    
    // Añadir usuario a la solicitud
    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('Error de autenticación:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error en la autenticación',
      error: error.message
    });
  }
};

// IMPORTANTE: La ruta de verificación debe estar ANTES de las rutas con parámetros :id
router.get('/verificar/:mac', authMiddleware, dispositivoController.verificarDispositivo);

// Rutas para gestión de dispositivos de usuario
router.get('/usuario', authMiddleware, dispositivoController.getDispositivosUsuario);
router.get('/:id', authMiddleware, dispositivoController.getDispositivo);
router.post('/', authMiddleware, dispositivoController.registrarDispositivo);
router.put('/:id', authMiddleware, dispositivoController.actualizarDispositivo);
router.delete('/:id', authMiddleware, dispositivoController.eliminarDispositivo);

// Ruta para enviar comandos al dispositivo
router.post('/:id/comando', authMiddleware, dispositivoController.enviarComando);

// Ruta para obtener estado del dispensador
router.get('/:id/estado', authMiddleware, dispositivoController.getEstadoDispensador);

module.exports = router;