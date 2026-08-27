---
id: conflict-visual-scaffolding-vs-non-visual-access
version: 1
axes: [PER-V>=2, COG>=2]
scope: [explanation, exercise, figure]
conflicts: []
evidence: "Access precedes optimisation; WCAG 1.1.1"
---

# Visual scaffolding vs. non-visual access

## The contradiction

`COG>=2` calls for visual support: diagrams, colour coding, spatial grouping,
icons marking task type. `PER-V>=2` makes exactly those supports unavailable, and
at level 3 they are not merely unhelpful — they are the part of the page the
learner cannot reach at all.

The naive resolution is to keep the visual scaffolding and describe it. That
produces a description of a support instead of a support, which carries the
cognitive cost of the description without any of the benefit.

## What to do

**Do not describe the scaffold. Rebuild it in an accessible modality.** The
scaffold's *function* is what transfers, not its form.

| Visual scaffold | Function | Non-visual equivalent |
|---|---|---|
| Colour-coded task types | Predict what kind of work this is | A spoken or written label opening each task: "Pregunta corta." |
| Boxed grouping | Show what belongs together | Explicit announcement: "Estas 3 preguntas son sobre el mismo texto." |
| Diagram of a process | Show order and relation | Numbered sequence, one step per line, relations stated |
| Icon marking difficulty | Set expectation | Stated up front: "Esta es la difícil." |
| Spatial layout of a comparison | Show two things side by side | Linearised with headers repeated per item |

Apply the same reduction of load — fewer items, one task at a time, predictable
order — through structure and wording rather than through space and colour.

## Anti-patterns

- **Describing the scaffold instead of rebuilding it.** "Hay un recuadro azul con
  tres preguntas" adds load and delivers nothing.
- **Dropping the scaffolding entirely** because it cannot be seen. `COG` did not
  go away; the learner now has an unsupported dense task.
- **Assuming blindness implies simplification.** It does not, and doing so is
  modification without justification. See `profiles.example/B7.yaml`.
- **Keeping both**: a described diagram *and* the linearised version. That is the
  cost of both with the benefit of one.
