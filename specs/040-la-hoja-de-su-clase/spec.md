# Feature Specification: La hoja se parece a la de su clase

**Feature Branch**: `040-la-hoja-de-su-clase`

**Created**: 2026-09-11

**Status**: Draft — **una decisión abierta, y no bloquea la primera historia**

**Input**: «¿En serio eso es material para un niño? Le doy eso a un niño de 8 años y lo
mato.» Dicho el 2026-09-09 delante del primer PDF que un modelo real había generado, que
salió legible, contrastado, fotocopiable — y con el aspecto de un documento técnico.

## La tensión, dicha en voz alta antes que nada

`018-pictogramas` se negó **exactamente** a esto, y su razonamiento hay que leerlo entero
antes de leer el resto:

> «Un chico de quince años con dislexia no quiere una ficha que parece de un niño de cinco.
> Tendría razón.»

De ahí sale `018` FR-1605: ningún eje activa pictogramas, y lo decide ella.

Esta feature es compatible con eso y hay que escribir por qué, o se pierde:

1. **La edad no es una barrera.** Derivar el aspecto de la edad no codifica una
   discapacidad en la hoja; derivarlo de un eje sí. La regla dura 11 queda intacta.
2. **La anulación es precisamente el caso de `018`.** El chaval de catorce en contenido de
   quinto —que `instructions/adapt.md` ya nombra— es para quien existe.
3. **El objetivo no es «que se vea adaptada», es «que se parezca a la de su clase».** Eso
   invierte el riesgo de estigma en vez de aumentarlo.

**Y el argumento que decide.** Hoy `presentationFor` da 24pt, 44ch y tinta negra a
`PER-V >= 2` **sin saber la edad de nadie**: sale la misma hoja para un niño de seis y para
uno de diecisiete. O sea que el principio que `018` dejó escrito **se está incumpliendo hoy
por la ausencia de esta feature**, no por añadirla.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El documento editable deja de ser menos accesible que el PDF (Priority: P1)

Un alumno que ve muy poco recibe su hoja a 24pt, con la línea corta y la tinta negra. Si
ella exporta el documento editable del mismo material —porque quiere retocarle una frase, o
porque su centro trabaja así— **le sale a 12pt**, con el mismo texto y ninguna de sus
adaptaciones de presentación.

**Why this priority**: **No es estética, es un fallo de accesibilidad**, y es el único
apartado de esta spec que no depende de ninguna decisión pendiente. Un alumno recibe hoy dos
documentos del mismo material con dos accesibilidades distintas, y la que él necesita
depende de por qué botón pasó ella.

**Independent Test**: exportar el editable de un alumno `PER-V: 2` y medir el cuerpo de
letra. Sin nada más de esta spec, deja de estar mal.

**Acceptance Scenarios**:

1. **Given** un alumno cuyas barreras producen 24pt, **When** ella exporta el documento
   editable, **Then** el cuerpo es el mismo que el de su hoja impresa.
2. **Given** el mismo alumno, **When** compara las dos salidas, **Then** el interlineado, la
   longitud de línea y el contraste coinciden, o lo que no pueda expresarse en el formato
   editable queda declarado aquí con su motivo.
3. **Given** un alumno sin ninguna barrera de presentación, **When** ella exporta,
   **Then** el documento sale como hoy — nadie pierde nada por este cambio.

---

### User Story 2 - La hoja se parece a la de sus compañeros (Priority: P2)

Una hoja para un niño de siete y una para un chaval de dieciséis salen hoy idénticas en
todo lo que no sea una barrera: misma letra, mismos márgenes, misma ausencia de color, mismo
aire. La de siete parece un documento de oficina y la de dieciséis también.

Después de esta historia, el aspecto lo decide **la edad**, desde el corpus, y la hoja de un
crío de siete se parece a la que le dan sus compañeros en clase.

**Why this priority**: Es la historia que da nombre a la feature y la que responde a la
frase que la originó. Va por detrás de US1 porque US1 arregla algo que está **mal** y ésta
mejora algo que está **pobre**, y porque ésta depende de una decisión que no es del autor.

**Independent Test**: renderizar el mismo material para alumnos de edades distintas sin
ninguna barrera observada y comparar las hojas. Hoy son idénticas; después no.

**Acceptance Scenarios**:

1. **Given** dos alumnos de edades de bandas distintas y ninguna barrera, **When** se
   imprime el mismo material, **Then** las hojas se ven distintas, y la diferencia se
   aprecia en el registro de `038` sin abrir el código.
2. **Given** un alumno de cualquier edad con `PER-V: 2`, **When** se imprime, **Then** las
   adaptaciones de barrera **mandan** sobre las de edad: la accesibilidad no se negocia con
   la estética.
3. **Given** cualquier edad y cualquier banda, **When** se comprueba la hoja, **Then** sigue
   pasando el suelo que ya existe — contraste, fotocopiabilidad y el barrido de
   accesibilidad, ahora sobre todas las bandas.

---

### User Story 3 - Y cuando la edad se equivoca, ella manda (Priority: P3)

El chaval de catorce que trabaja contenido de quinto. Por edad le tocaría la banda de
catorce; ella sabe que la hoja que le sirve no es ésa, o que la que le tocaría le resulta
infantil y no la va a coger.

Después de esta historia ella elige la banda, y queda anotado quién lo decidió y cuándo.

**Why this priority**: Es la salvaguarda de `018` hecha mecanismo, y va última porque sin
bandas no hay nada que anular.

**Acceptance Scenarios**:

1. **Given** un alumno con banda elegida por ella, **When** se imprime, **Then** manda la
   suya y no la de su edad.
2. **Given** esa elección, **When** se mira su ficha, **Then** consta que la tomó ella y
   cuándo, como ya consta en las otras decisiones que son suyas.
3. **Given** una banda elegida, **When** se comprueba la hoja, **Then** pasa exactamente los
   mismos suelos que una derivada de la edad — elegir no es una puerta trasera.

---

### Edge Cases

- **Un alumno sin edad registrada.** Es frecuente y legítimo: `011` dejó la edad opcional.
  Recibe la presentación de hoy, que es el estado actual y por tanto no una regresión.
- **Una edad que no cae en ninguna banda** — tres años, veintidós. El corpus tiene que
  responder algo, y «lo más cercano» y «la de por defecto» no son lo mismo.
- **Una banda anulada que ya no existe** porque el corpus se actualizó (`034`). No puede
  dejar a un alumno sin hoja.
- **Un alumno que es su propio caso**: `PER-V: 2` y siete años. Dos fuentes de tipografía
  sobre el mismo valor, y el orden tiene que estar escrito, no salir de cuál se aplicó
  última.
- **El documento editable y una banda.** Si la banda expresa algo que el formato editable no
  puede, se dice; no se calla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-3801**: El documento editable MUST recibir la misma presentación derivada de las
  barreras que el documento impreso, y lo que el formato no pueda expresar MUST quedar
  declarado con su motivo.
- **FR-3802**: El aspecto de una hoja MUST poder derivarse de la edad del alumno a través del
  corpus, no del código — «cómo se le habla y cómo se le presenta el material a un niño de
  ocho años» es juicio, y el Principio I lo pone en `instructions/`.
- **FR-3803**: Las adaptaciones derivadas de una barrera MUST prevalecer sobre las derivadas
  de la edad siempre que compitan, y el orden MUST estar escrito donde se decide.
- **FR-3804**: Ella MUST poder fijar la banda de aspecto de un alumno, y esa elección MUST
  quedar registrada con su fecha, como las demás decisiones que son suyas.
- **FR-3805**: La banda elegida MUST ser **un identificador del corpus** y no estilo libre:
  así el Principio I queda intacto y la anulación no puede salirse del conjunto que el
  barrido de accesibilidad ya recorre.
- **FR-3806**: **El renderizador MUST seguir sin recibir el perfil.** La edad, el curso, la
  etapa, el centro y la banda elegida MUST NOT cruzar hasta él; lo que cruza es un valor de
  presentación ya resuelto. Es `007` FR-506 y es la defensa más fuerte que tiene el sistema:
  una inyección no puede imprimir lo que nunca se pasó.
- **FR-3807**: El test que sujeta FR-506 MUST endurecerse para prohibir también los nombres
  de los campos nuevos — hoy prohíbe la palabra «perfil», no el hecho.
- **FR-3808**: El número de aspectos **distintos** que el sistema produce a lo largo de todas
  las edades MUST ser igual al número de bandas que declara el corpus. Si la edad se
  interpola en algún sitio, esto lo dice sin necesidad de saber dónde está la fuga.
- **FR-3809**: Ninguna banda MUST poder producir una hoja por debajo del suelo que ya existe:
  contraste, tamaño mínimo, longitud máxima de línea y fotocopiabilidad.
- **FR-3810**: El barrido de accesibilidad de la hoja MUST recorrer todas las bandas, o el
  aspecto nuevo no está comprobado.
- **FR-3811**: El nombre de una banda MUST NOT poder identificar a un alumno ni llegar al
  marcado de la hoja, y la comprobación que protege la hoja MUST cubrir ese canal — hoy la
  presentación viaja sólo dentro de la hoja de estilo y eso hay que conservarlo.
- **FR-3812**: Los dos knobs declarados y nunca producidos —la familia tipográfica y la
  separación entre párrafos— MUST pasar a producirse o MUST retirarse. Un knob muerto es una
  promesa que el código hace y no cumple.
- **FR-3813**: Una familia tipográfica MUST declararse como identificador de una cara
  conocida y no como nombre libre: un nombre libre se interpola sin escapar dentro de la
  hoja de estilo, y un corpus puede venir de fuera (`034`). Además evita por el otro lado el
  fallo de que una familia no incrustada caiga a otra en silencio.
- **FR-3814**: `instructions/render.md` MUST dejar de decir que la presentación no se fija
  nunca por alumno y no sale nunca de otra cosa del perfil, **y MUST decir por qué cambia**.
  Hoy esa frase contradice esta feature entera, y una regla que el corpus le enseña al modelo
  mientras el código hace lo contrario es el defecto de `037` otra vez.
- **FR-3815**: La comprobación que compara los colores de la hoja MUST seguir siendo útil con
  bandas: hoy compara todas las parejas de la hoja entera, y cualquier color nuevo le
  produciría avisos sobre colores que nadie tocó.

### Decisión abierta *(no la resuelve esta spec)*

- **D1 · Qué bandas hay y qué cambia en cada una.**
  [NEEDS CLARIFICATION: ¿qué franjas de edad, y qué cambia en cada una — cuerpo y forma de
  letra, color en los títulos, un icono por bloque, márgenes, cuadros por tipo de tarea?]

  Es **el contenido** de la feature y es criterio pedagógico. La decisión de arquitectura ya
  está tomada —lo manda la edad, desde el corpus, con anulación explícita por alumno— y esta
  spec la especifica entera. Lo que falta es qué dice el corpus.

  **No se afina a ojo**, y eso es una regla del proyecto y no una preferencia: `010` ya
  produjo una interfaz que pasaba todos los tests y era fea, y ADR 0009 prohíbe el pixel-diff
  precisamente porque «acabaría afirmando lo que produjo el último commit». Sin criterio
  humano detrás, unas bandas inventadas por el autor serían exactamente eso.

  **Bloquea US2 y US3. No bloquea US1.**

### Key Entities

- **Banda de aspecto**: un conjunto de decisiones de presentación con un identificador
  estable, declarado en el corpus, que se elige por edad o a mano. Estable porque acaba en
  ficheros que se comitan y en una ficha que ella firma.
- **Presentación**: lo que el renderizador recibe. Hoy sale sólo de las barreras; después,
  de las barreras **y** de una banda, resueltas antes de cruzar.
- **Anulación**: la banda que ella eligió para un alumno, con su fecha. Como `018` dejó la
  decisión de los pictogramas y `033` la marca de lengua vehicular.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-3801**: Un alumno con barreras de presentación recibe el **mismo** cuerpo de letra en
  el documento editable y en el impreso. Medido sobre los dos ficheros, no sobre la intención.
- **SC-3802**: Dos alumnos sin barreras y de bandas distintas reciben hojas que una persona
  distingue de un vistazo, en el registro de `038`.
- **SC-3803**: Recorriendo todas las edades, el número de aspectos distintos es exactamente
  el número de bandas del corpus.
- **SC-3804**: Cero violaciones de accesibilidad en el barrido, sobre **todas** las bandas y
  todas las presentaciones — no sobre una muestra.
- **SC-3805**: **Una PT mira la hoja de un niño de siete y dice si se la daría.** Recogido
  literal, también si es desfavorable, como `010` SC-805. Es el criterio que decide si esta
  feature funcionó, y **no es un test**: nadie puede verificarlo sin un aula.
- **SC-3806**: Ninguna de las dos hojas que hoy son la línea base —seis páginas para seis
  ejercicios, y 24pt idéntico a los seis y a los diecisiete años— sigue siendo la única
  respuesta posible después de esta feature.

## Assumptions

- **Las bandas se escriben cuando D1 se responda**, y hasta entonces no se escriben unas
  provisionales. Un corpus provisional se convierte en el definitivo por inercia, y éste es
  el que le dice al modelo cómo hablarle a un niño.
- **La edad ya está en el perfil** y es opcional (`011`), así que «sin edad» es un caso
  normal y no un error.
- **El registro de `038` es la superficie de revisión** de todo esto. Sin él esta spec se
  juzgaría por tests de propiedad, que es como `010` produjo algo que pasaba todo y era feo.
- **La paridad del editable puede no ser total.** El formato tiene límites reales; lo que se
  exige es que lo que no llegue esté dicho, no que llegue todo.
- **Nada de esto se verifica sin un aula.** SC-3805 lo dice y `validation.md` lo lleva
  diciendo desde el principio.
