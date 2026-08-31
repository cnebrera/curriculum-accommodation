# Quickstart: proving the material's kind matters

## Offline

```bash
cd app && npm test
```

`packages/core/test/kinds.test.ts` and `selection-baseline.test.ts`:

- **the test the spec asks for**: the same document as a worksheet and as an
  exam, and the prompts differ — the exam one asserts the constraint about this
  document
- a recipe scoped `[assessment]` is not offered for a document with no assessment
  blocks (FR-1004 — the field that was parsed and never read)
- a recipe scoped `[figure]` **is** offered for an exam containing a figure,
  because scope is about block classes and not about material kinds
- `study` does not relax the completeness check (FR-1008)
- a kind absent from the corpus degrades to «not offered» and logs, like every
  other corpus file (`011` FR-907) — and an **absent** kind is never written as
  `worksheet`, which is the defect this spec exists because of
- the report says what the material was treated as
- assessment-shaped blocks in a stated worksheet produce a **note to her** and no
  change of behaviour (FR-1005, Principle IX)

## End to end

```bash
cd app && npx playwright test e2e/material.spec.ts
```

The interface stops calling everything «una ficha»: she chooses, nothing is
pre-selected, and the word she chose appears on the screens that follow.

## The half that needs a key

**SC-1001.** Adapt the same exam twice — once labelled `exam`, once labelled
`worksheet` — and compare what changed. The exam version must change no assessed
criterion and must not reduce the number of items without saying so.

Not automated, and until it runs, hard rule 5 is a sentence the model is given
rather than a behaviour anybody has observed.

## What none of this proves

**SC-1003**: that a teacher reading the first screen can tell exams are treated
differently. One person, once.
