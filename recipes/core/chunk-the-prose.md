---
id: chunk-the-prose
version: 1
axes: [COG>=2]
scope: [explanation, example, note]
conflicts: []
evidence: "Working-memory load in continuous text; retrieval cues (headings) as
  an aid to self-study. UDL 3.3 — guide information processing"
---

# Chunk the prose

## One axis, on purpose

`axes:` is **AND** (see `recipes/README.md`), so `[COG>=2, EJE>=2, ATE>=2]` would
mean «all three at once» and would fire for almost nobody. It was written that way
first and selected **zero** learners — a recipe written to close a coverage gap,
which itself covered nothing.

Being startable is a different need and a different recipe: `signpost-the-page`,
on `EJE`. The same learner often needs both; that does not make them one rule.

## Why this recipe exists

Because the corpus did not have it, and that was hiding a real gap for two years
of specification.

Every load recipe here is scoped to `exercise` or `assessment`. So a **study
text** — explanations and examples, no exercises — selected **nothing** for a
learner with `COG>=2`. The apparent coverage was `one-task-per-page` being applied
to prose, which its own anti-patterns forbid, and `exam-access-not-difficulty`
being applied to apuntes, which is nonsense. Two misapplied recipes are not
coverage. See backlog G20.

This is the material she studies **alone, at home, with nobody beside her**. It is
the page where an adaptation that quietly teaches less is least likely to be
noticed, by anybody.

## What to do

**Chunk under headings that say what the chunk is about.** Not «Apartado 2» —
«Por qué el aire se mueve». A heading is a retrieval handle: when he comes back to
this page on Thursday having forgotten it, the headings are how he finds the part
he needs. Use the text's **own** divisions; if it has none, divide where the
subject does.

**One idea per paragraph, and say which one first.** The first sentence of a
paragraph names its idea; the rest develops it. A paragraph that changes subject
halfway is two paragraphs, and he loses the second one.

**Keep every connector.** «Porque», «por eso», «en cambio», «aunque» carry the
causation, and the causation *is* the content. Prose with the connectors stripped
reads more easily and teaches nothing — it becomes a list of facts that happen to
be adjacent.

**A summary after the text, never instead of it.** «Lo que hay que saber de esto»
at the end, three or four lines, in the text's own words. It is a way back in, not
a replacement — and a learner who reads only the box has still met the concept the
first time somewhere.

**Terms stay.** Defining «fotosíntesis» inline beside the word is
`keep-curricular-terms`' job, not this one — this recipe changes the shape of the
page and never the vocabulary of the subject.

## Before

> **La circulación de la sangre**
>
> El corazón es un órgano muscular que bombea la sangre a todo el cuerpo mediante
> contracciones rítmicas, y esta sangre, que sale por las arterias cargada de
> oxígeno procedente de los pulmones, va perdiendo ese oxígeno a medida que lo
> cede a las células de los tejidos, de modo que regresa al corazón por las venas
> ya empobrecida, para ser enviada de nuevo a los pulmones donde se oxigena otra
> vez, completando así un circuito doble que los científicos llaman circulación
> mayor y circulación menor según el trayecto que recorra.

## After

> **La circulación de la sangre**
>
> *Esto son tres partes.*
>
> **1 · Qué hace el corazón**
>
> El corazón es un músculo que bombea sangre a todo el cuerpo. Lo hace con
> contracciones rítmicas, como una bomba.
>
> **2 · El viaje de ida: la sangre sale con oxígeno**
>
> La sangre sale del corazón por las **arterias**, cargada de oxígeno que ha
> recogido en los pulmones. **Por eso**, a medida que avanza, va cediendo ese
> oxígeno a las células. Cuando vuelve al corazón por las **venas**, ya lleva poco.
>
> **3 · El viaje de vuelta, y por qué son dos circuitos**
>
> Esa sangre empobrecida se manda otra vez a los pulmones para oxigenarse.
> **Así** se completa un circuito doble: **circulación mayor** (corazón → cuerpo →
> corazón) y **circulación menor** (corazón → pulmones → corazón).
>
> ---
>
> **Lo que hay que saber de esto**
>
> - El corazón bombea; las arterias llevan sangre con oxígeno y las venas la traen
>   sin él.
> - Son dos circuitos: uno al cuerpo (mayor) y uno a los pulmones (menor).

Nothing was removed. The same two terms are still there, the causation is still
there — «por eso», «así» — and the sentence that carried four ideas now carries
one each.

## Anti-patterns

**Summarising.** The single failure this material has, and it is invisible: the
text comes out clearer and no longer covers what had to be covered. `012` names it
as the study kind's own prohibition (`forbids: [content, coverage]`), and a summary
*replacing* the text is that prohibition broken with the report saying success.

**One sentence per line.** That is `one-task-per-page` applied to prose, and its
own anti-patterns forbid it: it destroys the thread. A chunk is a paragraph with a
heading, not a sentence with air around it.

**Turning it all into bullet points.** Bullets remove the connectors, and the
connectors are the causation. A bulleted list of facts about the heart is a page he
can read and cannot explain — and «explain it» is what the exam will ask.

**Inventing a division the subject does not have.** A heading implies these are
separable parts. Three headings over something that is one continuous argument
teach him it is three things.

**Headings that name nothing.** «Apartado 2» is a label. «Por qué el aire se
mueve» is a handle. The first is worse than no heading, because it costs a line and
returns nothing.

**Replacing the text with the summary box.** The box is a way back in for somebody
who has already read it once. On its own it is the same lie as summarising, in a
nicer shape.

**Adding, because there is room now.** The white space is part of the adaptation,
exactly as it is in `one-task-per-page`.
