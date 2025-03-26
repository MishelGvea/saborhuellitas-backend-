const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Usuario = require("./models/Usuario"); // Asegúrate de tener la ruta correcta al modelo

// Conexión a la base de datos
mongoose.connect("mongodb://localhost:27017/sabor_y_huellitas", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Función para actualizar las contraseñas de los usuarios
async function actualizarContraseñas() {
  const usuarios = await Usuario.find(); // Traemos todos los usuarios

  for (let usuario of usuarios) {
    // Si la contraseña está en texto plano, la ciframos
    const hashedPassword = await bcrypt.hash(usuario.password, 10);
    usuario.password = hashedPassword; // Actualizamos la contraseña con la versión cifrada
    await usuario.save(); // Guardamos el usuario con la nueva contraseña cifrada
  }

  console.log("Contraseñas actualizadas correctamente.");
  mongoose.connection.close(); // Cerrar la conexión con la base de datos
}

// Ejecutar la función
actualizarContraseñas().catch(console.error);
