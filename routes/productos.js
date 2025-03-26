const express = require("express");
const router = express.Router();
const Producto = require("../models/Producto");

// Obtener todos los productos
router.get("/", async (req, res) => {
  try {
    const productos = await Producto.find();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los productos" });
  }
});

// Agregar un nuevo producto
router.post("/", async (req, res) => {
  const { nombre, descripcion, precio, imagenUrl } = req.body;

  if (!nombre || !descripcion || !precio || !imagenUrl) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  try {
    const nuevoProducto = new Producto({ nombre, descripcion, precio, imagenUrl });
    await nuevoProducto.save();
    res.status(201).json(nuevoProducto);
  } catch (error) {
    res.status(500).json({ message: "Error al agregar el producto" });
  }
});

module.exports = router;
