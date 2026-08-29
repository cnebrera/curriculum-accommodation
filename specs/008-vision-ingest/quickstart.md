# Quickstart — validating vision ingest

Prerequisites: `cd app && npm ci && npm run bundle:corpus && npm run build`.

## §1 · The converter and the validator, offline

```
npx vitest run packages/core/test/extraction.test.ts
```

Asserts, with no model and no network: the schema accepts a good page and rejects
each malformed case in the contract table; `[UNREADABLE]` survives to the IR
verbatim; exercise numbers survive verbatim; a non-decorative figure without a
description is rejected; non-monotone numbering is flagged and not rejected; the
same converter produces byte-identical IR from a vision page and from a digital
page carrying the same content.

## §2 · The budgets come from the corpus

```
npx vitest run packages/core/test/ingest-budget.test.ts
```

Reads the **shipped** `instructions/ingest.md`. Asserts the four values parse, that
absurd values are clamped with a log rather than obeyed, and that a missing front
matter block falls back rather than throwing.

## §3 · Reading the formats, offline

```
npx vitest run packages/core/test/documents.test.ts
```

Against committed fixtures: a digital PDF yields its text layer; a scanned PDF
yields page images and no text; a DOCX yields headings, lists and tables; hidden
text in a digital PDF raises the notice (FR-607); a HEIC decodes. No network, no
native module — which is also what SC-606 measures.

## §4 · The fixture set, and what it is for

`cases/003-ingest-fixtures/` holds worksheets written for the purpose, printed,
and photographed badly on purpose, each with a hand-written ground-truth IR. Run:

```
npx vitest run packages/core/test/fixtures.test.ts
```

This asserts the *ground truth is well-formed* — not the extraction, which needs a
key. It is the harness SC-601 and SC-602 are measured with, and it is a
deliverable of this feature: without it those criteria are decoration.

## §5 · The gate holds

```
npx playwright test e2e/ingest.spec.ts
```

In a real window, with no key: files are accepted and rejected by type;
the page bound is reported rather than silently applied; the name-in-photo warning
appears once and not again; **adaptation refuses while any page is unconfirmed**;
and confirming every page is the only thing that sets `verified`.

## §6 · With a real key — not automated

1. Photograph a two-page worksheet badly on purpose. Ingest it.
2. Confirm the extraction reads what the paper says. Time the whole journey: it
   must fit inside SC-603's 15 minutes.
3. Seed an error — change a number in the extracted text — and check a second
   reader finds it from the verification screen alone (SC-602).
4. Record what was reached in `specs/006-desktop-app/validation.md`, including the
   cost per page, because FR-611 makes that a number a teacher sees.
