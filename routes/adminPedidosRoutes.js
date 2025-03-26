// routes/adminPedidosRoutes.js
const express = require('express');
const router = express.Router();
const Pedido = require('../models/Pedido');

// Middleware para verificar si es administrador (si tienes autenticación implementada)
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    // Para desarrollo, permitimos acceso sin verificación
    next();
    // Descomenta la siguiente línea en producción:
    // res.status(403).json({ message: "Acceso denegado: Se requieren privilegios de administrador" });
  }
};

// Obtener todos los pedidos (para el panel de administración)
router.get('/', isAdmin, async (req, res) => {
  try {
    const pedidos = await Pedido.find().sort({ fechaCreacion: -1 });
    res.json(pedidos);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ error: 'Error al obtener la lista de pedidos' });
  }
});

// Actualizar el estado de un pedido
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    const estadosValidos = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];
    
    if (estado && !estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const pedidoActualizado = await Pedido.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    );
    
    if (!pedidoActualizado) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    res.json({
      mensaje: 'Pedido actualizado correctamente',
      pedido: pedidoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    res.status(500).json({ error: 'Error al actualizar el pedido' });
  }
});

// Eliminar un pedido
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const pedidoEliminado = await Pedido.findByIdAndDelete(req.params.id);
    
    if (!pedidoEliminado) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    res.json({ mensaje: 'Pedido eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar pedido:', error);
    res.status(500).json({ error: 'Error al eliminar el pedido' });
  }
});

module.exports = router;