const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellidoPaterno: { type: String, required: true },
  apellidoMaterno: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  direccion: { type: String, required: true },
  imagenUrl: { type: String, default: "" }, // URL de la imagen de perfil
  imagenPublicId: { type: String }, // ID público de Cloudinary
  fechaRegistro: { type: Date, default: Date.now },
  resetCode: { type: String, default: "" },
  resetCodeExpires: { type: Date, default: null },
  role: { type: String, default: "user" }
}, { collection: "usuarios" });

module.exports = mongoose.model("User", userSchema);