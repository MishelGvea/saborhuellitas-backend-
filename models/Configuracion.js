// models/Configuracion.js
const mongoose = require("mongoose");

const configuracionSchema = new mongoose.Schema({
  vision: {
    type: String,
    default: ""
  },
  mision: {
    type: String,
    default: ""
  },
  compromiso: {
    type: String,
    default: ""
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Configuracion", configuracionSchema, "configuracion");