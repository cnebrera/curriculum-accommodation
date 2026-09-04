---
id: one-idea-per-sentence
version: 1
axes: [LIN>=2]
scope: [explanation, example, note, instruction, exercise, assessment]
conflicts: []
evidence: "Syntactic complexity and comprehension; literal wording for
  non-figurative comprehension. UDL 2.1 — clarify vocabulary and syntax"
---

# One idea per sentence

**Not yet reviewed by a practising teacher.** Written 2026-09-04 from
`instructions/axes.md` and the gap the review found (PROD-01, decision P1): `LIN`
alone activated **nothing**. `lectura-facil-es` asks for `DEC>=2` *and* `LIN>=2`, so a
learner who reads fluently and loses the meaning of a long sentence — which is a
common profile and not a rare one — got an unadapted sheet. Treat what follows as a
starting point a PT should correct.

In `core/` and not in `lang/es/` on the rule this repository already uses: «if a rule
would still be true for material in Finnish, it belongs in core». One idea per
sentence would. Which Spanish words are infrequent would not, and that is
`lectura-facil-es`'s business.

## What this axis is

`LIN>=2` is «pierde frases con más de una idea». At 3 it is «necesita frases cortas y
literales». He decodes it — the letters are not the problem — and by the end of a
subordinate clause the beginning is gone.

## What to do

- **Split at every «que», «aunque», «mientras» that carries a second idea.** Two
  sentences, in the order the events happen.
- **Subject, verb, object, in that order.** A sentence that begins with the
  circumstance («Cuando la planta recibe luz, …») makes him hold the circumstance
  until the subject arrives.
- **Say the thing, not the way round it.** «No es infrecuente que…» → «Pasa muchas
  veces que…».
- **Literal, at 3.** «Se te ha ido el santo al cielo» is a sentence he will answer
  literally, correctly, and wrongly. Idiom, irony and rhetorical questions go.
- **One referent per pronoun, or no pronoun.** «Lo» three sentences after its noun is
  a lookup he cannot afford; repeat the noun.
- **Gloss the unfamiliar word; never delete it.** «El agua se evapora — se convierte
  en vapor —» keeps the curricular term and adds the meaning. Deleting it breaks
  `keep-curricular-terms` and costs him the word the class is using.

## Before

> Aunque las plantas necesitan luz para fabricar su alimento, algunas especies que
> viven en el sotobosque han desarrollado hojas más grandes, lo que les permite
> aprovechar la poca luz que llega hasta ellas.

## After

> Las plantas necesitan luz para fabricar su alimento.
>
> En el sotobosque llega poca luz.
>
> Algunas plantas del sotobosque tienen hojas más grandes.
>
> Con hojas grandes aprovechan esa poca luz.

## Anti-patterns

- **Shortening by deleting.** Four short sentences is an adaptation. Two short
  sentences and a missing fact is a different text, and the missing fact is usually
  the one the question asks about.
- **Telegraphic style.** «Plantas: luz. Alimento: fotosíntesis.» is not simpler, it
  is a different genre, and he has to reconstruct the grammar himself.
- **Removing the curricular term with the long sentence.** Gloss it in place.
- **Splitting a sentence whose halves depend on each other** without keeping the
  link. «Si llueve, no salimos» is one idea, not two.
- **Doing this to an exam question whose length is what is assessed.** Reading
  comprehension of a complex sentence *is* the criterion sometimes — flag it and
  stop (`exam-access-not-difficulty`).
