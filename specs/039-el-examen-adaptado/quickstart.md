# Quickstart · el examen adaptado

Todo offline, sin clave y sin red, salvo el último paso, que es el único que cuesta dinero
y el único que no se puede sustituir.

## Prerequisites

```bash
cd app
npm ci
npm run bundle:corpus
```

---

## §1 · La vía de respuesta, que es lo único que cambia el papel

```bash
npx vitest run packages/core/test/response-route.test.ts
```

| Caso | Esperado |
|---|---|
| `data-response: oral` | Sin rayas, y **con la frase** que dice cómo responder |
| `data-response: long` frente a `short` | Espacios distintos, y el largo mayor |
| `data-response` ausente | **Idéntico a hoy**, byte a byte. Nadie pierde nada |
| El mismo documento, con y sin `MOT` | Distintos, y la diferencia sólo en el espacio |
| Las tres salidas | La vía llega a las tres, o la que falta está declarada con su motivo |

## §2 · Que el renderizador siga sin ver el perfil

```bash
npx vitest run packages/core/test/untrusted.test.ts -t FR-506
```

No debería ni inmutarse, y ése es el punto: `MOT` entra por donde entran los otros cinco
ejes, como nivel en `presentationFor`. Si este test se pone rojo, el diseño se rompió.

## §3 · Mirarlo, que es la regla de este repositorio

```bash
npm run shots
open ../docs/screenshots/latest/hoja--examen--*.png
```

La fixture del examen de `038` tiene `data-response` de cuatro clases —`short`, `choice`,
`long`, `draw`— **escritas antes de que nada las leyera**, que es la razón de que sirva
ahora. Hoy las cuatro salen iguales. Después no, y eso se ve sin abrir el código.

## §4 · La escalada

```bash
npx vitest run packages/core/test/report-escalada.test.ts
```

| Caso | Esperado |
|---|---|
| Propuesta de tres líneas | Llegan **tres**. Medido sobre el informe escrito, no sobre la estructura |
| Una escalada | Va en su apartado, **nunca** dentro de «Lo que NO he hecho» |
| Sin escaladas | El apartado **no aparece**. Uno vacío enseña a saltárselo |
| Una escalada sin propuesta | Legítima. No se inventa un texto para cumplir el formato |

## §5 · El fantasma

```bash
bash ../scripts/validate-recipes.sh
```

Toda receta citada existe con la versión que se cita — hoy `docs/ir.md:118` cita
`one-task-per-item@1` y no hay tal receta. Comprobado **rojo primero**, porque un validador
escrito después del arreglo es un validador con la forma del arreglo.

## §6 · Una pasada real

Cuesta calderilla y es el único paso que no tiene sustituto: lo que se comprueba es que un
modelo **escriba `data-response`** en un material que no lo traía. Ningún test offline
puede decir eso.

Y de paso mide lo que quedó pendiente el 2026-09-11: si la reescritura de `§Output` sobre
`.scaffold` movió el 19% de fallos de procedencia (D3). **Tres pasadas**, y la respuesta
convierte D3 de discusión en dato.

## §7 · Lo que sigue sin poderse verificar

Que una PT lea un informe con una escalada y sepa qué tiene que decidir. Es SC-3704, se
recoge literal —también si es desfavorable— y no lo dice ningún test.
