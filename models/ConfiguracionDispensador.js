const mongoose = require("mongoose");

const configuracionSchema = new mongoose.Schema({
  cantidadDispensar: Number,
  horaDispensacion: String,
  nivelAlimento: Number,
  modoVacaciones: Boolean,
});

module.exports = mongoose.model("ConfiguracionDispensador", configuracionSchema, "configuracion_dispensador");