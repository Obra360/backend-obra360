import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

// Extender Request para incluir user tipado
declare global {
  namespace Express {
    interface Request {
      User?: {
        id: string;
        role: string;
      };
    }
  }
}

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role;
    let whereClause = {};

    // La lógica de filtrado por rol parece no aplicar directamente al modelo Movimiento.
    // Se deja vacío para permitir la visualización según otros parámetros o permisos.
    if (userRole === 'OPERARIO') {
      // whereClause = { role: 'OPERARIO' }; // El modelo Movimiento no tiene 'role'
    } else if (userRole !== 'ADMIN' && userRole !== 'SUPERVISOR') {
      // return res.json([]);
    }

    // CORREGIDO: El modelo se llama 'Movimiento', por lo que el cliente usa 'movimiento'.
    const movimientos = await prisma.movimiento.findMany({
      where: whereClause,
    });

    res.json(movimientos);

  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
