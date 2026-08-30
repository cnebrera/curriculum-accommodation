# Quickstart: proving one worksheet reaches three learners

## Prerequisites

A vault, a configured provider, and three learners with **different** profiles —
identical ones would let a broken implementation pass by producing three copies
of the same sheet.

## The offline half

```bash
cd app && npm test
```

`packages/shell/test/batch.test.ts` covers what does not need a provider:

- one extraction read once for three learners
- a forced failure on the second: first and third complete, failure named
- the same three learners in reverse order produce the same three documents
- a repeated code adapts once
- no half-written document after a failure or a cancellation
- correcting the extraction marks existing sheets stale, by name, and re-runs
  nothing

## The end-to-end half

```bash
cd app && npx playwright test e2e/group.spec.ts
```

Drives the real application: choose a worksheet, choose three learners, run,
and assert three `adapted.md` files exist under one job directory.

## The half that needs money

Not automated, and this is the measurement SC-502 asks for:

1. Photograph a worksheet. Adapt it for **one** learner. Note the cost.
2. Photograph the same worksheet again. Adapt for **three**. Note the cost.

The second should be less than three times the first, and the difference should
be one ingest. If it is not, the extraction is being re-read and FR-502 is not
met however green the suite is.

## What none of this proves

SC-506: whether a teacher who has done it once would go back to running it three
times. One person, once, and it is the only criterion that says whether the
feature was worth writing.
