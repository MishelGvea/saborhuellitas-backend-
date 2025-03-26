const mongoose = require("mongoose");

const PreguntaSchema = new mongoose.Schema({
  pregunta: {
    type: String,
    required: true,
  },
  respuesta: {
    type: String,
    required: true,
  },
  icono: {
    type: String, // Ejemplo: "📦"
    required: false,
  },
});

module.exports = mongoose.model("Pregunta", PreguntaSchema);
