import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET - List materials (Company-wide)
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { obraId } = req.query;

    const where: any = {
      Obra: { companyId: req.companyId }  // ✅ Filter by company, not user
    };
    
    if (obraId && typeof obraId === 'string') {
      where.obra_id = obraId; 
    }

    const materiales = await prisma.materiales.findMany({
      where,
      include: { Obra: true }, 
      orderBy: { created_at: 'desc' }
    });

    res.json(materiales);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// POST - Create material (Any company obra)
router.post('/', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { codigoInterno, nombre, unidad, cantidad, precio, obraId, remito, fechaIngreso } = req.body;

    // Verify obra belongs to user's company (not just user)
    const obra = await prisma.obra.findFirst({
      where: { 
        id: obraId, 
        companyId: req.companyId  // ✅ Company-based verification
      }
    });
    
    if (!obra) {
      return res.status(403).json({ error: 'Obra not found or not in your company' });
    }

    // Calculate precio total
    const precioTotal = precio && cantidad ? parseFloat(precio) * parseFloat(cantidad) : null;

    const material = await prisma.materiales.create({
      data: {
        codigo_interno: codigoInterno,
        nombre,
        unidad,
        cantidad: parseFloat(cantidad),
        precio: precio ? parseFloat(precio) : null,
        precio_total: precioTotal,
        obra_id: obraId,
        remito,
        fecha_ingreso: fechaIngreso ? new Date(fechaIngreso) : new Date()
      },
      include: { Obra: true }
    });

    res.status(201).json(material);
  } catch (error: any) {
    console.error('Error creating material:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Código interno ya existe' });
    }
    res.status(500).json({ error: 'Failed to create material' });
  }
});

// PUT - Update material (Company-wide access)
router.put('/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Verify material belongs to user's company
    const existingMaterial = await prisma.materiales.findFirst({
      where: { 
        id, 
        Obra: { companyId: req.companyId }  // ✅ Company-based verification
      }
    });

    if (!existingMaterial) {
      return res.status(403).json({ error: 'Material not found or not in your company' });
    }

    // Recalculate precio total if needed
    if (updateData.precio && updateData.cantidad) {
      updateData.precio_total = parseFloat(updateData.precio) * parseFloat(updateData.cantidad);
    }

    const material = await prisma.materiales.update({
      where: { id },
      data: updateData,
      include: { Obra: true }
    });

    res.json(material);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
});

// DELETE - Remove material (Company-wide access)
router.delete('/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;

    // Verify material belongs to user's company
    const material = await prisma.materiales.findFirst({
      where: { 
        id, 
        Obra: { companyId: req.companyId }  // ✅ Company-based verification
      }
    });

    if (!material) {
      return res.status(403).json({ error: 'Material not found or not in your company' });
    }

    await prisma.materiales.delete({ where: { id } });
    
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

export default router;