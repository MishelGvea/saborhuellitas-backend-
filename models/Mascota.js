const mongoose = require("mongoose");

const mascotaSchema = new mongoose.Schema({
  nombre: String,
  edad: Number,
  raza: String,
  peso: Number,
});

module.exports = mongoose.model("Mascota", mascotaSchema, "mascotas");