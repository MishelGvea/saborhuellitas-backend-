const express = require("express");
const router = express.Router();
const { Dispensador, Dispensacion } = require("../models/Dispensador");

// Obtener todos los dispositivos
router.get("/", async (req, res) => {
  try {
    const dispositivos = await Dispensador.find();
    res.json({
      success: true,
      data: dispositivos
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      mensaje: "Error al obtener los dispositivos",
      error: error.message 
    });
  }
});

// Buscar por correo
router.get("/buscar", async (req, res) => {
  const { correo } = req.query;
  try {
    const dispositivos = await Dispensador.find({ correo });
    res.json({
      success: true,
      data: dispositivos
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      mensaje: "Error al buscar dispositivos",
      error: error.message 
    });
  }
});

// Reiniciar dispositivo (actualizar último reinicio)
router.post("/reiniciar/:mac", async (req, res) => {
  try {
    await Dispensador.findOneAndUpdate(
      { mac: req.params.mac },
      { ultimo_reinicio: new Date() }
    );
    res.json({ 
      success: true,
      mensaje: "Dispensador reiniciado" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      mensaje: "Error al reiniciar dispositivo",
      error: error.message 
    });
  }
});

// NUEVA RUTA: Obtener historial de dispensaciones
router.get("/dispensaciones", async (req, res) => {
  try {
    const { limit = 10, page = 1, tipo, estado, desde, hasta, dispensadorId } = req.query;
    const skip = (page - 1) * parseInt(limit);
    
    console.log("Parámetros recibidos en historial:", { limit, page, dispensadorId });
    
    // Construir filtro con el dispensadorId proporcionado
    let filtro = {};
    
    if (dispensadorId) {
      filtro.dispensadorId = dispensadorId;
    }
    
    // Resto del filtro
    if (tipo) filtro.tipo = tipo;
    if (estado) filtro.estado = estado;
    
    // Filtro de fechas
    if (desde || hasta) {
      filtro.iniciada = {};
      if (desde) filtro.iniciada.$gte = new Date(desde);
      if (hasta) filtro.iniciada.$lte = new Date(hasta);
    }
    
    console.log("Filtro aplicado:", filtro);
    
    // Obtener dispensaciones
    try {
      const dispensaciones = await Dispensacion.find(filtro)
        .sort({ iniciada: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await Dispensacion.countDocuments(filtro);
      
      return res.status(200).json({
        success: true,
        data: dispensaciones || [],
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (findError) {
      console.error("Error en consulta a DB:", findError);
      return res.status(500).json({
        success: false,
        message: 'Error al consultar historial de dispensaciones',
        error: findError.message
      });
    }
  } catch (error) {
    console.error('Error al obtener historial de dispensaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener historial de dispensaciones',
      error: error.message
    });
  }
});

// RUTA ALTERNATIVA: Obtener historial por ID en URL
router.get("/:id/historial", async (req, res) => {
  // Redirigir la solicitud a la ruta principal de dispensaciones
  req.query.dispensadorId = req.params.id;
  
  try {
    const { limit = 10, page = 1, tipo, estado, desde, hasta } = req.query;
    const dispensadorId = req.params.id;
    const skip = (page - 1) * parseInt(limit);
    
    console.log("Parámetros recibidos en historial por ID:", { limit, page, dispensadorId });
    
    // Construir filtro
    let filtro = { dispensadorId };
    
    // Resto del filtro
    if (tipo) filtro.tipo = tipo;
    if (estado) filtro.estado = estado;
    
    // Filtro de fechas
    if (desde || hasta) {
      filtro.iniciada = {};
      if (desde) filtro.iniciada.$gte = new Date(desde);
      if (hasta) filtro.iniciada.$lte = new Date(hasta);
    }
    
    console.log("Filtro aplicado:", filtro);
    
    // Obtener dispensaciones
    const dispensaciones = await Dispensacion.find(filtro)
      .sort({ iniciada: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Dispensacion.countDocuments(filtro);
    
    return res.status(200).json({
      success: true,
      data: dispensaciones || [],
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener historial de dispensaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener historial de dispensaciones',
      error: error.message
    });
  }
});

// Obtener estado actual del dispensador
router.get("/estado", async (req, res) => {
  try {
    const { id } = req.query;
    
    let dispensador;
    if (id) {
      dispensador = await Dispensador.findById(id);
    } else {
      // Si no se proporciona ID, intentar obtener el primero
      dispensador = await Dispensador.findOne();
    }
    
    if (!dispensador) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dispensador no encontrado' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: dispensador
    });
  } catch (error) {
    console.error('Error al obtener estado del dispensador:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estado del dispensador',
      error: error.message
    });
  }
});

// Añadir esta ruta para enviar comandos al final del archivo dispensadorRoutes.js
router.post("/comando", async (req, res) => {
  try {
    const { comando } = req.body;
    
    // Conseguir el cliente MQTT
    const mqttClient = req.app.get('mqttClient');
    const MQTT_TOPICS = req.app.get('mqttTopics');
    
    if (!mqttClient || !mqttClient.connected) {
      return res.status(503).json({
        success: false,
        message: 'No hay conexión con el broker MQTT'
      });
    }
    
    // Enviar comando a través de MQTT - ENVIAR EL COMANDO DIRECTAMENTE COMO LO ESPERA EL ESP32
    const topic = `${MQTT_TOPICS.RAIZ}/comando`;
    
    // IMPORTANTE: Enviar solo el texto del comando, no un objeto JSON
    console.log(`Enviando comando a ${topic}: "${comando}"`);
    mqttClient.publish(topic, comando);
    
    return res.status(200).json({
      success: true,
      message: `Comando "${comando}" enviado con éxito`
    });
  } catch (error) {
    console.error('Error al enviar comando:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar comando',
      error: error.message
    });
  }
});
module.exports = router;