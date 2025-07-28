import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userRole = req.user?.role;
    let whereClause = {};

    if (userRole === 'OPERARIO') {
      whereClause = { role: 'OPERARIO' };
    } else if (userRole !== 'ADMIN') {
      return res.json([]);
    }

    // La única línea que cambia es esta:
    const salarios = await prisma.salario.findMany({
      where: whereClause,
    });

    res.json(salarios);

  } catch (error) {
    console.error('Error al obtener artículos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;