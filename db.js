require("dotenv").config(); // Cargar variables de entorno
const { MongoClient, ServerApiVersion } = require("mongodb");

// Validar si MONGO_URI está definido
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR: La variable MONGO_URI no está definida en .env");
  process.exit(1);
}

const uri = process.env.MONGO_URI; // Leer la URI desde .env

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true, // Forzar uso de TLS
  tlsAllowInvalidCertificates: true, // Permitir certificados inválidos si hay problemas con OpenSSL
});

async function connectDB() {
  try {
    await client.connect();
    console.log("✅ Conexión exitosa a MongoDB Atlas");
    return client.db(); // Se conecta a la base de datos definida en la URI
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB:", error);
    process.exit(1);
  }
}

module.exports = connectDB;
