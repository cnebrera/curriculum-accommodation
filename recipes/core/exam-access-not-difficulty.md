---
id: exam-access-not-difficulty
version: 1
axes: []
scope: [assessment]
conflicts: []
evidence: "Access arrangements vs. modification of the assessed criterion"
---

# Exams: change the access, not the difficulty

## What to do

This recipe applies to **every** `.assessment` block regardless of profile. It is
a constraint on all other recipes, not an adaptation on its own.

Permitted, always:
- Presentation: type size, spacing, one item per page, contrast, colour.
- Access route: read aloud, audio, braille-ready text, described figures.
- Response route: dictate, type, point, oral answer, scribe.
- Time and breaks.
- Clarifying the *instruction* — not the content being assessed.

Not permitted without a teaching-team decision:
- Removing assessed items.
- Reducing the number of things the learner must produce ("dos ejemplos" → "un
  ejemplo").
- Giving away part of the answer as scaffolding.
- Replacing an open question with a multiple choice.
- Changing the assessment criterion.

The second list is not forbidden — it is **not yours to decide**. Flag it and
stop.

## Before

> **2.** (2 puntos) Explica dos consecuencias de la deforestación.

## After — correct

> **2.** (2 puntos)
>
> Explica dos consecuencias de la deforestación.
>
> *Puedes contestar hablando. Un adulto escribe lo que digas.*

## After — wrong

> **2.** (2 puntos) Marca las consecuencias de la deforestación:
> ☐ Se pierden animales ☐ Hay más agua ☐ Sube la temperatura

The learner is now being assessed on recognition instead of explanation. That may
well be the right decision for this learner — but it is a change of criterion,
it goes in the official file, and a teaching team makes it. Not an agent.

## Anti-patterns

- **Silent easing.** Every one of the changes above is invisible in the finished
  PDF and looks like a good adaptation. It is the failure mode with the worst
  consequences: the learner passes an exam that certifies something untrue.
- **Splitting a two-part answer into two one-part answers** on an assessment.
  Fine on an exercise; on an exam it changes what is measured.
- **Adding a worked example** to an exam. That is scaffolding, and scaffolding on
  an assessment is answering it.
- Applying `explicit-steps` to an assessment where the sequencing is what is being
  assessed.
