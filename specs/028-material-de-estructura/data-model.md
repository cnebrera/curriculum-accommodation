# Data Model — material de estructura

The saved form **is an IR document in a job directory** (research R1). This file
describes its front matter, the Item, the builder's types — and what deliberately gains
no store.

## The structure document · `material/<job>/ir.md`

```yaml
---
source: structure            # what isGenerated now also accepts
structure: agenda            # agenda | secuencia | historia
for_learner: AL-07           # the opaque code; startedFor() reads it (021)
language: es                 # which language the drawings were resolved in
title: "Mañana del lunes"    # her label; a moment name, never a child's name
created: 2026-09-07
# historia only, written by the job like any provider job:
# recipes/cost/etc. as the standard path records them
---
```

- **`source: structure`** — `isGenerated` (`packages/core/src/ir/types.ts`) widens by one
  disjunct, so `resolveDocument` serves it, the print/sign-off/record paths that already
  handle a generated job apply, and an ingested *reading* remains unprintable as before.
- **`for_learner`** — read by `startedFor()`; never a name. It is the one fact linking
  the file to a learner, and it lives in the vault only — FR-2608 is about what the
  *rendering* contains, and the renderer takes an IR and no profile, so the code never
  has a path onto the page. `assertNoLearnerData` (`render/check.ts`) asserts it anyway.
- **`structure`** — the kind, for the record's label and the reprint button (`014`).
  It is *not* one of `material-kinds.md`'s four: those govern adaptation judgement; this
  material is never adapted.

## The blocks · one item, one block

| Kind | Block | Attributes |
|---|---|---|
| agenda | class `agenda-moment`, text = the moment's word/label | `data-picto: "palabra=1234"` when resolved; nothing when a declared gap |
| secuencia | class `secuencia-step`, text = the step's label | `data-number: "1"…`, `data-picto` as above |
| historia | ordinary IR paragraphs from the drafted text | `data-picto` per supported word, via `applyPictograms` |

`data-picto` keeps the existing `word=id` form (`pictograms/apply.ts` `parsePicto`), so
the renderer's pictogram cells, named gaps, alt text (`pictogramAlt`) and derived
attribution (`attributionFor`) work unchanged — and traceability (Principle VI) is the
same sentence it is on adapted material.

**A declared gap is the absence of `data-picto` plus the block saying so** — the word
renders, marked as having no drawing, per the existing `.picto-missing` treatment. Never
a guessed id (FR-2606).

## The builder's types · `packages/core/src/structure/build.ts`

```ts
type StructureKind = 'agenda' | 'secuencia' | 'historia';

interface StructureItem {
  /** The moment or step, in her words. What matchWord is asked about. */
  word: string;
  /** Optional longer label to print, when the word alone is terse. */
  label?: string;
}

interface BuildArgs {
  kind: StructureKind;
  title?: string;
  items: StructureItem[];         // her order is the order; nothing reorders
  language: string;
  set: PictogramSet;              // loaded by the shell, as for adapt
  overrides?: Readonly<Record<string, string>>;  // the learner's (018)
  chosen?: ReadonlyMap<string, string>;          // her vocabulary (024)
  names?: ReadonlySet<string>;                   // via nameWords(), as adapt does
}

interface Built {
  doc: IRDocument;                // front matter above + one block per item
  /** Every non-matched item, verbatim from matchWord: ambiguous ones feed the
   *  chooser (reportSkipped), none-ones are stated gaps. */
  gaps: Match[];
}
```

Pure, deterministic, no filesystem, no model — it lives in `core` and the isolation
suite walks it. Resolution is **only** `matchWord`; the builder holds no lookup.

## What deliberately gains no store

- **No builder-state file.** The saved material is the IR; reopening for reprint reads
  the IR. (v1 has no re-edit of a saved agenda — she builds a new one in five minutes,
  which is the feature's own success criterion. A `.rampa/requests` mirror like
  `jobComposeRequest` can arrive when an edit flow does, and not before.)
- **No structure index.** The record derives it (`014`'s whole argument); a list of
  «this learner's agendas» is `entryFor` filtered on the front matter it already reads.
- **No copy of the attribution.** Derived from the document by `attributionFor`, as
  everywhere; a stored copy is the licence condition somebody edits.
- **No per-kind renderer state.** The kind is a class on blocks; the renderer stays a
  function of the document.
