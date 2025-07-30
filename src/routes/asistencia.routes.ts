// /routes/asistencia.routes.ts
import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient, estado_asistencia as EstadoAsistenciaPrisma } from "@prisma/client";

// Enum para estado_asistencia (ajusta los valores según tu modelo Prisma)
enum estado_asistencia {
  COMPLETO = "COMPLETO",
  PENDIENTE = "PENDIENTE",
  EDITADO = "EDITADO"
}
import { authenticate } from "../middlewares/auth.js";

const router = Router();
const prisma = new PrismaClient();

// ==================== INTERFACES Y TIPOS ====================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface RegistroAsistenciaData {
  userId: string;
  fecha: string;
  tipo: 'entrada' | 'salida';
  hora: string;
  observaciones?: string;
}

interface ActualizarRegistroData {
  horaEntrada?: string;
  horaSalida?: string;
  observaciones?: string;
}

interface CalculoHoras {
  horasTotales: string;
  horasNormales: string;
  horasExtra: string;
}

// Definir el tipo correcto para los registros con User incluido
    interface RegistroConUsuario {
      id: string;
      userId: string;
      fecha: Date;
      horaEntrada: string | null;
      horaSalida: string | null;
      horasTotales: string | null;
      horasNormales: string | null;
      horasExtra: string | null;
      observaciones: string | null;
      estado: EstadoAsistenciaPrisma;  
      createdAt: Date;
      updatedAt: Date;
      createdBy: string | null;
      User: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    }

// ==================== UTILIDADES PARA CÁLCULO DE HORAS ====================

function timeToMinutes(timeString: string): number {
  if (!timeString) return 0;
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return hours * 60 + minutes + (seconds ? Math.round(seconds / 60) : 0);
}

function minutesToTimeString(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0:00:00";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
}

function calcularHoras(horaEntrada: string | null, horaSalida: string | null): CalculoHoras {
  if (!horaEntrada || !horaSalida) {
    return {
      horasTotales: "0:00:00",
      horasNormales: "0:00:00", 
      horasExtra: "0:00:00"
    };
  }

  const minutosEntrada = timeToMinutes(horaEntrada);
  const minutosSalida = timeToMinutes(horaSalida);
  
  let totalMinutos = minutosSalida - minutosEntrada;
  
  // Si la salida es al día siguiente (ej: entrada 22:00, salida 06:00)
  if (totalMinutos < 0) {
    totalMinutos += 24 * 60; // Agregar 24 horas
  }

  const horasTotales = minutesToTimeString(totalMinutos);
  
  // Calcular horas normales (máximo 8 horas = 480 minutos)
  const minutosNormales = Math.min(totalMinutos, 480);
  const horasNormales = minutesToTimeString(minutosNormales);
  
  // Calcular horas extra (lo que excede 8 horas)
  const minutosExtra = Math.max(0, totalMinutos - 480);
  const horasExtra = minutesToTimeString(minutosExtra);

  return { horasTotales, horasNormales, horasExtra };
}

function determinarEstado(horaEntrada: string | null, horaSalida: string | null): estado_asistencia {
  if (horaEntrada && horaSalida) return estado_asistencia.COMPLETO;
  if (horaEntrada) return estado_asistencia.PENDIENTE;
  return estado_asistencia.PENDIENTE;
}

// ==================== ENDPOINTS ====================

// ✅ GET /api/asistencia - Obtener registros de asistencia con filtros
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fecha, userId, mes, ano } = req.query;
    const currentUser = req.user;

    console.log('🔍 Obteniendo registros con filtros:', { fecha, userId, mes, ano, currentUser: currentUser ? currentUser.email : undefined });

    // Construir filtros
    const where: any = {};

    // Filtro por fecha específica
    if (fecha && typeof fecha === 'string') {
      where.fecha = new Date(fecha + 'T00:00:00.000Z');
    }

    // Filtro por mes y año
    if (mes && ano && typeof mes === 'string' && typeof ano === 'string') {
      const startDate = new Date(`${ano}-${mes.padStart(2, '0')}-01T00:00:00.000Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      where.fecha = {
        gte: startDate,
        lt: endDate
      };
    }

    // Filtro por usuario específico
    if (userId && typeof userId === 'string') {
      where.userId = userId;
    }

    // Si no es admin/supervisor, solo puede ver sus propios registros
    if (currentUser && currentUser.role === 'OPERARIO') {
      where.userId = currentUser.id;
    }

    const registros = await prisma.asistencias.findMany({
      where,
      include: {
        User: {  // ✅ CORREGIDO: User con mayúscula
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: [
        { fecha: 'desc' },
        { horaEntrada: 'asc' }
      ]
    });

    // Formatear respuesta
    const registrosFormateados = registros.map((registro: RegistroConUsuario) => ({
      id: registro.id,
      empleadoId: registro.userId,
      empleadoNombre: `${registro.User.firstName} ${registro.User.lastName}`, // ✅ CORREGIDO: User con mayúscula
      empleadoEmail: registro.User.email, // ✅ CORREGIDO: User con mayúscula
      fecha: registro.fecha.toISOString().split('T')[0],
      horaEntrada: registro.horaEntrada,
      horaSalida: registro.horaSalida,
      horasTotales: registro.horasTotales,
      horasNormales: registro.horasNormales,
      horasExtra: registro.horasExtra,
      observaciones: registro.observaciones,
      estado: registro.estado,
      createdAt: registro.createdAt,
      updatedAt: registro.updatedAt
    }));

    console.log(`✅ Enviando ${registrosFormateados.length} registros`);
    res.json(registrosFormateados);

  } catch (error) {
    console.error("❌ Error obteniendo registros de asistencia:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ✅ POST /api/asistencia/marcar - Crear o actualizar registro de entrada/salida
router.post("/marcar", authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId, fecha, tipo, hora, observaciones }: RegistroAsistenciaData = req.body;
    const currentUser = req.user;

    console.log('⏰ Marcando asistencia:', { userId, fecha, tipo, hora, user: currentUser ? currentUser.email : undefined });

    // Validaciones
    if (!userId || !fecha || !tipo || !hora) {
      res.status(400).json({ 
        error: "Faltan campos obligatorios: userId, fecha, tipo, hora" 
      });
      return;
    }

    if (!['entrada', 'salida'].includes(tipo)) {
      res.status(400).json({ 
        error: "Tipo debe ser 'entrada' o 'salida'" 
      });
      return;
    }

    // Verificar permisos (solo puede marcar para sí mismo, excepto admin/supervisor)
    if (currentUser && currentUser.role === 'OPERARIO' && userId !== currentUser.id) {
      res.status(403).json({ 
        error: "Solo puedes marcar asistencia para ti mismo" 
      });
      return;
    }

    const fechaObj = new Date(fecha + 'T00:00:00.000Z');

    // Buscar registro existente para esa fecha y usuario
    let registro = await prisma.asistencias.findUnique({  // ✅ CORREGIDO: asistencias con minúscula
      where: {
        userId_fecha: {
          userId: userId,
          fecha: fechaObj
        }
      }
    });

    let datosActualizacion: any = {
      observaciones: observaciones || registro?.observaciones || null,
      updatedAt: new Date()
    };

    if (tipo === 'entrada') {
      datosActualizacion.horaEntrada = hora;
      
      // Si ya tiene salida, recalcular horas
      if (registro?.horaSalida) {
        const calculo = calcularHoras(hora, registro.horaSalida);
        datosActualizacion = { ...datosActualizacion, ...calculo };
        datosActualizacion.estado = determinarEstado(hora, registro.horaSalida);
      }
    } else { // salida
      datosActualizacion.horaSalida = hora;
      
      // Si ya tiene entrada, recalcular horas
      if (registro?.horaEntrada) {
        const calculo = calcularHoras(registro.horaEntrada, hora);
        datosActualizacion = { ...datosActualizacion, ...calculo };
        datosActualizacion.estado = determinarEstado(registro.horaEntrada, hora);
      }
    }

    if (registro) {
      // Actualizar registro existente
      console.log('📝 Actualizando registro existente');
      registro = await prisma.asistencias.update({  // ✅ CORREGIDO: asistencias con minúscula
        where: { id: registro.id },
        data: datosActualizacion,
        include: {
          User: {  // ✅ CORREGIDO: User con mayúscula
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }) as RegistroConUsuario;
    } else {
      // Crear nuevo registro
      console.log('➕ Creando nuevo registro');
      const datosCreacion: any = {
        userId: userId,
        fecha: fechaObj,
        ...datosActualizacion,
        estado: tipo === 'entrada' ? estado_asistencia.PENDIENTE : estado_asistencia.PENDIENTE, // ✅ CORREGIDO: estado_asistencia con minúscula
        createdBy: currentUser ? currentUser.id : null
      };

      if (tipo === 'entrada') {
        datosCreacion.horaEntrada = hora;
      } else {
        datosCreacion.horaSalida = hora;
      }

      registro = await prisma.asistencias.create({
        data: datosCreacion,
        include: {
          User: {  
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })as RegistroConUsuario;
    }

    res.json({
      message: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`,
      registro: {
        id: (registro as RegistroConUsuario).id,
        empleadoNombre: `${(registro as RegistroConUsuario).User.firstName} ${(registro as RegistroConUsuario).User.lastName}`,
        fecha: registro.fecha.toISOString().split('T')[0],
        horaEntrada: registro.horaEntrada,
        horaSalida: registro.horaSalida,
        horasTotales: registro.horasTotales,
        horasNormales: registro.horasNormales,
        horasExtra: registro.horasExtra,
        estado: registro.estado
      }
    });

  } catch (error) {
    console.error("❌ Error marcando asistencia:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ✅ PUT /api/asistencia/:id - Actualizar registro completo
router.put("/:id", authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { horaEntrada, horaSalida, observaciones }: ActualizarRegistroData = req.body;
    const currentUser = req.user;

    console.log('✏️ Actualizando registro:', { id, horaEntrada, horaSalida, user: currentUser?.email });

    // Buscar registro existente
    const registroExistente = await prisma.asistencias.findUnique({  // ✅ CORREGIDO: asistencias con minúscula
      where: { id },
      include: { User: true }  // ✅ CORREGIDO: User con mayúscula
    }) as RegistroConUsuario;

    if (!registroExistente) {
      res.status(404).json({ error: "Registro no encontrado" });
      return;
    }

    // Verificar permisos
    if (!currentUser || (currentUser.role === 'OPERARIO' && registroExistente.userId !== currentUser.id)) {
      res.status(403).json({ 
        error: "Solo puedes editar tus propios registros" 
      });
      return;
    }

    // Calcular horas si se proporcionaron ambos tiempos
    let datosActualizacion: any = {
      horaEntrada: horaEntrada || registroExistente.horaEntrada,
      horaSalida: horaSalida || registroExistente.horaSalida,
      observaciones: observaciones !== undefined ? observaciones : registroExistente.observaciones,
      estado: estado_asistencia.EDITADO,  // ✅ CORREGIDO: estado_asistencia con minúscula
      updatedAt: new Date()
    };

    // Recalcular horas
    const calculo = calcularHoras(datosActualizacion.horaEntrada, datosActualizacion.horaSalida);
    datosActualizacion = { ...datosActualizacion, ...calculo };

    // Actualizar estado
    datosActualizacion.estado = determinarEstado(datosActualizacion.horaEntrada, datosActualizacion.horaSalida);

    const registroActualizado = await prisma.asistencias.update({  // ✅ CORREGIDO: asistencias con minúscula
      where: { id },
      data: datosActualizacion,
      include: {
        User: {  // ✅ CORREGIDO: User con mayúscula
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      message: "Registro actualizado correctamente",
      registro: {
        id: registroActualizado.id,
        empleadoNombre: `${registroActualizado.User.firstName} ${registroActualizado.User.lastName}`, // ✅ CORREGIDO: User con mayúscula
        fecha: registroActualizado.fecha.toISOString().split('T')[0],
        horaEntrada: registroActualizado.horaEntrada,
        horaSalida: registroActualizado.horaSalida,
        horasTotales: registroActualizado.horasTotales,
        horasNormales: registroActualizado.horasNormales,
        horasExtra: registroActualizado.horasExtra,
        observaciones: registroActualizado.observaciones,
        estado: registroActualizado.estado
      }
    });

  } catch (error) {
    console.error("❌ Error actualizando registro:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ✅ DELETE /api/asistencia/:id - Eliminar registro
router.delete("/:id", authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    console.log('🗑️ Eliminando registro:', { id, user: currentUser?.email });

    // Buscar registro
    const registro = await prisma.asistencias.findUnique({  // ✅ CORREGIDO: asistencias con minúscula
      where: { id }
    });

    if (!registro) {
      res.status(404).json({ error: "Registro no encontrado" });
      return;
    }

    // Verificar permisos
    if (!currentUser || (currentUser.role === 'OPERARIO' && registro.userId !== currentUser.id)) {
      res.status(403).json({ 
        error: "Solo puedes eliminar tus propios registros" 
      });
      return;
    }

    await prisma.asistencias.delete({  // ✅ CORREGIDO: asistencias con minúscula
      where: { id }
    });

    res.json({ message: "Registro eliminado correctamente" });

  } catch (error) {
    console.error("❌ Error eliminando registro:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ✅ GET /api/asistencia/resumen/:fecha - Obtener resumen del día
router.get("/resumen/:fecha", authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fecha } = req.params;
    const fechaObj = new Date(fecha + 'T00:00:00.000Z');

    console.log('📊 Obteniendo resumen del día:', fecha);

    const registros = await prisma.asistencias.findMany({  // ✅ CORREGIDO: asistencias con minúscula
      where: {
        fecha: fechaObj
      },
      include: {
        User: {  // ✅ CORREGIDO: User con mayúscula
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Calcular estadísticas
    const empleadosPresentes = registros.filter(r => r.horaEntrada).length;
    const empleadosCompletos = registros.filter(r => r.horaEntrada && r.horaSalida).length;
    
    let totalMinutos = 0;
    let totalMinutosExtra = 0;

    registros.forEach((registro: typeof registros[number]) => {
      if (registro.horasTotales) {
        totalMinutos += timeToMinutes(registro.horasTotales);
      }
      if (registro.horasExtra) {
        totalMinutosExtra += timeToMinutes(registro.horasExtra);
      }
    });

    const resumen = {
      fecha: fecha,
      empleadosPresentes,
      empleadosCompletos,
      horasTotales: minutesToTimeString(totalMinutos),
      horasExtra: minutesToTimeString(totalMinutosExtra),
      registros: registros.length
    };

    console.log('✅ Resumen calculado:', resumen);
    res.json(resumen);

  } catch (error) {
    console.error("❌ Error obteniendo resumen:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ✅ GET /api/asistencia/reporte/:ano/:mes - Generar reporte mensual
router.get("/reporte/:ano/:mes", authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { ano, mes } = req.params;
    const { userId } = req.query;
    const currentUser = req.user;

    console.log('📈 Generando reporte mensual:', { ano, mes, userId, user: currentUser?.email });

    const startDate = new Date(`${ano}-${mes.padStart(2, '0')}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const where: any = {
      fecha: {
        gte: startDate,
        lt: endDate
      }
    };

    // Si no es admin/supervisor, solo sus registros
    if (currentUser && currentUser.role === 'OPERARIO') {
      where.userId = currentUser.id;
    } else if (userId && typeof userId === 'string') {
      where.userId = userId;
    }

    const registros = await prisma.asistencias.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { User: { firstName: 'asc' } },
        { fecha: 'asc' }
      ]
    });
    // Si no hay registros, devolver mensaje amigable
    if (registros.length === 0) {
      res.json({
        mes: parseInt(mes),
        ano: parseInt(ano),
        usuarios: [],
        message: "No hay registros de asistencia para este periodo."
      });
      return;
    }
    // Agrupar por usuario
    const reporteUsuarios: { [key: string]: any } = {};

    registros.forEach((registro: typeof registros[number]) => {
      const userId = registro.userId;
      const userName = `${registro.User.firstName} ${registro.User.lastName}`;  // ✅ CORREGIDO: User con mayúscula

      if (!reporteUsuarios[userId]) {
        reporteUsuarios[userId] = {
          id: userId,
          nombre: userName,
          totalDias: 0,
          totalHoras: 0,
          totalHorasExtra: 0,
          registros: []
        };
      }

      reporteUsuarios[userId].registros.push({
        fecha: registro.fecha.toISOString().split('T')[0],
        horaEntrada: registro.horaEntrada,
        horaSalida: registro.horaSalida,
        horasTotales: registro.horasTotales,
        horasExtra: registro.horasExtra,
        estado: registro.estado
      });

      if (registro.horaEntrada && registro.horaSalida) {
        reporteUsuarios[userId].totalDias++;
      }

      if (registro.horasTotales) {
        reporteUsuarios[userId].totalHoras += timeToMinutes(registro.horasTotales);
      }

      if (registro.horasExtra) {
        reporteUsuarios[userId].totalHorasExtra += timeToMinutes(registro.horasExtra);
      }
    });

    // Convertir minutos de vuelta a formato de tiempo
    Object.values(reporteUsuarios).forEach((usuario: any) => {
      usuario.totalHoras = minutesToTimeString(usuario.totalHoras);
      usuario.totalHorasExtra = minutesToTimeString(usuario.totalHorasExtra);
    });

    const reporte = {
      mes: parseInt(mes),
      ano: parseInt(ano),
      usuarios: Object.values(reporteUsuarios)
    };

    console.log(`✅ Reporte generado para ${Object.keys(reporteUsuarios).length} usuarios`);
    res.json(reporte);

  } catch (error) {
    console.error("❌ Error generando reporte:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;