const express = require("express");
const router = express.Router();
const { getEstadoMQTT, publicarMensaje } = require("../config/mqtt");

// Obtener estado del sistema MQTT
router.get("/estado-mqtt", (req, res) => {
  try {
    const estadoMQTT = getEstadoMQTT();
    res.json({
      exito: true,
      ...estadoMQTT
    });
  } catch (error) {
    res.status(500).json({
      exito: false,
      mensaje: "Error al obtener estado MQTT",
      error: error.message
    });
  }
});

// Probar conexión MQTT publicando un mensaje de prueba
router.post("/probar-mqtt", async (req, res) => {
  try {
    const resultado = await publicarMensaje("sistema/prueba", JSON.stringify({
      mensaje: "Prueba de sistema",
      timestamp: new Date().toISOString()
    }));
    
    res.json({
      exito: true,
      mensaje: "Mensaje de prueba enviado correctamente",
      resultado
    });
  } catch (error) {
    res.status(500).json({
      exito: false,
      mensaje: "Error al enviar mensaje de prueba",
      error: error.message
    });
  }
});

module.exports = router;