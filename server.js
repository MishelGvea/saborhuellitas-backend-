const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Importar configuración
const config = require("./config");

// Importar el gestor MQTT
const MQTTManager = require("./utils/mqttManager");
const mqttManager = new MQTTManager(config);
const mqttClient = mqttManager.getClient();

// Configurar MQTT
const MQTT_TOPICS = {
  RAIZ: config.mqtt.topicRoot || "esp32",
  PESO: "dispensador",
  DISTANCIA: "distancia",
  LED: "led",
  SERVO: "servo",
  IP: "ip",
  MAC: "mac",
  COMANDO: "comando"
};

mqttClient.on('message', (topic, message) => {
  if (!topic.startsWith(`${MQTT_TOPICS.RAIZ}/`)) {
    console.log(`📩 Mensaje MQTT adicional: ${topic} => ${message.toString()}`);
  }
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware global
app.use(cors({
  origin: [
    process.env.FRONTEND_URL, 
    'http://localhost:5173',
    'https://saborhuellitas-frontend.vercel.app'
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static("public/uploads"));

// Hacer disponible el cliente MQTT para otros módulos
app.set('mqttClient', mqttClient);
app.set('mqttTopics', MQTT_TOPICS);
app.set('mqttManager', mqttManager);

// Importar y usar rutas
app.use("/api/proceso_compra", require("./routes/procesoCompra"));
app.use("/api/iot", require("./routes/iotRoutes"));
app.use("/api/admin/usuarios", require("./routes/adminUsuariosRoutes"));
app.use("/api", require("./routes/dashboardRoutes"));
app.use("/api/historial", require("./routes/historialRoutes"));
app.use("/api/dispositivos", require("./routes/dispositivosRoutes"));
app.use("/api/personalizacion", require("./routes/personalizacionRoutes"));
app.use('/uploads', express.static('public/uploads'));
app.use('/api/upload', require("./routes/uploadRoutes"));
app.use("/api/admin/crud/usuarios", require("./routes/adminCRUDUsuariosRoutes"));
app.use("/api/admin/crud/tienda", require("./routes/tiendaCRUDRoutes"));
app.use("/api/admin/pedidos", require("./routes/adminPedidosRoutes"));
app.use("/api/tienda", require("./routes/tienda"));
app.use("/api/slider", require("./routes/slider"));
app.use("/api/inicio", require("./routes/inicio"));
app.use("/api/productos", require("./routes/productos"));
app.use("/api/nosotros", require("./routes/nosotros"));
app.use("/api/preguntas", require("./routes/preguntas"));
app.use('/api/pedidos', require('./routes/pedidosRoutes'));
app.use("/api/auth", require("./routes/AuthRoutes"));
app.use("/api/mascotas", require("./routes/MascotaRoutes"));
app.use("/api/configuracion", require("./routes/ConfiguracionRoutes"));
app.use("/api/dispensador", require("./routes/dispensadorRoutes"));
app.use("/api/dispositivos-usuario", require("./routes/dispositivosUsuariosRoutes"));

// Ruta para verificar estado MQTT
app.get('/api/mqtt-status', (req, res) => {
  res.json({
    mqtt: {
      conectado: mqttClient.connected,
      dispositivosConectados: Array.from(mqttManager.macsDetectadas?.keys() || [])
    }
  });
});

// Conectar a MongoDB y arrancar servidor
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ Conectado a MongoDB");

    // Verificar conexión a Cloudinary
    const { testConnection } = require('./utils/cloudinaryUtils');
    testConnection().then(connected => {
      if (connected) {
        console.log('✅ Conexión a Cloudinary verificada');
      } else {
        console.error('❌ No se pudo conectar a Cloudinary');
      }
    });

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error de conexión a MongoDB:", err);
  });
