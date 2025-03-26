// models/Dispositivo.js
const mongoose = require("mongoose");

const dispositivoSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  usuarioEmail: {
    type: String,
    required: true
  },
  nombre: {
    type: String,
    default: "Dispensador"
  },
  mac: {
    type: String,
    required: true,
    unique: true
  },
  estado: {
    type: String,
    enum: ["Encendido", "Apagado"],
    default: "Apagado"
  },
  fechaRegistro: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model("Dispositivo", dispositivoSchema, "dispositivos");