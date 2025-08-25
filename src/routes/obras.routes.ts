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

// ==================== RUTAS DE OBRAS ====================

// POST /api/obras - Crear nueva obra
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { empresa, tipo, ciudad }: CreateObraRequest = req.body;
    
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    // Validar datos de entrada
    const errors = validateObraData(req.body);
    if (errors.length > 0) {
      res.status(400).json({ error: 'Datos inválidos', details: errors });
      return;
    }

    const nuevaObra = await prisma.obra.create({
      data: {
        empresa: empresa.trim(),
        tipo,
        ciudad: ciudad.trim(),
        userId: req.user.id,
        companyId: req.companyId! // Company filtering applied automatically
      },
      include: { 
        user: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true 
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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/obras - Obtener todas las obras (filtradas por compañía)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    
    // Base filter: always filter by company
    let whereClause: any = {
      companyId: req.companyId
    };
    
    // Additional role-based filtering within the company
    if (userRole === 'OPERARIO') {
      // OPERARIO only sees their own obras
      whereClause.userId = req.user!.id;
    }
    // ADMIN and SUPERVISOR see all obras within their company
    
    const obras = await prisma.obra.findMany({
      where: whereClause,
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
      orderBy: { empresa: 'asc' }
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
    
    if (!isValidUUID(id)) {
      res.status(400).json({ error: 'ID de obra inválido' });
      return;
    }
    
    const obra = await prisma.obra.findFirst({
      where: { 
        id,
        companyId: req.companyId // Company filtering
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
    
    const obra = await prisma.obra.findFirst({
      where: { 
        id,
        companyId: req.companyId // Company filtering
      },
      include: {
        articulos: {
          include: {
            movimientos: {
              orderBy: {
                fechaTransaccion: 'desc'
              }
            }
          },
          orderBy: {
            nombre: 'asc'
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

// PUT /api/obras/:id - Actualizar obra
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateObraRequest = req.body;
    
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }
    
    const obraExistente = await prisma.obra.findFirst({ 
      where: { 
        id,
        companyId: req.companyId // Company filtering
      } 
    });
    
    if (!obraExistente) {
      res.status(404).json({ error: 'Obra no encontrada' });
      return;
    }
    
    // Role-based authorization within company
    if (obraExistente.userId !== req.user.id && !['ADMIN', 'SUPERVISOR'].includes(req.user.role)) {
      res.status(403).json({ error: 'No tienes permisos para editar esta obra' });
      return;
    }
    
    const obraActualizada = await prisma.obra.update({
      where: { id },
      data: updateData,
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
    
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }
    
    const obraExistente = await prisma.obra.findFirst({
      where: { 
        id,
        companyId: req.companyId // Company filtering
      },
      include: { articulos: true }
    });
    
    if (!obraExistente) {
      res.status(404).json({ error: 'Obra no encontrada' });
      return;
    }
    
    // Role-based authorization within company
    if (obraExistente.userId !== req.user.id && !['ADMIN', 'SUPERVISOR'].includes(req.user.role)) {
      res.status(403).json({ error: 'No tienes permisos para eliminar esta obra' });
      return;
    }
    
    if (obraExistente.articulos.length > 0) {
      res.status(400).json({ 
        error: 'No se puede eliminar la obra porque tiene artículos asociados' 
      });
      return;
    }
    
    await prisma.obra.delete({ where: { id } });
    
    res.json({ 
      message: 'Obra eliminada correctamente', 
      obraId: id 
    });
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