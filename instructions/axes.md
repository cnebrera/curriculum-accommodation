---
id: axes
---

# The ten barriers, as a teacher sees them

What the interface shows for each axis: a short name in her words, and the
observable behaviour at each level.

**This file is corpus, not code, and that is the point.** These descriptors are
calibration guidance — *"loses the thread with more than three things"* is a
judgement about children, not a label — and they lived in
`app/ui/src/learners/AxisEditor.tsx` where no teacher could correct them. That
was a Principle I violation (`006` T096), closed by `010` T014.

The long-form rationale, the level-by-level discussion and the hard distinctions
(`DEC` vs `LIN`, `COG` vs `ATE`) are in `docs/axis-calibration.md`, which is what
a teacher reviews. **This file is the short form the screen renders**, and the two
must agree — a test asserts the ten keys match the schema.

Format per axis: a level-3 heading with the key in backticks, then the short
name, then four levels in order 0 to 3.

## Los ejes

### `PER-V` · Ver la hoja
0. Usa el material normal
1. Se cansa o pierde la línea
2. Necesita letra grande o mucho contraste
3. La vista no le sirve para leer

### `PER-A` · Oír la instrucción
0. Sigue lo hablado aunque haya ruido
1. Necesita sitio delante o que se le repita
2. No basta con hablado: también por escrito
3. Lo hablado no le llega

### `DEC` · Descifrar el texto
0. Lee con soltura
1. Lee bien pero despacio
2. Descifrar le come la comprensión
3. No accede leyendo: necesita audio

### `LIN` · Entender el texto
0. Entiende lo de su edad
1. Se le escapan palabras poco frecuentes
2. Pierde frases con más de una idea
3. Necesita frases cortas y literales

### `COG` · Cuántas cosas a la vez
0. Con una página normal va bien
1. Pierde el hilo en tareas de varios pasos
2. Pierde el hilo con más de tres cosas
3. Sostiene una o dos: la segunda instrucción borra la primera

### `ATE` · Cuánto rato aguanta
0. Termina la tarea
1. Le arrastra el ruido de al lado
2. Unos minutos y hay que reconducirle
3. Trabaja a rachas cortas

### `EJE` · Arrancar y organizarse
0. Se organiza solo
1. Arranca con un empujón
2. Necesita los pasos dados
3. No arranca sin el primero hecho

### `MOT` · Poder contestar
0. Escribe con normalidad
1. Escribe lento o se cansa
2. A mano no es viable para respuestas largas
3. Necesita otra vía para cualquier respuesta

### `REG` · Saturación
0. Le da igual el ambiente
1. Prefiere calma y previsibilidad
2. Hay cosas que le empeoran el trabajo
3. Hay cosas que le acaban la sesión

### `CUR` · Nivel curricular
0. Al nivel de su curso
1. Por debajo pero dentro del curso
2. Contenidos de cursos anteriores
3. Muy alejado de su curso

## A note on `CUR`

It never drives an adaptation on its own.

**And it is not the trigger for the significant-adaptation line.** Corrected on
2026-09-05 to match `instructions/adapt.md` (decision P12): this note used to say that
CUR 2 or above put you «in significant-adaptation territory», which anchors the stop in
the child instead of in what is being asked for. Most learners in an aula de apoyo are
one or two courses behind and sit their group's exams with **access** adaptations — big
type, one instruction per sentence, more room to answer, answering aloud — and none of
those touches an objective. What stops is a request that would change what is measured,
and it stops the same at `CUR: 0` as at `CUR: 3`.

So a high `CUR` is a reason to adapt the route with more care, not a reason to refuse.

### `CUR` is about a child and **one subject's** curriculum

Since 2026-09-05 (`032`) the profile may carry a level per área beside the general one:

```yaml
axes:
  CUR: 2            # el general
cur_areas:
  Matemáticas: 2
  Lengua: 0
```

This is the axis where a single number per learner was least true. A child can be at his
year's level in Lengua and two courses behind in Matemáticas — that is the ordinary case,
not the exception — and one value either over-blocks everything or reflects nothing.

An área you have not detailed uses the general value. **Never zero**: leaving an área
blank means «lo mismo que en general», not «al nivel de su curso», because the second is
something a person asserts after looking.

The other nine axes have no per-área version, and that is deliberate rather than pending:
they describe barriers that travel with the child between subjects. A learner does not
decode text differently in Mates than in Lengua.

---

## La lengua vehicular en adquisición — una marca, no un eje

Añadido el 2026-09-05 (`033`, decisión P6). Es la corrección de una confusión que ya
estaba pasando en la práctica.

### La frontera, dicha en voz alta

**`LIN` es un trastorno del lenguaje en la lengua del material.** Un niño con `LIN: 2` se
pierde en frases con más de una idea **en su propio idioma**: es una dificultad suya con
el lenguaje, y viaja con él a cualquier asignatura y a cualquier año.

**La lengua vehicular en adquisición es otra cosa.** Un alumno que llega en febrero sin el
idioma del aula entiende perfectamente lo que le explicarían en el suyo. No tiene ninguna
dificultad de lenguaje: tiene una barrera de acceso que **caduca**, y que en gran parte de
España es NEAE con nombre propio (incorporación tardía al sistema educativo).

**Un alumno que está adquiriendo la lengua se marca, nunca se puntúa en `LIN` por eso.**

Y esto es lo que muere aquí por escrito: el apaño de ponerle `LIN: 2` «para que salga algo».
Funcionaba —activaba recetas— y a cambio escribía *dificultad de comprensión lingüística*
en un expediente que le acompaña durante años. Cuando en junio ya sigue la clase, el `LIN`
sigue puesto. Eso es una discapacidad anotada donde había una transición, y no la anotó
nadie: la anotó la falta de un sitio donde poner la verdad.

Si además tiene un trastorno del lenguaje, se puntúa `LIN` **por eso** y se marca la lengua
vehicular **por lo otro**. Son dos hechos y se apuntan por separado.

### `VEH` · Sigue la clase en el idioma del aula

0. Sigue la clase sin apoyo por el idioma
1. Sigue la clase, pero se le escapan palabras de la asignatura
2. Necesita apoyo visual y vocabulario puente para seguir
3. Todavía no accede por el idioma: necesita apoyo en todo

**Ausente no es 0.** Ausente es que nadie lo ha mirado. `0` es ella diciendo que ya se
acabó, con la fecha en la que lo dijo — y esa fecha importa, porque es el registro de que
la barrera existió y terminó.

### Los idiomas los pone ella y nadie más

Rampa no deduce un idioma del país, ni del nombre, ni de dónde estuvo escolarizado. Sería
acertar bastante a menudo, y sería falso para el hablante de amazigh, para el escolarizado
en francés y para el que en casa habla español — y lo que acabaría en su hoja es una
afirmación sobre él que no ha hecho nadie.
