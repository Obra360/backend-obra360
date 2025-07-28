import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para extraer el rol del objeto 'user' y adjuntarlo
 * directamente al objeto 'req' para un acceso más sencillo en
 * los siguientes manejadores de rutas.
 */
export const attachRole = (req: Request, res: Response, next: NextFunction) => {
  // Ahora TypeScript sabe que req.user y req.role pueden existir. ¡Sin 'any'!
  if (req.user && req.user.role) {
    req.role = req.user.role;
  }
  
  next();
};