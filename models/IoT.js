// models/IoT.js
const mongoose = require("mongoose");

const IoTSchema = new mongoose.Schema({
  correo: {
    type: String,
    required: true,
    trim: true
  },
  mac: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  estado: {
    type: String,
    enum: ["Encendido", "Apagado"],
    default: "Apagado"
  },
  ultimo_reinicio: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Usar el nombre de colección "dispensador_iot" para mantener la coherencia con tu esquema
module.exports = mongoose.model("IoT", IoTSchema, "dispensador_iot");