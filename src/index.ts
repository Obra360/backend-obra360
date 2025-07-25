import express from "express";
import dotenv from "dotenv";
dotenv.config(); // Cargar variables de entorno desde .env
import obrasRouter from "./routes/obras.js";
import path from "path";
import cors from "cors";
import { PrismaClient, User } from '@prisma/client';
import { fileURLToPath } from "url";
import pkg from "jsonwebtoken";
const { sign } = pkg;
import { compare, hash } from "bcryptjs";
import { authenticate } from "./middlewares/auth.js";
console.log("🟢 authenticate cargado");
import authRouter from "./routes/auth.routes.js"; //Se usa auth.routes.ts que se hizo para la conexion entre front/BACKend



const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = [
  "https://frontend-obra360.onrender.com",
  "http://localhost:3000"
  ];

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET no definida");
  process.exit(1);
}

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://frontend-obra360.onrender.com",
      "http://localhost:3000"
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
}));

// Necesario para que __dirname funcione con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../../frontend-obra360");

// Servir frontend estático
app.use(express.static(frontendPath));
app.get("/", (req, res) => res.sendFile(path.join(frontendPath, "index.html")));
app.get("/*.html", (req, res) => {
  const requestedFile = path.join(frontendPath, req.path);
  res.sendFile(requestedFile, err => {
    if (err) res.status(404).send("Archivo no encontrado");
  });
});

// Registro de usuario
app.post("/users", async (req, res) => {
  try {
    const hashedPassword = await hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: { ...req.body, password: hashedPassword }
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, token: generateJwt(user) });
  } catch {
    res.status(400).json({ error: "Email or username is not unique" });
  }
});

// Login
app.post("/users/login", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.body.email }
    });
    if (!user) throw new Error("User not found");
    const isPasswordCorrect = await compare(req.body.password, user.password);
    if (!isPasswordCorrect) throw new Error("Incorrect password");

    const { password: _, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, token: generateJwt(user) });
  } catch {
    res.status(401).json({ error: "Email or password are wrong" });
  }
});

// Autenticación protegida
app.get("/user", authenticate, async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (!user) return res.sendStatus(401);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, token: generateJwt(user) });
  } catch (err) {
    next(err);
  }
});

function generateJwt(user: User): string {
  return sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, {
    expiresIn: "1d"
  });
}

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:");
  console.error(err instanceof Error ? err.stack : err);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:");
  console.error(reason instanceof Error ? reason.stack : reason);
});

console.log("📦 index.ts compilado correctamente");

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});


