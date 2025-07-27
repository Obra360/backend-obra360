import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { authenticate, requireAdmin } from "../middlewares/auth";

const router = Router();
const prisma = new PrismaClient();

// Obtener listado de usuarios (solo admin)
router.get("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json(users);
  } catch (err) {
    console.error("Error al obtener usuarios:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Crear nuevo operador (solo admin)
router.post("/", authenticate, requireAdmin, async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    const hashedPassword = await hash(password, 10);
    const nuevo = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: "OPERARIO",
      },
    });

    res.status(201).json({ message: "Operador creado", id: nuevo.id });
  } catch (err) {
    console.error("Error al crear operador:", err);
    res.status(500).json({ error: "Error al crear operador" });
  }
});

export default router;
