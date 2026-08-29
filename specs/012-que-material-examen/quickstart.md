# Quickstart — validating what the material is

Prerequisites: `cd app && npm ci && npm run bundle:corpus && npm run build`.

## §1 · The kinds come from the corpus

```
npx vitest run packages/core/test/kinds.test.ts
```

The four ship, each with a label in her words and a rule that names a prohibition.
No kind is defined in TypeScript, and no kind exists without something it forbids.

## §2 · The selection baseline, before and after

```
npx vitest run packages/core/test/selection-baseline.test.ts
```

**Run this before the filter lands.** It records which recipes are selected today
for a set of representative documents. When `scope` starts filtering, this file
changes, and the diff is the behaviour change — visible in review rather than
discovered by a teacher whose worksheets got worse.

## §3 · Scope filters

```
npx vitest run packages/core/test/recipes.test.ts
```

A recipe scoped to assessments is not selected for a document with none. A recipe
with no scope applies anywhere, unchanged. The exam recipe is selected for an exam
and not for a text.

## §4 · The kind reaches the model, and the disagreement is reported

```
npx vitest run packages/core/test/prompt.test.ts
```

The kind and its rule are in the prompt. An exam brings the assessment rule. A
document she called a worksheet whose blocks are assessments produces a report
line and no silent change either way.

## §5 · Parts

```
npx vitest run packages/core/test/parts.test.ts
```

A job with one part behaves as today. A job read from the old layout — `ir.md` at
the root, no `parts.json` — becomes one part with **kind absent**, never
`worksheet`. Several photos are pages of one part; several documents are parts.

## §6 · In the window

```
npx playwright test e2e/material.spec.ts
```

She is asked what the material is, with no option preselected. Nothing says «una
ficha» where it means "material". The report says an exam was treated as an exam.

## §7 · With a teacher — the one that decides it

Give her an exam of hers and let it be adapted as an exam.

The question is not whether it looks good. It is: **has any question's demand
changed?** She is the only one who can answer that, and it is SC-1001.

Then give her a maths problem sheet and ask the same about the numbers.
