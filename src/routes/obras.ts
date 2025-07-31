import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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

// ... (las rutas GET, POST, PUT, DELETE que ya tenías se mantienen aquí)

// GET /api/obras - Obtener todas las obras
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const obras = await prisma.obra.findMany({
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        }
      },
      orderBy: {
        createdAt: 'desc' // Esto ahora funcionará gracias al cambio en el schema
      }
    });
    res.json(obras);
  } catch (error) {
    console.error('Error al obtener obras:', error);
    // Ahora el log del servidor te dará el error exacto de Prisma si sigue fallando
    res.status(500).json({ error: 'Error al obtener obras' });
  }
});


// AÑADIDO: Ruta de estadísticas que faltaba
router.get('/stats/general', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Acceso denegado: solo administradores' });
      return;
    }

    const [totalObras, obrasPrivadas, obrasPublicas] = await Promise.all([
      prisma.obra.count(),
      prisma.obra.count({ where: { tipo: 'Obra privada' } }),
      prisma.obra.count({ where: { tipo: 'Obra pública' } }),
    ]);

    res.json({
      totalObras,
      obrasPrivadas,
      obrasPublicas,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de obras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// ... (resto de tus rutas de obras.ts)

export default router;
