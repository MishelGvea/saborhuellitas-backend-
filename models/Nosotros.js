const mongoose = require("mongoose");

const NosotrosSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  antecedentes: {
    titulo: String,
    descripcion1: String,
    descripcion2: String,
    imagen: String
  },
  quienesSomos: {
    titulo: String,
    descripcion: String,
    imagen: String
  },
  mision: {
    titulo: String,
    descripcion: String
  },
  vision: {
    titulo: String,
    descripcion: String
  },
  valores: [
    {
      titulo: String,
      descripcion: String
    }
  ],
  footer: {
    politicas: {
      privacidad: {
        titulo: String,
        contenido: String
      },
      terminosCondiciones: {
        titulo: String,
        contenido: String
      }
    },
    redesSociales: {
      facebook: {
        url: String,
        nombrePagina: String
      },
      instagram: {
        url: String,
        nombrePagina: String
      },
      twitter: {
        url: String,
        nombrePagina: String
      }
    },
    soporte: {
      contacto: {
        telefono: String,
        email: String
      }
    },
    misionVision: {
      mision: {
        titulo: String,
        contenido: String
      },
      vision: {
        titulo: String,
        contenido: String
      },
      valores: [
        {
          titulo: String,
          contenido: String
        }
      ]
    }
  }
});

module.exports = mongoose.model("Nosotros", NosotrosSchema, "Nosotros");