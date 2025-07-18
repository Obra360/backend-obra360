import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
