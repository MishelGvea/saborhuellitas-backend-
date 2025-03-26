// routes/iotRoutes.js
const express = require("express");
const router = express.Router();
const IoT = require("../models/IoT");

// Obtener todos los dispositivos IoT
router.get("/", async (req, res) => {
  try {
    // Si hay un parámetro de correo, filtramos por correo
    if (req.query.correo) {
      const dispositivos = await IoT.find({ correo: req.query.correo });
      return res.json(dispositivos);
    }
    
    // Si no hay parámetro, devolvemos todos
    const dispositivos = await IoT.find();
    res.json(dispositivos);
  } catch (error) {
    console.error("Error al obtener dispositivos IoT:", error);
    res.status(500).json({ mensaje: "Error al obtener los dispositivos IoT" });
  }
});

// Reiniciar dispositivo por MAC
router.post("/reiniciar/:mac", async (req, res) => {
  try {
    const dispositivo = await IoT.findOneAndUpdate(
      { mac: req.params.mac },
      { ultimo_reinicio: new Date() },
      { new: true }
    );
    
    if (!dispositivo) {
      return res.status(404).json({ mensaje: "Dispositivo no encontrado" });
    }
    
    res.json({ mensaje: "Dispositivo reiniciado correctamente" });
  } catch (error) {
    console.error("Error al reiniciar dispositivo IoT:", error);
    res.status(500).json({ mensaje: "Error al reiniciar el dispositivo" });
  }
});

module.exports = router;