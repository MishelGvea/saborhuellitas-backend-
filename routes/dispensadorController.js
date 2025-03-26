// controllers/dispensadorController.js
const { Dispensador, Dispensacion, Alerta, Mantenimiento } = require('../models/Dispensador');

// Obtener estado actual del dispensador
exports.getEstadoDispensador = async (req, res) => {
  try {
    const dispensador = await Dispensador.findById('dispensador-principal');
    
    if (!dispensador) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dispensador no encontrado' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: dispensador
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

// Obtener historial de dispensaciones
exports.getHistorialDispensaciones = async (req, res) => {
  try {
    const { limit = 10, page = 1, tipo, estado, desde, hasta, dispensadorId } = req.query;
    const skip = (page - 1) * limit;
    
    console.log("Parámetros recibidos:", { limit, page, dispensadorId });
    
    // Construir filtro con el dispensadorId proporcionado
    let filtro = {};
    
    // Usar el dispensadorId desde los parámetros de consulta
    if (dispensadorId) {
      filtro.dispensadorId = dispensadorId;
    } else {
      // Valor predeterminado si no se proporciona
      filtro.dispensadorId = 'dispensador-principal';
    }
    
    // Resto del filtro igual que antes
    if (tipo) filtro.tipo = tipo;
    if (estado) filtro.estado = estado;
    
    // Filtro de fechas
    if (desde || hasta) {
      filtro.iniciada = {};
      if (desde) filtro.iniciada.$gte = new Date(desde);
      if (hasta) filtro.iniciada.$lte = new Date(hasta);
    }
    
    console.log("Filtro aplicado:", filtro);
    
    // Obtener dispensaciones y contar total
    const [dispensaciones, total] = await Promise.all([
      Dispensacion.find(filtro)
        .sort({ iniciada: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Dispensacion.countDocuments(filtro)
    ]);
    
    return res.status(200).json({
      success: true,
      data: dispensaciones,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener historial de dispensaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener historial de dispensaciones',
      error: error.message
    });
  }
};

// Obtener estadísticas de dispensaciones
exports.getEstadisticasDispensaciones = async (req, res) => {
  try {
    const { periodo = 'semana' } = req.query;
    
    // Calcular fecha de inicio según el periodo
    let fechaInicio = new Date();
    switch(periodo) {
      case 'dia':
        fechaInicio.setDate(fechaInicio.getDate() - 1);
        break;
      case 'semana':
        fechaInicio.setDate(fechaInicio.getDate() - 7);
        break;
      case 'mes':
        fechaInicio.setMonth(fechaInicio.getMonth() - 1);
        break;
      case 'año':
        fechaInicio.setFullYear(fechaInicio.getFullYear() - 1);
        break;
      default:
        fechaInicio.setDate(fechaInicio.getDate() - 7);
    }
    
    // Consultas para estadísticas
    const [
      totalDispensaciones,
      dispensacionesCompletadas,
      totalDispensado,
      promedioDispensado,
      dispensacionesPorTipo,
      dispensacionesPorEstado
    ] = await Promise.all([
      // Total de dispensaciones
      Dispensacion.countDocuments({ 
        dispensadorId: 'dispensador-principal',
        iniciada: { $gte: fechaInicio }
      }),
      
      // Dispensaciones completadas
      Dispensacion.countDocuments({ 
        dispensadorId: 'dispensador-principal',
        estado: 'completada',
        iniciada: { $gte: fechaInicio }
      }),
      
      // Total dispensado (en gramos)
      Dispensacion.aggregate([
        { 
          $match: { 
            dispensadorId: 'dispensador-principal',
            estado: 'completada',
            iniciada: { $gte: fechaInicio }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$cantidadDispensada' }
          }
        }
      ]),
      
      // Promedio dispensado por operación
      Dispensacion.aggregate([
        { 
          $match: { 
            dispensadorId: 'dispensador-principal',
            estado: 'completada',
            iniciada: { $gte: fechaInicio }
          }
        },
        {
          $group: {
            _id: null,
            promedio: { $avg: '$cantidadDispensada' }
          }
        }
      ]),
      
      // Dispensaciones por tipo
      Dispensacion.aggregate([
        { 
          $match: { 
            dispensadorId: 'dispensador-principal',
            iniciada: { $gte: fechaInicio }
          }
        },
        {
          $group: {
            _id: '$tipo',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Dispensaciones por estado
      Dispensacion.aggregate([
        { 
          $match: { 
            dispensadorId: 'dispensador-principal',
            iniciada: { $gte: fechaInicio }
          }
        },
        {
          $group: {
            _id: '$estado',
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    // Formatear resultados
    const estadisticas = {
      periodo,
      fechaInicio,
      fechaFin: new Date(),
      totalDispensaciones,
      dispensacionesCompletadas,
      porcentajeExito: totalDispensaciones > 0 
        ? (dispensacionesCompletadas / totalDispensaciones) * 100 
        : 0,
      totalDispensado: totalDispensado.length > 0 ? totalDispensado[0].total : 0,
      promedioDispensado: promedioDispensado.length > 0 ? promedioDispensado[0].promedio : 0,
      dispensacionesPorTipo: dispensacionesPorTipo.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      dispensacionesPorEstado: dispensacionesPorEstado.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
    
    return res.status(200).json({
      success: true,
      data: estadisticas
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de dispensaciones',
      error: error.message
    });
  }
};

// Obtener alertas no leídas
exports.getAlertas = async (req, res) => {
  try {
    const { limit = 10, page = 1, nivel, leida } = req.query;
    const skip = (page - 1) * limit;
    
    // Construir filtro
    let filtro = { dispensadorId: 'dispensador-principal' };
    
    if (nivel) filtro.nivel = nivel;
    if (leida !== undefined) filtro.leida = leida === 'true';
    
    // Obtener alertas y contar total
    const [alertas, total] = await Promise.all([
      Alerta.find(filtro)
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Alerta.countDocuments(filtro)
    ]);
    
    return res.status(200).json({
      success: true,
      data: alertas,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener alertas',
      error: error.message
    });
  }
};

// Marcar alerta como leída
exports.marcarAlertaLeida = async (req, res) => {
  try {
    const { id } = req.params;
    
    const alerta = await Alerta.findById(id);
    
    if (!alerta) {
      return res.status(404).json({
        success: false,
        message: 'Alerta no encontrada'
      });
    }
    
    alerta.leida = true;
    await alerta.save();
    
    return res.status(200).json({
      success: true,
      data: alerta
    });
  } catch (error) {
    console.error('Error al marcar alerta como leída:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al marcar alerta como leída',
      error: error.message
    });
  }
};

// Actualizar configuración del dispensador
exports.actualizarConfiguracion = async (req, res) => {
  try {
    const { 
      capacidadMaxima, 
      cantidadDispensacion, 
      horariosAutomaticos,
      alertaNivelBajo
    } = req.body;
    
    const dispensador = await Dispensador.findById('dispensador-principal');
    
    if (!dispensador) {
      return res.status(404).json({
        success: false,
        message: 'Dispensador no encontrado'
      });
    }
    
    // Actualizar configuración
    if (capacidadMaxima !== undefined) dispensador.configuracion.capacidadMaxima = capacidadMaxima;
    if (cantidadDispensacion !== undefined) dispensador.configuracion.cantidadDispensacion = cantidadDispensacion;
    if (horariosAutomaticos !== undefined) dispensador.configuracion.horariosAutomaticos = horariosAutomaticos;
    if (alertaNivelBajo !== undefined) dispensador.configuracion.alertaNivelBajo = alertaNivelBajo;
    
    dispensador.ultimaActualizacion = new Date();
    await dispensador.save();
    
    return res.status(200).json({
      success: true,
      data: dispensador
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración',
      error: error.message
    });
  }
};

// Comandos remotos al dispensador (mediante MQTT)
exports.enviarComando = async (req, res) => {
  try {
    const { comando, parametros } = req.body;
    
    // Aquí necesitamos integrar con el cliente MQTT para enviar el comando
    const mqttClient = req.app.get('mqttClient'); // Asumiendo que el cliente MQTT está disponible en la app
    
    if (!mqttClient || !mqttClient.connected) {
      return res.status(500).json({
        success: false,
        message: 'No hay conexión con el broker MQTT'
      });
    }
    
    // Enviar comando a través de MQTT
    const topic = `esp32/comando`;
    const payload = JSON.stringify({ comando, ...parametros });
    
    mqttClient.publish(topic, payload);
    
    // Registrar el comando en la base de datos
    const nuevaDispensacion = comando === 'dispensar' ? await Dispensacion.create({
      dispensadorId: 'dispensador-principal',
      tipo: 'remota',
      estado: 'iniciada',
      cantidadObjetivo: parametros?.cantidad || 50,
      solicitadaPor: {
        id: req.usuario?._id,
        nombre: req.usuario?.nombre || 'Usuario web'
      },
      iniciada: new Date()
    }) : null;
    
    return res.status(200).json({
      success: true,
      message: `Comando "${comando}" enviado con éxito`,
      data: nuevaDispensacion
    });
  } catch (error) {
    console.error('Error al enviar comando:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar comando',
      error: error.message
    });
  }
};

// Registrar mantenimiento
exports.registrarMantenimiento = async (req, res) => {
  try {
    const { tipo, descripcion, detalles, proximoMantenimiento } = req.body;
    
    const nuevoMantenimiento = await Mantenimiento.create({
      dispensadorId: 'dispensador-principal',
      tipo,
      descripcion,
      detalles,
      proximoMantenimiento,
      realizadoPor: {
        id: req.usuario?._id,
        nombre: req.usuario?.nombre || 'Usuario web'
      }
    });
    
    return res.status(201).json({
      success: true,
      data: nuevoMantenimiento
    });
  } catch (error) {
    console.error('Error al registrar mantenimiento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar mantenimiento',
      error: error.message
    });
  }
};

// Obtener historial de mantenimiento
exports.getHistorialMantenimiento = async (req, res) => {
  try {
    const { limit = 10, page = 1, tipo } = req.query;
    const skip = (page - 1) * limit;
    
    // Construir filtro
    let filtro = { dispensadorId: 'dispensador-principal' };
    if (tipo) filtro.tipo = tipo;
    
    // Obtener mantenimientos y contar total
    const [mantenimientos, total] = await Promise.all([
      Mantenimiento.find(filtro)
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Mantenimiento.countDocuments(filtro)
    ]);
    
    return res.status(200).json({
      success: true,
      data: mantenimientos,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener historial de mantenimiento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener historial de mantenimiento',
      error: error.message
    });
  }
};