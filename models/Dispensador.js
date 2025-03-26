// models/Dispensador.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para almacenar el estado actual del dispensador
const dispensadorSchema = new Schema({
  _id: { type: String, required: true }, // ID personalizado basado en la MAC o un ID específico
  nombre: { type: String, default: 'Dispensador Huellitas' },
  estado: {
    conectado: { type: Boolean, default: false },
    ultimaConexion: { type: Date, default: Date.now }
  },
  sensores: {
    servo: { type: String, enum: ['abierto', 'cerrado'], default: 'cerrado' },
    led: { type: String, enum: ['verde', 'amarillo', 'rojo', 'desconocido'], default: 'desconocido' },
    peso: { type: Number, default: 0 },
    distancia: { type: Number, default: 0 }
  },
  dispositivo: {
    ip: { type: String, default: 'Desconocida' },
    mac: { type: String, default: 'Desconocida' },
    firmware: { type: String },
    bateria: { type: Number }, // Porcentaje de batería si es relevante
    temperatura: { type: Number } // Temperatura del dispositivo si tiene sensor
  },
  configuracion: {
    capacidadMaxima: { type: Number, default: 1000 }, // en gramos
    cantidadDispensacion: { type: Number, default: 50 }, // en gramos
    horariosAutomaticos: [{ 
      hora: { type: Number },
      minuto: { type: Number },
      activo: { type: Boolean, default: true },
      dias: [{ type: Number }] // 0-6 (domingo a sábado)
    }],
    alertaNivelBajo: { type: Number, default: 200 } // en gramos
  },
  mascota: {
    id: { type: Schema.Types.ObjectId, ref: 'Mascota' },
    nombre: { type: String },
    peso: { type: Number }, // en kg
    edad: { type: Number }, // en meses
    racionDiaria: { type: Number } // en gramos
  },
  propietario: {
    id: { type: Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String },
    email: { type: String }
  },
  ultimaActualizacion: { type: Date, default: Date.now }
}, { collection: 'dispensador_estado' });

// Esquema para dispensaciones (historial)
const dispensacionSchema = new Schema({
  dispensadorId: { type: String, required: true },
  tipo: { 
    type: String, 
    enum: ['manual', 'automatica', 'remota'], 
    default: 'manual' 
  },
  estado: {
    type: String,
    enum: ['iniciada', 'completada', 'fallida', 'cancelada'],
    default: 'iniciada'
  },
  pesoInicial: { type: Number }, // en gramos
  pesoFinal: { type: Number }, // en gramos
  cantidadObjetivo: { type: Number }, // en gramos
  cantidadDispensada: { type: Number }, // en gramos
  iniciada: { type: Date, default: Date.now },
  finalizada: { type: Date },
  duracion: { type: Number }, // en segundos
  solicitadaPor: {
    id: { type: Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String }
  },
  detalles: { type: Schema.Types.Mixed } // Para información adicional
}, { collection: 'dispensador_historial' });

// Esquema para alertas y notificaciones
const alertaSchema = new Schema({
  dispensadorId: { type: String, required: true },
  tipo: { 
    type: String, 
    enum: ['nivel_bajo', 'error_dispensacion', 'bateria_baja', 'desconexion', 'conexion', 'comando', 'error_sistema', 'error_dispositivo', 'actualizacion', 'info'],
    required: true 
  },
  mensaje: { type: String, required: true },
  nivel: { 
    type: String, 
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info' 
  },
  fecha: { type: Date, default: Date.now },
  leida: { type: Boolean, default: false },
  accion: { type: String }, // Acción recomendada o ejecutada
  detalles: { type: Schema.Types.Mixed }
}, { collection: 'dispensador_alertas' });

// Esquema para mantenimiento y calibración
const mantenimientoSchema = new Schema({
  dispensadorId: { type: String, required: true },
  tipo: { 
    type: String, 
    enum: ['calibracion', 'limpieza', 'reemplazo_bateria', 'actualizacion_firmware', 'otro'],
    required: true 
  },
  fecha: { type: Date, default: Date.now },
  realizado: { type: Boolean, default: true },
  realizadoPor: {
    id: { type: Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String }
  },
  descripcion: { type: String },
  detalles: { type: Schema.Types.Mixed },
  proximoMantenimiento: { type: Date } // Fecha recomendada del próximo mantenimiento
}, { collection: 'dispensador_mantenimiento' });

// Crear modelos
const Dispensador = mongoose.model('Dispensador', dispensadorSchema);
const Dispensacion = mongoose.model('Dispensacion', dispensacionSchema);
const Alerta = mongoose.model('Alerta', alertaSchema);
const Mantenimiento = mongoose.model('Mantenimiento', mantenimientoSchema);

// Exportar modelos
module.exports = {
  Dispensador,
  Dispensacion,
  Alerta,
  Mantenimiento
};