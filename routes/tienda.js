const express = require("express");
const router = express.Router();
const Tienda = require("../models/Tienda");

// Ruta para obtener los datos de Inicio
router.get("/", async (req, res) => {
  try {
    const tienda = await Tienda.find(); // Buscar todos los documentos
    if (!tienda || tienda.length === 0) {
      return res.status(404).json({ mensaje: "Información de inicio no encontrada" });
    }
    res.json(tienda);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener la información", error });
  }
});

module.exports = router;
