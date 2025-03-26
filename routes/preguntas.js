const express = require("express");
const router = express.Router();
const Pregunta = require("../models/Pregunta");

// 📌 Obtener todas las preguntas
router.get("/", async (req, res) => {
  try {
    const preguntas = await Pregunta.find();
    res.json(preguntas);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener las preguntas" });
  }
});

// 📌 Agregar una nueva pregunta
router.post("/", async (req, res) => {
  try {
    const nuevaPregunta = new Pregunta(req.body);
    const preguntaGuardada = await nuevaPregunta.save();
    res.status(201).json(preguntaGuardada);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al guardar la pregunta" });
  }
});

// 📌 Actualizar una pregunta existente
router.put("/:id", async (req, res) => {
  try {
    const preguntaActualizada = await Pregunta.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } // Devuelve el documento actualizado
    );
    
    if (!preguntaActualizada) {
      return res.status(404).json({ mensaje: "Pregunta no encontrada" });
    }
    
    res.json(preguntaActualizada);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar la pregunta" });
  }
});

// 📌 Eliminar una pregunta
router.delete("/:id", async (req, res) => {
  try {
    await Pregunta.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Pregunta eliminada" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar la pregunta" });
  }
});

module.exports = router;