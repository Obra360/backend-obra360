import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import ExcelJS from 'exceljs';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Excel processing function (moved here to avoid import issues)
interface ImportResult {
  success: boolean;
  row: number;
  data?: any;
  error?: string;
}

async function processExcelImport(
  buffer: Buffer, 
  companyId: string
): Promise<{ results: ImportResult[], summary: { total: number, success: number, errors: number } }> {
  const workbook = new ExcelJS.Workbook();
  
  await workbook.xlsx.load(buffer as any);
  
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }

  const results: ImportResult[] = [];
  const rows = worksheet.getRows(2, worksheet.rowCount - 1);

  if (!rows) {
    throw new Error('No data rows found');
  }

  const companyObras = await prisma.obra.findMany({
    where: { companyId },
    select: { id: true, empresa: true }
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    try {
      const codigo = row.getCell(1).value?.toString()?.trim();
      const nombre = row.getCell(2).value?.toString()?.trim();
      const obraAsociada = row.getCell(3).value?.toString()?.trim();
      const unidad = row.getCell(4).value?.toString()?.trim();
      const stock = parseFloat(row.getCell(5).value?.toString() || '0');
      const precioUnit = parseFloat(row.getCell(6).value?.toString() || '0');
      const fechaIngreso = row.getCell(7).value as Date || new Date();

      if (!codigo) {
        results.push({ success: false, row: rowNumber, error: 'Código es requerido' });
        continue;
      }
      if (!nombre) {
        results.push({ success: false, row: rowNumber, error: 'Nombre es requerido' });
        continue;
      }
      if (!unidad) {
        results.push({ success: false, row: rowNumber, error: 'Unidad es requerida' });
        continue;
      }
      if (isNaN(stock) || stock < 0) {
        results.push({ success: false, row: rowNumber, error: 'Stock debe ser un número válido' });
        continue;
      }
      if (isNaN(precioUnit) || precioUnit < 0) {
        results.push({ success: false, row: rowNumber, error: 'Precio unitario debe ser un número válido' });
        continue;
      }

      let obraId = null;
      if (obraAsociada) {
        const obra = companyObras.find(o => 
          o.empresa.toLowerCase() === obraAsociada.toLowerCase()
        );
        if (!obra) {
          results.push({ 
            success: false, 
            row: rowNumber, 
            error: `Obra "${obraAsociada}" no encontrada en la empresa` 
          });
          continue;
        }
        obraId = obra.id;
      }

      const precioTotal = stock * precioUnit;

      const material = await prisma.materiales.create({
        data: {
          codigo_interno: codigo,
          nombre,
          unidad,
          cantidad: stock,
          precio: precioUnit,
          precio_total: precioTotal,
          obra_id: obraId,
          fecha_ingreso: fechaIngreso,
          companyId: companyId
        },
        include: { Obra: true }
      });

      results.push({ success: true, row: rowNumber, data: material });

    } catch (error: any) {
      console.error('Error processing row:', error);
      results.push({ 
        success: false, 
        row: rowNumber, 
        error: error.message || 'Error desconocido' 
      });
    }
  }

  const summary = {
    total: results.length,
    success: results.filter(r => r.success).length,
    errors: results.filter(r => !r.success).length
  };

  return { results, summary };
}

// GET - List materials (Company-wide)
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { obraId } = req.query;

    const where: any = {
      Obra: { companyId: req.companyId }
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

    const obra = await prisma.obra.findFirst({
      where: { 
        id: obraId, 
        companyId: req.companyId
      }
    });
    
    if (!obra) {
      return res.status(403).json({ error: 'Obra not found or not in your company' });
    }

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

// POST - Import materials from Excel
router.post('/importar', upload.single('excel'), async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.companyId) {
      return res.status(400).json({ error: 'Company ID not found' });
    }

    const { results, summary } = await processExcelImport(req.file.buffer, req.companyId);

    res.json({
      message: 'Import completed',
      summary,
      results
    });

  } catch (error: any) {
    console.error('Error importing Excel:', error);
    res.status(500).json({ error: error.message || 'Failed to import Excel file' });
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

    const existingMaterial = await prisma.materiales.findFirst({
      where: { 
        id, 
        Obra: { companyId: req.companyId }
      }
    });

    if (!existingMaterial) {
      return res.status(403).json({ error: 'Material not found or not in your company' });
    }

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

    const material = await prisma.materiales.findFirst({
      where: { 
        id, 
        Obra: { companyId: req.companyId }
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