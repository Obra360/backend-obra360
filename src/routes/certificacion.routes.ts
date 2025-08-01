import { Router, Request, Response } from 'express';
import { PrismaClient, EstadoCertificacion, ItemCertificado } from '@prisma/client';
import { authenticate } from '../middlewares/auth.js';

const router = Router();
const prisma = new PrismaClient();

// ==================== INTERFACES ====================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface CreateCertificacionData {
  obra: string;
  tipoCertificacion: string;
  fecha: string;
  items: {
    codigo: string;
    descripcion: string;
    unidad: string;
    cantidad: number;
    precio: number;
  }[];
}

interface UpdateCertificacionData {
  obra?: string;
  tipoCertificacion?: string;
  fecha?: string;
  estado?: EstadoCertificacion;
}

// ==================== RUTAS ====================

// GET /api/certificaciones - Obtener todas las certificaciones
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { obra, estado, fecha, mes, ano } = req.query;
    const currentUser = req.user;

    const where: any = {};

    if (obra && typeof obra === 'string') where.obra = obra;
    if (estado && typeof estado === 'string') where.estado = estado as EstadoCertificacion;
    if (fecha && typeof fecha === 'string') where.fecha = new Date(fecha + 'T00:00:00.000Z');

    if (mes && ano && typeof mes === 'string' && typeof ano === 'string') {
      const startDate = new Date(`${ano}-${mes.padStart(2, '0')}-01T00:00:00.000Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      where.fecha = { gte: startDate, lt: endDate };
    }

    if (currentUser && currentUser.role === 'OPERARIO') {
      where.createdBy = currentUser.id;
    }

    const certificaciones = await prisma.certificacion.findMany({
      where,
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        user: { // CORREGIDO: la relación se llama 'user'
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }]
    });

    const certificacionesFormateadas = certificaciones.map(cert => ({
      id: cert.id,
      obra: cert.obra,
      tipoCertificacion: cert.tipoCertificacion,
      fecha: cert.fecha.toISOString().split('T')[0],
      estado: cert.estado,
      total: parseFloat(cert.total.toString()),
      cantidadItems: cert.items.length,
      createdAt: cert.createdAt,
      updatedAt: cert.updatedAt,
      createdBy: cert.user ? { // CORREGIDO: acceder a 'cert.user'
        id: cert.user.id,
        nombre: `${cert.user.firstName} ${cert.user.lastName}`,
        email: cert.user.email
      } : null,
      items: cert.items.map((item: ItemCertificado) => ({ // CORREGIDO: Añadido tipo explícito
        id: item.id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: parseFloat(item.cantidad.toString()),
        precio: parseFloat(item.precio.toString()),
        subtotal: parseFloat(item.subtotal.toString())
      }))
    }));

    res.json(certificacionesFormateadas);

  } catch (error) {
    console.error('❌ Error obteniendo certificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/certificaciones - Crear nueva certificación
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { obra, tipoCertificacion, fecha, items }: CreateCertificacionData = req.body;
    const currentUser = req.user;

    if (!obra || !tipoCertificacion || !fecha || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Faltan campos obligatorios: obra, tipoCertificacion, fecha, items' });
      return;
    }

    const total = items.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);

    const certificacion = await prisma.$transaction(async (tx) => {
      const newCert = await tx.certificacion.create({
        data: {
          obra,
          tipoCertificacion,
          fecha: new Date(fecha + 'T00:00:00.000Z'),
          total,
          estado: EstadoCertificacion.PENDIENTE,
          createdBy: currentUser?.id || null
        }
      });

      const itemsData = items.map(item => ({
        certificacionId: newCert.id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: item.cantidad,
        precio: item.precio,
        subtotal: item.cantidad * item.precio
      }));

      await tx.itemCertificado.createMany({ data: itemsData });
      return newCert;
    });

    const certificacionCompleta = await prisma.certificacion.findUnique({
      where: { id: certificacion.id },
      include: {
        items: true,
        user: { // CORREGIDO: la relación se llama 'user'
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!certificacionCompleta) {
        res.status(404).json({ error: 'No se pudo encontrar la certificación recién creada.' });
        return;
    }

    res.status(201).json({
      message: 'Certificación creada exitosamente',
      certificacion: {
        id: certificacionCompleta.id,
        obra: certificacionCompleta.obra,
        tipoCertificacion: certificacionCompleta.tipoCertificacion,
        fecha: certificacionCompleta.fecha.toISOString().split('T')[0],
        estado: certificacionCompleta.estado,
        total: parseFloat(certificacionCompleta.total.toString()),
        cantidadItems: certificacionCompleta.items.length,
        createdBy: certificacionCompleta.user ? // CORREGIDO: acceder a 'user'
          `${certificacionCompleta.user.firstName} ${certificacionCompleta.user.lastName}` : null
      }
    });

  } catch (error) {
    console.error('❌ Error creando certificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/certificaciones/:id - Obtener certificación específica
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const certificacion = await prisma.certificacion.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        user: { // CORREGIDO: la relación se llama 'user'
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!certificacion) {
      res.status(404).json({ error: 'Certificación no encontrada' });
      return;
    }

    if (currentUser && currentUser.role === 'OPERARIO' && certificacion.createdBy !== currentUser.id) {
      res.status(403).json({ error: 'Solo puedes ver certificaciones que has creado' });
      return;
    }

    const certificacionFormateada = {
      id: certificacion.id,
      obra: certificacion.obra,
      tipoCertificacion: certificacion.tipoCertificacion,
      fecha: certificacion.fecha.toISOString().split('T')[0],
      estado: certificacion.estado,
      total: parseFloat(certificacion.total.toString()),
      createdAt: certificacion.createdAt,
      updatedAt: certificacion.updatedAt,
      createdBy: certificacion.user ? { // CORREGIDO: acceder a 'user'
        id: certificacion.user.id,
        nombre: `${certificacion.user.firstName} ${certificacion.user.lastName}`,
        email: certificacion.user.email
      } : null,
      items: certificacion.items.map((item: ItemCertificado) => ({ // CORREGIDO: tipo explícito
        id: item.id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: parseFloat(item.cantidad.toString()),
        precio: parseFloat(item.precio.toString()),
        subtotal: parseFloat(item.subtotal.toString())
      }))
    };

    res.json(certificacionFormateada);

  } catch (error) {
    console.error('❌ Error obteniendo certificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/certificaciones/:id - Actualizar certificación
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateCertificacionData = req.body;
    const currentUser = req.user;

    const certificacionExistente = await prisma.certificacion.findUnique({ where: { id } });

    if (!certificacionExistente) {
      res.status(404).json({ error: 'Certificación no encontrada' });
      return;
    }

    if (currentUser && currentUser.role === 'OPERARIO' && certificacionExistente.createdBy !== currentUser.id) {
      res.status(403).json({ error: 'Solo puedes editar certificaciones que has creado' });
      return;
    }

    const datosActualizacion: any = {};
    if (updateData.obra) datosActualizacion.obra = updateData.obra;
    if (updateData.tipoCertificacion) datosActualizacion.tipoCertificacion = updateData.tipoCertificacion;
    if (updateData.fecha) datosActualizacion.fecha = new Date(updateData.fecha + 'T00:00:00.000Z');
    if (updateData.estado) datosActualizacion.estado = updateData.estado;

    const certificacionActualizada = await prisma.certificacion.update({
      where: { id },
      data: datosActualizacion,
      include: {
        items: true,
        user: { // CORREGIDO: la relación se llama 'user'
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      message: 'Certificación actualizada correctamente',
      certificacion: {
        id: certificacionActualizada.id,
        obra: certificacionActualizada.obra,
        tipoCertificacion: certificacionActualizada.tipoCertificacion,
        fecha: certificacionActualizada.fecha.toISOString().split('T')[0],
        estado: certificacionActualizada.estado,
        total: parseFloat(certificacionActualizada.total.toString()),
        cantidadItems: certificacionActualizada.items.length
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando certificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/certificaciones/:id - Eliminar certificación
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const certificacion = await prisma.certificacion.findUnique({ where: { id } });

    if (!certificacion) {
      res.status(404).json({ error: 'Certificación no encontrada' });
      return;
    }

    if (currentUser && currentUser.role === 'OPERARIO' && certificacion.createdBy !== currentUser.id) {
      res.status(403).json({ error: 'Solo puedes eliminar certificaciones que has creado' });
      return;
    }

    if (['APROBADA', 'PAGADA'].includes(certificacion.estado)) {
      res.status(400).json({ error: 'No se puede eliminar una certificación aprobada o pagada' });
      return;
    }

    await prisma.certificacion.delete({ where: { id } });
    res.json({ message: 'Certificación eliminada correctamente' });

  } catch (error) {
    console.error('❌ Error eliminando certificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/certificaciones/stats/resumen - Obtener estadísticas
router.get('/stats/resumen', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user;
    const whereClause = currentUser && currentUser.role === 'OPERARIO' ? { createdBy: currentUser.id } : {};

    const [
      totalCertificaciones,
      certificacionesPendientes,
      certificacionesCompletas,
      certificacionesAprobadas,
      totalMonto
    ] = await Promise.all([
      prisma.certificacion.count({ where: whereClause }),
      prisma.certificacion.count({ where: { ...whereClause, estado: 'PENDIENTE' } }),
      prisma.certificacion.count({ where: { ...whereClause, estado: 'COMPLETA' } }),
      prisma.certificacion.count({ where: { ...whereClause, estado: 'APROBADA' } }),
      prisma.certificacion.aggregate({
        where: whereClause,
        _sum: { total: true }
      })
    ]);

    const resumenPorObra = await prisma.certificacion.groupBy({
      by: ['obra'],
      where: whereClause,
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } }
    });

    const resumen = {
      totalCertificaciones,
      certificacionesPendientes,
      certificacionesCompletas,
      certificacionesAprobadas,
      totalMonto: parseFloat(totalMonto._sum.total?.toString() || '0'),
      resumenPorObra: resumenPorObra.map(item => ({
        obra: item.obra,
        cantidad: item._count._all,
        total: parseFloat(item._sum.total?.toString() || '0')
      }))
    };

    res.json(resumen);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
