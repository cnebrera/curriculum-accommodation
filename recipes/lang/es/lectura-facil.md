---
id: lectura-facil-es
version: 1
axes: [DEC>=2, LIN>=2]
scope: [explanation, example, instruction, exercise]
conflicts: [exam-access-not-difficulty]
evidence: "UNE 153101:2018 EX — Lectura Fácil; Plena Inclusión"
lang: es
---

# Lectura fácil (español)

## What to do

Spanish-specific application of easy-read conventions. Apply *after*
`keep-curricular-terms`, never instead of it.

- **One idea per sentence.** Aim under 15 words. Never split a sentence in a way
  that loses the connector's meaning — "porque", "aunque" and "si" carry content.
- **Active voice, subject first.** «La planta absorbe el agua», not «El agua es
  absorbida por la planta».
- **Avoid nominalisation.** «Cuando se calienta el aire» beats «El calentamiento
  del aire».
- **Cut the impersonal `se`** where it hides who acts: «se observa que» → «vemos
  que» or just drop it.
- **Resolve pronouns and deixis.** Repeat the noun rather than «este», «aquél»,
  «lo anterior». Repetition is not a stylistic flaw here.
- **Expand abbreviations** on first use: «etc.», «p. ej.», «s. XIX».
- **Literal language.** Idiom and metaphor go, unless the figure of speech is the
  content — in a Lengua unit it usually is, and then it stays and gets explained.
- **Line breaks at syntactic boundaries.** One clause per line where the layout
  allows; do not hyphenate across lines.
- Numbers as digits: «3», not «tres».

## Before

> Se estima que la deforestación, cuyo avance se ha visto acelerado en las
> últimas décadas, conlleva la desaparición de numerosas especies, muchas de las
> cuales aún no han sido catalogadas.

## After

> Los bosques desaparecen cada vez más rápido.
> Esto se llama **deforestación**.
>
> Muchos animales y plantas viven en los bosques.
> Cuando el bosque desaparece, esos animales y plantas también desaparecen.
>
> Algunos de esos animales y plantas todavía no tienen nombre científico.

## Anti-patterns

- **Simplifying the curricular term along with the sentence.** «Deforestación»
  stays. See `keep-curricular-terms`.
- **Chopping sentences at commas** and producing fragments that no longer connect:
  «Los bosques desaparecen. Rápido.» A short sentence must still be a sentence.
- **Losing causality.** «porque», «por eso», «si… entonces» carry the reasoning
  the learner is being taught. Keep the connector, shorten the clauses.
- **Removing figurative language in a Lengua y Literatura unit** where metaphor is
  the object of study.
- **Applying this to `.assessment`** — it conflicts with
  `exam-access-not-difficulty`, which wins. Rewriting an exam question in easy
  read can change what is being assessed; the presentation adaptations are
  allowed, the rewording needs the teacher.
- Infantilising. Easy read is not baby talk. A 14-year-old gets 14-year-old
  content in accessible language.
