# Feature Specification: El examen adaptado

**Feature Branch**: `039-el-examen-adaptado`

**Created**: 2026-09-11

**Status**: Draft — **three decisions are open and they are not the author's** (see «Decisiones abiertas»)

**Input**: Las catorce medidas metodológicas del material que una PT en ejercicio pasó
(`COMO-ADAPTAR-LOS-EXAMENES.pdf`, Jesús Jarque), repartidas por el Principio I, y el canal
por el que una adaptación que cruza la línea llega a la maestra en vez de aplicarse sola.

## Por qué esta feature va antes que el aspecto

`038` construyó el instrumento para mirar la hoja. Ésta decide **qué puede decir** una
receta antes de que `040` decida cómo se ve, y el orden no es negociable: **una receta no
puede prometer un renderizado que no existe.** Ese es el defecto entero de `037`, donde
`signpost-the-page` prometía cabeceras al modelo y `renderHTML` las aplanaba — el corpus
prometió y el código incumplió, durante meses, sin que nada lo dijera.

Por eso las medidas del PDF que son **tipografía** (la letra escolar enlazada) o
**primitivas visuales** (palabras clave resaltadas, recordatorios, banco de palabras) no se
escriben aquí: son knobs de `040` y estructura de `041`, y escribirlas como corpus hoy
repetiría el defecto a sabiendas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Contesta como puede contestar (Priority: P1)

Un chico con una barrera motora no escribe a mano con soltura. Su examen sale hoy con dos
rayas de altura fija para cada respuesta, iguales que las de todo el mundo — o, en la vía
de adaptación, **sin ninguna raya en absoluto**. Ella tiene que decidir cada vez, a mano,
si le deja dictar, y el documento no lo dice en ninguna parte.

Después de esta historia, la vía de respuesta que su perfil declara llega al papel: quien
dicta no recibe rayas que no va a usar y recibe la frase que dice que puede contestar
hablando; quien escribe poco recibe el espacio que necesita; quien señala recibe opciones
separadas de verdad y no una lista apretada.

**Why this priority**: Es lo único de esta spec que **el corpus ya manda y nadie ejecuta**.
`recipes/core/response-route.md` prescribe quitar las rayas a quien dicta, `docs/ir.md`
documenta `data-response` con ocho valores, y **ninguno de los dos llega a ningún sitio**.
No es una capacidad nueva: es una promesa incumplida, que es peor.

**Independent Test**: adaptar un material con alumnos de vías de respuesta distintas y
comparar los documentos. Sin ninguna otra parte de esta spec, la hoja ya cambia.

**Acceptance Scenarios**:

1. **Given** un alumno cuyo perfil declara respuesta oral, **When** ella imprime su hoja,
   **Then** los ejercicios no llevan rayas y la hoja dice, en su idioma de instrucción, que
   puede contestar hablando.
2. **Given** un alumno sin barrera motora y sin vía declarada, **When** ella imprime,
   **Then** la hoja sale como hoy — el cambio no alcanza a quien no lo necesita.
3. **Given** un ejercicio que el material original marcó como de respuesta larga, **When**
   se imprime para quien escribe a mano, **Then** el espacio es mayor que el de una
   respuesta corta, y la diferencia es visible en el registro de `038`.

---

### User Story 2 - Cuando cruza la línea, se lo dice — y le deja el texto escrito (Priority: P2)

Una medida del PDF pide partir una pregunta de dos partes en dos preguntas de una. En una
ficha es correcto. En un examen **cambia lo que se mide**, y la guarda del proyecto ya lo
dice: su segunda lista no está prohibida, está declarada **«no es tuya la decisión.
Márcalo y para.»**

Hoy no hay nada que lo marque. El canal existe —`flaggedSignificant`— y ningún llamador de
producción lo usa, así que la instrucción «márcalo» no tiene dónde marcar.

Después de esta historia, cuando una adaptación cruza la línea, el informe se lo dice a
ella **en su propio apartado**, distinto de «lo que no he hecho», y le entrega **la
propuesta redactada** —la pregunta reescrita, tal cual, de varias líneas si hace falta—
marcada como no aplicada. Ella decide, que es de quien es la decisión, y no parte de cero.

**Why this priority**: Sin US1 la hoja sigue sin servirle a un alumno concreto; sin esto,
la que se queda sin servicio es ella. Pero es P2 porque US1 se puede entregar sola y esto
no: necesita que el informe sepa llevar una propuesta, que hoy no sabe.

**Independent Test**: pedir una adaptación que cruce la línea y leer el informe. La hoja no
cambia — ése es el punto — y el informe gana un apartado con un texto que ella puede copiar.

**Acceptance Scenarios**:

1. **Given** un examen y un alumno cuyo perfil justificaría partir un ítem, **When** se
   adapta, **Then** el ítem llega **entero** a la hoja y el informe lleva la propuesta de
   partirlo, dicho como propuesta.
2. **Given** una propuesta de varias líneas, **When** ella abre el informe, **Then** las
   líneas siguen siendo varias — una pregunta reescrita aplanada a un párrafo no se puede
   copiar a un examen.
3. **Given** un informe con una propuesta, **When** ella lo lee, **Then** en ningún punto
   puede confundirla con algo ya hecho.
4. **Given** una **ficha** y la misma adaptación, **When** se adapta, **Then** se aplica sin
   escalar nada: la línea es del examen, no del material en general.

---

### User Story 3 - Las medidas que sí son suyas, escritas donde se pueden aplicar (Priority: P3)

De las catorce medidas, unas ya tienen receta, otras dependen de mecánica que no existe, y
queda un grupo que se puede escribir hoy. Entre ellas la que `docs/ir.md` **ya cita en su
ejemplo y no existe**: `one-task-per-item@1`, la receta que implementa la regla dura 7 —
«extiende `4a`, `4b`, no renumeres». El contrato enseña al modelo a citar una receta
fantasma.

**Why this priority**: Es valor real y es el que menos duele si se retrasa: las cinco
medidas con casa ya funcionan. Pero el fantasma sí importa — una cita que no lleva a
ninguna parte le enseña a la maestra que el informe es decoración.

**Independent Test**: `validate-recipes` deja de aceptar una cita a una receta inexistente,
y la receta nueva produce `4a`/`4b` sobre un material real.

**Acceptance Scenarios**:

1. **Given** el ejemplo de `docs/ir.md`, **When** se valida el corpus, **Then** toda receta
   citada existe con la versión que se cita.
2. **Given** un ejercicio con dos partes en una ficha, **When** se adapta para quien no
   sostiene dos cosas a la vez, **Then** salen `4a` y `4b` y **la numeración original no se
   toca**.

---

### Edge Cases

- **Un alumno con vía de respuesta declarada y un material que ya trae la suya.** Manda el
  material: `data-response` del origen describe lo que la tarea pide («dibuja»), y el perfil
  describe cómo puede responder él. Cuando chocan —el material pide dibujar y él no puede
  sostener un lápiz— eso es una barrera de acceso, no un formato: se escala, no se resuelve.
- **Una propuesta que el modelo redacta y que no se puede aplicar.** El informe la lleva
  igual. Es material para que ella decida, no una acción pendiente.
- **Un examen sin ningún ítem que cruce la línea.** El apartado no aparece. Un apartado vacío
  titulado «decisiones que te dejo» enseña a saltárselo.
- **Una hoja de la vía de composición** (`002`), que ya escribe `data-answer-space`. No puede
  perder el espacio que ya tiene por adoptar una vía nueva.
- **Un alumno sin `MOT` observado.** No se le inventa una vía: ausencia no es cero.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-3701**: El documento MUST derivar el espacio y la forma de respuesta de la vía que el
  material declara y del perfil del alumno, en vez de emitir el mismo espacio para todos.
- **FR-3702**: Un alumno cuya vía de respuesta no requiere escritura a mano MUST recibir una
  hoja **sin el espacio de escritura** y **con la frase** que le dice cómo puede responder,
  en su idioma de instrucción.
- **FR-3703**: La vía de respuesta MUST llegar también al documento editable y a las
  modalidades lineales, o declararse explícitamente fuera de alcance con su motivo — una
  adaptación que sólo existe en una de las salidas es la tubería paralela que el Principio IV
  prohíbe.
- **FR-3704**: El sistema MUST NOT inferir una vía de respuesta de un eje que no sea el que
  la describe, ni inventarla cuando no hay observación.
- **FR-3705**: Cuando una adaptación caiga en la segunda lista de la guarda del examen, el
  sistema MUST aplicar la hoja **sin ella** y registrar la escalada.
- **FR-3706**: La escalada MUST poder llevar **una propuesta redactada** además del motivo, y
  el informe MUST conservarla tal como se escribió, **incluidos los saltos de línea**.
- **FR-3707**: El informe MUST presentar las escaladas en un apartado **distinto** del de «lo
  que no he hecho», de forma que una propuesta no se pueda leer como algo ya aplicado.
- **FR-3708**: La regla de escalar MUST tener alcance de evaluación y no global: las mismas
  adaptaciones son legítimas en una ficha y se aplican allí sin aviso.
- **FR-3709**: El informe MUST recibir el documento original además del adaptado, de modo que
  «toda numeración del origen sigue encabezando una tarea» sea comprobable sin depender de lo
  que el modelo cuente (backlog G69).
- **FR-3710**: Toda receta citada por el contrato de la IR o por el corpus MUST existir, con
  la versión citada, y la validación del corpus MUST fallar si no (backlog: el fantasma
  `one-task-per-item@1`).
- **FR-3711**: Partir un ítem en partes MUST extender la numeración original (`4a`, `4b`) y
  MUST NOT renumerar el resto.
- **FR-3712**: La imagen fotografiada queda **fuera de alcance**, con motivo: no es
  presentación, es un camino de egreso nuevo para los bytes de una foto hasta la página de un
  niño, y las preguntas que trae no son de esta feature.
- **FR-3713**: Las medidas del PDF que dependen de tipografía o de primitivas visuales
  MUST NOT escribirse como corpus en esta feature, y MUST quedar nombradas aquí con la spec
  que las habilita.
- **FR-3714**: Ninguna de las capacidades nuevas MUST poder activarse desde un eje que la
  guarda del examen no permita, y el conflicto entre una receta nueva y la guarda MUST
  declararse en el corpus como los conflictos existentes.

### Decisiones abiertas *(no las resuelve esta spec)*

Se dejan escritas aquí, sin resolver, porque son **criterio pedagógico** y corresponden a
Carlos y a la PT. Ninguna bloquea US1.

- **D1 · Cuatro medidas del PDF chocan con la guarda del examen.**
  [NEEDS CLARIFICATION: ¿el PDF describe prácticas de aula que la guarda debería admitir en
  un examen con su aviso, o la guarda tiene razón y esas medidas son sólo de ficha?]
  Segmentar las tareas de una pregunta y poner un ejemplo resuelto están nombradas
  **literalmente** como anti-patrones en examen («en un examen cambia lo que se mide»;
  «andamiar un examen es contestarlo»). Secuenciar ya está resuelto por la decisión P27: una
  pregunta por página sí, el ítem entero. Evitar actividades repetitivas depende de si «siete
  sumas» es un ítem evaluado o siete. Las cuatro son legítimas en una ficha sin discusión.
- **D2 · La línea del perfil A3, «El primer ejercicio ya resuelto de ejemplo».**
  [NEEDS CLARIFICATION: ¿significa «resuelve el 1 delante de él» o «añade uno nuevo antes del
  1»?] Medido tres veces de tres: el modelo toma la primera lectura y **le quita un ejercicio
  al niño**; el patrón de oro escrito a mano toma la segunda. El propio hallazgo (G69) dice
  que es criterio y que no lo decide el código.
- **D3 · El reintento de la puerta de procedencia.**
  [NEEDS CLARIFICATION: ¿se le da reintento acotado a la puerta de procedencia, sabiendo que
  cambia cuándo se gasta el dinero de una maestra?] Falla el ~19% de las pasadas. La
  alternativa de coste cero —reescribir la regla en el prompt— se hizo el 2026-09-11 y
  **falta medirla**: tres pasadas reales. Si el 19% no se mueve, la pregunta deja de ser
  discutible.

### Key Entities

- **Vía de respuesta**: cómo puede responder este alumno — hablando, escribiendo poco,
  señalando, dibujando, manipulando. Vive en su perfil; el material declara aparte lo que la
  tarea pide.
- **Escalada**: una adaptación que no se aplicó porque no le corresponde al sistema
  decidirla. Lleva **qué**, **por qué** y, cuando se puede redactar, **la propuesta**.
- **Receta**: como hoy, juicio en Markdown con `id@version`. Lo que esta feature añade es que
  una cita a una receta que no existe deje de ser posible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-3701**: Dos alumnos con vías de respuesta distintas y el mismo material reciben hojas
  **visiblemente distintas** en el espacio de respuesta, y la diferencia se ve en el registro
  de `038` sin abrir el código.
- **SC-3702**: Ninguna hoja de un alumno cuya vía no es la escritura lleva espacio de
  escritura sin la frase que explica la alternativa.
- **SC-3703**: Una propuesta de tres líneas llega al informe con sus tres líneas, medido
  sobre el informe escrito y no sobre la estructura que lo produjo.
- **SC-3704**: Una PT que lee un informe con una escalada dice, sin que se le pregunte por
  ello, qué tiene que decidir. Protocolo de `010` SC-805: **se recoge literal, también si es
  desfavorable**.
- **SC-3705**: Cero recetas citadas e inexistentes en todo el corpus y en `docs/ir.md`,
  comprobado por la validación que ya corre en cada commit.
- **SC-3706**: El 100% de las adaptaciones que caen en la segunda lista de la guarda quedan
  registradas, medido sobre casos construidos a propósito — no sobre pasadas reales, donde la
  ausencia de escaladas no distingue «no cruzó la línea» de «no lo detectó».

## Assumptions

- **La guarda del examen se queda como está mientras D1 no se responda.** Escribir corpus que
  la contradiga y luego revertirlo es peor que esperar: el corpus es lo que se le enseña al
  modelo, y una regla que va y viene produce adaptaciones que van y vienen.
- **La vía de respuesta se declara en el perfil, no se deduce de un diagnóstico.** Es la
  misma línea que el proyecto ya sostiene en todas partes.
- **Las medidas de tipografía y de primitivas visuales llegan por `040` y `041`.** Aquí sólo
  quedan nombradas, para que nadie las dé por olvidadas.
- **El informe lo lee una persona que va a decidir**, no un sistema que va a ejecutar. Eso es
  lo que hace que aplanar una propuesta a un párrafo sea un defecto y no una cuestión de
  formato.
- **Nada de esto se puede verificar de verdad sin un aula.** Lo dice `validation.md` y lo
  vuelve a decir SC-3704: la única línea que importa sigue siendo una PT con alumnos.
