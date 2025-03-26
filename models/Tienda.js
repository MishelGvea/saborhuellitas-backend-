const mongoose = require("mongoose");

const TiendaSchema = new mongoose.Schema({
  nombre: String,
  descripcion: String,
  precio: Number,
  imagenUrl: String,
  imagenPublicId: String, // Campo para Cloudinary
  categoria: String
});

module.exports = mongoose.model("Tienda", TiendaSchema, "Tienda"); // "Tienda" como nombre exacto de la colección