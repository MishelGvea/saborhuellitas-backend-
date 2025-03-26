// routes/dispositivoController.js
const DispositivoUsuario = require('../models/DispositivoUsuario');
const { Dispensador } = require('../models/Dispensador');
const User = require('../models/User');

/**
 * Controlador para gestionar la relación entre dispositivos y usuarios
 */

// Obtener todos los dispositivos de un usuario
exports.getDispositivosUsuario = async (req, res) => {
  try {
    const usuarioId = req.usuario._id; // Viene del middleware de autenticación
    
    const dispositivos = await DispositivoUsuario.find({ usuarioId })
      .select('-token'); // No enviar el token por seguridad
    
    return res.status(200).json({
      success: true,
      count: dispositivos.length,
      data: dispositivos
    });
  } catch (error) {
    console.error('Error al obtener dispositivos del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener dispositivos',
      error: error.message
    });
  }
};

// Obtener un dispositivo específico
exports.getDispositivo = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario._id;
    
    const dispositivo = await DispositivoUsuario.findOne({
      _id: id,
      usuarioId
    });
    
    if (!dispositivo) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado o no pertenece al usuario'
      });
    }
    
    // Si el dispositivo tiene un dispensadorId, obtener también los datos del dispensador
    let datosDispensador = null;
    if (dispositivo.dispensadorId) {
      datosDispensador = await Dispensador.findById(dispositivo.dispensadorId);
    }
    
    return res.status(200).json({
      success: true,
      data: {
        dispositivo,
        dispensador: datosDispensador
      }
    });
  } catch (error) {
    console.error('Error al obtener dispositivo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener dispositivo',
      error: error.message
    });
  }
};

// Registrar un nuevo dispositivo para el usuario
exports.registrarDispositivo = async (req, res) => {
  try {
    const { macAddress, nombre, mascota } = req.body;
    const usuarioId = req.usuario._id;
    
    // Verificar si la MAC tiene formato válido
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de dirección MAC inválido. Use formato XX:XX:XX:XX:XX:XX'
      });
    }
    
    // Verificar si el dispositivo ya está registrado
    const dispositivoExistente = await DispositivoUsuario.findByMac(macAddress);
    if (dispositivoExistente) {
      return res.status(400).json({
        success: false,
        message: 'Este dispositivo ya está registrado por un usuario'
      });
    }
    
    // Crear nuevo registro de dispositivo
    const nuevoDispositivo = new DispositivoUsuario({
      macAddress: macAddress.toUpperCase(),
      usuarioId,
      nombre: nombre || 'Mi Dispensador',
      mascota: mascota || {}
    });
    
    await nuevoDispositivo.save();
    
    // Buscar o crear un documento de dispensador para este dispositivo
    let dispensador = await Dispensador.findOne({ 'dispositivo.mac': macAddress.toUpperCase() });
    
    if (!dispensador) {
      // Crear un dispensador genérico si no existe
      dispensador = new Dispensador({
        _id: `dispensador-${macAddress.replace(/:/g, '')}`,
        nombre: nombre || 'Dispensador Huellitas',
        estado: {
          conectado: false,
          ultimaConexion: null
        },
        sensores: {
          servo: 'cerrado',
          led: 'desconocido',
          peso: 0,
          distancia: 0
        },
        dispositivo: {
          ip: 'Desconocida',
          mac: macAddress.toUpperCase()
        },
        propietario: {
          id: usuarioId
        }
      });
      
      await dispensador.save();
    } else {
      // Si ya existe, actualizamos el propietario
      dispensador.propietario = {
        id: usuarioId
      };
      dispensador.nombre = nombre || dispensador.nombre;
      
      await dispensador.save();
    }
    
    // Actualizar el dispositivo con la referencia al dispensador
    nuevoDispositivo.dispensadorId = dispensador._id;
    await nuevoDispositivo.save();
    
    return res.status(201).json({
      success: true,
      message: 'Dispositivo registrado exitosamente',
      data: {
        dispositivo: nuevoDispositivo,
        dispensador
      }
    });
  } catch (error) {
    console.error('Error al registrar dispositivo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar dispositivo',
      error: error.message
    });
  }
};

// Actualizar información de un dispositivo
exports.actualizarDispositivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, mascota, configuracion } = req.body;
    const usuarioId = req.usuario._id;
    
    // Verificar que el dispositivo pertenece al usuario
    const dispositivo = await DispositivoUsuario.findOne({
      _id: id,
      usuarioId
    });
    
    if (!dispositivo) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado o no pertenece al usuario'
      });
    }
    
    // Actualizar campos
    if (nombre) dispositivo.nombre = nombre;
    if (mascota) dispositivo.mascota = { ...dispositivo.mascota, ...mascota };
    if (configuracion) {
      dispositivo.configuracion = {
        ...dispositivo.configuracion,
        ...configuracion
      };
    }
    
    await dispositivo.save();
    
    // Si hay un dispensador asociado, actualizar también sus datos
    if (dispositivo.dispensadorId) {
      const dispensador = await Dispensador.findById(dispositivo.dispensadorId);
      if (dispensador) {
        if (nombre) dispensador.nombre = nombre;
        
        if (mascota) {
          dispensador.mascota = {
            ...dispensador.mascota,
            ...mascota,
            id: dispositivo.usuarioId
          };
        }
        
        if (configuracion) {
          dispensador.configuracion = {
            ...dispensador.configuracion,
            ...(configuracion.cantidadDispensacion ? { cantidadDispensacion: configuracion.cantidadDispensacion } : {}),
            ...(configuracion.horariosAutomaticos ? { horariosAutomaticos: configuracion.horariosAutomaticos } : {})
          };
        }
        
        await dispensador.save();
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Dispositivo actualizado exitosamente',
      data: dispositivo
    });
  } catch (error) {
    console.error('Error al actualizar dispositivo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar dispositivo',
      error: error.message
    });
  }
};

// Eliminar/desvincular un dispositivo
exports.eliminarDispositivo = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario._id;
    
    // Verificar que el dispositivo pertenece al usuario
    const dispositivo = await DispositivoUsuario.findOne({
      _id: id,
      usuarioId
    });
    
    if (!dispositivo) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado o no pertenece al usuario'
      });
    }
    
    // Guardar la MAC para referencia
    const macAddress = dispositivo.macAddress;
    
    // Eliminar el registro de asociación
    await DispositivoUsuario.deleteOne({ _id: id });
    
    // Si hay un dispensador asociado, actualizar su estado
    if (dispositivo.dispensadorId) {
      const dispensador = await Dispensador.findById(dispositivo.dispensadorId);
      if (dispensador) {
        // Limpiar la referencia al propietario
        dispensador.propietario = undefined;
        await dispensador.save();
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Dispositivo desvinculado exitosamente',
      data: {
        macAddress,
        desvinculado: true
      }
    });
  } catch (error) {
    console.error('Error al desvincular dispositivo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al desvincular dispositivo',
      error: error.message
    });
  }
};

// Verificar disponibilidad de un dispositivo por MAC
exports.verificarDispositivo = async (req, res) => {
  try {
    const { mac } = req.params;
    
    // Verificar formato MAC
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(mac)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de dirección MAC inválido'
      });
    }
    
    // Buscar en la colección de dispositivos
    const dispositivoExistente = await DispositivoUsuario.findByMac(mac);
    
    // Buscar también en la colección de dispensadores (por compatibilidad)
    const dispensadorExistente = await Dispensador.findOne({
      'dispositivo.mac': mac.toUpperCase()
    });
    
    // Determinar estado de registro y disponibilidad
    const estaRegistrado = !!dispositivoExistente;
    const existeDispensador = !!dispensadorExistente;
    
    // Obtener información del propietario si está registrado
    let propietarioInfo = null;
    if (estaRegistrado && dispositivoExistente.usuarioId) {
      const propietario = await User.findById(dispositivoExistente.usuarioId).select('nombre email');
      if (propietario) {
        propietarioInfo = {
          nombre: propietario.nombre,
          email: propietario.email
        };
      }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        macAddress: mac.toUpperCase(),
        estaRegistrado,
        existeDispensador,
        disponible: !estaRegistrado,
        propietario: propietarioInfo,
        ultimaConexion: dispensadorExistente ? dispensadorExistente.estado.ultimaConexion : null
      }
    });
  } catch (error) {
    console.error('Error al verificar dispositivo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar dispositivo',
      error: error.message
    });
  }
};

// Obtener estado actual del dispensador asociado
exports.getEstadoDispensador = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario._id;
    
    // Verificar que el dispositivo pertenece al usuario
    const dispositivo = await DispositivoUsuario.findOne({
      _id: id,
      usuarioId
    });
    
    if (!dispositivo) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado o no pertenece al usuario'
      });
    }
    
    // Si no hay dispensador asociado, devolver error
    if (!dispositivo.dispensadorId) {
      return res.status(404).json({
        success: false,
        message: 'No hay dispensador asociado a este dispositivo'
      });
    }
    
    // Obtener los datos del dispensador
    const dispensador = await Dispensador.findById(dispositivo.dispensadorId);
    
    if (!dispensador) {
      return res.status(404).json({
        success: false,
        message: 'Dispensador no encontrado en la base de datos'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        dispositivo: {
          _id: dispositivo._id,
          nombre: dispositivo.nombre,
          macAddress: dispositivo.macAddress
        },
        dispensador: dispensador
      }
    });
  } catch (error) {
    console.error('Error al obtener estado del dispensador:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estado del dispensador',
      error: error.message
    });
  }
};

// Enviar comando al dispensador
exports.enviarComando = async (req, res) => {
  try {
    const { id } = req.params;
    const { comando, parametros } = req.body;
    const usuarioId = req.usuario._id;
    
    // Verificar que el dispositivo pertenece al usuario
    const dispositivo = await DispositivoUsuario.findOne({
      _id: id,
      usuarioId
    });
    
    if (!dispositivo) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado o no pertenece al usuario'
      });
    }
    
    // Si no hay dispensador asociado, devolver error
    if (!dispositivo.dispensadorId) {
      return res.status(404).json({
        success: false,
        message: 'No hay dispensador asociado a este dispositivo'
      });
    }
    
    // Obtener el cliente MQTT
    const mqttClient = req.app.get('mqttClient');
    const mqttTopics = req.app.get('mqttTopics');
    
    if (!mqttClient || !mqttClient.connected) {
      return res.status(500).json({
        success: false,
        message: 'No hay conexión con el broker MQTT'
      });
    }
    
    // Enviar comando a través de MQTT
    const topic = mqttTopics ? mqttTopics.COMANDO : 'esp32/comando';
    const payload = JSON.stringify({
      comando,
      ...parametros,
      mac: dispositivo.macAddress, // Incluir MAC para que el dispositivo reconozca el comando
      dispositivo: dispositivo._id.toString(),
      usuario: {
        id: usuarioId.toString(),
        nombre: req.usuario.nombre || 'Usuario'
      }
    });
    
    mqttClient.publish(topic, payload);
    
    // Registrar el comando enviado
    return res.status(200).json({
      success: true,
      message: `Comando "${comando}" enviado con éxito al dispositivo`,
      data: {
        dispositivo: dispositivo._id,
        comando,
        parametros,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error al enviar comando al dispensador:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar comando al dispensador',
      error: error.message
    });
  }
};