// routes/pedidosRoutes.js
const express = require('express');
const router = express.Router();
const Pedido = require('../models/Pedido');
const Tienda = require('../models/Tienda'); // Para verificar stock si quieres

// Generar número de referencia único
const generarNumeroReferencia = () => {
  const fecha = new Date();
  const timestamp = fecha.getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PED-${timestamp}-${random}`;
};

// Crear un nuevo pedido
router.post('/', async (req, res) => {
  try {
    const { productos, datosCliente } = req.body;
    
    // Validar datos mínimos
    if (!productos || !productos.length || !datosCliente) {
      return res.status(400).json({ error: 'Faltan datos para procesar el pedido' });
    }
    
    // Calcular total (incluye costo de envío express)
    let total = productos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    if (datosCliente.metodoEnvio === 'express') {
      total += 5; // 5 EUR adicionales por envío express
    }
    
    // Crear el pedido
    const nuevoPedido = new Pedido({
      numeroReferencia: generarNumeroReferencia(),
      productos,
      datosCliente,
      total,
      estado: 'pendiente'
    });
    
    await nuevoPedido.save();
    
    // Respuesta exitosa
    res.status(201).json({
      mensaje: 'Pedido creado correctamente',
      pedido: {
        _id: nuevoPedido._id,
        numeroReferencia: nuevoPedido.numeroReferencia,
        total: nuevoPedido.total
      }
    });
  } catch (error) {
    console.error('Error al crear pedido:', error);
    res.status(500).json({ error: 'Error al procesar el pedido' });
  }
});

// Obtener un pedido específico (para la página de confirmación)
router.get('/:id', async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    res.json(pedido);
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    res.status(500).json({ error: 'Error al obtener el pedido' });
  }
});

module.exports = router;