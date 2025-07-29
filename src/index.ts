import express from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config(); // Cargar variables de entorno desde .env

import path from "path";
import { PrismaClient, User } from '@prisma/client';
import { fileURLToPath } from "url";
import pkg from "jsonwebtoken";
const { sign, verify } = pkg;
import { compare, hash } from "bcryptjs";
import { authenticate, requireAdmin} from "./middlewares/auth.js";
console.log("🟢 authenticate cargado");
import userRouter from "./routes/user.routes.js";
import obrasRouter from "./routes/obras.js";
import articulosRouter from './routes/articulos.routes.js';
import salariosRouter from './routes/salarios.routes.js';
import certificacionRouter from './routes/certificacion.routes.js';
import movimientosRouter from './routes/movimientos.routes.js';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = [
  "https://frontend-obra360.onrender.com",
  "http://localhost:3000"
  ];
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

app.use(express.json()); 
app.options("*", cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
}));


if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET no definida");
  process.exit(1);
}



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

app.get("/auth/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    
    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    
    res.json({ valid: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.use(authenticate);
app.use('/api/obras', obrasRouter);
app.use('/api/articulos', articulosRouter);
app.use('/api/certificacion', certificacionRouter);
app.use('/api/movimientos', movimientosRouter);
app.use('/api/salarios', salariosRouter);
app.use("/api/users", userRouter);


app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});


