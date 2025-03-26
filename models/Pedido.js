// models/Pedido.js
const mongoose = require("mongoose");

const productoEnPedidoSchema = new mongoose.Schema({
  productoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tienda' 
  },
  nombre: String,
  precio: Number,
  cantidad: Number,
  imagenUrl: String
});

const pedidoSchema = new mongoose.Schema({
  numeroReferencia: {
    type: String,
    required: true,
    unique: true
  },
  productos: [productoEnPedidoSchema],
  datosCliente: {
    nombre: { type: String, required: true },
    email: { type: String, required: true },
    telefono: String,
    direccion: { type: String, required: true },
    metodoEnvio: { type: String, enum: ['normal', 'express'], default: 'normal' },
    metodoPago: { type: String, enum: ['contraentrega', 'transferencia'], default: 'contraentrega' }
  },
  total: Number,
  estado: {
    type: String,
    enum: ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'],
    default: 'pendiente'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Pedido", pedidoSchema);