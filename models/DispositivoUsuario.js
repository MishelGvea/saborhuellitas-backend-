// models/DispositivoUsuario.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Esquema para asociar dispositivos (dispensadores) a usuarios
 * Esto permite que cada dispensador pertenezca a un único usuario
 */
const dispositivoUsuarioSchema = new Schema({
  // Identificador único del dispositivo (MAC address)
  macAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Validar formato MAC (xx:xx:xx:xx:xx:xx o xx-xx-xx-xx-xx-xx)
        return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(v);
      },
      message: props => `${props.value} no es una dirección MAC válida!`
    }
  },
  
  // Referencia al usuario dueño del dispositivo
  usuarioId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Nombre personalizado que el usuario da al dispensador
  nombre: {
    type: String,
    required: true,
    trim: true,
    default: 'Mi Dispensador'
  },
  
  // Datos de la mascota asociada al dispensador
  mascota: {
    nombre: String,
    tipo: String, // perro, gato, etc.
    raza: String,
    peso: Number, // en kg
    edad: Number, // en meses
    imagen: String // URL de la imagen
  },
  
  // Estado de registro y activación
  estado: {
    activo: {
      type: Boolean,
      default: true
    },
    registrado: {
      type: Date,
      default: Date.now
    },
    ultimaConexion: {
      type: Date,
      default: null
    }
  },
  
  // Configuración personalizada del dispensador
  configuracion: {
    cantidadDispensacion: {
      type: Number,
      default: 50, // en gramos
      min: 10,
      max: 500
    },
    horariosAutomaticos: [{
      hora: Number,
      minuto: Number,
      activo: {
        type: Boolean,
        default: true
      },
      dias: [Number] // 0-6 (domingo a sábado)
    }]
  },
  
  // Referencia al dispensador en la colección de dispensadores
  dispensadorId: {
    type: String,
    default: null
  },
  
  // Campo para identificar el dispositivo en la aplicación
  token: {
    type: String,
    default: function() {
      // Generar token aleatorio para autenticación simple del dispositivo
      return Math.random().toString(36).substring(2, 15) + 
             Math.random().toString(36).substring(2, 15);
    }
  },
  
  // Notas o descripción del usuario
  notas: String
}, 
{ 
  collection: 'dispositivos_usuarios',
  timestamps: true
});

// Crear índices para búsquedas eficientes
//dispositivoUsuarioSchema.index({ macAddress: 1 });
dispositivoUsuarioSchema.index({ usuarioId: 1 });

// Método estático para buscar dispositivos de un usuario
dispositivoUsuarioSchema.statics.findByUsuario = function(usuarioId) {
  return this.find({ usuarioId });
};

// Método estático para buscar dispositivo por MAC
dispositivoUsuarioSchema.statics.findByMac = function(macAddress) {
  return this.findOne({ macAddress: macAddress.toUpperCase() });
};

// Método para verificar si un dispositivo ya está registrado
dispositivoUsuarioSchema.statics.estaRegistrado = async function(macAddress) {
  const count = await this.countDocuments({ macAddress: macAddress.toUpperCase() });
  return count > 0;
};

// Método para comprobar si una MAC pertenece a un usuario específico
dispositivoUsuarioSchema.statics.perteneceAUsuario = async function(macAddress, usuarioId) {
  const dispositivo = await this.findOne({ 
    macAddress: macAddress.toUpperCase(),
    usuarioId
  });
  return !!dispositivo;
};

// Crear el modelo
const DispositivoUsuario = mongoose.model('DispositivoUsuario', dispositivoUsuarioSchema);

module.exports = DispositivoUsuario;