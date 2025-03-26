// routes/historialRoutes.js
const express = require("express");
const router = express.Router();
const HistorialActividad = require("../models/HistorialActividad");
const Dispositivo = require("../models/Dispositivo");
const Usuario = require("../models/Usuario");

// Obtener todo el historial de actividades
router.get("/", async (req, res) => {
  try {
    const historialRaw = await HistorialActividad.find()
      .sort({ fecha: -1 }) // Del más reciente al más antiguo
      .limit(100); // Limitamos a 100 entradas para no sobrecargar

    // Transformamos los datos al formato que espera el frontend
    const historial = await Promise.all(
      historialRaw.map(async (registro) => {
        // Buscamos información del usuario si existe
        let correo = "N/A";
        if (registro.usuarioId) {
          const usuario = await Usuario.findById(registro.usuarioId);
          if (usuario) {
            correo = usuario.email;
          } else if (registro.email) {
            correo = registro.email;
          }
        } else if (registro.email) {
          correo = registro.email;
        }

        // Buscamos información del dispositivo si existe en los detalles
        let mac = "N/A";
        if (registro.detalles && registro.detalles.dispositivoId) {
          const dispositivo = await Dispositivo.findById(registro.detalles.dispositivoId);
          if (dispositivo) {
            mac = dispositivo.mac;
          } else if (registro.detalles.mac) {
            mac = registro.detalles.mac;
          }
        } else if (registro.detalles && registro.detalles.mac) {
          mac = registro.detalles.mac;
        }

        return {
          id: registro._id,
          correo,
          mac,
          accion: `${registro.tipo}: ${registro.accion}`,
          fecha: registro.fecha,
          descripcion: registro.descripcion
        };
      })
    );

    res.json(historial);
  } catch (error) {
    console.error("Error al obtener historial de actividades:", error);
    res.status(500).json({ mensaje: "Error al obtener historial de actividades" });
  }
});

// Registrar una nueva actividad
router.post("/", async (req, res) => {
  try {
    const { tipo, accion, usuarioId, email, descripcion, ip, detalles } = req.body;

    const nuevaActividad = new HistorialActividad({
      tipo,
      accion,
      usuarioId,
      email,
      descripcion,
      ip,
      detalles
    });

    await nuevaActividad.save();

    res.status(201).json({
      mensaje: "Actividad registrada correctamente",
      actividad: nuevaActividad
    });
  } catch (error) {
    console.error("Error al registrar actividad:", error);
    res.status(500).json({ mensaje: "Error al registrar actividad" });
  }
});

// Obtener actividades por tipo
router.get("/tipo/:tipo", async (req, res) => {
  try {
    const historial = await HistorialActividad.find({ tipo: req.params.tipo })
      .sort({ fecha: -1 })
      .limit(50);

    res.json(historial);
  } catch (error) {
    console.error(`Error al obtener actividades de tipo ${req.params.tipo}:`, error);
    res.status(500).json({ mensaje: `Error al obtener actividades de tipo ${req.params.tipo}` });
  }
});

// Obtener actividades por usuario
router.get("/usuario/:id", async (req, res) => {
  try {
    const historial = await HistorialActividad.find({ usuarioId: req.params.id })
      .sort({ fecha: -1 })
      .limit(50);

    res.json(historial);
  } catch (error) {
    console.error(`Error al obtener actividades del usuario ${req.params.id}:`, error);
    res.status(500).json({ mensaje: `Error al obtener actividades del usuario` });
  }
});

// Eliminar entradas antiguas (más de 30 días)
router.delete("/limpiar", async (req, res) => {
  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30); // 30 días atrás

    const resultado = await HistorialActividad.deleteMany({
      fecha: { $lt: fechaLimite }
    });

    res.json({
      mensaje: `Se eliminaron ${resultado.deletedCount} registros antiguos del historial`,
      eliminados: resultado.deletedCount
    });
  } catch (error) {
    console.error("Error al limpiar historial:", error);
    res.status(500).json({ mensaje: "Error al limpiar historial" });
  }
});

module.exports = router;