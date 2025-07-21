import express from "express";
import obrasRouter from '/home/toby/Obra360/backend-obra360/src/routes/obras.js';
import path from "path";
import cors from "cors";
import pkg from '@prisma/client';
import { fileURLToPath } from "url";

const { PrismaClient } = pkg;
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/api/obras', obrasRouter);
const prisma = new PrismaClient();

//  Necesario para que __dirname funcione con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//  Ruta al frontend
const frontendPath = path.join(__dirname, "../../frontend-obra360");

//  Servir archivos estáticos (CSS, JS, imágenes)
app.use(express.static(frontendPath));

// Ruta para "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

//  Ruta comodín para servir cualquier .html directamente
app.get("/*.html", (req, res) => {
  const requestedFile = path.join(frontendPath, req.path);
  res.sendFile(requestedFile, (err) => {
    if (err) {
      res.status(404).send("Archivo no encontrado");
    }
  });
});


app.listen(PORT, () => {
  console.log(`🟢 Servidor corriendo en http://localhost:${PORT}`);
});
