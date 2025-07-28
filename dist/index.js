import express from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();
import path from "path";
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from "url";
import pkg from "jsonwebtoken";
const { sign } = pkg;
import { compare } from "bcryptjs";
import { authenticate } from "./middlewares/auth";
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
        }
        else {
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
        res.json({ ...userWithoutPassword, token: generateJwt(user) });
    }
    catch {
        res.status(401).json({ error: "Email or password are wrong" });
    }
});
app.get("/user", authenticate, async (req, res, next) => {
    try {
        const user = req.user;
        if (!user)
            return res.sendStatus(401);
        const { password: _, ...userWithoutPassword } = user;
        res.json({ ...userWithoutPassword, token: generateJwt(user) });
    }
    catch (err) {
        next(err);
    }
});
function generateJwt(user) {
    return sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
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
//# sourceMappingURL=index.js.map