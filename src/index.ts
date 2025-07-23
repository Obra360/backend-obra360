import express from "express";
import path from "path";
import cors from "cors";
import { PrismaClient, User } from '@prisma/client';
import { fileURLToPath } from "url";
import { sign } from "jsonwebtoken";
import { compare, hash } from "bcryptjs";
import { authenticate, ExpressRequest } from "./middlewares/auth.js";
//  corregido referencia local de router en obras
import router from "./routes/obras.js";

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;
const generateJwt = (user: User): string  => {
  return sign({email: user.email}, 'JWT_SECRET')
}
//  Necesario para que __dirname funcione con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//  Ruta al frontend
const frontendPath = path.join(__dirname, "../../frontend-obra360");


app.use(cors());
app.use(express.json());
app.use('/api/obras', router);


//  Metodo para crear usuarios con constraseña hasheada
app.post("/users", async (req, res) =>{
  try {
    const hashedPassword = await hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {...req.body, password: hashedPassword}
    });
    const {password: _password, ...userWithoutPassword} = user
    res.json({...userWithoutPassword, token: generateJwt(user)});
  } catch (err) {
    res.json({ error: "Email or username is not unique" });
  }
});


app.post('users/login', async (req, res)  =>{
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: req.body.email
      }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const isPasswordCorrect = await compare(req.body.password, user.password)

    if (!isPasswordCorrect) {
      throw new Error('Incorrect password')
    }
  } catch (error) {
    res.json({error: 'Email or password are wrong'})
  }
});

//  Metodo para autenticacion a traves de middleware authenticate
app.get('/user', authenticate, async (req: ExpressRequest, res, next) =>{
  try {
    if(!req.user) {
      return res.sendStatus(401)
    }
    const {password: _password, ...userWithoutPassword} = req.user;
    res.json({...userWithoutPassword, token: generateJwt(req.user)});
  } catch (err) {
    next(err);
  }
})


app.listen(PORT, () => {
  console.log(`🟢 Servidor corriendo en http://localhost:${PORT}`);
});
