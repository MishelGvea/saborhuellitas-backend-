const express = require("express");
const router = express.Router();
const Mascota = require("../models/Mascota");

// Ruta para obtener los datos de la mascota
router.get("/", async (req, res) => {
  try {
    const mascota = await Mascota.findOne(); // Obtiene la primera mascota
    if (!mascota) {
      return res.status(404).json({ error: "No se encontró ninguna mascota" });
    }
    res.json(mascota);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la mascota" });
  }
});

// Ruta para actualizar los datos de la mascota
router.put("/", async (req, res) => {
  try {
    const { nombre, edad, raza, peso } = req.body;

    // Busca la mascota y actualiza sus datos
    const mascota = await Mascota.findOneAndUpdate(
      {}, // Filtro para encontrar la mascota (puedes ajustarlo si es necesario)
      { nombre, edad, raza, peso },
      { new: true } // Devuelve el documento actualizado
    );

    if (!mascota) {
      return res.status(404).json({ error: "No se encontró ninguna mascota" });
    }

    res.json({ mensaje: "✅ Información actualizada correctamente", mascota });
  } catch (error) {
    console.error("❌ Error al actualizar la mascota:", error);
    res.status(500).json({ error: "❌ Error al actualizar la mascota" });
  }
});

module.exports = router;