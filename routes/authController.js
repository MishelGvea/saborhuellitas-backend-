// routes/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");

// Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Función para generar token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d", // Token válido por 30 días
  });
};

// Login de usuario
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Busca al usuario por su email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Correo o contraseña incorrectos." });
    }

    // Compara la contraseña proporcionada con la almacenada
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: "Correo o contraseña incorrectos." });
    }

    // Generar token JWT
    const token = generateToken(user._id);

    // Si todo está bien, devuelve los datos del usuario y el token
    const userData = {
      _id: user._id,
      nombre: user.nombre,
      email: user.email,
      direccion: user.direccion,
      fechaRegistro: user.fechaRegistro,
      role: user.role || "user"
    };

    res.status(200).json({ 
      message: "Login exitoso", 
      usuario: userData,
      token
    });
  } catch (err) {
    console.error("Error durante el login:", err);
    res.status(500).json({ error: "Error al conectar con el servidor." });
  }
};

// Registro de usuario
exports.register = async (req, res) => {
  const { nombre, apellidoPaterno, apellidoMaterno, email, password, direccion } = req.body;

  // Validación de campos obligatorios
  if (!nombre || !apellidoPaterno || !apellidoMaterno || !email || !password || !direccion) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  try {
    // Verifica si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "El correo electrónico ya está registrado." });
    }

    // Hashea la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crea un nuevo usuario
    const newUser = new User({
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      email,
      password: hashedPassword,
      direccion,
    });

    // Guarda el usuario en la base de datos
    await newUser.save();

    // Genera token para autenticación inmediata
    const token = generateToken(newUser._id);

    // Respuesta exitosa
    res.status(201).json({
      message: "Usuario registrado exitosamente.",
      usuario: {
        _id: newUser._id,
        nombre: newUser.nombre,
        email: newUser.email,
        role: newUser.role
      },
      token
    });
  } catch (err) {
    console.error("Error durante el registro:", err);
    res.status(500).json({ error: `Error al registrar el usuario: ${err.message}` });
  }
};

// Obtener perfil de usuario
exports.getPerfil = async (req, res) => {
  try {
    // El usuario viene del middleware de autenticación
    const usuario = req.usuario;

    res.status(200).json({
      success: true,
      data: usuario
    });
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener perfil de usuario",
      error: error.message
    });
  }
};

// Actualizar perfil de usuario
exports.updatePerfil = async (req, res) => {
  try {
    const { nombre, apellidoPaterno, apellidoMaterno, direccion } = req.body;
    const usuarioId = req.usuario._id;

    // Verificamos campos
    const actualizacion = {};
    if (nombre) actualizacion.nombre = nombre;
    if (apellidoPaterno) actualizacion.apellidoPaterno = apellidoPaterno;
    if (apellidoMaterno) actualizacion.apellidoMaterno = apellidoMaterno;
    if (direccion) actualizacion.direccion = direccion;

    // Actualizamos el usuario
    const usuarioActualizado = await User.findByIdAndUpdate(
      usuarioId,
      actualizacion,
      { new: true, select: '-password -resetCode -resetCodeExpires' }
    );

    if (!usuarioActualizado) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    res.status(200).json({
      success: true,
      message: "Perfil actualizado correctamente",
      data: usuarioActualizado
    });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar perfil de usuario",
      error: error.message
    });
  }
};

// Cambiar contraseña
exports.cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    const usuarioId = req.usuario._id;

    // Verificar datos
    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({
        success: false,
        message: "La contraseña actual y la nueva son requeridas"
      });
    }

    // Obtener usuario con contraseña
    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    // Verificar contraseña actual
    const esPasswordValida = await bcrypt.compare(passwordActual, usuario.password);
    if (!esPasswordValida) {
      return res.status(400).json({
        success: false,
        message: "La contraseña actual es incorrecta"
      });
    }

    // Hashear nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordNueva, salt);

    // Actualizar contraseña
    usuario.password = hashedPassword;
    await usuario.save();

    res.status(200).json({
      success: true,
      message: "Contraseña actualizada correctamente"
    });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).json({
      success: false,
      message: "Error al cambiar contraseña",
      error: error.message
    });
  }
};

// Solicitar recuperación de contraseña
exports.solicitarRecuperacion = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "El correo electrónico es obligatorio." });
  }

  try {
    // 1. Verificar si el correo existe en la base de datos
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "El correo no está registrado." });
    }

    // 2. Generar un código de verificación
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString(); // Código de 6 dígitos
    const resetCodeExpires = Date.now() + 3600000; // Expira en 1 hora (3600000 ms)

    // 3. Guardar el código en la base de datos
    user.resetCode = resetCode;
    user.resetCodeExpires = resetCodeExpires;
    await user.save();

    // 4. Configurar el correo electrónico
    const mailOptions = {
      from: process.env.EMAIL_USER, // Correo del remitente
      to: email, // Correo del destinatario
      subject: "Código de Verificación para Recuperar Contraseña", // Asunto
      text: `Tu código de verificación es: ${resetCode}. Este código expirará en 1 hora.`, // Cuerpo del correo
    };

    // 5. Enviar el correo
    await transporter.sendMail(mailOptions);

    // 6. Respuesta exitosa
    res.status(200).json({ message: "Si el correo está registrado, recibirás un código de verificación." });
  } catch (err) {
    console.error("Error detallado en solicitar-recuperacion:", err);
    res.status(500).json({ 
      error: "Error al procesar la solicitud.", 
      details: err.message,
    });
  }
};

// Verificar código de recuperación
exports.verificarCodigo = async (req, res) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({ error: "El correo y el código son obligatorios." });
  }

  try {
    // Buscar usuario
    const user = await User.findOne({ 
      email,
      resetCode: code,
      resetCodeExpires: { $gt: Date.now() } // Verifica que el código no haya expirado
    });
    
    if (!user) {
      return res.status(400).json({ error: "Código inválido o expirado." });
    }

    // Código válido
    res.status(200).json({ message: "Código verificado correctamente." });
  } catch (err) {
    console.error("Error al verificar código:", err);
    res.status(500).json({ error: "Error al verificar el código." });
  }
};

// Cambiar contraseña con código
exports.cambiarContrasena = async (req, res) => {
  const { email, code, newPassword } = req.body;
  
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  try {
    // Buscar usuario con código válido
    const user = await User.findOne({ 
      email,
      resetCode: code,
      resetCodeExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ error: "Código inválido o expirado." });
    }

    // Hashear nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Actualizar contraseña y eliminar código de recuperación
    user.password = hashedPassword;
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Contraseña cambiada exitosamente." });
  } catch (err) {
    console.error("Error al cambiar contraseña:", err);
    res.status(500).json({ error: "Error al cambiar la contraseña." });
  }
};

// Verificar token JWT
exports.verificarToken = async (req, res) => {
  try {
    // El middleware de autenticación ya verificó el token
    // Si llegamos aquí, el token es válido
    res.status(200).json({
      success: true,
      message: "Token válido",
      usuario: {
        _id: req.usuario._id,
        nombre: req.usuario.nombre,
        email: req.usuario.email,
        role: req.usuario.role
      }
    });
  } catch (error) {
    console.error("Error al verificar token:", error);
    res.status(500).json({
      success: false,
      message: "Error al verificar token",
      error: error.message
    });
  }
};