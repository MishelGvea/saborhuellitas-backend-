// check-models.js
// Script para verificar la estructura de los modelos
const mongoose = require('mongoose');
const { Dispensador } = require('./models/Dispensador');

// 1. Verificar estructura de los esquemas sin intentar convertir todo a JSON
console.log('📋 Estructura del esquema Dispensador:');
// Obtener los nombres de las propiedades/paths
const paths = Object.keys(Dispensador.schema.paths);
console.log('Propiedades/Paths:', paths);

// Para cada path, mostrar su tipo
console.log('\nDetalles de cada propiedad:');
paths.forEach(path => {
  const type = Dispensador.schema.paths[path].instance || 'Mixed';
  console.log(`- ${path}: ${type}`);
});

// Mostrar las colecciones donde se guardarán los documentos
console.log('\n📁 Colecciones:');
console.log(`- Dispensador: ${Dispensador.collection.name}`);

// Mostrar métodos disponibles
console.log('\n🔧 Métodos disponibles en Dispensador:');
console.log(Object.keys(Dispensador));

console.log('\n🔧 Métodos en el prototype de Dispensador:');
console.log(Object.getOwnPropertyNames(Dispensador.prototype));

// Verificar que podemos crear una instancia
console.log('\n✅ Creando una instancia de prueba:');
const testDispensador = new Dispensador({
  _id: 'test-dispensador',
  nombre: 'Dispensador de Prueba'
});
console.log('Instancia creada:', testDispensador._id, testDispensador.nombre);

console.log('\n✅ Verificación completada');