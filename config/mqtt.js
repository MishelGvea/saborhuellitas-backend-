const mqtt = require("mqtt");
const DispositivoUsuario = require("../models/DispositivoUsuario");

// Variables para seguimiento de estado
let lastMessageTime = null;
let connectionState = 'desconectado';
let messageCount = 0;
let connectionAttempts = 0;
let lastReceivedMAC = null; // Para almacenar la última MAC recibida
let lastErrorTime = null; // Para controlar frecuencia de logs de error

// Opciones de conexión actualizadas
const options = {
  clientId: `server_mqtt_${Math.random().toString(16).substr(2, 8)}`,
  keepalive: 60,
  reconnectPeriod: 5000,
  clean: true,
  username: 'Mayel',
  password: 'Password123?'
};

// Conexión al broker MQTT - usar WebSocket seguro para entornos como Render
const mqttClient = mqtt.connect("wss://88e521c6583143439eae9947c083c31e.s1.eu.hivemq.cloud:8884/mqtt", options);

// Tópicos a suscribirse
const TOPICS = [
  "sensores/peso",
  "sensores/distancia", 
  "sensores/led", 
  "sensores/servo",
  "sensores/ip",
  "sensores/mac",
  "sensores/potenciometro" // Añadido para tu código ESP32
];

mqttClient.on("connect", () => {
  console.log("✅ Conectado a MQTT desde el servidor");
  connectionState = 'conectado';
  connectionAttempts = 0;
  
  // Suscribirse a los tópicos relevantes
  TOPICS.forEach(topic => {
    mqttClient.subscribe(topic, (err) => {
      if (err) {
        console.error(`❌ Error al suscribirse a ${topic}:`, err);
      } else {
        console.log(`✅ Suscrito a ${topic}`);
      }
    });
  });
});

mqttClient.on("message", async (topic, message) => {
  try {
    const data = message.toString();
    console.log(`📩 Recibido MQTT -> ${topic}: ${data}`);
    
    // Actualizar estadísticas
    lastMessageTime = new Date();
    messageCount++;

    // Manejar mensajes de identificación del dispositivo
    if (topic === "sensores/mac") {
      const macAddress = data.trim();
      lastReceivedMAC = macAddress; // Guardar la MAC para usar con la IP
      console.log(`📌 Dispositivo identificado - MAC: ${macAddress}`);
      
      // Verificar si el dispositivo ya existe en MongoDB
      let dispositivo = await DispositivoUsuario.findOne({ mac: macAddress });
      if (!dispositivo) {
        // Si no existe, crearlo
        dispositivo = new DispositivoUsuario({
          mac: macAddress,
          ip: "Pendiente",
          peso: 0,
          distancia: 0,
          estado_led: "desconocido",
          estado_servo: "cerrado",
          potenciometro: 0,
          timestamp: new Date()
        });
        await dispositivo.save();
        console.log(`✅ Nuevo dispositivo registrado - MAC: ${macAddress}`);
      } else {
        console.log(`📋 Dispositivo existente - MAC: ${macAddress}`);
      }
      return;
    }

    // Manejar actualización de IP
    if (topic === "sensores/ip") {
      const ipAddress = data.trim();
      console.log(`📌 Recibida IP: ${ipAddress}`);
      
      // Si conocemos la MAC, actualizar el dispositivo correcto
      if (lastReceivedMAC) {
        await DispositivoUsuario.findOneAndUpdate(
          { mac: lastReceivedMAC },
          { $set: { ip: ipAddress, lastSeen: new Date() } }
        );
        console.log(`✅ Actualizada IP para MAC ${lastReceivedMAC}: ${ipAddress}`);
      } else {
        // Si no conocemos la MAC, buscar el dispositivo más reciente
        const dispositivo = await DispositivoUsuario.findOne().sort({ timestamp: -1 });
        if (dispositivo) {
          dispositivo.ip = ipAddress;
          dispositivo.lastSeen = new Date();
          await dispositivo.save();
          console.log(`✅ Actualizada IP del último dispositivo: ${ipAddress}`);
        } else {
          console.log("⚠️ Recibida IP pero no hay dispositivos registrados");
        }
      }
      return;
    }

    // Para los demás tópicos, buscar dispositivo para actualizar
    // Primero intentar por MAC (si conocemos la última)
    let dispositivo;
    if (lastReceivedMAC) {
      dispositivo = await DispositivoUsuario.findOne({ mac: lastReceivedMAC });
    }
    
    // Si no tenemos MAC o no se encontró, buscar el más reciente
    if (!dispositivo) {
      dispositivo = await DispositivoUsuario.findOne().sort({ timestamp: -1 });
    }
    
    if (!dispositivo) {
      console.log("⚠️ No hay dispositivos registrados para actualizar");
      return;
    }

    // Preparar la actualización según el tópico
    let updateData = { lastSeen: new Date() };

    if (topic === "sensores/peso") {
      updateData.peso = parseFloat(data);
    } else if (topic === "sensores/distancia") {
      updateData.distancia = parseFloat(data);
    } else if (topic === "sensores/led") {
      updateData.estado_led = data;
    } else if (topic === "sensores/servo") {
      updateData.estado_servo = data;
    } else if (topic === "sensores/potenciometro") {
      updateData.potenciometro = parseFloat(data);
    }

    // Actualizar el dispositivo
    await DispositivoUsuario.findByIdAndUpdate(
      dispositivo._id,
      { $set: updateData }
    );

    console.log(`💾 Actualizado en MongoDB: ${dispositivo.mac}, ${topic} → ${data}`);
  } catch (error) {
    console.error("❌ Error procesando mensaje MQTT:", error);
  }
});

// Manejar errores y reconexión con limitación de logs
mqttClient.on("error", (err) => {
  // Limitar logs de errores (máximo uno cada minuto)
  const now = new Date();
  if (!lastErrorTime || (now - lastErrorTime) > 60000) {
    console.error("❌ Error de conexión MQTT:", err);
    lastErrorTime = now;
  }
  connectionState = 'error';
});

mqttClient.on("offline", () => {
  console.warn("⚠️ Cliente MQTT desconectado");
  connectionState = 'desconectado';
});

mqttClient.on("reconnect", () => {
  connectionAttempts++;
  // Limitar logs de reconexión (solo cada 5 intentos)
  if (connectionAttempts % 5 === 0) {
    console.log(`🔄 Intentando reconectar a MQTT... (intento ${connectionAttempts})`);
  }
  connectionState = 'reconectando';
});

// Función para publicar mensajes (útil para controladores)
const publicarMensaje = (topic, message, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!mqttClient.connected) {
      console.warn("⚠️ Intentando publicar pero MQTT no está conectado");
      reject(new Error("MQTT no conectado"));
      return;
    }
    
    mqttClient.publish(topic, message.toString(), options, (err) => {
      if (err) {
        console.error(`❌ Error publicando en ${topic}:`, err);
        reject(err);
      } else {
        console.log(`📤 Publicado en ${topic}: ${message}`);
        resolve(true);
      }
    });
  });
};

// Función para obtener el estado actual del cliente MQTT
const getEstadoMQTT = () => {
  return {
    estado: connectionState,
    conectado: mqttClient.connected,
    ultimoMensaje: lastMessageTime,
    mensajesRecibidos: messageCount,
    intentosReconexion: connectionAttempts,
    topicos: TOPICS,
    ultimaMAC: lastReceivedMAC
  };
};

module.exports = {
  mqttClient,
  publicarMensaje,
  getEstadoMQTT
};