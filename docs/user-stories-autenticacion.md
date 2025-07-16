# Historias de Usuario: Autenticación y Gestión de Usuarios

---

## Historia 1: Registro de usuario (solo admin)

**Como** administrador,  
**quiero** poder crear cuentas de usuario para otros empleados asignando su rol,  
**para** gestionar el acceso seguro a la plataforma.

### Criterios de aceptación
- [ ] El admin puede registrar un usuario y asignar un rol: supervisor, operario u otro admin.
- [ ] Si el email ya existe, se muestra un error claro.
- [ ] Al crear usuario, se le envía confirmación por email (opcional a implementar más adelante).

---

## Historia 2: Login de usuario

**Como** usuario registrado,  
**quiero** iniciar sesión con mis credenciales,  
**para** acceder a las funcionalidades de la plataforma según mi rol.

### Criterios de aceptación
- [ ] Usuarios pueden loguearse con email y contraseña.
- [ ] Si las credenciales son incorrectas, se notifica de forma clara sin revelar detalles de seguridad.
- [ ] Tras login exitoso, reciben un token JWT.
- [ ] El token se usa para acceder a recursos protegidos.

---

## Historia 3: Cierre de sesión

**Como** usuario autenticado,  
**quiero** cerrar sesión de forma segura,  
**para** asegurar que nadie use mi sesión si dejo el equipo desatendido.

### Criterios de aceptación
- [ ] Existe endpoint para "logout".
- [ ] El token se invalida (o en front se borra el token del almacenamiento local).

---

## Historia 4: Gestión de roles por admin

**Como** administrador,  
**quiero** poder actualizar el rol de un usuario,  
**para** asignarle permisos según su nuevo puesto/responsabilidad.

### Criterios de aceptación
- [ ] El admin puede listar usuarios y cambiar su rol.
- [ ] Cambios de rol son efectivos de inmediato.
- [ ] No se permite auto-bajar de rol admin si es el único admin existente.

---

## Historia 5: Permitir solo el acceso autorizado

**Como** usuario,  
**quiero** que solo me muestren y permitan realizar acciones según mi rol,  
**para** garantizar seguridad y orden en la gestión de la plataforma.

### Criterios de aceptación
- [ ] Endpoints protegidos por middleware de autenticación (JWT).
- [ ] El acceso se restringe por rol a acciones sensibles (por ejemplo, solo admin puede crear usuarios).

---

## Historia 6 (opcional): Recuperación de contraseña

**Como** usuario registrado,  
**quiero** recuperar mi contraseña si la olvido,  
**para** poder acceder nuevamente al sistema.

### Criterios de aceptación
- [ ] Hay un endpoint para iniciar recuperación de contraseña vía email.
- [ ] El usuario recibe instrucciones por correo para establecer nueva contraseña.

---

## Tareas técnicas asociadas

- [ ] Crear modelo de Usuario con emails únicos y campo de rol.
- [ ] Implementar endpoints: `/auth/register`, `/auth/login`, `/auth/logout`, `/users`.
- [ ] Middleware de autenticación y autorización por rol.
- [ ] Pruebas de endpoints y validaciones.
- [ ] Documentación de endpoints en README.

---