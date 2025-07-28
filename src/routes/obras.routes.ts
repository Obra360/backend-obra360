import { Router } from 'express';
import { prisma } from '../lib/prisma.js'; // Asumimos una instancia única de Prisma

const router = Router();

router.get('/', async (req, res) => {
  try {

    const userRole = req.user?.role;

    let whereClause = {};

    //Aplica la lógica de filtrado según el rol.
    if (userRole === 'OPERARIO') {
      whereClause = {
        role: 'OPERARIO'
      };
    } else if (userRole !== 'ADMIN') {
        
      return res.json([]);
    }
    // Si es ADMIN, `whereClause` se queda como un objeto vacío `{}`,
    // lo que significa que Prisma no aplicará ningún filtro y devolverá todo.

    //Ejecuta la consulta con el filtro dinámico.
    const obras = await prisma.obra.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json(obras);

  } catch (error) {
    console.error('Error al obtener obras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;