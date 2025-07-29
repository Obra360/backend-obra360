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

interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Extender Request para incluir user tipado
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// ==================== RUTAS DE OBRAS ====================

// GET /api/obras - Obtener todas las obras
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const obras = await prisma.obra.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
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

// POST /api/obras - Crear nueva obra
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { empresa, tipo, ciudad }: CreateObraRequest = req.body;
    
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const userId = req.user.id;

    // Validaciones
    const validationErrors = validateObraData({ empresa, tipo, ciudad });
    if (validationErrors.length > 0) {
      res.status(400).json({ 
        error: 'Datos inválidos',
        details: validationErrors
      });
      return;
    }

    const nuevaObra = await prisma.obra.create({
      data: {
        empresa: empresa.trim(),
        tipo,
        ciudad: ciudad.trim(),
        userid: userId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Obra creada exitosamente',
      obra: nuevaObra
    });
  } catch (error) {
    console.error('Error al crear obra:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor'
    });
  }
});

// PUT /api/obras/:id - Actualizar obra
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateObraRequest = req.body;
    
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Validar que el ID sea un UUID válido
    if (!isValidUUID(id)) {
      res.status(400).json({ error: 'ID de obra inválido' });
      return;
    }

    // Verificar que la obra existe
    const obraExistente = await prisma.obra.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    if (!obraExistente) {
      res.status(404).json({ error: 'Obra no encontrada' });
      return;
    }

    // Verificar permisos (solo el propietario o admin/supervisor puede editar)
    if (obraExistente.userid !== userId && !['ADMIN', 'SUPERVISOR'].includes(userRole)) {
      res.status(403).json({ 
        error: 'No tienes permisos para editar esta obra' 
      });
      return;
    }

    // Validar datos de actualización con tipado correcto
    const fieldsToUpdate: { empresa?: string; tipo?: string; ciudad?: string } = {};
    
    if (updateData.empresa !== undefined) {
      if (!updateData.empresa.trim()) {
        res.status(400).json({ error: 'El nombre de la empresa no puede estar vacío' });
        return;
      }
      fieldsToUpdate.empresa = updateData.empresa.trim();
    }
    
    if (updateData.tipo !== undefined) {
      const tiposValidos = ['Obra privada', 'Obra pública'];
      if (!tiposValidos.includes(updateData.tipo)) {
        res.status(400).json({ 
          error: 'Tipo de obra inválido. Debe ser "Obra privada" o "Obra pública"' 
        });
        return;
      }
      fieldsToUpdate.tipo = updateData.tipo;
    }
    
    if (updateData.ciudad !== undefined) {
      if (!updateData.ciudad.trim()) {
        res.status(400).json({ error: 'La ciudad no puede estar vacía' });
        return;
      }
      fieldsToUpdate.ciudad = updateData.ciudad.trim();
    }

    // Si no hay campos para actualizar
    if (Object.keys(fieldsToUpdate).length === 0) {
      res.status(400).json({ 
        error: 'No se proporcionaron campos para actualizar' 
      });
      return;
    }

    const obraActualizada = await prisma.obra.update({
      where: { id },
      data: fieldsToUpdate,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    res.json({
      message: 'Obra actualizada exitosamente',
      obra: obraActualizada
    });
  } catch (error) {
    console.error('Error al actualizar obra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/obras/:id - Eliminar obra
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Validar que el ID sea un UUID válido
    if (!isValidUUID(id)) {
      res.status(400).json({ error: 'ID de obra inválido' });
      return;
    }

    // Verificar que la obra existe
    const obraExistente = await prisma.obra.findUnique({
      where: { id },
      include: {
        articulos: true,
        user: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    if (!obraExistente) {
      res.status(404).json({ error: 'Obra no encontrada' });
      return;
    }

    // Verificar permisos (solo el propietario o admin/supervisor puede eliminar)
    if (obraExistente.userid !== userId && !['ADMIN', 'SUPERVISOR'].includes(userRole)) {
      res.status(403).json({ 
        error: 'No tienes permisos para eliminar esta obra' 
      });
      return;
    }

    // Verificar si la obra tiene artículos asociados
    if (obraExistente.articulos.length > 0) {
      res.status(400).json({ 
        error: 'No se puede eliminar la obra porque tiene artículos asociados',
        details: `La obra tiene ${obraExistente.articulos.length} artículo(s). Elimine primero los artículos.`
      });
      return;
    }

    // Eliminar la obra
    await prisma.obra.delete({
      where: { id }
    });

    res.json({ 
      message: 'Obra eliminada correctamente',
      obraId: id
    });
  } catch (error) {
    console.error('Error al eliminar obra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/obras/:id/articulos - Obtener artículos de una obra
router.get('/:id/articulos', async (req: Request, res: Response): Promise<void> => {
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
        articulos: {
          include: {
            movimientos: {
              orderBy: {
                Fecha_transaccion: 'desc'
              }
            }
          },
          orderBy: {
            Nombre: 'asc'
          }
        }
      }
    });

    if (!obra) {
      res.status(404).json({ error: 'Obra no encontrada' });
      return;
    }

    res.json({
      obraId: obra.id,
      empresa: obra.empresa,
      articulos: obra.articulos
    });
  } catch (error) {
    console.error('Error al obtener artículos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/obras/stats/general - Obtener estadísticas de obras (solo para admin)
router.get('/stats/general', async (req: Request, res: Response): Promise<void> => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    // Verificar que el usuario sea admin
    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ 
        error: 'Acceso denegado: solo administradores',
        message: 'No tienes permisos para ver estadísticas generales'
      });
      return;
    }

    const [totalObras, obrasPrivadas, obrasPublicas, obrasRecientes] = await Promise.all([
      prisma.obra.count(),
      prisma.obra.count({ where: { tipo: 'Obra privada' } }),
      prisma.obra.count({ where: { tipo: 'Obra pública' } }),
      prisma.obra.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
          }
        }
      })
    ]);

    res.json({
      totalObras,
      obrasPrivadas,
      obrasPublicas,
      obrasRecientes
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
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