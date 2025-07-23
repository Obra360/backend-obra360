import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";;

export interface ExpressRequest extends Request {
  user?: User;
}

export const authenticate = async (
  req: ExpressRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token not found" });
  }

  try {
    const decode = verify(token, process.env.JWT_SECRET as string) as { email: string };

    const user = await prisma.user.findUnique({
      where: { email: decode.email },
    });

    req.user = user ?? undefined;
    next();
  } catch (err) {
    console.error("Error en auth middleware:", err);
    req.user = undefined;
    next();
  }
};
