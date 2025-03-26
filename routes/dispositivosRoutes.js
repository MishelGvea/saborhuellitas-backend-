const express = require("express");
const router = express.Router();
const Dispensador = require("../models/Dispensador");
// Eliminada la referencia al middleware de autenticación

// Obtener configuración actual del dispensador
router.get("/configuracion", async (req, res) => {
  try {
    const configuracion = await Dispensador.findOne();
    if (!configuracion) {
      // Si no existe, creamos una configuración por defecto
      const nuevaConfig = new Dispensador();
      await nuevaConfig.save();
      return res.json(nuevaConfig);
    }
    res.json(configuracion);
  } catch (error) {
    console.error("❌ Error al obtener configuración:", error);
    res.status(500).json({ mensaje: "Error al obtener configuración", error: error.message });
  }
});

// Actualizar configuración del dispensador
router.put("/configuracion", async (req, res) => {
  try {
    const { cantidadDispensar, horaDispensacion, modoVacaciones } = req.body;
    
    const configuracion = await Dispensador.findOneAndUpdate(
      {}, 
      { cantidadDispensar, horaDispensacion, modoVacaciones }, 
      { new: true, upsert: true }
    );
    
    res.json({ 
      mensaje: "Configuración actualizada con éxito", 
      configuracion 
    });
  } catch (error) {
    console.error("❌ Error al actualizar configuración:", error);
    res.status(500).json({ mensaje: "Error al actualizar configuración", error: error.message });
  }
});

// Dispensar alimento manualmente
router.post("/dispensar", async (req, res) => {
  try {
    const { cantidad } = req.body;
    
    if (isNaN(cantidad) || cantidad < 10 || cantidad > 500) {
      return res.status(400).json({ mensaje: "La cantidad debe estar entre 10 y 500 gramos" });
    }
    
    // Guardar registro de dispensación
    const configuracion = await Dispensador.findOne();
    
    if (!configuracion) {
      const nuevaConfig = new Dispensador({
        historialDispensaciones: [{
          cantidad,
          fecha: new Date(),
        }],
        ultimaDispensacion: new Date()
      });
      await nuevaConfig.save();
    } else {
      configuracion.historialDispensaciones.push({
        cantidad,
        fecha: new Date(),
      });
      configuracion.ultimaDispensacion = new Date();
      await configuracion.save();
    }
    
    // Aquí puedes añadir lógica adicional para comunicarte con tu ESP32
    // por ejemplo, enviar un mensaje MQTT (requiere un cliente MQTT en el servidor)
    
    res.json({ mensaje: `Dispensando ${cantidad} gramos de alimento` });
  } catch (error) {
    console.error("❌ Error al dispensar alimento:", error);
    res.status(500).json({ mensaje: "Error al dispensar alimento", error: error.message });
  }
});

// Obtener historial de dispensaciones
router.get("/historial", async (req, res) => {
  try {
    const dispensador = await Dispensador.findOne();
    if (!dispensador) {
      return res.json({ historial: [] });
    }
    
    res.json({ historial: dispensador.historialDispensaciones });
  } catch (error) {
    console.error("❌ Error al obtener historial:", error);
    res.status(500).json({ mensaje: "Error al obtener historial", error: error.message });
  }
});

// Actualizar nivel de alimento (se podría llamar desde un webhook o servicio)
router.put("/nivel", async (req, res) => {
  try {
    const { nivel } = req.body;
    
    if (!["🟢 Lleno", "🟡 Medio", "🔴 Vacío", "❓ Desconocido"].includes(nivel)) {
      return res.status(400).json({ mensaje: "Nivel de alimento no válido" });
    }
    
    const configuracion = await Dispensador.findOneAndUpdate(
      {}, 
      { nivelAlimento: nivel }, 
      { new: true, upsert: true }
    );
    
    res.json({ 
      mensaje: "Nivel de alimento actualizado", 
      nivelAlimento: configuracion.nivelAlimento 
    });
  } catch (error) {
    console.error("❌ Error al actualizar nivel:", error);
    res.status(500).json({ mensaje: "Error al actualizar nivel", error: error.message });
  }
});

module.exports = router;