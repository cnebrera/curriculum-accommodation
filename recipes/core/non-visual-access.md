---
id: non-visual-access
axes: [PER-V>=2]
scope: [explanation, example, instruction, exercise, assessment, figure]
conflicts: []
evidence: "WCAG 1.1.1; Marrakesh accessible-format copies"
---

# Non-visual access

## What to do

Remove every dependency on seeing, in the text as well as in the images.

**Images** are handled by their `data-role` (see `docs/ir.md`): `decorative` is
dropped, `informative` becomes its short description, `essential` becomes its full
description, placed where the image was.

**Text that points at the page** must be rewritten. "El de la derecha", "como ves
en el recuadro azul", "une con flechas", "rodea" and "colorea" are all visual
instructions. Replace the *route*, not the task: matching becomes "escribe la
letra que corresponde", circling becomes "escribe las palabras que cumplen".

**Layout that carries meaning** — a two-column comparison, a table, a diagram —
becomes explicit structure: a list with labels, or a linearised table read row by
row with its headers repeated.

## Before

> **3.** Observa el esquema y une con flechas cada parte de la planta con su
> función. Fíjate en el ejemplo en verde.

## After

> **3.** Vas a relacionar cada parte de la planta con su función.
>
> *Descripción del esquema: aparecen tres partes de una planta — raíz, tallo y
> hoja — y tres funciones desordenadas.*
>
> Partes: 1) raíz · 2) tallo · 3) hoja
> Funciones: a) sujeta la planta y absorbe agua · b) transporta la savia ·
> c) capta la luz del sol
>
> Escribe la letra que corresponde a cada número. Ejemplo: 1 → a
> Ahora tú: 2 → ___ · 3 → ___

## Anti-patterns

- **Describing an `essential` image and calling it done** when the task also needs
  spatial reasoning over it. Some tasks need replacing, not describing — say so
  in the report rather than emitting an impossible exercise.
- **Alt text that names the file or the object without the information.** "Esquema
  de la fotosíntesis" tells the learner nothing they can answer with.
- **Dropping an `essential` image with no description.** This must block the
  render. An exercise the learner cannot possibly answer is worse than no sheet.
- **Keeping "rodea" and hoping.** Every visual verb gets a non-visual equivalent.
- Simplifying the content while you are at it, without a separate recipe and axis
  justifying it. Blindness is not a comprehension barrier.
