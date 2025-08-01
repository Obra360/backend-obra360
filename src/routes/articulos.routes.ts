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

    // Esta lógica parece específica para otro modelo,
    // el modelo Articulo no tiene un campo 'role'.
    // Se deja vacío para que los roles no-admin puedan ver los artículos.
    if (userRole === 'OPERARIO') {
      // whereClause = { role: 'OPERARIO' }; // El modelo Articulo no tiene 'role'
    } else if (userRole !== 'ADMIN' && userRole !== 'SUPERVISOR') {
      // Si no es admin o supervisor, podría no ver nada o ver una lista filtrada.
      // Por ahora, se permite ver todo.
    }

    // CORREGIDO: El modelo se llama 'Articulo', por lo que el cliente usa 'articulo' en minúscula.
    const articulos = await prisma.articulo.findMany({
      where: whereClause,
    });

    res.json(articulos);

  } catch (error) {
    console.error('Error al obtener artículos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
