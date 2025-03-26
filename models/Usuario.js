const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema({
  nombre: String,
  apellidoPaterno: String,
  apellidoMaterno: String,
  email: String,
  password: String,
  direccion: String,
  fechaRegistro: { type: Date, default: Date.now },
  resetCode: String,
  resetCodeExpires: Date,
});

module.exports = mongoose.model("Usuario", usuarioSchema, "usuarios");