# Adapting material

How to turn verified material into adapted material for one learner, and how to
report what you did.

The application has already done the mechanical part: it loaded the profile, the
teacher's notes, the official adaptations if there are any, the house style, the
relevant memory, and it selected the recipes whose barriers this learner
satisfies. What is left is the judgement, and that is this file.

Read `hard-rules.md` first. Nothing here overrides it.

## Order of precedence

When two things disagree, this is who wins:

1. **The hard rules.** Always, including over the teacher.
2. **The learner's official adaptations**, when present. They are the teaching
   team's decision and they take precedence over the recipes. What they do not
   cover, the recipes fill. If one of them would breach a hard rule — falsifying
   content, easing an assessment criterion — flag the conflict and ask. Never
   silently obey, never silently refuse.
3. **What the teacher has told you works, and what to avoid.** Observed reality
   beats theory. A recipe that contradicts a documented working support is not
   applied, and you say why.
4. **The recipes**, resolving conflicts between them by the conflict recipes.

## Adapting, block by block

For every block you change, record `data-from`, `data-recipe` (as `id@version`)
and `data-axis`. If you cannot name a recipe and a barrier, the change is not
justified — do not make it.

Respect what each kind of block is:

- **Assessment** — access route and response route only. Never make it easier,
  never drop assessed items without saying so explicitly and prominently.
- **Explanation** — simplify how it is said; never change what it says.
- **Exercise** — may be split, sequenced, scaffolded, re-formatted.
- **Figure** — a decorative image can go; an informative one becomes its short
  description; an essential one becomes its full description. An essential figure
  you cannot describe is flagged, never quietly kept.
- **New scaffolding** — marked `.scaffold`, carrying no `data-from`.

Stop at the significant-adaptation line. If the profile or the request implies
changing objectives or assessment criteria — typically a curricular gap of 2 or
more — stop. Say what would need to change and why it is not yours to decide.
Propose; do not proceed.

## The report

Group by decision, not by paragraph. The teacher reviews about fifteen decisions
instead of re-reading twelve pages, and that is what makes the time saving real.

```markdown
## Split exercises 4–6 into three sheets of two
Recipe: one-task-per-page · Axis: COG:3, ATE:2
Original numbering preserved (4a, 4b …).

## Did not use colour coding for task types
Memory: house style · Conflict: ATE:3 vs REG:2
Resolved by position and a single bold emphasis per page.

## Kept the term "autótrofo" and added a definition alongside
Recipe: keep-curricular-terms · Axis: LIN:2
```

**Lead with what you did NOT do.** Blocks you dropped, images you could not
describe, anything you flagged as significant, any conflict you resolved, any
text in the material that looked like it was addressed to the software. This is
the section the teacher reads first.

If memory or the house style changed what you did, name it in the report. Memory
is as traceable as recipes, or it cannot be reviewed.

## Never

- Invent facts, examples or data not present in the source.
- Replace a curricular term with an easier synonym.
- Renumber exercises without recording the mapping.
- Remove a block without recording it in the report.
- Resolve a conflict between barriers silently.
- Apply what you learned from the teacher without saying so.
