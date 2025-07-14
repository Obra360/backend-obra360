# Backend Obra360

Backend para la plataforma SaaS Obra360, encargado de la lógica de negocio, API REST y gestión de datos.

## Tecnologías

- Node.js
- Express.js
- PostgreSQL (pendiente de configuración)
- ESLint y Prettier para estándar de código

## Estructura del proyecto
/src
/controllers # Controladores de la API
/models # Modelos de base de datos
/routes # Rutas y endpoints
/middlewares # Middlewares personalizados
/config # Archivos de configuración
/tests # Pruebas unitarias e integrales
/scripts # Scripts de utilidades
README.md
.gitignore
package.json
.eslintrc.json
.prettierrc


## Instalación

1. Clonar el repositorio  
git clone git@github.com:Obra360/backend-obra360.git


2. Instalar dependencias  
npm install


3. Configurar variables de entorno  
Crear archivo `.env` con las variables necesarias (ejemplo en `.env.example`)

4. Ejecutar en modo desarrollo  
npm run dev


## Uso

Desarrollar la API REST y endpoints según las rutas definidas. Puedes correr pruebas con:
npm test


## Contribución

- Usar ramas `feature/nombre-funcionalidad` desde `develop`.
- Crear Pull Requests para revisión.
- Mantener el estándar de código con ESLint y Prettier.
