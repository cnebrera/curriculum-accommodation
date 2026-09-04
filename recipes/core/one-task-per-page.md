---
id: one-task-per-page
version: 2
axes: [COG>=2, ATE>=2]
scope: [exercise, assessment]
conflicts: [exam-access-not-difficulty]
evidence: "Working-memory load; reduction of on-page distractors"
---

# One task per page

## What to do

Split a page holding several exercises into several pages holding one each.
Surround each task with blank space. Nothing else competes for attention: no
sidebar, no next question visible below, no decorative image.

**Preserve the original numbering.** If the sheet had exercises 4, 5 and 6, the
adapted sheets carry 4, 5 and 6 — not 1, 2 and 3. The class works out loud on
"exercise five"; a renumbered sheet makes the learner unable to follow.

When one exercise contains several sub-questions, split those too and number them
`4a`, `4b`, keeping the mapping in the report.

**Not on an assessment.** `exam-access-not-difficulty` lists «splitting a two-part
answer into two one-part answers on an assessment» among its anti-patterns, and
this recipe told you to split sub-questions «too». Both could be selected over the
same `.assessment` block and neither declared the other, so the contradiction was
resolved by whichever the model happened to follow — silently (review CONS-08,
decision P27). They now declare each other: on an exam the **guard wins**, one item
per page stays, and the sub-questions stay whole. Pagination is an access
arrangement; splitting what is answered is a change of criterion.

## Before

> **4.** Observa el esquema y responde: a) ¿Qué gas absorbe la hoja? b) ¿Qué gas
> libera? c) ¿De dónde saca el agua la planta? d) Escribe con tus palabras qué es
> la fotosíntesis.
>
> **5.** Rodea los seres vivos autótrofos: musgo, perro, pino, águila, alga.

## After

> *(sheet 1)*
> **4a.** Mira el dibujo. ¿Qué gas absorbe la hoja?
>
> *(sheet 2)*
> **4b.** Mira el dibujo. ¿Qué gas libera la hoja?
>
> *(sheet 3)*
> **4c.** ¿De dónde saca el agua la planta?
>
> *(sheet 4)*
> **4d.** Escribe con tus palabras qué es la fotosíntesis.
>
> *(sheet 5)*
> **5.** Rodea los seres vivos autótrofos: musgo, perro, pino, águila, alga.

## Anti-patterns

- **Renumbering.** The single most common way to make an adapted sheet unusable
  in a real classroom.
- **Dropping sub-questions instead of splitting them.** Four questions on four
  pages is an adaptation. Two questions on one page is a different exercise.
- **Splitting an exercise whose parts depend on each other** without carrying the
  needed context onto each page. If 4b only makes sense after 4a, repeat the
  stem.
- **Using the space freed up to add more.** The blank space *is* the adaptation.
- Applying this to `.explanation` blocks. Explanations are chunked, not
  paginated one-sentence-per-page — that destroys the thread.
- **Splitting sub-questions on an assessment.** One item per page: yes. `4a` and
  `4b` as separate items: no, that is what is being measured.
