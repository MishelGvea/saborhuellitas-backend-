// routes/personalizacionRoutes.js
const express = require("express");
const router = express.Router();
const Personalizacion = require("../models/Personalizacion");

// Obtener la configuración de personalización
router.get("/", async (req, res) => {
  try {
    // Buscar la configuración de personalización (debería ser solo un documento)
    let personalizacion = await Personalizacion.findOne();
    
    // Si no existe, crear una configuración inicial
    if (!personalizacion) {
      personalizacion = new Personalizacion({
        colorTema: "#000000",
        imagenLogin: "",
        mostrarLogo: true
      });
      await personalizacion.save();
    }
    
    res.json(personalizacion);
  } catch (error) {
    console.error("Error al obtener personalización:", error);
    res.status(500).json({ mensaje: "Error al obtener la personalización" });
  }
});

// Actualizar la configuración de personalización
router.put("/", async (req, res) => {
  try {
    const { colorTema, imagenLogin, mostrarLogo } = req.body;
    
    // Validar datos de entrada
    if (typeof mostrarLogo !== 'boolean') {
      return res.status(400).json({ mensaje: "El campo mostrarLogo debe ser un booleano" });
    }
    
    // Buscar la configuración existente
    let personalizacion = await Personalizacion.findOne();
    
    if (personalizacion) {
      // Actualizar si existe
      personalizacion.colorTema = colorTema;
      personalizacion.imagenLogin = imagenLogin;
      personalizacion.mostrarLogo = mostrarLogo;
      personalizacion.fechaActualizacion = new Date();
      
      await personalizacion.save();
    } else {
      // Crear nueva configuración si no existe
      personalizacion = new Personalizacion({
        colorTema,
        imagenLogin,
        mostrarLogo
      });
      
      await personalizacion.save();
    }
    
    res.json({ 
      mensaje: "Personalización actualizada correctamente",
      personalizacion 
    });
  } catch (error) {
    console.error("Error al actualizar personalización:", error);
    res.status(500).json({ mensaje: "Error al actualizar la personalización" });
  }
});

module.exports = router;