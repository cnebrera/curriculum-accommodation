# Review checklist

Fill this in with the actual decisions from the job, in this order. The order is
the point: the first four sections are where adapted material goes wrong in ways
that are invisible in the finished PDF.

## 0 · Si este material lo ha generado Rampa (`kind: generated`)

**Empieza por la sección 6, antes que por nada.** Y cuenta con más tiempo, no con
menos: revisar material generado cuesta más que revisar una adaptación.

Por qué. Cuando Rampa adapta, hay un original que dice qué es verdad, y lo que
revisas es si los cambios están bien. Cuando Rampa genera, no hay original:
**nadie ha leído este contenido**. Lo que se puede comprobar con una cuenta está
comprobado — la aritmética es exacta y los ejercicios practican lo que pediste —
pero si el texto es cierto, si enseña lo que querías y si va en el orden que tiene
sentido, eso no lo ha mirado nadie todavía.

Y dos secciones de abajo no aplican, para que no te den una sensación de
comprobado que no te has ganado:

- La **sección 1** (fidelidad de la lectura) no aplica: no había nada que leer.
- La **sección 4** (integridad curricular) se convierte en la sección 6, que es la
  misma pregunta hecha donde no hay original contra el que compararla.

Si al terminar la 6 no puedes decir «esto es cierto y enseña lo que pedí», no lo
firmes. Un borrador devuelto no ha costado nada; una hoja con un dato falso la
corrige un niño y la da por buena.

## 1 · Extraction faithfulness

- [ ] Every `[UNREADABLE]` flag resolved or accepted
- [ ] Exercise numbering matches the original
- [ ] Nothing in the source is missing from the IR
- [ ] Descriptions of `essential` figures are accurate and sufficient to answer

## 2 · Significant adaptation

- [ ] Nothing crossed into changing objectives or assessment criteria without
      being flagged
- [ ] Anything flagged has been taken to the teaching team, not decided here

## 3 · Assessment blocks

- [ ] Every touched `.assessment` block preserves what is being assessed
- [ ] No assessed items silently removed
- [ ] No scaffolding added to an exam
- [ ] Response route changes are recorded

## 4 · Curricular integrity

- [ ] No invented facts or examples
- [ ] Curricular terms kept, with definitions alongside
- [ ] Nothing dropped that is not listed in the report
- [ ] Causal connectors preserved

## 5 · Fit to this learner

- [ ] Documented supports in `works` respected
- [ ] Nothing from `avoid` present
- [ ] Register is age-appropriate — accessible, not infantilised
- [ ] Response format matches what the learner can actually produce

## 6 · Generated material *(only when `kind: generated`)* — **primero, no sexto**

Ver la sección 0. Esta es la sección donde se decide si el material sirve.

- [ ] Every factual claim is true and traces to the anchor
- [ ] Unsupported claims are marked and listed
- [ ] The material actually teaches the stated objectives
- [ ] No objective was quietly replaced with an easier one
- [ ] Cada bloque cita un trozo de lo que dí como anclaje, y el trozo dice lo que
      el bloque afirma *(que la cita exista lo comprueba el programa; que diga lo
      que el bloque afirma, no)*
- [ ] Los ejercicios están en un nivel que le encaja *(si el informe dice que no
      pudo comprobar el nivel, esto es tuyo entero)*
- [ ] He mirado la hoja de soluciones y las cuentas son las de los ejercicios que
      están en la hoja
- [ ] Lo que el informe lista como «no comprobado» lo he comprobado yo

## 7 · Memory

- [ ] Every correction captured, with a scope I chose
- [ ] Learner-scope items are in the profile and its notes
- [ ] Journal entries describe the pattern, not the worksheet passage
- [ ] Nothing about this learner is queued to leave my machine

## 8 · Output

- [ ] Every requested modality generated
- [ ] Non-visual outputs contain no visual-only instructions
- [ ] Audio announces item numbers and pauses after questions

## 9 · Sign-off

- [ ] I have looked at the material, not just the report
- [ ] `review.signed_off` set and files re-rendered without the draft mark

**Rejected an adaptation?** That is profile information. Update `avoid` or the
axis level that was wrong, so the next unit starts closer.
