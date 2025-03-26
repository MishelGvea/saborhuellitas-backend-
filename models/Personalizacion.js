// models/Personalizacion.js
const mongoose = require("mongoose");

const personalizacionSchema = new mongoose.Schema({
  colorTema: {
    type: String,
    default: "#000000"
  },
  imagenLogin: {
    type: String,
    default: ""
  },
  mostrarLogo: {
    type: Boolean,
    default: true
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Personalizacion", personalizacionSchema, "personalizacion");