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
