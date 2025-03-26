// routes/adminUsuariosRoutes.js
const express = require("express");
const router = express.Router();
const Usuario = require("../models/Usuario"); // Usamos tu modelo existente
const Dispositivo = require("../models/Dispositivo"); // Nuevo modelo de dispositivos
const bcrypt = require("bcryptjs");

// Obtener todos los usuarios (con opciones de filtrado avanzadas para admin)
router.get("/", async (req, res) => {
  try {
    const { correo, mac } = req.query;
    let usuarios = [];
    
    // Aplicar filtros para usuarios
    if (correo) {
      usuarios = await Usuario.find({ 
        email: { $regex: correo, $options: 'i' } 
      });
    } else {
      usuarios = await Usuario.find();
    }
    
    // Transformar los resultados para mostrar cada dispositivo como un registro separado
    const resultados = [];
    
    // Para cada usuario, buscamos sus dispositivos
    for (const usuario of usuarios) {
      let dispositivos = [];
      
      // Si hay filtro de MAC, aplicarlo
      if (mac) {
        dispositivos = await Dispositivo.find({ 
          usuarioId: usuario._id,
          mac: { $regex: mac, $options: 'i' }
        });
      } else {
        dispositivos = await Dispositivo.find({ usuarioId: usuario._id });
      }
      
      if (dispositivos.length > 0) {
        // Si tiene dispositivos, agregamos cada uno como un resultado
        dispositivos.forEach(disp => {
          resultados.push({
            correo: usuario.email,
            nombre: usuario.nombre,
            apellidoPaterno: usuario.apellidoPaterno,
            apellidoMaterno: usuario.apellidoMaterno,
            dispositivo: disp.nombre,
            mac: disp.mac,
            estado: disp.estado
          });
        });
      } else {
        // Si no tiene dispositivos, lo agregamos sin dispositivo
        resultados.push({
          correo: usuario.email,
          nombre: usuario.nombre,
          apellidoPaterno: usuario.apellidoPaterno,
          apellidoMaterno: usuario.apellidoMaterno,
          dispositivo: "No registrado",
          mac: "N/A",
          estado: "N/A"
        });
      }
    }
    
    res.json(resultados);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ mensaje: "Error al obtener los usuarios" });
  }
});

// Ruta específica para el componente ListaUsuarios
router.get("/lista", async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-password -resetCode -resetCodeExpires');
    
    // Transformar los datos al formato que espera el componente ListaUsuarios
    const usuariosFormateados = usuarios.map(usuario => ({
      id: usuario._id,
      nombre: usuario.nombre || "",
      apellido: `${usuario.apellidoPaterno || ""} ${usuario.apellidoMaterno || ""}`.trim(),
      correo: usuario.email || "",
      direccion: usuario.direccion || ""
    }));
    
    res.json(usuariosFormateados);
  } catch (error) {
    console.error("Error al obtener lista de usuarios:", error);
    res.status(500).json({ mensaje: "Error al obtener lista de usuarios" });
  }
});

// Obtener detalles de un usuario específico (para edición)
router.get("/:id", async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('-password');
    
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }
    
    // Obtener dispositivos asociados
    const dispositivos = await Dispositivo.find({ usuarioId: usuario._id });
    
    res.json({
      usuario,
      dispositivos
    });
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ mensaje: "Error al obtener el usuario" });
  }
});

// Crear un nuevo usuario desde el panel admin
router.post("/", async (req, res) => {
  try {
    // Verificar si el email ya existe
    const usuarioExistente = await Usuario.findOne({ email: req.body.email });
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: "Este correo electrónico ya está registrado" });
    }
    
    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    
    const nuevoUsuario = new Usuario({
      nombre: req.body.nombre,
      apellidoPaterno: req.body.apellidoPaterno,
      apellidoMaterno: req.body.apellidoMaterno,
      email: req.body.email,
      password: hashedPassword,
      direccion: req.body.direccion || ""
    });
    
    await nuevoUsuario.save();
    
    // No devolver la contraseña
    const usuarioResponse = nuevoUsuario.toObject();
    delete usuarioResponse.password;
    
    res.status(201).json({ 
      mensaje: "Usuario creado correctamente", 
      usuario: usuarioResponse 
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ mensaje: "Error al crear el usuario" });
  }
});

// Actualizar un usuario
router.put("/:id", async (req, res) => {
  try {
    const userData = {
      nombre: req.body.nombre,
      apellidoPaterno: req.body.apellidoPaterno,
      apellidoMaterno: req.body.apellidoMaterno,
      email: req.body.email,
      direccion: req.body.direccion
    };
    
    // Si se proporciona una nueva contraseña, encriptarla
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(req.body.password, salt);
    }
    
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      userData,
      { new: true }
    ).select('-password');
    
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }
    
    res.json({ 
      mensaje: "Usuario actualizado correctamente", 
      usuario 
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ mensaje: "Error al actualizar el usuario" });
  }
});

// Eliminar un usuario
router.delete("/:id", async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }
    
    // Eliminar todos los dispositivos asociados
    await Dispositivo.deleteMany({ usuarioId: req.params.id });
    
    res.json({ mensaje: "Usuario y sus dispositivos eliminados correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ mensaje: "Error al eliminar el usuario" });
  }
});

// Gestionar dispositivos de un usuario
router.post("/:id/dispositivos", async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }
    
    // Verificar si el MAC ya existe
    const dispositivoExistente = await Dispositivo.findOne({ mac: req.body.mac });
    if (dispositivoExistente) {
      return res.status(400).json({ mensaje: "Esta dirección MAC ya está registrada" });
    }
    
    const nuevoDispositivo = new Dispositivo({
      usuarioId: usuario._id,
      nombre: req.body.nombre || "Dispensador",
      mac: req.body.mac,
      estado: req.body.estado || "Apagado"
    });
    
    await nuevoDispositivo.save();
    
    res.json({ 
      mensaje: "Dispositivo añadido correctamente", 
      dispositivo: nuevoDispositivo 
    });
  } catch (error) {
    console.error("Error al añadir dispositivo:", error);
    res.status(500).json({ mensaje: "Error al añadir el dispositivo" });
  }
});

// Actualizar un dispositivo
router.put("/:userId/dispositivos/:id", async (req, res) => {
  try {
    const dispositivo = await Dispositivo.findOneAndUpdate(
      { _id: req.params.id, usuarioId: req.params.userId },
      {
        nombre: req.body.nombre,
        estado: req.body.estado
      },
      { new: true }
    );
    
    if (!dispositivo) {
      return res.status(404).json({ mensaje: "Dispositivo no encontrado" });
    }
    
    res.json({ 
      mensaje: "Dispositivo actualizado correctamente", 
      dispositivo 
    });
  } catch (error) {
    console.error("Error al actualizar dispositivo:", error);
    res.status(500).json({ mensaje: "Error al actualizar el dispositivo" });
  }
});

// Eliminar un dispositivo
router.delete("/:userId/dispositivos/:id", async (req, res) => {
  try {
    const dispositivo = await Dispositivo.findOneAndDelete({ 
      _id: req.params.id, 
      usuarioId: req.params.userId 
    });
    
    if (!dispositivo) {
      return res.status(404).json({ mensaje: "Dispositivo no encontrado" });
    }
    
    res.json({ mensaje: "Dispositivo eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar dispositivo:", error);
    res.status(500).json({ mensaje: "Error al eliminar el dispositivo" });
  }
});

// Obtener total de usuarios (para dashboard)
router.get("/total/count", async (req, res) => {
  try {
    const total = await Usuario.countDocuments();
    res.json({ total });
  } catch (error) {
    console.error("Error al obtener total de usuarios:", error);
    res.status(500).json({ mensaje: "Error al obtener total de usuarios" });
  }
});

module.exports = router;