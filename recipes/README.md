# Recipes

A recipe is the unit of pedagogical judgement in Rampa. It is Markdown, it is
readable by a teacher, and it is the thing you contribute if you know how to
adapt material but not how to program.

Licensed CC BY-SA 4.0 — see `LICENSE-CONTENT.md`.

## Layout

| Directory | Contains |
|---|---|
| `core/` | Language-neutral: cognitive load, layout, sequencing, sensory access, response route, assessment |
| `lang/<code>/` | Language-specific: lexical simplification, readability standards, morphology |

If a rule would still be true for material in Finnish, it belongs in `core/`.

## Anatomy

```yaml
---
id: one-task-per-page
version: 1                           # bump on any change to what it does
axes: [COG>=2, ATE>=2]              # when it applies
scope: [exercise, assessment]        # which IR block classes
conflicts: [dense-revision-sheet]
evidence: "UDL 8.3; working-memory load"
---
```

**Bump `version` whenever you change what the recipe does.** Adapted material
records `data-recipe: one-task-per-page@1`, and that attribute is the audit
trail: without a version it points at a moving target, and traceability to a
moving target is not traceability. Typo fixes do not count; a changed rule or a
new anti-pattern does.

Then, in this order:

1. **What to do** — concrete, imperative, unambiguous.
2. **Before / after** — a real example. Not a description of an example.
3. **Anti-patterns** — what a well-meaning adapter gets wrong here.

## Anti-patterns are the point

Anyone can write "simplify the language". The value of a recipe is in the line
that says *don't replace the technical term the child is being assessed on*.

A recipe without anti-patterns will be asked for them in review. The corpus is
what stops an agent from quietly stripping the curriculum out of a worksheet
while making it look friendlier.

## Contributing one

Copy the shape of an existing recipe, keep it to one decision, and give a real
before/after from material you have actually adapted — with the source material
itself left out. See `CONTRIBUTING.md`.
