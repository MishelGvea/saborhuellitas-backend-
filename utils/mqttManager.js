// utils/mqttManager.js
const mqtt = require('mqtt');
const { Dispensador } = require('../models/Dispensador');
const DispositivoUsuario = require('../models/DispositivoUsuario');

class MQTTManager {
  constructor(config) {
    this.config = config;
    this.mqttClient = null;
    this.topics = {
      RAIZ: config.mqtt.topicRoot || 'esp32',
      PESO: 'dispensador',
      DISTANCIA: 'distancia',
      LED: 'led',
      SERVO: 'servo',
      IP: 'ip',
      MAC: 'mac',
      COMANDO: 'comando'
    };
    
    this.macsDetectadas = new Map();
    this.ultimaMAC = null;
    
    // Inicializar conexión
    this.connect();
  }
  
  connect() {
    // Opciones de conexión optimizadas para Render
    const mqttOptions = {
      clientId: `huellitas-server-${Math.random().toString(16).substring(2, 8)}`,
      clean: true,
      connectTimeout: 30000,
      reconnectPeriod: 5000,
      username: 'Mayel',           // Usuario creado en HiveMQ
      password: 'Password123?',    // Contraseña configurada
      rejectUnauthorized: false,   // Importante para evitar problemas SSL
      protocolVersion: 4,          // MQTT v3.1.1
      keepalive: 60
    };
    
    // URL con WebSocket seguro (mejor para entornos cloud como Render)
    const brokerUrl = "wss://88e521c6583143439eae9947c083c31e.s1.eu.hivemq.cloud:8884/mqtt";
    
    console.log(`Conectando a MQTT broker: ${brokerUrl}`);
    try {
      this.mqttClient = mqtt.connect(brokerUrl, mqttOptions);
    } catch (err) {
      console.error("❌ Error crítico al conectar con MQTT:", err);
    }
    
    // Configurar eventos
    this.mqttClient.on('connect', () => {
      console.log('✅ MQTTManager: Conectado al broker MQTT');
      
      // Suscribirse a todos los topics del dispositivo
      const topicRaiz = `${this.topics.RAIZ}/#`;
      this.mqttClient.subscribe(topicRaiz, (err) => {
        if (err) {
          console.error('❌ Error al suscribirse a los topics:', err);
        } else {
          console.log(`✅ Suscrito a ${topicRaiz}`);
        }
      });
    });
    
    this.mqttClient.on('message', this.handleMessage.bind(this));
    
    this.mqttClient.on('error', (err) => {
      console.error('❌ Error MQTT:', err);
    });
    
    this.mqttClient.on('close', () => {
      console.log('📴 Conexión MQTT cerrada');
    });
    
    this.mqttClient.on('reconnect', () => {
      console.log('🔄 Intentando reconectar a MQTT...');
    });
    
    this.mqttClient.on('offline', () => {
      console.log('📴 Cliente MQTT fuera de línea');
    });
  }
  
  /**
   * Manejar mensaje MQTT recibido
   */
  async handleMessage(topic, message) {
    try {
      const valor = message.toString();
      console.log(`📥 Mensaje MQTT recibido [${topic}]: ${valor}`);
      
      // Extraer partes del topic
      const partesTopic = topic.split('/');
      if (partesTopic.length < 2) return;
      
      const topicRaiz = partesTopic[0];
      const subtopic = partesTopic[1];
      
      // Verificar que el topic raíz coincida con lo configurado
      if (topicRaiz !== this.topics.RAIZ) return;
      
      // Procesar MAC cuando se recibe
      if (subtopic === this.topics.MAC) {
        await this.procesarMAC(valor);
      }
      
      // Procesar IP cuando se recibe
      if (subtopic === this.topics.IP) {
        await this.procesarIP(valor, this.ultimaMAC);
      }
      
      // Procesar cambios en sensores y actualizar en la BD
      if (subtopic === this.topics.PESO || subtopic === 'peso') {
        await this.actualizarSensor('peso', parseInt(valor), this.ultimaMAC);
      }
      
      if (subtopic === this.topics.DISTANCIA) {
        await this.actualizarSensor('distancia', parseFloat(valor), this.ultimaMAC);
      }
      
      if (subtopic === this.topics.LED) {
        await this.actualizarSensor('led', valor, this.ultimaMAC);
      }
      
      if (subtopic === this.topics.SERVO) {
        await this.actualizarSensor('servo', valor, this.ultimaMAC);
      }
      
      // Procesar comandos si es necesario
      if (subtopic === this.topics.COMANDO) {
        await this.procesarComando(valor);
      }
    } catch (error) {
      console.error('❌ Error al procesar mensaje MQTT:', error);
    }
  }
  
  /**
   * Procesar dirección MAC recibida
   */
  async procesarMAC(mac) {
    try {
      // Normalizar MAC a mayúsculas
      const macNormalizada = mac.toUpperCase();
      this.ultimaMAC = macNormalizada;
      
      console.log(`🔍 Procesando dispositivo con MAC: ${macNormalizada}`);
      
      // Buscar si ya tenemos un dispensador para esta MAC
      let dispensador = await Dispensador.findOne({ 'dispositivo.mac': macNormalizada });
      
      if (!dispensador) {
        console.log(`🆕 Nuevo dispositivo detectado: ${macNormalizada}`);
        
        // Crear dispensador con ID basado en la MAC
        const dispensadorId = `dispensador-${macNormalizada.replace(/:/g, '')}`;
        
        dispensador = new Dispensador({
          _id: dispensadorId,
          nombre: `Dispensador ${macNormalizada.substring(9)}`,
          dispositivo: {
            mac: macNormalizada,
            ip: 'Desconocida'
          },
          estado: {
            conectado: true,
            ultimaConexion: new Date()
          }
        });
        
        await dispensador.save();
        console.log(`✅ Nuevo dispensador creado: ${dispensadorId}`);
      } else {
        // Actualizar estado de conexión
        dispensador.estado.conectado = true;
        dispensador.estado.ultimaConexion = new Date();
        await dispensador.save();
        console.log(`✅ Dispensador actualizado: ${dispensador._id}`);
      }
      
      // Almacenar la MAC en el mapa para usarla con futuros mensajes
      this.macsDetectadas.set(macNormalizada, dispensador._id);
      
      // Verificar si este dispositivo está asociado a un usuario
      const dispositivoUsuario = await DispositivoUsuario.findByMac(macNormalizada);
      
      if (dispositivoUsuario) {
        console.log(`👤 Dispositivo asociado al usuario ${dispositivoUsuario.usuarioId}`);
        
        // Actualizar datos del propietario en el dispensador si no están actualizados
        if (!dispensador.propietario || dispensador.propietario.id.toString() !== dispositivoUsuario.usuarioId.toString()) {
          dispensador.propietario = {
            id: dispositivoUsuario.usuarioId
          };
          await dispensador.save();
        }
        
        // Actualizar la última conexión en el registro de dispositivo
        dispositivoUsuario.estado.ultimaConexion = new Date();
        dispositivoUsuario.estado.activo = true;
        await dispositivoUsuario.save();
      } else {
        console.log(`ℹ️ Dispositivo ${macNormalizada} no está asociado a ningún usuario`);
      }
      
      return dispensador;
    } catch (error) {
      console.error(`❌ Error al procesar MAC ${mac}:`, error);
      throw error;
    }
  }
  
  /**
   * Procesar dirección IP recibida
   */
  async procesarIP(ip, mac) {
    if (!mac) return;
    
    try {
      // Buscar dispensador por MAC
      const dispensadorId = this.macsDetectadas.get(mac);
      
      if (dispensadorId) {
        // Actualizar IP en el dispensador
        await Dispensador.findByIdAndUpdate(dispensadorId, {
          'dispositivo.ip': ip,
          ultimaActualizacion: new Date()
        });
        
        console.log(`✅ IP actualizada para dispositivo ${mac}: ${ip}`);
      }
    } catch (error) {
      console.error(`❌ Error al procesar IP ${ip}:`, error);
    }
  }
  
  /**
   * Actualizar valor de un sensor
   */
  async actualizarSensor(sensor, valor, mac) {
    // Si no tenemos MAC, no podemos identificar el dispositivo
    if (!mac) {
      console.log(`⚠️ No se puede actualizar sensor ${sensor}, MAC desconocida`);
      return;
    }
    
    try {
      const dispensadorId = this.macsDetectadas.get(mac);
      
      if (!dispensadorId) {
        console.log(`⚠️ Dispensador no encontrado para MAC ${mac}`);
        return;
      }
      
      // Construir la actualización según el tipo de sensor
      const actualizacion = {};
      actualizacion[`sensores.${sensor}`] = valor;
      actualizacion.ultimaActualizacion = new Date();
      
      // Actualizar el dispensador
      await Dispensador.findByIdAndUpdate(dispensadorId, {
        $set: actualizacion
      });
      
      console.log(`✅ Sensor ${sensor} actualizado para ${dispensadorId}: ${valor}`);
    } catch (error) {
      console.error(`❌ Error al actualizar sensor ${sensor}:`, error);
    }
  }
  
  /**
   * Procesar comando recibido
   */
  async procesarComando(mensaje) {
    try {
      // Intentar parsear si es JSON
      let comando = mensaje;
      
      try {
        if (typeof mensaje === 'string' && mensaje.startsWith('{') && mensaje.endsWith('}')) {
          comando = JSON.parse(mensaje);
        }
      } catch (e) {
        console.log(`⚠️ No se pudo parsear comando como JSON: ${mensaje}`);
      }
      
      console.log(`📩 Comando recibido:`, comando);
    } catch (error) {
      console.error(`❌ Error al procesar comando:`, error);
    }
  }
  
  /**
   * Enviar comando a un dispositivo específico
   */
  enviarComando(mac, comando, parametros = {}, usuario = null) {
    try {
      // Verificar que tenemos conexión
      if (!this.mqttClient || !this.mqttClient.connected) {
        console.error('❌ No hay conexión MQTT para enviar comando');
        return false;
      }
      
      // Crear payload con comando y parámetros
      const payload = JSON.stringify({
        comando,
        ...parametros,
        mac: mac.toUpperCase(),
        timestamp: new Date().toISOString(),
        ...(usuario ? { usuario } : {})
      });
      
      // Enviar al topic de comandos
      const topic = `${this.topics.RAIZ}/${this.topics.COMANDO}`;
      this.mqttClient.publish(topic, payload);
      
      console.log(`📤 Comando enviado a ${mac}: ${comando}`);
      return true;
    } catch (error) {
      console.error(`❌ Error al enviar comando a ${mac}:`, error);
      return false;
    }
  }
  
  /**
   * Verificar si un dispositivo está conectado (ha enviado datos recientemente)
   */
  estaConectado(mac) {
    return this.macsDetectadas.has(mac.toUpperCase());
  }
  
  /**
   * Obtener cliente MQTT para uso externo
   */
  getClient() {
    return this.mqttClient;
  }
  
  /**
   * Obtener topics para uso externo
   */
  getTopics() {
    return this.topics;
  }
}

module.exports = MQTTManager;