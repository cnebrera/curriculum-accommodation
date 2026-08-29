# Phase 1 — Data model

One new entity, one new field, one field that starts being read.

## Part (new)

A job is a unit of work. A **part** is one document within it, with its own source
and its own kind. Today every job has exactly one part; the shape exists from the
start because retrofitting it would touch every screen, the vault layout, the
report and sign-off (research R4).

```
material/<job>/
  parts.json                 ← the index: which parts, what each is
  p1/
    ir.md
    extraction.json
    source/                  ← her photos or files
  p2/
    ir.md
    …
  <LEARNER-CODE>/            ← unchanged: one extraction, N learners
    adapted.md
```

| Field | Notes |
|---|---|
| `id` | `p1`, `p2`. Stable, and it prefixes block ids so two parts cannot collide |
| `kind` | `worksheet` \| `exam` \| `study` \| `problems`. **Asked, never defaulted** |
| `label` | Her words: «el texto», «la hoja de problemas». Shown, never sent |
| `source` | `photos` \| `pdf-digital` \| `docx` \| `pasted` — as `008` already records |

**Migration:** a job with `ir.md` at its root and no `parts.json` is read as a
single part `p1` with `kind` absent. Absent, not `worksheet` — the whole finding
behind this spec is that an unasked kind was written as `worksheet`, and repeating
it during migration would bake the same lie into her existing material.

## The kind reaches the prompt

```
## Qué es este material
Es un examen.

En un examen puedes cambiar CÓMO se pregunta y nunca QUÉ se está evaluando.
```

The second line comes from the corpus, not from here (FR-1002, Principle I). The
prompt carries her statement and the rule; `instructions/adapt.md` owns what the
rule says.

**Where the kind and the block classes disagree** — she said worksheet and the
document is full of `.assessment` blocks — the report says so (FR-1005). Neither
is overridden: she may be adapting last year's exam as practice, which genuinely
makes it a worksheet, and the application does not know that and she does.

## `recipe.scope` starts filtering

Unchanged on disk. What changes is that it is read.

```
scope: [assessment]     → offered only where the document has .assessment blocks
scope: [exercise, assessment]  → either
(absent)                → anywhere
```

**Absent means anywhere**, deliberately. The alternative would disable every
recipe nobody has annotated, which is a much larger change wearing the same commit
message (research R3).

## The kinds live in the corpus

`recipes/kinds.md`, or an equivalent the recipe loader already reads:

```yaml
- id: exam
  label: "Un examen o una prueba"
  rule: >
    Puedes cambiar cómo se pregunta y nunca qué se está evaluando…
  forbids: [demand]
- id: problems
  label: "Una hoja de problemas"
  rule: >
    No cambies las cantidades ni las operaciones que se practican…
  forbids: [quantities]
```

`forbids` is machine-readable so a check can exist later; `rule` is what the model
reads. A fifth kind is this file plus nothing.
