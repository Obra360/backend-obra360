import { Request, Response, NextFunction } from "express";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware que automáticamente filtra consultas por companyId
export const requireCompanyAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({ error: "Usuario no autenticado" });
      return;
    }

    if (!user.companyId) {
      res.status(403).json({ 
        error: "Acceso denegado", 
        message: "Usuario sin compañía asignada" 
      });
      return;
    }

    // Verificar que la compañía del usuario existe y está activa
    const company = await prisma.company.findUnique({
      where: { 
        id: user.companyId,
        isActive: true 
      }
    });

    if (!company) {
      res.status(403).json({ 
        error: "Compañía inactiva o inexistente",
        message: "La compañía asociada no está disponible"
      });
      return;
    }

    // Agregar companyId a req para uso en rutas
    (req as any).companyId = user.companyId;
    next();
  } catch (error) {
    console.error("Error en company auth middleware:", error);
    res.status(500).json({ error: "Error interno del servidor" });
    return;
  }
};

// Middleware específico para operaciones en modelos que requieren company filtering
export const withCompanyScope = (model: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    const companyId = user?.companyId;
    
    if (!companyId) {
      res.status(403).json({ 
        error: "Acceso denegado", 
        message: "Company ID requerido" 
      });
      return;
    }

    // Agregar el where condition para company scoping automáticamente
    (req as any).companyFilter = { companyId };
    next();
  };
};