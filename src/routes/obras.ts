import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ==================== INTERFACES PARA TIPADO ====================

interface CreateObraRequest {
  empresa: string;
  tipo: string;
  ciudad: string;
}

interface UpdateObraRequest {
  empresa?: string;
  tipo?: string;
  ciudad?: string;
}

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

// ==================== RUTAS DE OBRAS ====================

// POST /api/obras - Crear nueva obra
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { empresa, tipo, ciudad }: CreateObraRequest = req.body;
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }
    const userId = req.user.id;

    // CORREGIDO: 'userId' ahora es 'userId'
    const nuevaObra = await prisma.obra.create({
      data: {
        empresa: empresa.trim(),
        tipo,
        ciudad: ciudad.trim(),
        userId: userId // Corregido
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } }
    });
    res.status(201).json({ message: 'Obra creada exitosamente', obra: nuevaObra });
  } catch (error) {
    console.error('Error al crear obra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/obras - Obtener todas las obras
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const obras = await prisma.obra.findMany({
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(obras);
  } catch (error) {
    console.error('Error al obtener obras:', error);
    res.status(500).json({ error: 'Error al obtener obras' });
  }
});

// GET /api/obras/:id - Obtener una obra específica
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validar que el ID sea un UUID válido
    if (!isValidUUID(id)) {
      res.status(400).json({ error: 'ID de obra inválido' });
      return;
    }
    
    const obra = await prisma.obra.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        articulos: {
          include: {
            movimientos: true
          }
        }
      }
    });

    if (!obra) {
      res.status(404).json({ error: 'Obra no encontrada' });
      return;
    }

    res.json(obra);
  } catch (error) {
    console.error('Error al obtener obra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// GET /api/obras/:id/articulos - Obtener artículos de una obra
router.get('/:id/articulos', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const obra = await prisma.obra.findUnique({
      where: { id },
      include: {
        articulos: {
          include: {
            movimientos: {
              orderBy: {
                // CORREGIDO: 'Fecha_transaccion' ahora es 'fechaTransaccion'
                fechaTransaccion: 'desc'
              }
            }
          },
          orderBy: {
            // CORREGIDO: 'Nombre' ahora es 'nombre'
            nombre: 'asc'
          }
        }
      }
    });

    if (!obra) {
      res.status(404).json({ error: 'Obra no encontrada' });
      return;
    }
    res.json({ obraId: obra.id, empresa: obra.empresa, articulos: obra.articulos });
  } catch (error) {
    console.error('Error al obtener artículos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// PUT /api/obras/:id - Actualizar obra
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData: UpdateObraRequest = req.body;
        if (!req.user) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        const obraExistente = await prisma.obra.findUnique({ where: { id } });
        if (!obraExistente) {
            res.status(404).json({ error: 'Obra no encontrada' });
            return;
        }
        // CORREGIDO: 'userId' ahora es 'userId'
        if (obraExistente.userId !== req.user.id && !['ADMIN', 'SUPERVISOR'].includes(req.user.role)) {
            res.status(403).json({ error: 'No tienes permisos para editar esta obra' });
            return;
        }
        const obraActualizada = await prisma.obra.update({
            where: { id },
            data: updateData,
        });
        res.json({ message: 'Obra actualizada exitosamente', obra: obraActualizada });
    } catch (error) {
        console.error('Error al actualizar obra:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// DELETE /api/obras/:id - Eliminar obra
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!req.user) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        const obraExistente = await prisma.obra.findUnique({
            where: { id },
            include: { articulos: true }
        });
        if (!obraExistente) {
            res.status(404).json({ error: 'Obra no encontrada' });
            return;
        }
        // CORREGIDO: 'userId' ahora es 'userId'
        if (obraExistente.userId !== req.user.id && !['ADMIN', 'SUPERVISOR'].includes(req.user.role)) {
            res.status(403).json({ error: 'No tienes permisos para eliminar esta obra' });
            return;
        }
        if (obraExistente.articulos.length > 0) {
            res.status(400).json({ error: 'No se puede eliminar la obra porque tiene artículos asociados' });
            return;
        }
        await prisma.obra.delete({ where: { id } });
        res.json({ message: 'Obra eliminada correctamente', obraId: id });
    } catch (error) {
        console.error('Error al eliminar obra:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ==================== FUNCIONES DE UTILIDAD ====================

function validateObraData(data: CreateObraRequest): string[] {
  const errors: string[] = [];
  
  if (!data.empresa || !data.empresa.trim()) {
    errors.push('El nombre de la empresa es requerido');
  }
  
  if (!data.tipo) {
    errors.push('El tipo de obra es requerido');
  } else {
    const tiposValidos = ['Obra privada', 'Obra pública'];
    if (!tiposValidos.includes(data.tipo)) {
      errors.push('Tipo de obra inválido. Debe ser "Obra privada" o "Obra pública"');
    }
  }
  
  if (!data.ciudad || !data.ciudad.trim()) {
    errors.push('La ciudad es requerida');
  }
  
  return errors;
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}



export default router;
