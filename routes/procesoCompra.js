const express = require("express");
const router = express.Router();
const ProcesoCompra = require("../models/ProcesoCompra");

// 🟢 Ruta para obtener los datos del proceso de compra
router.get("/", async (req, res) => {
  try {
    const proceso = await ProcesoCompra.findOne(); // Obtiene solo un documento
    if (!proceso) {
      return res.status(404).json({ mensaje: "No se encontró el proceso de compra" });
    }
    res.json(proceso);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener el proceso de compra", error });
  }
});

// 🟡 Ruta para actualizar los datos del proceso de compra
router.put("/", async (req, res) => {
  try {
    const updatedProceso = await ProcesoCompra.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json(updatedProceso);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar el proceso de compra", error });
  }
});

module.exports = router;
