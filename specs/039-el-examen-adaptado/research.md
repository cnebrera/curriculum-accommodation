# Research · El examen adaptado

Cuatro preguntas que había que medir antes de planificar. Las cuatro se midieron sobre el
código, no sobre la memoria, y **dos de las cuatro corrigen lo que la spec suponía**.

---

## R1 · ¿Por dónde llega hoy la vía de respuesta, y dónde se corta exactamente?

**Medido.** La cadena es más larga de lo que parecía y el corte está en un sitio distinto
del que decía el plan.

| Eslabón | Estado |
|---|---|
| `profile.response` en el esquema del alumno | **existe** (`vault/schema.ts:83`) |
| Llega al modelo | **sí** — `prompt/adapt.ts:318` lo lee y lo mete en el prompt |
| La receta que lo gobierna | **existe** — `recipes/core/response-route.md`, `axes: [MOT>=2]`, y dice «Read `response` in the profile first» |
| El modelo puede expresarlo en la IR | **`data-response`**, ocho valores, documentado en `docs/ir.md` |
| Alguien lee `data-response` | **nadie.** Cero referencias en `app/packages/` fuera de tests |
| El espacio de respuesta se emite desde | **`data-answer-space`**, otro atributo (`render/html.ts:368`, `render/odt.ts:222`) |
| Quién escribe `data-answer-space` | **sólo `compose/sheet.ts`**, la vía de composición de `002` |

**Y la consecuencia es peor que «no está mecanizado».** En la vía de **adaptación**, una
hoja no lleva espacio de respuesta **en absoluto** — porque nada escribe
`data-answer-space` por ahí. Así que la receta le dice al modelo «quita las rayas» y **no
hay rayas que quitar**: la instrucción es un no-op, y lo ha sido desde que se escribió.

En la vía de **composición** sí las hay, y son las mismas para todo el mundo: dos rayas de
`1.9em` fijas, sin mirar ni la vía declarada ni `MOT`.

**Decisión.** `data-response` pasa a ser lo que gobierna el espacio, porque es el atributo
que el contrato ya documenta y el que el modelo ya sabe escribir. `data-answer-space` se
conserva como lo que es —«este bloque lleva espacio»— y deja de ser el único que decide
cuánto.

**Alternativa rechazada:** que el modelo escriba `data-answer-space` con un tamaño. Sería
juicio tipográfico en manos del modelo, que es Principio I al revés, y además no
determinista.

---

## R2 · ¿Cómo llega `MOT` al renderizador sin romper `007` FR-506?

**Por donde ya llegan todas.** `presentationFor(levels)` toma **niveles de eje** y nada
más, precisamente «so no caller can accidentally hand the profile to the renderer», y
`untrusted.test.ts:610` lo sujeta leyendo el código fuente de `jobs/print.ts`.

Así que `MOT` entra como un knob más de `Presentation`, junto a los cinco que ya existen.
No hace falta ningún canal nuevo y no hay nada que endurecer: el perfil sigue sin cruzar.

**Y esto separa limpiamente las dos mitades**, que la spec trataba como una:

- **Lo que pide la tarea** —«esto se contesta con una palabra», «esto se dibuja»— es del
  **documento**: `data-response`, escrito por el modelo desde el material original.
- **Cómo puede responder él** es del **perfil**: llega como nivel de eje, resuelto a
  presentación antes de cruzar.

El renderizador combina las dos sin saber de quién es ninguna.

---

## R3 · ¿Puede el informe llevar hoy una propuesta de varias líneas?

**No, y se midió dónde se pierde.** Dos obstáculos independientes, y el segundo no estaba
en el plan:

1. **El tipo.** `flaggedSignificant?: string[]` (`report/index.ts:34`) no tiene sitio para
   un motivo y una propuesta separados.
2. **La presentación.** Se renderiza en `:175` **dentro de `notDone`**, la lista de «Lo que
   NO he hecho». Una propuesta impresa ahí se lee como una acción ya tomada.
3. **El aplanado.** `report/notes.ts:50` hace
   `.replace(/^\s*[-*]\s*/, '').replace(/\s+/g, ' ').trim()` sobre cada línea. Una pregunta
   de examen reescrita —que son varias líneas —sale como un párrafo corrido.

**Decisión.** La escalada pasa a ser una estructura con `qué`, `por qué` y `propuesta?`
opcional, y se renderiza en su propio apartado con la propuesta en bloque, sin pasar por el
normalizador de notas. El normalizador se queda como está para lo que es suyo: las notas
que ella escribe a mano.

**Por qué no basta con no aplanar.** Porque el apartado es el problema mayor: un texto
perfecto dentro de «lo que no he hecho» sigue leyéndose mal. Los dos arreglos son
necesarios y ninguno es suficiente.

---

## R4 · El fantasma `one-task-per-item@1` · ¿es una cita rota o falta una receta?

**Medido:** en `recipes/core/` hay `one-task-per-page.md` y **nada** con id
`one-task-per-item`. La cita está en el ejemplo de `docs/ir.md:118`, que es el documento
que se le enseña al modelo como contrato de la IR.

**Y la regla que implementaría existe y no tiene receta.** La regla dura 7 —«extiende `4a`,
`4b`, no renumeres»— describe un comportamiento que ninguna receta prescribe hoy.

**Decisión.** Se escribe la receta, porque la alternativa —quitar la cita del ejemplo—
dejaría la regla dura sin nada que la aplique y el ejemplo sin mostrar el caso que existe
para mostrar.

**Y hay que vigilar una cosa al escribirla**, que es el motivo de que esto viva en `039` y
no suelto: partir un ítem en `4a`/`4b` es **exactamente** la medida que la guarda del
examen nombra como anti-patrón. La receta nace, por tanto, con `scope` que excluya la
evaluación y declarando su conflicto con la guarda — igual que `one-task-per-page` ya lo
declara y pierde contra ella por la decisión P27.


---

## R5 · Lo que la receta ya prescribía y el diseño no recogía (T001)

Leerla entera antes de tocar nada era una tarea, y ha valido las dos veces.

### R5a · «Quitar el espacio del todo» es un anti-patrón, y `data-model.md` lo pedía

La tabla decía «sin rayas, con la frase» para quien dicta. La receta dice otra cosa, y da
el motivo:

> **Removing the answer space entirely.** With no mark that an answer belongs there, a
> corrected sheet cannot say whether the learner responded — and **in an exam that is a
> question left unassessed**.

Lo que pide es «a small marked space», y su propio ejemplo lo dibuja: la pregunta intacta,
la frase *«Contesta en voz alta»*, y debajo **una casilla**. Tres rayas se convierten en
una casilla que registra que se contestó, no en nada.

**Corregido**: para una vía que no es escritura, el documento lleva la frase **y una marca
de que ahí va una respuesta**. Nunca vacío.

### R5b · La vía no puede salir de `MOT`, y eso **elimina** el knob que T005 iba a añadir

La receta lo dice como anti-patrón, con el ejemplo:

> **Choosing the route from the diagnosis.** The profile says `MOT: 2`; it does not say
> why. A learner with cerebral palsy, one with a broken wrist and one with dysgraphia
> **share the axis and share no solution**.

O sea que `MOT` dice que **hay** una barrera y no **cuál** es la salida. La salida está en
`profile.response`, escrita por quien le da clase. Y `profile.response` no puede cruzar al
renderizador (`007` FR-506).

**Y la salida a eso ya estaba construida, sólo que yo la había pasado por alto.** La vía
llega al papel **por el documento**, no por la presentación:

```
profile.response  →  prompt/adapt.ts:318  →  el modelo, aplicando response-route.md
                  →  data-response en el bloque  →  el renderizador
```

Cada eslabón existe menos el último. Así que **no hace falta ningún knob nuevo en
`Presentation` y no hace falta que `MOT` llegue al renderizador**: el renderizador lee el
documento y nada más.

**Esto corrige a R2 y a la spec.** R2 concluía que `MOT` entraba como knob de presentación
«por donde entran los otros cinco». Es posible y es innecesario, y lo innecesario aquí es
peor que inútil: un knob derivado de `MOT` elegiría la salida desde el eje, que es
exactamente el anti-patrón que la receta nombra. El diseño correcto es **más pequeño** que
el que había planificado.

Queda entonces así:

| | Decide | Lo lee |
|---|---|---|
| Qué pide la tarea | el material original | el modelo, y lo escribe en `data-response` |
| Cómo puede responder él | ella, en `profile.response` | el modelo, aplicando la receta |
| **Cuánto espacio y de qué forma** | **el renderizador, desde `data-response`** | **es lo único que falta** |

Principio I intacto y de forma más limpia: el juicio entero vive en el Markdown de la
receta, y lo determinista es sólo «este valor produce esta forma».

**Lo que se pierde y hay que decirlo.** Si el modelo no escribe `data-response`, no pasa
nada: la hoja sale como hoy. El mecanismo no puede rescatar a una adaptación que no marcó
la vía, y rescatarla sería adivinar la salida desde el eje — el anti-patrón otra vez. Lo
que lo cubre es la puerta de siempre: ella mira la hoja.
