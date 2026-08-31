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
