import express from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();
import path from "path";
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from "url";
import pkg from "jsonwebtoken";
const { sign, verify } = pkg;
import { compare } from "bcryptjs";
import { authenticate } from "./middlewares/auth.js";
console.log("🟢 authenticate cargado");
import userRouter from "./routes/user.routes.js";
import obrasRouter from "./routes/obras.js";
import articulosRouter from './routes/articulos.routes.js';
import salariosRouter from './routes/salarios.routes.js';
import certificacionRouter from './routes/certificacion.routes.js';
import movimientosRouter from './routes/movimientos.routes.js';
import asistenciaRouter from './routes/asistencia.routes.js';
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = [
    "https://frontend-obra360.onrender.com",
    "http://localhost:3000",
    "http://127.0.0.1:5500"
];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("No permitido por CORS"));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.options("*", cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("No permitido por CORS"));
        }
    },
    credentials: true,
}));
if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET no definida");
    process.exit(1);
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../../frontend-obra360");
app.use(express.static(frontendPath));
app.get("/", (req, res) => res.sendFile(path.join(frontendPath, "index.html")));
app.get("/*.html", (req, res) => {
    const requestedFile = path.join(frontendPath, req.path);
    res.sendFile(requestedFile, err => {
        if (err)
            res.status(404).send("Archivo no encontrado");
    });
});
app.post("/users/login", async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email: req.body.email }
        });
        if (!user)
            throw new Error("User not found");
        const isPasswordCorrect = await compare(req.body.password, user.password);
        if (!isPasswordCorrect)
            throw new Error("Incorrect password");
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            ...userWithoutPassword,
            token: generateJwt(user),
            message: "Login exitoso"
        });
    }
    catch (error) {
        console.error("Error en login:", error);
        res.status(401).json({ error: "Email o contraseña incorrectos" });
    }
});
app.get("/auth/verify", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }
        const decoded = verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            valid: true,
            user: userWithoutPassword
        });
    }
    catch (error) {
        console.error("Error verificando token:", error);
        res.status(401).json({ error: "Invalid token" });
    }
});
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        service: 'obra360-backend'
    });
});
app.get("/user", authenticate, async (req, res, next) => {
    try {
        const user = req.user;
        if (!user)
            return res.sendStatus(401);
        const currentUser = await prisma.user.findUnique({
            where: { id: user.id }
        });
        if (!currentUser) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const { password: _, ...userWithoutPassword } = currentUser;
        res.json({
            ...userWithoutPassword,
            token: generateJwt(currentUser)
        });
    }
    catch (err) {
        console.error("Error obteniendo usuario:", err);
        next(err);
    }
});
app.use("/api/users", authenticate, userRouter);
app.use('/api/obras', authenticate, obrasRouter);
app.use('/api/articulos', authenticate, articulosRouter);
app.use('/api/certificaciones', authenticate, certificacionRouter);
app.use('/api/movimientos', authenticate, movimientosRouter);
app.use('/api/salarios', authenticate, salariosRouter);
app.use('/api/asistencia', authenticate, asistenciaRouter);
function generateJwt(user) {
    return sign({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
    }, process.env.JWT_SECRET, {
        expiresIn: "1d"
    });
}
app.use('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        res.status(404).json({
            error: 'Ruta de API no encontrada',
            message: `La ruta ${req.method} ${req.originalUrl} no existe`,
            availableRoutes: [
                'POST /users/login',
                'GET /auth/verify',
                'GET /user',
                'GET /health',
                'API Routes: /api/obras, /api/users, /api/articulos, /api/certificaciones, /api/asistencia, etc.'
            ]
        });
    }
    else {
        res.sendFile(path.join(frontendPath, "index.html"));
    }
});
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
        error: 'Error interno del servidor',
        message: isDevelopment ? error.message : 'Algo salió mal',
        ...(isDevelopment && { stack: error.stack })
    });
});
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:");
    console.error(err instanceof Error ? err.stack : err);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});
process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled Rejection:");
    console.error(reason instanceof Error ? reason.stack : reason);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});
console.log("📦 index.ts compilado correctamente");
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Frontend Path: ${frontendPath}`);
});
app.get('/test-asistencia', async (req, res) => {
    try {
        const count = await prisma.asistencia.count();
        const sample = await prisma.asistencia.findFirst({
            include: {
                User: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        res.json({
            message: '✅ Asistencia funciona correctamente!',
            totalRegistros: count,
            ejemploRegistro: sample,
            schemaInfo: {
                modelo: 'Asistencia',
                relacion: 'User',
                enums: ['EstadoAsistencia', 'UserRole']
            }
        });
    }
    catch (error) {
        console.error('Error en test-asistencia:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Error desconocido',
            message: '❌ Error probando tabla asistencias'
        });
    }
});
//# sourceMappingURL=index.js.map