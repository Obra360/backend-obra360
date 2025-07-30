import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();
const prisma = new PrismaClient();

// Obtener listado de usuarios (admin y supervisor)
router.get("/", authenticate, async (req, res) => {
  const currentUser = (req as any).user;
  
  // Solo admin y supervisor pueden ver la lista
  if (currentUser.role !== "ADMIN" && currentUser.role !== "SUPERVISOR") {
    return res.status(403).json({ error: "No tienes permisos para ver usuarios" });
  }

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

// Crear nuevo usuario (actualizado)
router.post("/", authenticate, async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;
  const currentUser = (req as any).user;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  let userRole = role || "OPERARIO";

  if (currentUser.role !== "ADMIN") {
    if (currentUser.role === "SUPERVISOR") {
      if (role && role !== "OPERARIO") {
        return res.status(403).json({ error: "Como supervisor, solo puedes crear operadores" });
      }
      userRole = "OPERARIO";
    } else {
      return res.status(403).json({ error: "No tienes permisos para crear usuarios" });
    }
  }

  try {
    const hashedPassword = await hash(password, 10);
    const nuevo = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: userRole,
      },
    });

    res.status(201).json({ 
      message: "Usuario creado correctamente", 
      id: nuevo.id,
      role: userRole 
    });
  } catch (err) {
    console.error("Error al crear usuario:", err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// Actualizar usuario (NUEVO)
router.put("/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, role, password } = req.body;
  const currentUser = (req as any).user;

  if (!firstName || !lastName || !email || !role) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (currentUser.role !== "ADMIN") {
      if (currentUser.role !== "SUPERVISOR" || targetUser.role !== "OPERARIO") {
        return res.status(403).json({ error: "No tienes permisos para editar este usuario" });
      }
    }

    const updateData: any = { firstName, lastName, email, role };

    if (password && password.trim().length > 0) {
      updateData.password = await hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });

    res.json({ 
      message: "Usuario actualizado correctamente",
      user: updatedUser 
    });

  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Eliminar usuario (NUEVO)
router.delete("/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const currentUser = (req as any).user;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (currentUser.id === id) {
      return res.status(400).json({ error: "No puedes eliminarte a ti mismo" });
    }

    if (currentUser.role !== "ADMIN") {
      if (currentUser.role !== "SUPERVISOR" || targetUser.role !== "OPERARIO") {
        return res.status(403).json({ error: "No tienes permisos para eliminar este usuario" });
      }
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: "Usuario eliminado correctamente" });

  } catch (err) {
    console.error("Error al eliminar usuario:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;