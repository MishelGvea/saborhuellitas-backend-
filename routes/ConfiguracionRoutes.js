// routes/configuracionRoutes.js
const express = require("express");
const router = express.Router();
const Nosotros = require("../models/Nosotros");

// Obtener la configuración completa
router.get("/", async (req, res) => {
  try {
    // Buscar el documento existente
    let nosotros = await Nosotros.findOne();
    
    if (!nosotros) {
      return res.status(404).json({ mensaje: "Datos no encontrados" });
    }
    
    // Convertir a objeto plano y eliminar el _id
    const nosotrosObj = nosotros.toObject();
    delete nosotrosObj._id;
    
    res.json(nosotrosObj);
  } catch (error) {
    console.error("Error al obtener configuración:", error);
    res.status(500).json({ mensaje: "Error al obtener la configuración" });
  }
});

// Actualizar la configuración completa
router.put("/", async (req, res) => {
  try {
    // Obtener todos los datos del cuerpo de la petición
    const datosActualizados = req.body;
    
    // Eliminar el _id si está presente para evitar errores
    if (datosActualizados._id) {
      delete datosActualizados._id;
    }
    
    // Buscar el documento existente
    let nosotros = await Nosotros.findOne();
    
    if (!nosotros) {
      return res.status(404).json({ mensaje: "Datos no encontrados" });
    }
    
    // Actualizar todos los campos
    Object.keys(datosActualizados).forEach(key => {
      if (key !== '_id') {
        nosotros[key] = datosActualizados[key];
      }
    });
    
    await nosotros.save();
    
    // Devolver el objeto actualizado sin el _id
    const nosotrosObj = nosotros.toObject();
    delete nosotrosObj._id;
    
    res.json({ 
      mensaje: "Datos actualizados correctamente",
      configuracion: nosotrosObj
    });
  } catch (error) {
    console.error("Error al actualizar configuración:", error);
    res.status(500).json({ mensaje: "Error al actualizar la configuración" });
  }
});

module.exports = router;