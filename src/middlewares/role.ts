import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para extraer el rol del objeto 'user' y adjuntarlo
 * directamente al objeto 'req' para un acceso más sencillo.
 * Actualizado para usar la interfaz global.
 */
export const attachRole = (req: Request, res: Response, next: NextFunction) => {
  // Ya no necesitamos adjuntar req.role - se puede usar req.user.role directamente
  // Este middleware se mantiene por compatibilidad pero no hace nada
  next();
};