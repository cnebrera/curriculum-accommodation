# Research: what the material is

## Why the four kinds are these four

The spec names them from what a PT actually brings: «una ficha o unos ejercicios,
un examen o una prueba, apuntes o un texto para estudiar, una hoja de problemas.»

They earn their places by **differing in what may be changed**, which is the only
distinction that changes behaviour:

| kind | what adaptation may do |
|---|---|
| `worksheet` | everything the recipes offer |
| `exam` | presentation and response route only — the criterion is preserved (hard rule 5) |
| `study` | everything, **and** the completeness check does not relax: a study text with content missing is a study text that teaches less |
| `problems` | everything except the quantities and the operations exercised — a simplified sum is a different exercise |

A fifth kind is worth adding only when it answers that column differently.
«Deberes» and «actividad de clase» do not; they are worksheets.

## Why `scope` is per block class, not per material kind

`recipe.scope` holds IR block classes — `explanation`, `example`, `instruction`,
`exercise`, `assessment`, `figure` — and the nine recipes in the corpus use them
that way. It is tempting to read FR-1004 as "a recipe declares which *material
kinds* it suits", and that would be a second vocabulary saying nearly the same
thing twice.

**Decision: scope stays block classes.** The material kind constrains *what may
change*; the block class constrains *where a recipe applies*. An exam contains
`.assessment` blocks and also instructions and figures, and a recipe about
figures applies to those figures whatever the document is called.

So FR-1004 is implemented as: a recipe whose scope intersects none of the block
classes present in this document is not offered. That is deterministic, it is set
intersection, and it is testable without a model.

## What was NOT researched

**Whether the model actually respects the exam constraint.** Hard rule 5 exists,
the prompt will now assert it about the document, and nothing here measures
compliance. SC-1001 asks for it over a fixture set and it needs a real key. Until
that runs, "an exam adapted as an exam changes no assessed criterion" is a
requirement rather than a finding — recorded, not resolved.
