// routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const Usuario = require("../models/Usuario");
const Dispositivo = require("../models/Dispositivo");
const HistorialActividad = require("../models/HistorialActividad");

// Total de usuarios
router.get("/usuarios/total", async (req, res) => {
  try {
    const total = await Usuario.countDocuments();
    res.json({ total });
  } catch (error) {
    console.error("Error al obtener total de usuarios:", error);
    res.status(500).json({ mensaje: "Error al obtener total de usuarios" });
  }
});

// Total de dispositivos
router.get("/dispositivos/total", async (req, res) => {
  try {
    const total = await Dispositivo.countDocuments();
    res.json({ total });
  } catch (error) {
    console.error("Error al obtener total de dispositivos:", error);
    res.status(500).json({ mensaje: "Error al obtener total de dispositivos" });
  }
});

// Total de entradas en el historial
router.get("/historial/total", async (req, res) => {
  try {
    const total = await HistorialActividad.countDocuments();
    res.json({ total });
  } catch (error) {
    console.error("Error al obtener total del historial:", error);
    res.status(500).json({ mensaje: "Error al obtener total del historial" });
  }
});

// Estadísticas generales del dashboard
router.get("/estadisticas", async (req, res) => {
  try {
    const [
      totalUsuarios,
      totalDispositivos,
      totalHistorial,
      dispositivos_activos,
      dispositivos_inactivos
    ] = await Promise.all([
      Usuario.countDocuments(),
      Dispositivo.countDocuments(),
      HistorialActividad.countDocuments(),
      Dispositivo.countDocuments({ estado: "Encendido" }),
      Dispositivo.countDocuments({ estado: "Apagado" })
    ]);

    res.json({
      usuarios: {
        total: totalUsuarios
      },
      dispositivos: {
        total: totalDispositivos,
        activos: dispositivos_activos,
        inactivos: dispositivos_inactivos
      },
      historial: {
        total: totalHistorial
      }
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({ mensaje: "Error al obtener estadísticas" });
  }
});

module.exports = router;