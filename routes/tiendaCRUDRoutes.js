const express = require("express");
const router = express.Router();
const Tienda = require("../models/Tienda");
const cloudinary = require('../config/cloudinary');

// Obtener todos los productos
router.get("/", async (req, res) => {
  try {
    const productos = await Tienda.find();
    res.json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: "Error al obtener los productos" });
  }
});

// Buscar productos por nombre o categoría
router.get("/buscar", async (req, res) => {
  try {
    const { nombre, categoria } = req.query;
    let filtro = {};
    
    if (nombre) {
      filtro.nombre = { $regex: nombre, $options: "i" }; // Búsqueda insensible a mayúsculas/minúsculas
    }
    
    if (categoria) {
      filtro.categoria = categoria;
    }
    
    const productos = await Tienda.find(filtro);
    res.json(productos);
  } catch (error) {
    console.error("Error al buscar productos:", error);
    res.status(500).json({ error: "Error al buscar productos" });
  }
});

// Obtener categorías disponibles
router.get("/categorias", async (req, res) => {
  try {
    const categorias = await Tienda.distinct("categoria");
    res.json(categorias.filter(cat => cat)); // Filtrar categorías vacías
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    res.status(500).json({ error: "Error al obtener las categorías" });
  }
});

// Obtener un producto específico por ID
router.get("/:id", async (req, res) => {
  try {
    const producto = await Tienda.findById(req.params.id);
    
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    
    res.json(producto);
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({ error: "Error al obtener el producto" });
  }
});

// Crear un nuevo producto
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion, precio, imagenUrl, imagenPublicId, categoria } = req.body;
    
    // Validación básica
    if (!nombre || !descripcion || !precio) {
      return res.status(400).json({ error: "Nombre, descripción y precio son obligatorios" });
    }
    
    // Crear un nuevo producto
    const nuevoProducto = new Tienda({
      nombre,
      descripcion,
      precio,
      imagenUrl: imagenUrl || "https://res.cloudinary.com/dozphinph/image/upload/v1710777777/products/default-product_abcdef.jpg",
      imagenPublicId,
      categoria: categoria || "otros"
    });
    
    await nuevoProducto.save();
    res.status(201).json(nuevoProducto);
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ error: "Error al crear el producto" });
  }
});

// Actualizar un producto
router.put("/:id", async (req, res) => {
  try {
    const { nombre, descripcion, precio, imagenUrl, imagenPublicId, categoria } = req.body;
    
    // Validación básica
    if (!nombre || !descripcion || !precio) {
      return res.status(400).json({ error: "Nombre, descripción y precio son obligatorios" });
    }
    
    // Obtener el producto actual para ver si la imagen ha cambiado
    const productoActual = await Tienda.findById(req.params.id);
    
    if (!productoActual) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    
    // Si la imagen ha cambiado y teníamos una imagen anterior en Cloudinary, la eliminamos
    if (productoActual.imagenPublicId && 
        imagenPublicId && 
        productoActual.imagenPublicId !== imagenPublicId) {
      try {
        await cloudinary.uploader.destroy(productoActual.imagenPublicId);
      } catch (cloudinaryError) {
        console.error("Error al eliminar imagen anterior de Cloudinary:", cloudinaryError);
        // Continuamos con la actualización incluso si falla la eliminación
      }
    }
    
    // Actualizar producto
    const productoActualizado = await Tienda.findByIdAndUpdate(
      req.params.id,
      {
        nombre,
        descripcion,
        precio,
        imagenUrl,
        imagenPublicId,
        categoria
      },
      { new: true }
    );
    
    res.json(productoActualizado);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ error: "Error al actualizar el producto" });
  }
});

// Eliminar un producto
router.delete("/:id", async (req, res) => {
  try {
    const producto = await Tienda.findById(req.params.id);
    
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    
    // Si el producto tiene una imagen en Cloudinary, intentamos eliminarla
    if (producto.imagenPublicId) {
      try {
        await cloudinary.uploader.destroy(producto.imagenPublicId);
      } catch (cloudinaryError) {
        console.error("Error al eliminar imagen de Cloudinary:", cloudinaryError);
        // Continuamos con la eliminación del producto incluso si falla la eliminación de la imagen
      }
    }
    
    // Eliminar el producto
    await Tienda.findByIdAndDelete(req.params.id);
    
    res.json({ mensaje: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
});

module.exports = router;