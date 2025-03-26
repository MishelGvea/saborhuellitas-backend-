// mqtt-to-mongo.js (Versión corregida)
const mqtt = require('mqtt');
const mongoose = require('mongoose');
const moment = require('moment');
const config = require('../config');

// Variables para control de logs
let lastMqttErrorLog = null;

// Mostrar la configuración actual (sin credenciales)
console.log('🔧 Configuración:');
console.log(`- MongoDB: ${config.mongodb.uri.split('/').pop()}`); // Solo mostrar el nombre de la BD
console.log(`- MQTT Broker: ${config.mqtt.broker}`);
console.log(`- MQTT Topic Root: ${config.mqtt.topicRoot}`);

// Verificar si el módulo de modelos está disponible
let Dispensador, Dispensacion, Alerta, Mantenimiento;
try {
  const models = require('./models/Dispensador');
  Dispensador = models.Dispensador;
  Dispensacion = models.Dispensacion;
  Alerta = models.Alerta;
  Mantenimiento = models.Mantenimiento;
  console.log('✅ Modelos cargados correctamente');
} catch (error) {
  console.error('❌ Error cargando modelos:', error.message);
  process.exit(1);
}

// Configuración MQTT
const MQTT_BROKER = config.mqtt.broker;
const TOPIC_RAIZ = `${config.mqtt.topicRoot}/#`;

// Configuración MongoDB
const MONGO_URI = config.mongodb.uri;
const MONGO_OPTIONS = config.mongodb.options || { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4  // Forzar IPv4
};

// Variable para almacenar el estado de la dispensación activa
let dispensacionActiva = null;

// Función para actualizar un sensor en el dispensador - VERSIÓN MEJORADA
async function actualizarSensor(campo, valor) {
  if (mongoose.connection.readyState !== 1) {
    console.log('⚠️ MongoDB no conectado, no se puede actualizar sensor');
    return;
  }
  
  try {
    console.log(`🔄 Intentando actualizar sensor ${campo} a ${valor}...`);
    
    // Construir la actualización
    const actualizacion = {};
    actualizacion[`sensores.${campo}`] = valor;
    actualizacion.ultimaActualizacion = new Date();
    
    // Intentar actualizar usando replaceOne para evitar problemas de estructura
    const resultado = await Dispensador.updateOne(
      { _id: 'dispensador-principal' },
      { $set: actualizacion }
    );
    
    if (resultado.matchedCount > 0) {
      console.log(`✅ Sensor ${campo} actualizado a ${valor}`);
      
      // Verificar condiciones para alertas
      if (campo === 'peso') {
        // Obtener dispensador actualizado
        const dispensador = await Dispensador.findById('dispensador-principal');
        
        // Verificar nivel bajo
        if (dispensador && dispensador.configuracion && valor <= dispensador.configuracion.alertaNivelBajo) {
          await Alerta.create({
            dispensadorId: 'dispensador-principal',
            tipo: 'nivel_bajo',
            mensaje: `Nivel de alimento bajo: ${valor}g`,
            nivel: 'warning',
            accion: 'Rellenar dispensador'
          });
        }
      }
    } else {
      console.log(`⚠️ No se encontró el documento 'dispensador-principal', creando...`);
      
      // Crear estructura base
      const nuevoDispensador = {
        _id: 'dispensador-principal',
        nombre: 'Dispensador Huellitas',
        estado: {
          conectado: true,
          ultimaConexion: new Date()
        },
        sensores: {
          servo: 'cerrado',
          led: 'desconocido',
          peso: 0,
          distancia: 0
        },
        dispositivo: {
          ip: 'Desconocida',
          mac: 'Desconocida'
        },
        configuracion: {
          capacidadMaxima: 1000,
          cantidadDispensacion: 50,
          alertaNivelBajo: 200
        },
        ultimaActualizacion: new Date()
      };
      
      // Actualizar con el valor específico
      nuevoDispensador.sensores[campo] = valor;
      
      // Usar replaceOne con upsert
      await Dispensador.replaceOne(
        { _id: 'dispensador-principal' },
        nuevoDispensador,
        { upsert: true }
      );
      
      console.log(`✅ Creado nuevo dispensador con ${campo}=${valor}`);
    }
  } catch (error) {
    console.error(`❌ Error actualizando sensor ${campo}:`, error);
  }
}

// Función para actualizar un campo del dispositivo - VERSIÓN MEJORADA
async function actualizarDispositivo(campo, valor) {
  if (mongoose.connection.readyState !== 1) {
    console.log('⚠️ MongoDB no conectado, no se puede actualizar dispositivo');
    return;
  }
  
  try {
    console.log(`🔄 Intentando actualizar dispositivo ${campo} a ${valor}...`);
    
    // Construir actualización
    const actualizacion = {};
    actualizacion[`dispositivo.${campo}`] = valor;
    actualizacion.ultimaActualizacion = new Date();
    
    // Actualizar usando updateOne con upsert
    const resultado = await Dispensador.updateOne(
      { _id: 'dispensador-principal' },
      { $set: actualizacion },
      { upsert: false }
    );
    
    if (resultado.matchedCount > 0) {
      console.log(`✅ Dispositivo ${campo} actualizado a ${valor}`);
    } else {
      console.log(`⚠️ No se encontró el documento para actualizar dispositivo.${campo}`);
      
      // Intentar inicializar la estructura completa
      const dispensador = await Dispensador.findById('dispensador-principal');
      if (!dispensador) {
        console.log('🆕 Inicializando documento principal...');
        
        // Crear estructura base
        const nuevoDispensador = {
          _id: 'dispensador-principal',
          nombre: 'Dispensador Huellitas',
          estado: {
            conectado: true,
            ultimaConexion: new Date()
          },
          sensores: {
            servo: 'cerrado',
            led: 'desconocido',
            peso: 0,
            distancia: 0
          },
          dispositivo: {
            ip: 'Desconocida',
            mac: 'Desconocida'
          },
          configuracion: {
            capacidadMaxima: 1000,
            cantidadDispensacion: 50,
            alertaNivelBajo: 200
          },
          ultimaActualizacion: new Date()
        };
        
        // Actualizar con el valor específico
        nuevoDispensador.dispositivo[campo] = valor;
        
        // Usar replaceOne con upsert
        await Dispensador.replaceOne(
          { _id: 'dispensador-principal' },
          nuevoDispensador,
          { upsert: true }
        );
        
        console.log(`✅ Creado nuevo dispensador con dispositivo.${campo}=${valor}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error actualizando dispositivo ${campo}:`, error);
  }
}

// Conectar a MongoDB con reintentos
let dbConnection = null;
let retryCount = 0;
const MAX_RETRIES = 5;

function connectWithRetry() {
  console.log(`🔄 Intentando conectar a MongoDB (intento ${retryCount + 1}/${MAX_RETRIES})...`);
  
  mongoose.connect(MONGO_URI, MONGO_OPTIONS)
    .then(() => {
      console.log('✅ Conectado a MongoDB');
      dbConnection = mongoose.connection;
      retryCount = 0; // Reiniciar contador de reintentos
      
      // Inicializar el dispensador
      inicializarDispensador().catch(err => {
        console.error('❌ Error inicializando dispensador:', err);
      });
    })
    .catch(err => {
      console.error('❌ Error conectando a MongoDB:', err);
      
      retryCount++;
      if (retryCount < MAX_RETRIES) {
        // Reintento exponencial
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        console.log(`🕒 Reintentando en ${retryDelay / 1000} segundos...`);
        
        setTimeout(connectWithRetry, retryDelay);
      } else {
        console.error(`❌ Máximo número de reintentos (${MAX_RETRIES}) alcanzado. Saliendo...`);
        process.exit(1);
      }
    });
}

// Manejar errores de MongoDB
mongoose.connection.on('error', (err) => {
  console.error('❌ Error de conexión MongoDB:', err);
  if (err.name === 'MongoNetworkError') {
    console.log('🔄 Error de red detectado, intentando reconectar...');
    setTimeout(connectWithRetry, 5000);
  }
});

mongoose.connection.on('disconnected', () => {
  console.log('❌ MongoDB desconectado. Intentando reconectar...');
  setTimeout(connectWithRetry, 5000);
});

// Iniciar conexión
connectWithRetry();

// Inicializar el documento de dispensador si no existe
async function inicializarDispensador() {
  try {
    console.log('🔍 Verificando dispensador principal...');
    
    // Verificar si ya existe el dispensador
    const dispensadorExistente = await Dispensador.findById('dispensador-principal');
    
    if (!dispensadorExistente) {
      console.log('🆕 Creando dispensador principal...');
      
      // Crear el dispensador principal
      const nuevoDispensador = new Dispensador({
        _id: 'dispensador-principal',
        nombre: 'Dispensador Huellitas',
        estado: {
          conectado: false,
          ultimaConexion: new Date()
        },
        sensores: {
          servo: 'cerrado',
          led: 'desconocido',
          peso: 0,
          distancia: 0
        },
        dispositivo: {
          ip: 'Desconocida',
          mac: 'Desconocida'
        },
        configuracion: {
          capacidadMaxima: 1000,
          cantidadDispensacion: 50,
          alertaNivelBajo: 200
        }
      });
      
      await nuevoDispensador.save();
      console.log('✅ Dispensador principal creado');
      
      // Crear alerta de inicialización
      await Alerta.create({
        dispensadorId: 'dispensador-principal',
        tipo: 'conexion',
        mensaje: 'Sistema de dispensador inicializado',
        nivel: 'info'
      });
    } else {
      console.log('✅ Dispensador principal encontrado');
    }
  } catch (error) {
    console.error('❌ Error inicializando dispensador:', error);
    throw error; // Propagar el error
  }
}

// Función para procesar mensajes MQTT
async function procesarMensajeMQTT(topic, message) {
  const valor = message.toString();
  console.log(`📥 Mensaje procesado [${topic}]: ${valor}`);
  
  // Verificar conexión a MongoDB
  if (mongoose.connection.readyState !== 1) {
    console.log('⚠️ MongoDB no conectado, no se puede procesar mensaje');
    return;
  }
  
  // Extraer el subtopic del topic completo
  const partesTopic = topic.split('/');
  if (partesTopic.length < 2) {
    console.log(`⚠️ Formato de topic incorrecto: ${topic}`);
    return;
  }
  
  const topicRoot = config.mqtt.topicRoot || 'esp32';
  if (partesTopic[0] !== topicRoot) {
    console.log(`⚠️ Topic root incorrecto: ${partesTopic[0]}, esperado: ${topicRoot}`);
    return;
  }
  
  const subtopic = partesTopic[1];
  console.log(`🔍 Procesando subtopic: ${subtopic} con valor: ${valor}`);
  
  try {
    // Manejar diferentes tipos de datos según el subtopic
    switch (subtopic) {
      case 'dispensador': // Peso
      case 'peso':        // Soporte para ambos formatos
        // Actualizar el sensor de peso
        const peso = parseInt(valor);
        await actualizarSensor('peso', peso);
        
        // Si hay una dispensación activa, comprobar si ha terminado
        if (dispensacionActiva) {
          if (dispensacionActiva.pesoInicial + 30 <= peso) { // Consideramos completado si aumentó al menos 30g
            // Calcular datos de la dispensación
            const duracion = moment().diff(dispensacionActiva.fechaInicio, 'seconds');
            const pesoFinal = peso;
            const aumentoPeso = pesoFinal - dispensacionActiva.pesoInicial;
            
            // Actualizar la dispensación en la base de datos
            await Dispensacion.findByIdAndUpdate(
              dispensacionActiva._id,
              {
                estado: 'completada',
                pesoFinal,
                cantidadDispensada: aumentoPeso,
                finalizada: new Date(),
                duracion
              }
            );
            
            // Registrar alerta de dispensación completada
            await Alerta.create({
              dispensadorId: 'dispensador-principal',
              tipo: 'info',
              mensaje: `Dispensación completada: +${aumentoPeso}g en ${duracion}s`,
              nivel: 'info'
            });
            
            console.log(`✅ Dispensación finalizada: +${aumentoPeso}g en ${duracion}s`);
            
            // Resetear la dispensación activa
            dispensacionActiva = null;
          }
        }
        break;
        
      case 'distancia':
        await actualizarSensor('distancia', parseFloat(valor));
        break;
        
      case 'led':
        await actualizarSensor('led', valor);
        break;
        
      case 'servo':
        await actualizarSensor('servo', valor);
        
        // Si el servo se abre, es una dispensación iniciando
        if (valor === 'abierto' && !dispensacionActiva) {
          // Obtener el dispensador actual
          const dispensador = await Dispensador.findById('dispensador-principal');
          
          if (dispensador) {
            const pesoInicial = dispensador.sensores.peso;
            
            // Crear nueva dispensación
            const nuevaDispensacion = await Dispensacion.create({
              dispensadorId: 'dispensador-principal',
              tipo: 'manual', // Asumimos manual por defecto
              estado: 'iniciada',
              pesoInicial,
              cantidadObjetivo: dispensador.configuracion ? dispensador.configuracion.cantidadDispensacion : 50,
              iniciada: new Date()
            });
            
            // Guardar referencia a la dispensación activa
            dispensacionActiva = {
              _id: nuevaDispensacion._id,
              pesoInicial,
              fechaInicio: moment()
            };
            
            console.log(`🥣 Dispensación iniciada. Peso inicial: ${pesoInicial}g`);
          }
        }
        break;
        
      case 'comando':
        // Si es un comando JSON, parsearlo
        let comandoDatos = valor;
        try {
          if (valor.startsWith('{') && valor.endsWith('}')) {
            comandoDatos = JSON.parse(valor);
          }
        } catch (e) {
          // Si falla el parsing, usamos el valor original
          comandoDatos = valor;
        }
        
        // Registrar el comando recibido como alerta
        await Alerta.create({
          dispensadorId: 'dispensador-principal',
          tipo: 'comando',
          mensaje: `Comando recibido: ${typeof comandoDatos === 'object' ? comandoDatos.comando : comandoDatos}`,
          nivel: 'info',
          detalles: comandoDatos
        });
        
        // Si es comando de dispensar y tenemos un objeto
        if (typeof comandoDatos === 'object' && comandoDatos.comando === 'dispensar') {
          // Marcar la dispensación como remota si no hay una activa aún
          if (!dispensacionActiva) {
            // Obtener el dispensador actual
            const dispensador = await Dispensador.findById('dispensador-principal');
            
            if (dispensador) {
              // Si hay usuario, registrarlo
              let solicitadaPor = {};
              if (comandoDatos.usuario) {
                solicitadaPor = {
                  id: comandoDatos.usuario.id,
                  nombre: comandoDatos.usuario.nombre || 'Usuario web'
                };
              }
              
              // Crear nueva dispensación antes de que se abra el servo
              const nuevaDispensacion = await Dispensacion.create({
                dispensadorId: 'dispensador-principal',
                tipo: 'remota',
                estado: 'iniciada',
                pesoInicial: dispensador.sensores.peso,
                cantidadObjetivo: comandoDatos.cantidad || (dispensador.configuracion ? dispensador.configuracion.cantidadDispensacion : 50),
                iniciada: new Date(),
                solicitadaPor
              });
              
              console.log(`🌐 Dispensación remota registrada: ${nuevaDispensacion._id}`);
            }
          }
        }
        break;
        
      case 'ip':
        await actualizarDispositivo('ip', valor);
        break;
        
      case 'mac':
        await actualizarDispositivo('mac', valor);
        break;
        
      case 'bateria':
        await actualizarDispositivo('bateria', parseInt(valor));
        
        // Verificar nivel bajo de batería
        if (parseInt(valor) < 20) {
          await Alerta.create({
            dispensadorId: 'dispensador-principal',
            tipo: 'bateria_baja',
            mensaje: `Batería baja: ${valor}%`,
            nivel: 'warning',
            accion: 'Recargar o reemplazar batería'
          });
        }
        break;
        
      case 'temperatura':
        await actualizarDispositivo('temperatura', parseFloat(valor));
        
        // Verificar temperatura alta
        if (parseFloat(valor) > 60) {
          await Alerta.create({
            dispensadorId: 'dispensador-principal',
            tipo: 'error_dispositivo',
            mensaje: `Temperatura alta: ${valor}°C`,
            nivel: 'warning',
            accion: 'Verificar ventilación del dispositivo'
          });
        }
        break;
        
      default:
        console.log(`⚠️ Subtopic no reconocido: ${subtopic}`);
        break;
    }
  } catch (error) {
    console.error(`❌ Error procesando mensaje [${topic}]:`, error);
    
    // Registrar error como alerta solo si MongoDB está conectado
    try {
      if (mongoose.connection.readyState === 1) {
        await Alerta.create({
          dispensadorId: 'dispensador-principal',
          tipo: 'error_sistema',
          mensaje: `Error procesando mensaje MQTT: ${error.message}`,
          nivel: 'error',
          detalles: { topic, mensaje: valor, error: error.message }
        });
      }
    } catch (alertaError) {
      console.error('Error guardando alerta:', alertaError);
    }
  }
}

// Conectar al broker MQTT con reintentos y credenciales actualizadas
let mqttClient = null;
let mqttRetryCount = 0;
const MQTT_MAX_RETRIES = 5;

function connectMQTTWithRetry() {
  console.log(`🔄 Intentando conectar a MQTT (intento ${mqttRetryCount + 1}/${MQTT_MAX_RETRIES})...`);
  
  // Opciones MQTT actualizadas con credenciales
  const mqttOptions = {
    clientId: `mqtt-to-mongo-${Math.random().toString(16).substring(2, 8)}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
    username: 'Mayel',
    password: 'Password123?',
    rejectUnauthorized: false,
  };
  
  // Crear cliente MQTT con WebSocket seguro
  mqttClient = mqtt.connect("wss://88e521c6583143439eae9947c083c31e.s1.eu.hivemq.cloud:8884/mqtt", mqttOptions);
  
  // Eventos MQTT
  mqttClient.on('connect', async () => {
    console.log('✅ Conectado al broker MQTT');
    mqttRetryCount = 0; // Reiniciar contador de reintentos
    
    // Verificar que MongoDB esté conectado antes de continuar
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ Esperando conexión a MongoDB...');
      
      // Reintentar cuando MongoDB esté conectado
      const checkMongoInterval = setInterval(() => {
        if (mongoose.connection.readyState === 1) {
          clearInterval(checkMongoInterval);
          setupMQTTSubscription();
        }
      }, 1000);
      
      return;
    }
    
    setupMQTTSubscription();
  });
  
  function setupMQTTSubscription() {
    try {
      // Actualizar estado de conexión
      Dispensador.findByIdAndUpdate('dispensador-principal', {
        'estado.conectado': true,
        'estado.ultimaConexion': new Date()
      }).then(() => {
        console.log('✅ Estado de conexión actualizado');
      }).catch(err => {
        console.error('❌ Error actualizando estado de conexión:', err);
      });
      
      // Suscribirse al topic raíz
      mqttClient.subscribe(TOPIC_RAIZ, (err) => {
        if (err) {
          console.error('❌ Error al suscribirse a MQTT:', err);
        } else {
          console.log(`✅ Suscrito a ${TOPIC_RAIZ}`);
          
          // Registrar inicio del servicio
          Alerta.create({
            dispensadorId: 'dispensador-principal',
            tipo: 'conexion',
            mensaje: 'Servicio MQTT-MongoDB iniciado',
            nivel: 'info'
          });
          
          // IMPORTANTE: Solo configurar el procesamiento de mensajes después de suscribirse
          console.log('🎯 Configurando handler de mensajes MQTT...');
          mqttClient.on('message', procesarMensajeMQTT);
        }
      });
    } catch (error) {
      console.error('❌ Error inicializando MQTT:', error);
    }
  }
  
  // Manejar errores con limitación de logs
  mqttClient.on('error', (err) => {
    // Limitar logs de errores (máximo uno cada 5 minutos)
    const now = new Date();
    if (!lastMqttErrorLog || (now - lastMqttErrorLog) > 300000) {
      console.error('❌ Error MQTT:', err);
      lastMqttErrorLog = now;
    }
  });
  
  mqttClient.on('close', () => {
    console.log('📴 Conexión MQTT cerrada');
  });
  
  mqttClient.on('offline', () => {
    console.log('📴 MQTT offline');
    
    // Actualizar estado en MongoDB solo si está conectado
    if (mongoose.connection.readyState === 1) {
      Dispensador.findByIdAndUpdate('dispensador-principal', {
        'estado.conectado': false
      }).catch(err => console.error('Error actualizando estado:', err));
    }
  });
  
  mqttClient.on('reconnect', () => {
    // Limitar logs de reconexión
    if (mqttRetryCount % 10 === 0) {
      console.log('🔄 Intentando reconectar a MQTT...');
    }
  });
  
  // Manejar errores de conexión
  mqttClient.on('end', () => {
    console.log('📴 Conexión MQTT terminada');
    
    mqttRetryCount++;
    if (mqttRetryCount < MQTT_MAX_RETRIES) {
      const retryDelay = Math.min(1000 * Math.pow(2, mqttRetryCount), 30000);
      console.log(`🕒 Reintentando MQTT en ${retryDelay / 1000} segundos...`);
      
      setTimeout(connectMQTTWithRetry, retryDelay);
    } else {
      console.error(`❌ Máximo número de reintentos MQTT (${MQTT_MAX_RETRIES}) alcanzado.`);
    }
  });
}

// Iniciar conexión MQTT
connectMQTTWithRetry();

console.log('🚀 Servicio MQTT-MongoDB iniciado');

// Manejar cierre de la aplicación
process.on('SIGINT', async () => {
  console.log('⏹️ Deteniendo servicio...');
  
  try {
    // Actualizar estado de conexión solo si MongoDB está conectado
    if (mongoose.connection.readyState === 1) {
      await Dispensador.findByIdAndUpdate('dispensador-principal', {
        'estado.conectado': false
      });
      
      // Registrar cierre del servicio
      await Alerta.create({
        dispensadorId: 'dispensador-principal',
        tipo: 'desconexion',
        mensaje: 'Servicio MQTT-MongoDB detenido ordenadamente',
        nivel: 'info'
      });
    }
  } catch (error) {
    console.error('Error durante el cierre:', error);
  } finally {
    // Cerrar conexiones
    if (mqttClient) {
      mqttClient.end();
    }
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    process.exit(0);
  }
});

// Exportar para uso en server.js si es necesario
module.exports = {
  mqttClient,
  mongoose
};