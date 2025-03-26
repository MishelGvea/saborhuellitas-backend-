// config.js
require("dotenv").config(); // Asegúrate de que esto está al principio

module.exports = {
  // Configuración de MongoDB
  mongodb: {
    // Usar la variable de entorno MONGO_URI directamente
    uri: process.env.MONGO_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 segundos
      // Las opciones retryWrites y w ya vienen en tu cadena de conexión
    }
  },
  
  // Configuración de MQTT
  mqtt: {
    broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
    clientId: 'huellitas-mongodb-bridge',
    topicRoot: 'esp32',
    qos: 0
  },
  
  // Configuración de la aplicación
  app: {
    logLevel: process.env.LOG_LEVEL || 'info', // 'debug', 'info', 'warn', 'error'
    retentionDays: 30,  // Días que se conservarán los datos
    port: process.env.PORT || 5000
  },

  // Configuración de email (si se necesita para notificaciones del dispensador)
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    service: 'gmail'
  },

  // Configuración de Cloudinary (si se necesita para el dispensador)
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  }
};