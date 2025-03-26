// models/AdminUsuario.js
const mongoose = require("mongoose");

const AdminUsuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  apellidoPaterno: {
    type: String,
    required: true,
    trim: true
  },
  apellidoMaterno: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  direccion: {
    type: String,
    trim: true
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  activo: {
    type: Boolean,
    default: true
  },
  dispositivos: [{
    nombre: {
      type: String,
      trim: true
    },
    mac: {
      type: String,
      trim: true
    },
    modelo: {
      type: String,
      trim: true
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
  }],
  ultimaConexion: {
    type: Date
  },
  resetCode: String,
  resetCodeExpires: String,
  historialAcciones: [{
    accion: String,
    fecha: {
      type: Date,
      default: Date.now
    },
    descripcion: String
  }]
}, { timestamps: true });

module.exports = mongoose.model("AdminUsuario", AdminUsuarioSchema, "usuarios");