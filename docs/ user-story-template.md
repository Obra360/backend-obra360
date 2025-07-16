# Historia de Usuario

**Como** [ROL de usuario]  
**quiero** [acción/necesidad]  
**para** [beneficio o razón].

## Criterios de Aceptación

- [ ] Criterio claro #1
- [ ] Criterio claro #2
- [ ] Criterio claro #3

## Tareas técnicas (si aplica)

- [ ] Crear endpoint para ...
- [ ] Agregar validaciones para ...
- [ ] Escribir pruebas unitarias/integración
- [ ] Actualizar documentación

---

### Ejemplo

**Como** supervisor de obra  
**quiero** registrar los movimientos de materiales en una obra  
**para** llevar un control actualizado y evitar faltantes.

#### Criterios de Aceptación

- [ ] Existen endpoints para registrar, editar y listar movimientos de materiales.
- [ ] Solo usuarios con rol supervisor o mayor pueden registrar movimientos.
- [ ] Se generan entradas de log al crear/modificar movimientos.

#### Tareas técnicas

- [ ] Crear modelo `MovimientoMaterial`
- [ ] Implementar rutas REST `/materiales/movimientos`
- [ ] Crear tests para lógica de permisos y validaciones
- [ ] Documentar endpoints en README