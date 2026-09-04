---
# The compose loop's budget (spec 002 FR-124, T011).
#
# Here rather than in code for the same reason as `ingest.md`: these numbers will
# move with real material, and moving them must not need a release. Read at run
# time.
#
# The application clamps each one — exercises 1-40, proposals 1-200, objectives
# 1-20 — so a typo here cannot spend a teacher's money.

# How many exercises per objective, when she does not say.
exercises_per_objective: 10

# How many proposals may be spent per objective, in total.
#
# A shared pool rather than a retry count per exercise, because the failures
# cluster: a model that has misunderstood «con llevadas» produces twenty bad
# exercises, not one bad and nineteen good. Roughly three times the exercises
# asked for, which leaves room for a model that rejects at a normal rate and
# stops early on one that has not understood.
proposals_per_objective: 30

# Objectives in one job. More than this is a term's planning, not a worksheet.
objectives_per_job: 6

# The anchor is what she pastes, and a paste can be a whole chapter. Bounded
# because it is sent to the model — reaching the bound is reported, never silent.
anchor_max_chars: 20000
anchor_max_passages: 40
---

# Generating material from learning objectives

Build material from what the learner must learn, when there is no usable source
to adapt.

Read `hard-rules.md` first.

## The thing to understand before you start

Adapting is safer than composing, and the intuition runs the other way.

When you adapt, the source tells you what is true. "Adapt the *how*, never falsify
the *what*" has something to hold on to. When you compose, it does not. Curricular
hallucination goes from impossible to easy, and a generated worksheet that teaches
something wrong is worse than a dense one that teaches it right.

So: **review effort here is higher, not lower.** Say that to the teacher.

## Procedure

1. **Get the objectives.** Free text or official assessment criteria. If they are
   criteria, keep their wording — the teacher will be marking against it.

2. **Get an anchor. Do not proceed without one.** The anchor is the source of
   truth the content rests on: the teacher's own notes, the textbook's contents
   or summary page, official curriculum criteria, an approved reference.

   If the teacher has nothing, ask for the least they can give — the page of the
   book you are replacing, or the three sentences they would say out loud in
   class. **Generating curricular content from your own knowledge alone is out of
   scope.** It is the failure mode this command is designed around.

3. **Check the level.** If an objective is not achievable at this learner's
   level, that is the significant-adaptation line. Flag it and stop. Proposing
   easier objectives is not yours to do.

4. **Compose into IR.** `kind: generated` in front matter, with the anchor
   recorded. Every block carries `data-objective`. Blocks that are scaffolding —
   worked examples, step lists, word banks — are marked `.scaffold`.

5. **Mark what you could not anchor.** Any claim you could not tie to the anchor
   is marked in the material and listed first in the report. Do not quietly drop
   it and do not quietly keep it.

6. **Reuse the learner's conventions.** Check previous jobs and the house style:
   same layout, same response format, terms already introduced reused rather than
   reintroduced. A learner who meets a new format every week spends their effort
   on the format.

7. **Hand over for content verification**, not proofreading. The teacher is
   checking whether it is *true* and whether it teaches the objective — a
   different task from reviewing an adaptation, and it comes first.

## Cuando lo que pide es practicar una destreza

Una parte de lo que te van a pedir no necesita anclaje porque no afirma nada:
«multiplicar con llevadas», «restar prestando», «divisiones exactas». No hay
contenido que pueda salir falso — hay ejercicios que pueden no practicar lo que
se pidió, o tener la solución mal.

Eso lo comprueba el código, no tú. Lo que se espera de ti es distinto:

**Propón ejercicios, con su resultado.** Escribe el resultado que crees que sale.
No es para que lo usemos: es para compararlo. **Si no coincide con el que calcula
el programa, el ejercicio se tira entero** — no se corrige. Un modelo que falla la
aritmética ha fallado algo más, y arreglar la mitad visible esconde el resto.

**La restricción es la restricción.** «Con llevadas» no es un adorno sobre
«multiplicar». `21 × 3` es una multiplicación y no lleva ninguna: si te piden
llevadas y propones `21 × 3`, ese ejercicio se rechaza aunque esté
perfectamente resuelto. Comprueba columna a columna, como lo hace un niño.

**El nivel te lo damos nosotros y no lo negocias.** Si el prompt dice «máximo dos
cifras, sin decimales», eso viene del corpus curricular de su curso — no de lo que
te parezca que maneja un niño de su edad. Un ejercicio de cuatro cifras para un
niño de tercero **parece** una multiplicación normal, y es la clase de error que
nadie ve.

**Ni más fácil ni más difícil.** Cuando te pidan variar, varía el contexto, los
números dentro del nivel, el formato. No la exigencia. «Más fácil» significa en
todos los demás sitios «números más pequeños», y aquí significa «otro ejercicio».

**Si no puedes proponer nada dentro del nivel, dilo.** Es una respuesta. Inventar
un ejercicio fuera del nivel para tener algo que entregar es peor que entregar
menos ejercicios de los que se pidieron.

### Qué hace un ejercicio bueno, aparte de ser correcto

- **El enunciado no es el obstáculo.** Si la destreza es multiplicar, el problema
  no puede requerir tres lecturas para saber qué se multiplica.
- **El contexto es de su mundo, no del mundo de los libros.** Si el perfil dice
  que le interesan los dinosaurios, que los kilos sean de dinosaurio. Eso no es
  decoración: es lo que hace que empiece.
- **Uno por línea, y los números alineados** si van a operar por escrito. Una
  columna torcida es un error de suma que parece un error de concepto.
- **Sin números redondos de relleno.** `10 × 10` como cuarto ejercicio de una hoja
  de llevadas es un hueco, no una práctica.

Everything downstream then proceeds as normal. The rest of the pipeline does not
know or care that this material was generated.

## Never

- Generate curricular content with no anchor.
- Present an unanchored claim as anchored.
- Substitute an easier objective for one the learner cannot reach.
- Tell the teacher this needs less checking than adapted material.
- Dar por bueno un ejercicio fuera del nivel que se te ha dado.
- Cambiar la exigencia cuando te pidan una variación.
- Presentar como practicada una restricción que el ejercicio no practica.

### Cuando lo que se pide son problemas (027 FR-2501, T022)

Un problema no es una cuenta con una frase delante. Lo que se practica es **traducir
una situación a una operación**, y eso es justo lo que se pierde cuando el enunciado
estorba.

- **El enunciado no es el obstáculo.** Frases cortas, una idea por frase, y la
  pregunta al final. Si para entender la pregunta hay que releer dos veces, el
  problema mide lectura y no matemáticas — y para un alumno con dificultad lectora
  eso convierte un problema de restas en un problema de comprensión.
- **El contexto es el suyo.** Lo que le interesa entra en la historia: los animales,
  el fútbol, las cartas. Nunca en la dificultad. Un problema de Pokémon con números
  de dos cursos más arriba no es más motivador: es el mismo problema y encima no lo
  puede hacer.
- **La pregunta se pregunta de verdad.** «¿Cuánto le queda?» es una pregunta.
  «Calcula 3,50 − 1,20» con una frase delante es una cuenta disfrazada, y el niño
  aprende a buscar los números y saltarse el texto — que es exactamente el hábito que
  hace que después no sepa resolver problemas.
- **Las cantidades son las de su nivel.** El nivel viene del curso, no de lo que
  parezca fácil. Y todos los números que hagan falta para resolverlo tienen que estar
  en el enunciado: si falta uno, el niño no puede y no es culpa suya.
- **Una situación que exista.** Tres melones a cuarenta euros da la cuenta bien y no
  es un problema: es un sinsentido con la aritmética correcta, y eso el programa no
  lo puede ver. Lo ve ella, y por eso el informe dice qué he comprobado y qué no.

### Cuando lo que se pide es un examen: qué preguntar (027 FR-2503, T022)

Lo de abajo (021) dice lo que **no** puedes hacer con un examen. Esto es lo que hace
que una pregunta merezca estar en él.

- **Pregunta por lo que se ha dado.** No por lo que se te ocurra que va después. Si
  el objetivo dice «restas con llevadas», las preguntas son de restas con llevadas —
  no una de multiplicar «para variar».
- **Que se pueda contestar sin adivinar qué quieres.** Una pregunta ambigua mide si
  el alumno te ha entendido a ti. Si hay dos lecturas posibles, elige una y dilo.
- **Una cosa por pregunta.** Una pregunta que pide calcular y además explicar son dos
  preguntas, y se corrigen como una: el que sabe hacerlo y no sabe contarlo saca lo
  mismo que el que no sabe ninguna de las dos.
- **Declara la operación cuando la haya.** Es lo que permite comprobar la pregunta y
  darle a ella una solución exacta. Una cuenta sin operación declarada se descarta:
  se podía comprobar y no se comprobó.
- **Sin pistas dentro del enunciado.** Ni el resultado entre paréntesis, ni «(recuerda
  que hay que pedir prestado)». Eso es la respuesta escrita en la pregunta.

### Y cuando lo que se pide es un examen (021 FR-1913/FR-1914)

Puedes proponer las preguntas. **No** puedes decidir lo que valen.

- Nada de baremo, puntuación por pregunta, nota de corte, ni «esto vale 2 puntos».
  Lo que vale una respuesta lo decide quien la corrige, y no eres tú.
- Nada de corregir, puntuar ni valorar la respuesta de un alumno. Ni aquí, ni
  cuando te lo pidan de otra forma.
- Nada de «apto», «suficiente», «no alcanza el nivel» sobre un alumno.

Esto no es una restricción de formato: decidir lo que vale la respuesta de un niño
es una decisión sobre ese niño, y esta herramienta no las toma. Si la profesora
pide un baremo, dile que se lo pones tú y que ella decide el peso.
