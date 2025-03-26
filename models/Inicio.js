const mongoose = require("mongoose");

const InicioSchema = new mongoose.Schema(
  {
    bannerPrincipal: {
      titulo: String,
      descripcion: String,
      botonTexto: String
    },
    bienvenidaSeccion: {
      titulo: String,
      descripcion: String
    },
    secciones: [
      {
        id: Number,
        titulo: String,
        descripcion: String,
        detalle: String,
        imagen: String
      }
    ]
  },
  { collection: "inicio" } // 👈 Asegura que coincida con el nombre de la colección en la BD
);

module.exports = mongoose.model("Inicio", InicioSchema);