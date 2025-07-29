// src/middlewares/auth.ts - Con tipado TypeScript correcto
import { Request, Response, NextFunction } from "express";
import pkg from "jsonwebtoken";
const { verify } = pkg;

// Interface para el usuario decodificado del JWT
interface DecodedUser {
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
      user?: DecodedUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ 
      error: "Unauthorized", 
      message: "Token de autorización requerido" 
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET no está definida en las variables de entorno");
    res.status(500).json({ error: "Error de configuración del servidor" });
    return;
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET) as DecodedUser;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ 
        error: "Token expired",
        message: "Tu sesión ha expirado. Por favor inicia sesión nuevamente."
      });
    } else if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ 
        error: "Invalid token",
        message: "El token proporcionado no es válido."
      });
    } else {
      console.error("Error al verificar token:", err);
      res.status(401).json({ error: "Invalid token" });
    }
    return;
  }
};

export const requireAdmin = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  const user = req.user;
  
  if (!user || user.role !== "ADMIN") {
    res.status(403).json({ 
      error: "Acceso denegado: solo administradores",
      message: "No tienes permisos para acceder a este recurso"
    });
    return;
  }
  
  next();
};

// Middleware adicional para supervisores y administradores
export const requireAdminOrSupervisor = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  const user = req.user;
  
  if (!user || !['ADMIN', 'SUPERVISOR'].includes(user.role)) {
    res.status(403).json({ 
      error: "Acceso denegado",
      message: "Se requiere rol de Administrador o Supervisor"
    });
    return;
  }
  
  next();
};

// Middleware para verificar que el usuario puede acceder a recursos propios
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    const targetUserId = req.params[userIdParam];
    
    if (!user) {
      res.status(401).json({ error: "Usuario no autenticado" });
      return;
    }
    
    // Admin puede acceder a cualquier recurso
    if (user.role === 'ADMIN') {
      next();
      return;
    }
    
    // Supervisor puede acceder a recursos de operarios
    if (user.role === 'SUPERVISOR') {
      next();
      return;
    }
    
    // Operarios solo pueden acceder a sus propios recursos
    if (user.id !== targetUserId) {
      res.status(403).json({ 
        error: "Acceso denegado",
        message: "Solo puedes acceder a tus propios recursos"
      });
      return;
    }
    
    next();
  };
};