const mongoose = require("mongoose");

const ProcesoCompraSchema = new mongoose.Schema(
  {
    titulo: String,
    descripcion: String,
    pasos: [
      {
        id: Number,
        titulo: String,
        descripcion: String,
      }
    ]
  },
  { collection: "proceso_compra" } // Nombre de la colección en MongoDB
);

module.exports = mongoose.model("ProcesoCompra", ProcesoCompraSchema);
