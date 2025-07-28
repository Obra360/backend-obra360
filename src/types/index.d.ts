import "express";

// Define un tipo para tu objeto de usuario para mayor claridad.
interface UserPayload {
  id: string; // o el tipo de dato que sea tu ID
  role: string;
  email: string;
  // ...cualquier otra propiedad del usuario que venga en el JWT
}

// Extiende la interfaz Request de Express
declare global {
  namespace Express {
    export interface Request {
      user?: UserPayload; // El objeto 'user' que añade tu middleware de autenticación
      role?: string;      // La propiedad 'role' que añadirá nuestro nuevo middleware
    }
  }
}