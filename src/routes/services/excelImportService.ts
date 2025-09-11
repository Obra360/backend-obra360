import * as ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ImportResult {
  success: boolean;
  row: number;
  data?: any;
  error?: string;
}

export async function processExcelImport(
  buffer: Buffer,
  companyId: string,
): Promise<{
  results: ImportResult[];
  summary: { total: number; success: number; errors: number };
}> {
  const workbook = new ExcelJS.Workbook();

  // Fix Buffer type issue
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error("No worksheet found in Excel file");
  }

  const results: ImportResult[] = [];
  const rows = worksheet.getRows(2, worksheet.rowCount - 1); // Skip header row

  if (!rows) {
    throw new Error("No data rows found");
  }

  // Get company obras for validation - FIXED: using 'empresa' field
  const companyObras = await prisma.obra.findMany({
    where: { companyId },
    select: { id: true, empresa: true }, // Changed from 'nombre' to 'empresa'
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // Excel row number (accounting for header)

    try {
      // Extract data from Excel row
      const codigo = row.getCell(1).value?.toString()?.trim();
      const nombre = row.getCell(2).value?.toString()?.trim();
      const obraAsociada = row.getCell(3).value?.toString()?.trim();
      const unidad = row.getCell(4).value?.toString()?.trim();
      const stock = parseFloat(row.getCell(5).value?.toString() || "0");
      const precioUnit = parseFloat(row.getCell(6).value?.toString() || "0");
      const fechaIngreso = (row.getCell(7).value as Date) || new Date();

      // Validation
      if (!codigo) {
        results.push({
          success: false,
          row: rowNumber,
          error: "Código es requerido",
        });
        continue;
      }
      if (!nombre) {
        results.push({
          success: false,
          row: rowNumber,
          error: "Nombre es requerido",
        });
        continue;
      }
      if (!unidad) {
        results.push({
          success: false,
          row: rowNumber,
          error: "Unidad es requerida",
        });
        continue;
      }
      if (isNaN(stock) || stock < 0) {
        results.push({
          success: false,
          row: rowNumber,
          error: "Stock debe ser un número válido",
        });
        continue;
      }
      if (isNaN(precioUnit) || precioUnit < 0) {
        results.push({
          success: false,
          row: rowNumber,
          error: "Precio unitario debe ser un número válido",
        });
        continue;
      }

      // Find obra if specified - FIXED: using 'empresa' field
      let obraId = null;
      if (obraAsociada) {
        const obra = companyObras.find(
          (o) => o.empresa.toLowerCase() === obraAsociada.toLowerCase(), // Changed from 'nombre' to 'empresa'
        );
        if (!obra) {
          results.push({
            success: false,
            row: rowNumber,
            error: `Obra "${obraAsociada}" no encontrada en la empresa`,
          });
          continue;
        }
        obraId = obra.id;
      }

      // Calculate precio total
      const precioTotal = stock * precioUnit;

      // Create material with companyId
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
          companyId: companyId, // Add companyId to materials
        },
        include: { Obra: true },
      });

      results.push({ success: true, row: rowNumber, data: material });
    } catch (error: any) {
      console.error("Error processing row:", error);
      results.push({
        success: false,
        row: rowNumber,
        error: error.message || "Error desconocido",
      });
    }
  }

  const summary = {
    total: results.length,
    success: results.filter((r) => r.success).length,
    errors: results.filter((r) => !r.success).length,
  };

  return { results, summary };
}
