const express = require("express");
const router = express.Router();
const Usuario = require("../models/Usuario");
const bcrypt = require("bcryptjs");
const { deleteImage } = require('../utils/cloudinaryUtils');

// Obtener todos los usuarios para el CRUD
router.get("/", async (req, res) => {
  try {
    const usuarios = await Usuario.find().select("-password -resetCode -resetCodeExpires");
    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios para CRUD:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// Buscar usuarios por correo para el CRUD
router.get("/buscar", async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: "Se requiere parámetro de búsqueda" });
    }
    
    const usuarios = await Usuario.find({
      email: { $regex: email, $options: "i" }
    }).select("-password -resetCode -resetCodeExpires");
    
    res.json(usuarios);
  } catch (error) {
    console.error("Error al buscar usuarios:", error);
    res.status(500).json({ error: "Error al buscar usuarios" });
  }
});

// Obtener un usuario específico por ID
router.get("/:id", async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select("-password -resetCode -resetCodeExpires");
    
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    res.json(usuario);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ error: "Error al obtener el usuario" });
  }
});

// Crear un nuevo usuario
router.post("/", async (req, res) => {
  try {
    const { nombre, apellidoPaterno, apellidoMaterno, email, password, direccion, imagenUrl, imagenPublicId } = req.body;
    
    // Verificar campos requeridos
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
    }
    
    // Verificar si el email ya existe
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ error: "Este correo electrónico ya está registrado" });
    }
    
    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Crear el usuario
    const nuevoUsuario = new Usuario({
      nombre,
      apellidoPaterno: apellidoPaterno || "",
      apellidoMaterno: apellidoMaterno || "",
      email,
      password: hashedPassword,
      direccion: direccion || "",
      imagenUrl: imagenUrl || "",
      imagenPublicId: imagenPublicId || "",
      fechaRegistro: new Date()
    });
    
    await nuevoUsuario.save();
    
    // Respuesta sin incluir la contraseña
    const usuarioResponse = await Usuario.findById(nuevoUsuario._id).select("-password -resetCode -resetCodeExpires");
    
    res.status(201).json(usuarioResponse);
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ error: "Error al crear el usuario: " + error.message });
  }
});

// Actualizar un usuario
router.put("/:id", async (req, res) => {
  try {
    const { nombre, apellidoPaterno, apellidoMaterno, email, password, direccion, imagenUrl, imagenPublicId } = req.body;
    
    // Verificar existencia del usuario
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    // Verificar que el email no esté en uso por otro usuario
    if (email !== usuario.email) {
      const emailEnUso = await Usuario.findOne({ email });
      if (emailEnUso) {
        return res.status(400).json({ error: "Este correo electrónico ya está en uso por otro usuario" });
      }
    }
    
    // Si la imagen ha cambiado y teníamos una imagen anterior en Cloudinary, la eliminamos
    if (usuario.imagenPublicId && 
        imagenPublicId && 
        usuario.imagenPublicId !== imagenPublicId) {
      try {
        await deleteImage(usuario.imagenPublicId);
      } catch (cloudinaryError) {
        console.error("Error al eliminar imagen anterior de Cloudinary:", cloudinaryError);
        // Continuamos con la actualización incluso si falla la eliminación
      }
    }
    
    // Preparar datos de actualización
    const datosActualizacion = {
      nombre: nombre || usuario.nombre,
      apellidoPaterno: apellidoPaterno !== undefined ? apellidoPaterno : usuario.apellidoPaterno,
      apellidoMaterno: apellidoMaterno !== undefined ? apellidoMaterno : usuario.apellidoMaterno,
      email: email || usuario.email,
      direccion: direccion !== undefined ? direccion : usuario.direccion,
      imagenUrl: imagenUrl !== undefined ? imagenUrl : usuario.imagenUrl,
      imagenPublicId: imagenPublicId !== undefined ? imagenPublicId : usuario.imagenPublicId
    };
    
    // Actualizar contraseña si se proporciona
    if (password) {
      const salt = await bcrypt.genSalt(10);
      datosActualizacion.password = await bcrypt.hash(password, salt);
    }
    
    // Actualizar usuario
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      req.params.id,
      datosActualizacion,
      { new: true }
    ).select("-password -resetCode -resetCodeExpires");
    
    res.json(usuarioActualizado);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error al actualizar el usuario: " + error.message });
  }
});

// Eliminar un usuario
router.delete("/:id", async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    // Si el usuario tiene una imagen en Cloudinary, la eliminamos
    if (usuario.imagenPublicId) {
      try {
        await deleteImage(usuario.imagenPublicId);
      } catch (cloudinaryError) {
        console.error("Error al eliminar imagen de Cloudinary:", cloudinaryError);
        // Continuamos con la eliminación del usuario incluso si falla la eliminación de la imagen
      }
    }
    
    // Eliminar el usuario
    await Usuario.findByIdAndDelete(req.params.id);
    
    res.json({ mensaje: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ error: "Error al eliminar el usuario: " + error.message });
  }
});

module.exports = router;