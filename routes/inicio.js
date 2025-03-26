const express = require("express");
const router = express.Router();
const Inicio = require("../models/Inicio");

// 🟢 Ruta para obtener los datos de inicio
router.get("/", async (req, res) => {
  try {
    const inicio = await Inicio.findOne(); 
    if (!inicio) {
      return res.status(404).json({ mensaje: "Información de inicio no encontrada" });
    }
    res.json(inicio);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener la información", error });
  }
});


// 🟡 Ruta para actualizar los datos de inicio
router.put("/", async (req, res) => {
  try {
    const updatedInicio = await Inicio.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json(updatedInicio);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar la información", error });
  }
});

module.exports = router;