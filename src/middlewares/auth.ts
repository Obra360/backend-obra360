import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { NextFunction, Request, Response } from "express";

interface JwtPayload {
  email: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "JWT_SECRET") as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { email: decoded.email }
    });

    // Asegurás tipado si extendés el Request (opcional)
    (req as any).user = user ?? undefined;
    next();
  } catch (err) {
    (req as any).user = undefined;
    next();
  }
};
