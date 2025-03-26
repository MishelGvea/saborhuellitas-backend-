// models/HistorialActividad.js
const mongoose = require("mongoose");

const historialActividadSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: true,
    enum: ['login', 'configuracion', 'dispositivo', 'usuario', 'otro']
  },
  accion: {
    type: String,
    required: true
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  email: String,
  descripcion: String,
  fecha: {
    type: Date,
    default: Date.now
  },
  ip: String,
  detalles: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model("HistorialActividad", historialActividadSchema, "historial_actividades");