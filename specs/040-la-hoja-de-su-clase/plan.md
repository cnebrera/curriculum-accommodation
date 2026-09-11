# Implementation Plan: La hoja se parece a la de su clase

**Branch**: `040-la-hoja-de-su-clase` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

## Summary

US1 primero y sola: **el documento editable deja de ser menos accesible que el impreso.**
Un alumno `PER-V: 2` recibe hoy 24pt en su hoja y 12pt en el editable del mismo material,
y eso no es estética.

US2 y US3 —el aspecto por edad y su anulación— están especificadas enteras y **bloqueadas
por D1**, que es el contenido de las bandas y es criterio pedagógico.

## Technical Context

**Language/Version**: TypeScript 5, Node 22 — sin dependencias nuevas.

**Primary Dependencies**: ninguna. `render/odt.ts` y `jobs/export.ts`.

**Storage**: sin cambios de esquema. US1 no toca el perfil.

**Testing**: vitest sobre el ODT producido; el registro de `038` **no cubre el editable**
y eso está declarado en `validation.md` como el hueco que es.

**Target Platform**: la aplicación de escritorio.

**Project Type**: aplicación de escritorio con núcleo determinista.

**Performance Goals**: N/A.

**Constraints**: offline; el renderizador sigue sin recibir el perfil (`007` FR-506).

**Scale/Scope**: US1 son dos ficheros.

## Constitution Check

| Principio | Cómo lo cumple |
|---|---|
| **I · El juicio vive en Markdown** | US1 no añade juicio ninguno: **traduce** a ODF una presentación que ya se decidió en `presentationFor`. No hay ninguna decisión pedagógica nueva en el código |
| **II · Código determinista y sin modelo** | Una función pura de `Presentation` a propiedades ODF |
| **III · Adapta el *cómo*, nunca falsees el *qué*** | Sólo presentación. El texto no se toca |
| **IV · Una extracción, N salidas** | **Es literalmente la razón de US1.** Hoy las dos salidas de una misma extracción tienen accesibilidades distintas, que es la tubería paralela que este principio prohíbe — llegando como divergencia y no como código duplicado |
| **V · Barreras funcionales** | La presentación ya sale de niveles de eje. Sin cambios |
| **VI · Todo cambio es trazable** | Sin cambios |
| **VII · El borrador se anuncia** | Sin cambios; la marca del editable ya existe |
| **VIII · Feedback es memoria** | No aplica |
| **IX · El contenido nunca es instrucción** | US1 no mete texto nuevo en el documento. **Y eso importa aquí**: R4 midió que `export.ts` comprueba un HTML sin presentación y entrega un ODT aparte, así que el día que la presentación añada texto, lo comprobado y lo entregado divergen. Hoy no pasa, y queda anotado |

**Sin violaciones para US1.**

**Para US2/US3, cuando D1 se responda**, hay una que vigilar y está en la spec como
FR-3811: un identificador de banda es corto, y `checkOutput` escanea el contenido del
`<style>` — donde viaja la presentación. `038` midió que **un dato de cuatro caracteres
colisiona el 6,5% de las veces** con la fuente incrustada. No es de US1.

## Project Structure

```text
app/packages/core/src/render/odt.ts     # OdtOptions gana presentation; los estilos la usan
app/packages/shell/src/jobs/export.ts   # resuelve la misma presentación que print.ts
app/packages/core/test/odt-presentation.test.ts
```

**Structure Decision**: ningún fichero nuevo de producción. La presentación entra por
donde ya entra en el otro renderizador.

## Fases

1. **US1 · paridad del editable.** Entregable sola y sin decisiones pendientes.
2. **US2 · el aspecto por edad.** Bloqueada por D1.
3. **US3 · la anulación por alumno.** Bloqueada por D1.

## Complexity Tracking

No aplica para US1.
