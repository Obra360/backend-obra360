import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function createInitialUsers() {
  try {
    const users = [
      {
        email: "admin@prueba.com",
        password: await hash("12345678", 12),
        firstName: "Admin",
        lastName: "Principal",
        companyId: "00000000-0000-0000-0000-000000000001",
        role: "ADMIN"
      },
      {
        email: "usuario1@prueba.com", 
        password: await hash("12345678!", 12),
        firstName: "Usuario",
        lastName: "Admin",
       companyId: "00000000-0000-0000-0000-000000000001",
        role: "OPERARIO"
      }
      // Agrega más usuarios aquí
    ];

    for (const userData of users) {
      const user = await prisma.user.create({
        data: userData
      });
      console.log(`✅ Usuario creado: ${user.email}`);
    }

    console.log("✅ Todos los usuarios creados exitosamente");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createInitialUsers();