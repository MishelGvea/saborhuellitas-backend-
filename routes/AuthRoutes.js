// routes/AuthRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("./authController");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware de autenticación
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
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado, por favor inicie sesión nuevamente'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error en la autenticación',
      error: error.message
    });
  }
};

// Rutas públicas
router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/solicitar-recuperacion", authController.solicitarRecuperacion);
router.post("/verificar-codigo", authController.verificarCodigo);
router.post("/cambiar-contrasena", authController.cambiarContrasena);

// Rutas que requieren autenticación
router.get("/perfil", authMiddleware, authController.getPerfil);
router.put("/perfil", authMiddleware, authController.updatePerfil);
router.post("/cambiar-password", authMiddleware, authController.cambiarPassword);
router.get("/verificar-token", authMiddleware, authController.verificarToken);

module.exports = router;