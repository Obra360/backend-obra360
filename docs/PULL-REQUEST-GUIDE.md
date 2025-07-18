# Guía para Pull Requests (PR) y Revisiones en Backend Obra360

## ¿Cuándo crear un Pull Request?

- Al terminar una funcionalidad (rama `feature/xyz`) hacia `develop`.
- Para corregir bugs críticos (rama `hotfix/xyz`) hacia `main` o `develop`.

## Requisitos antes de crear un PR

- [ ] Código probado localmente (tests pasan, app funciona).
- [ ] Cumple estándar de código (ESLint y Prettier).
- [ ] Cambios descritos claramente en el mensaje del commit y del PR.
- [ ] Documentación y comments actualizados si aplica.

## Cómo crear un Pull Request

1. Subir cambios a la rama correspondiente (`feature/xyz`).
2. Ir a GitHub, elegir **Compare & pull request**.
3. Seleccionar base: `develop`, comparar con tu rama.
4. Completar el template (describir bien qué se hizo).
5. Solicitar al menos 1 revisor (puedes asignar en campo "Reviewers").

## Proceso de revisión

- Revisar código, sugerir mejoras, dejar comentarios.
- Si hay cambios necesarios, solicitarlos y esperar correcciones.
- Cuando está OK, aprobar PR y hacer merge.
- Eliminar rama después del merge (opcional pero recomendable).

## Buenas prácticas

- Haz PRs pequeños, enfocados y de un solo tema.
- Agrega contexto en la descripción.
- Responde rápidamente a comentarios o solicitudes de cambios.

---
