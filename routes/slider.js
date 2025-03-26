const express = require("express");
const router = express.Router();
const Slider = require("../models/Slider");

// 🟢 Ruta para obtener los slides del slider
router.get("/", async (req, res) => {
  try {
    const slides = await Slider.find();
    if (!slides || slides.length === 0) {
      return res.status(404).json({ mensaje: "No hay slides disponibles" });
    }
    res.json(slides);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener los slides", error });
  }
});

module.exports = router;