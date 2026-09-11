# Implementation Plan: El examen adaptado

**Branch**: `039-el-examen-adaptado` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

## Summary

Tres cosas que el corpus ya promete y el código no cumple: la vía de respuesta llega al
papel, la escalada tiene por dónde salir y llevar un texto que ella pueda copiar, y una
receta que el contrato cita deja de ser un fantasma.

El orden lo fija una sola cosa: **lo que depende de D1 queda aislado al final**, de modo
que responderla en un sentido u otro cambie una receta y una tabla del corpus, nunca el
mecanismo.

## Technical Context

**Language/Version**: TypeScript 5, Node 22, Electron 38 — sin dependencias nuevas.

**Primary Dependencies**: ninguna nueva. Todo el trabajo cae en `@rampa/core`
(`render/`, `report/`, `ir/`) y en el corpus (`instructions/`, `recipes/`).

**Storage**: el vault, sin cambios de esquema. La vía de respuesta ya está en
`profile.response` y el eje `MOT` ya existe.

**Testing**: vitest para la capa determinista; Playwright para la vía real; el registro de
`038` para mirar la hoja, que es lo que decide si el espacio de respuesta sirve.

**Target Platform**: la aplicación de escritorio, las tres salidas (impresa, editable,
lineal).

**Project Type**: aplicación de escritorio con núcleo determinista.

**Performance Goals**: N/A. Nada de esto añade una llamada a un modelo; todo es
renderizado local.

**Constraints**: offline, sin clave, sin red. El renderizador **sigue sin recibir el
perfil** (`007` FR-506).

**Scale/Scope**: cuatro ficheros de `core`, dos del corpus, un documento de contrato.

## Constitution Check

*GATE: pasa antes de Phase 0 y se vuelve a comprobar tras Phase 1.*

| Principio | Cómo lo cumple |
|---|---|
| **I · El juicio vive en Markdown** | Qué hace un espacio de respuesta apropiado para quien dicta lo dice `response-route.md`, que ya existe. Lo que se añade en TypeScript es **cuánto espacio y de qué forma**, que es mecánica. La receta nueva de `4a`/`4b` es juicio y va en Markdown |
| **II · Código determinista y sin modelo** | Ninguna parte llama a un modelo. El espacio de respuesta sale de un atributo del documento y de un nivel de eje, por una función pura |
| **III · Adapta el *cómo*, nunca falsees el *qué*** | **Es la feature entera.** La vía de respuesta es acceso; la guarda del examen es lo que impide que se convierta en dificultad; y la escalada existe para que lo que cambiaría el *qué* no se aplique solo |
| **IV · Una extracción, N salidas** | FR-3703 lo exige explícitamente: la vía de respuesta llega a las tres salidas o se declara fuera con motivo. Una adaptación que sólo existe en el PDF es la tubería paralela que este principio prohíbe |
| **V · Barreras funcionales, no etiquetas** | `MOT` es un eje funcional. No se lee ningún diagnóstico y no se infiere la vía de ninguna otra cosa (FR-3704) |
| **VI · Todo cambio es trazable** | La escalada **es** trazabilidad: qué no se hizo, por qué, y qué se propone. Y FR-3709 le da al informe el documento original para que la comprobación de numeración deje de depender de lo que el modelo cuente |
| **VII · El borrador se anuncia** | Sin cambios. Nada de esto toca la firma ni la marca |
| **VIII · El feedback es memoria y lo enruta una persona** | La escalada es exactamente eso: el sistema no decide, marca y para |
| **IX · El contenido nunca es instrucción** | La propuesta redactada **es contenido del modelo** y llega al informe como texto para que ella lo lea. No se ejecuta, no se aplica y no alcanza a la hoja. Hay que escribirlo así en el contrato o la propuesta se convierte en un canal de inyección con más alcance que los actuales |

**Sin violaciones.** No hay «Complexity Tracking» que rellenar.

**Re-comprobado tras Phase 1**: el diseño no introduce ninguna. El punto de más riesgo es
el Principio IX y se cierra en el contrato: la propuesta se renderiza como texto en un
apartado que dice de quién viene.

## Project Structure

### Documentation (this feature)

```text
specs/039-el-examen-adaptado/
├── spec.md
├── plan.md              # este fichero
├── research.md          # R1-R4, y dos de las cuatro corrigen a la spec
├── data-model.md
├── quickstart.md
├── contracts/
│   └── escalada.md
├── checklists/requirements.md
└── tasks.md             # lo escribe /speckit-tasks
```

### Source Code (repository root)

```text
app/packages/core/src/
├── render/
│   ├── html.ts          # answerSpace() pasa a leer data-response y la presentación
│   ├── odt.ts           # la misma vía, para que IV no se rompa
│   └── linear.ts        # idem
├── report/
│   ├── index.ts         # la escalada deja de ser string[] y sale de notDone
│   └── notes.ts         # sin tocar: su normalizador es para las notas de ella
└── ir/
    └── provenance.ts    # sin tocar

app/corpus/
├── instructions/
│   └── render.md        # lo que el renderizador hace con la vía de respuesta
└── recipes/core/
    └── one-task-per-item.md   # la receta que docs/ir.md ya cita

docs/ir.md               # data-response deja de ser vocabulario sin lector
```

**Structure Decision**: nada nuevo. Cada cosa cae donde ya vive su familia, que es lo que
hace que el Principio I se pueda comprobar leyendo rutas.

## Fases, y por qué en este orden

1. **US1 · la vía de respuesta.** No toca la guarda del examen en ningún punto: la vía es
   acceso, y la guarda la lista como permitida *siempre*. Entregable sola.
2. **US2 · el canal de escalada, sin disparador.** El tipo, el apartado propio y la
   propuesta de varias líneas. Se construye entero y se deja sin cablear **qué** dispara
   una escalada, que es D1.
3. **US3 · sólo el fantasma.** `one-task-per-item@1` es un defecto del contrato.
4. **Bloqueado por D1**, y aislado al final: las recetas de las cuatro medidas en disputa.

## Complexity Tracking

No aplica: el Constitution Check pasa sin violaciones.
