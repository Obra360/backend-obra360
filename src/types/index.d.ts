import "express";

// Define un tipo para tu objeto de usuario para mayor claridad.
interface UserPayload {
  id: string; // o el tipo de dato que sea tu ID
  role: string;
  email: string;
  // ...cualquier otra propiedad del usuario que venga en el JWT
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        companyId: string;
        iat?: number;
        exp?: number;
      };
      companyId?: string;
      companyFilter?: { companyId: string };
    }
  }
}

export {};