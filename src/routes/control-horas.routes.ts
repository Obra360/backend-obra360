import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// ==================== PERSONAS ====================

// Obtener todas las personas
router.get('/personas', async (req, res) => {
  try {
    const personas = await prisma.personaControlHoras.findMany({
      where: { activo: true },
      orderBy: [
        { apellido: 'asc' },
        { nombre: 'asc' }
      ]
    });
    
    res.json(personas);
  } catch (error) {
    console.error('Error obteniendo personas:', error);
    res.status(500).json({ error: 'Error al obtener personas' });
  }
});

// Crear nueva persona
router.post('/personas', async (req, res) => {
  const { nombre, apellido, dni } = req.body;
  
  // Validaciones
  if (!nombre || !apellido || !dni) {
    return res.status(400).json({ 
      error: 'Todos los campos son obligatorios' 
    });
  }
  
  try {
    // Verificar DNI duplicado
    const existente = await prisma.personaControlHoras.findUnique({
      where: { dni: dni.trim() }
    });
    
    if (existente) {
      return res.status(400).json({ 
        error: 'Ya existe una persona con ese DNI' 
      });
    }
    
    const nuevaPersona = await prisma.personaControlHoras.create({
      data: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim()
      }
    });
    
    res.status(201).json(nuevaPersona);
  } catch (error) {
    console.error('Error creando persona:', error);
    res.status(500).json({ error: 'Error al crear persona' });
  }
});

// Actualizar persona
router.put('/personas/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, dni, activo } = req.body;
  
  try {
    const updateData: any = {};
    
    if (nombre !== undefined) updateData.nombre = nombre.trim();
    if (apellido !== undefined) updateData.apellido = apellido.trim();
    if (dni !== undefined) updateData.dni = dni.trim();
    if (activo !== undefined) updateData.activo = activo;
    
    const persona = await prisma.personaControlHoras.update({
      where: { id },
      data: updateData
    });
    
    res.json(persona);
  } catch (error: any) {
    console.error('Error actualizando persona:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El DNI ya existe' });
    }
    
    res.status(500).json({ error: 'Error al actualizar persona' });
  }
});

// ==================== CONTROL DE HORAS ====================

// Obtener registros de control de horas
router.get('/registros', async (req, res) => {
  const { fechaDesde, fechaHasta, personaId } = req.query;
  
  try {
    const where: any = {};
    
    // Aplicar filtros
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(fechaDesde as string);
      if (fechaHasta) where.fecha.lte = new Date(fechaHasta as string);
    }
    
    if (personaId) {
      where.personaId = personaId as string;
    }
    
    const registros = await prisma.controlHoras.findMany({
      where,
      include: {
        persona: true,
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { fecha: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    // Formatear respuesta
    const registrosFormateados = registros.map(registro => ({
      id: registro.id,
      personaId: registro.personaId,
      nombre: registro.persona.nombre,
      apellido: registro.persona.apellido,
      dni: registro.persona.dni,
      fecha: registro.fecha.toISOString().split('T')[0],
      horaEntrada: registro.horaEntrada,
      horaSalida: registro.horaSalida,
      horasExtra: registro.horasExtra?.toString() || '0',
      observaciones: registro.observaciones,
      registradoPor: registro.user ? `${registro.user.firstName} ${registro.user.lastName}` : null
    }));
    
    res.json(registrosFormateados);
  } catch (error) {
    console.error('Error obteniendo registros:', error);
    res.status(500).json({ error: 'Error al obtener registros' });
  }
});

// Registrar entrada/salida
router.post('/marcar', async (req: any, res) => {
  const { personaId, tipo, fecha, hora, esHoraExtra } = req.body;
  const userId = req.user?.id; // Usuario autenticado
  
  // Validaciones
  if (!personaId || !tipo || !fecha || !hora) {
    return res.status(400).json({ 
      error: 'Todos los campos son obligatorios' 
    });
  }
  
  if (!['entrada', 'salida'].includes(tipo)) {
    return res.status(400).json({ 
      error: 'Tipo de registro inválido' 
    });
  }
  
  try {
    // Verificar que la persona existe
    const persona = await prisma.personaControlHoras.findUnique({
      where: { id: personaId }
    });
    
    if (!persona) {
      return res.status(404).json({ 
        error: 'Persona no encontrada' 
      });
    }
    
    const fechaDate = new Date(fecha);
    fechaDate.setHours(0, 0, 0, 0);
    
    // Buscar o crear registro del día
    let registro = await prisma.controlHoras.findUnique({
      where: {
        unique_persona_fecha: {
          personaId: personaId,
          fecha: fechaDate
        }
      }
    });
    
    const updateData: any = {
      createdBy: userId
    };
    
    if (tipo === 'entrada') {
      updateData.horaEntrada = hora;
    } else {
      updateData.horaSalida = hora;
      
      // Si se marca como hora extra y ya tiene entrada
      if (esHoraExtra && registro?.horaEntrada) {
        // Convertir horaEntrada a string si es Date
        let horaEntradaStr = typeof registro.horaEntrada === 'string'
          ? registro.horaEntrada
          : registro.horaEntrada instanceof Date
            ? registro.horaEntrada.toTimeString().slice(0,5)
            : '';
        const [horaE, minE] = horaEntradaStr.split(':').map(Number);
        const [horaS, minS] = hora.split(':').map(Number);
        let totalMinutos = (horaS * 60 + minS) - (horaE * 60 + minE);
        if (totalMinutos < 0) totalMinutos += 24 * 60;
        
        // Si trabaja más de 8 horas, calcular extra
        if (totalMinutos > 480) { // 8 horas = 480 minutos
          updateData.horasExtra = parseFloat(((totalMinutos - 480) / 60).toFixed(2));
        }
      }
    }
    
    if (registro) {
      // Actualizar registro existente
      registro = await prisma.controlHoras.update({
        where: { id: registro.id },
        data: updateData,
        include: { persona: true }
      });
    } else {
      // Crear nuevo registro
      registro = await prisma.controlHoras.create({
        data: {
          personaId,
          fecha: fechaDate,
          ...updateData
        },
        include: { persona: true }
      });
    }
    
    res.json({ 
      message: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`,
      registro 
    });
  } catch (error) {
    console.error('Error registrando:', error);
    res.status(500).json({ error: 'Error al registrar' });
  }
});

// Actualizar registro
router.put('/registros/:id', async (req, res) => {
  const { id } = req.params;
  const { horaEntrada, horaSalida, horasExtra, observaciones } = req.body;
  
  try {
    const updateData: any = {};
    
    if (horaEntrada !== undefined) updateData.horaEntrada = horaEntrada || null;
    if (horaSalida !== undefined) updateData.horaSalida = horaSalida || null;
    if (horasExtra !== undefined) updateData.horasExtra = parseFloat(horasExtra) || 0;
    if (observaciones !== undefined) updateData.observaciones = observaciones;
    
    const registro = await prisma.controlHoras.update({
      where: { id },
      data: updateData,
      include: { persona: true }
    });
    
    res.json({ 
      message: 'Registro actualizado correctamente',
      registro 
    });
  } catch (error: any) {
    console.error('Error actualizando registro:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        error: 'Registro no encontrado' 
      });
    }
    
    res.status(500).json({ error: 'Error al actualizar registro' });
  }
});

// Eliminar registro
router.delete('/registros/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await prisma.controlHoras.delete({
      where: { id }
    });
    
    res.json({ 
      message: 'Registro eliminado correctamente' 
    });
  } catch (error: any) {
    console.error('Error eliminando registro:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        error: 'Registro no encontrado' 
      });
    }
    
    res.status(500).json({ error: 'Error al eliminar registro' });
  }
});

// Obtener resumen del día
router.get('/resumen/:fecha', async (req, res) => {
  const { fecha } = req.params;
  
  try {
    const fechaDate = new Date(fecha);
    fechaDate.setHours(0, 0, 0, 0);
    
    const registros = await prisma.controlHoras.findMany({
      where: { fecha: fechaDate }
    });
    
    const personasPresentes = new Set(
      registros.filter(r => r.horaEntrada).map(r => r.personaId)
    ).size;
    
    let totalMinutosTrabajados = 0;
    let totalHorasExtra = 0;
    
    registros.forEach(registro => {
      if (registro.horaEntrada && registro.horaSalida) {
        const horaEntradaStr = typeof registro.horaEntrada === 'string'
          ? registro.horaEntrada
          : registro.horaEntrada instanceof Date
            ? registro.horaEntrada.toTimeString().slice(0,5)
            : '';
        const horaSalidaStr = typeof registro.horaSalida === 'string'
          ? registro.horaSalida
          : registro.horaSalida instanceof Date
            ? registro.horaSalida.toTimeString().slice(0,5)
            : '';
        const [horaE, minE] = horaEntradaStr.split(':').map(Number);
        const [horaS, minS] = horaSalidaStr.split(':').map(Number);
        let minutos = (horaS * 60 + minS) - (horaE * 60 + minE);
        if (minutos < 0) minutos += 24 * 60;
        totalMinutosTrabajados += minutos;
      }
      totalHorasExtra += Number(registro.horasExtra) || 0;
    });
    
    const horasTrabajadas = Math.floor(totalMinutosTrabajados / 60);
    const minutosTrabajados = totalMinutosTrabajados % 60;
    
    res.json({
      empleadosPresentes: personasPresentes,
      horasTotales: `${horasTrabajadas}:${minutosTrabajados.toString().padStart(2, '0')}`,
      horasExtra: `${totalHorasExtra.toFixed(1)}h`
    });
  } catch (error) {
    console.error('Error obteniendo resumen:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

// Exportar a Excel
router.get('/exportar', async (req, res) => {
  const { fechaDesde, fechaHasta, personaId } = req.query;
  
  try {
    // Para implementar la exportación a Excel, instala: npm install exceljs
    // import ExcelJS from 'exceljs';
    
    // Por ahora, devolvemos un CSV simple
    const where: any = {};
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(fechaDesde as string);
      if (fechaHasta) where.fecha.lte = new Date(fechaHasta as string);
    }
    if (personaId) where.personaId = personaId as string;
    
    const registros = await prisma.controlHoras.findMany({
      where,
      include: { persona: true },
      orderBy: [{ fecha: 'desc' }, { persona: { apellido: 'asc' } }]
    });
    
    // Generar CSV
    let csv = 'Fecha,DNI,Apellido,Nombre,Entrada,Salida,Horas Trabajadas,Horas Extra,Observaciones\n';
    
    registros.forEach(registro => {
      let horasTrabajadas = '0:00';
      
      if (registro.horaEntrada && registro.horaSalida) {
        // Convertir a string si es Date
        const horaEntradaStr = typeof registro.horaEntrada === 'string'
          ? registro.horaEntrada
          : registro.horaEntrada instanceof Date
            ? registro.horaEntrada.toTimeString().slice(0,5)
            : '';
        const horaSalidaStr = typeof registro.horaSalida === 'string'
          ? registro.horaSalida
          : registro.horaSalida instanceof Date
            ? registro.horaSalida.toTimeString().slice(0,5)
            : '';
        const [horaE, minE] = horaEntradaStr.split(':').map(Number);
        const [horaS, minS] = horaSalidaStr.split(':').map(Number);
        let totalMinutos = (horaS * 60 + minS) - (horaE * 60 + minE);
        if (totalMinutos < 0) totalMinutos += 24 * 60;
        horasTrabajadas = `${Math.floor(totalMinutos / 60)}:${(totalMinutos % 60).toString().padStart(2, '0')}`;
      }
      
      csv += `${registro.fecha.toLocaleDateString('es-AR')},`;
      csv += `${registro.persona.dni},`;
      csv += `${registro.persona.apellido},`;
      csv += `${registro.persona.nombre},`;
      csv += `${registro.horaEntrada || '-'},`;
      csv += `${registro.horaSalida || '-'},`;
      csv += `${horasTrabajadas},`;
      csv += `${registro.horasExtra}h,`;
      csv += `${registro.observaciones || ''}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="control-horas.csv"');
    res.send('\ufeff' + csv); // BOM para Excel
  } catch (error) {
    console.error('Error exportando:', error);
    res.status(500).json({ error: 'Error al exportar' });
  }
});

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    const personasCount = await prisma.personaControlHoras.count();
    const registrosCount = await prisma.controlHoras.count();
    
    res.json({
      message: '✅ Control de Horas API funcionando correctamente',
      stats: {
        personas: personasCount,
        registros: registrosCount
      },
      endpoints: [
        'GET /api/control-horas/personas',
        'POST /api/control-horas/personas',
        'GET /api/control-horas/registros',
        'POST /api/control-horas/marcar',
        'PUT /api/control-horas/registros/:id',
        'DELETE /api/control-horas/registros/:id',
        'GET /api/control-horas/resumen/:fecha',
        'GET /api/control-horas/exportar'
      ]
    });
  } catch (error) {
    console.error('Error en test:', error);
    res.status(500).json({ 
      error: 'Error en test',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;