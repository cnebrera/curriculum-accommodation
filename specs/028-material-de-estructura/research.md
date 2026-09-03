# Phase 0 · Research

Four questions. R1 shapes the feature; R4 found that «reuse the standard path» is nearly
literal for the story.

---

## R1 · Where does structure material live in the vault — a job like the others, or a form of its own?

**Decision**: **a job.** `material/<job>/ir.md`, front matter `source: structure`,
`structure: agenda | secuencia | historia`, `for_learner: <code>`, `language`, plus the
ordered items as the document's blocks. One accommodation in code: `isGenerated`
(`app/packages/core/src/ir/types.ts`) accepts `source: structure` beside
`source: composed`, and `RecordSource` (`app/packages/core/src/record/entry.ts`) gains a
`structure` case.

**Rationale**: `014` settled how the record works before this feature arrived, and the
answer decides this question. `entryFor` (`app/packages/core/src/record/scan.ts`)
**derives** the record from `material/` — nothing is stored — and it already includes a
job that was started for a learner but never adapted, via `startedFor(irFrontMatter)`.
So a structure job stamped `for_learner`:

- **appears in the record** (FR-2604) through the existing branch, with only a
  `sourceOf` case to name its kind honestly;
- **is erased by `003`** because the erasure planner asks `entryFor` — what the record
  lists, erasure removes, with no new enumeration to forget;
- **resolves, prints and signs** through `resolveDocument` (`021`), whose generated-job
  branch already refuses to hand a learner's document to another learner and already
  derives the draft mark from the document;
- **reprints deterministically**, because the saved thing *is* the adapted-IR-equivalent:
  render is a pure function of the file (`022` FR-2004's rule).

**Why the front matter says `structure` and not `composed`**: honesty in the record. A
composed job's «original» is objectives she gave; a structure job's «original» is the
items she picked. `sourceOf` collapsing both into `composed` would make the record
describe an agenda as «composed from objectives: —», which is a lie with an empty list.

**Alternatives considered**: a form of its own (`structure/<learner>/…` or a file per
learner under `profiles/`) — rejected: every consumer (record, erasure, print, sign-off,
handover's «existence may travel») would need a second enumeration, and `014` has found
the missed-second-enumeration defect repeatedly. Reusing `source: composed` verbatim —
rejected above. A JSON of items rendered on demand — rejected: it would be a second
document format beside the IR, and Principle IV exists to prevent exactly that.

---

## R2 · What shape is the builder — and where does selection and order live?

**Decision**: a **pure function in `core`** plus a screen that reuses the choosers that
already exist.

```
buildStructure({ kind, title?, items, language, set, overrides, chosen, names })
  → { doc: IRDocument, gaps: Match[] }        // packages/core/src/structure/build.ts
```

Each item is a word/label (plus, for sequences, its position number; for stories, the
sentence it supports). The function resolves each item's drawing by calling **`matchWord`**
(`app/packages/core/src/pictograms/match.ts`) — the same call, the same `MatchOptions`,
the same four rungs — and emits IR blocks carrying `data-picto` word→id exactly as
adapted material does, so `renderHTML`'s existing pictogram rendering, named gaps,
`alt` text and derived attribution all apply unchanged.

**Rationale**: the precedence is **one mechanism** (`018` FR-1612 / `024` FR-2215), and
the only way to guarantee that is for the builder to have no lookup of its own — not a
copy, not a "simplified" version for whole-moment words. `matchWord` already returns
`ambiguous` and `none` as distinct refusals, which is FR-2606 for free: the builder maps
both to a declared gap and reports the ambiguous ones with `reportSkipped`, so the screen
can offer the same chooser `024` built (`candidatesFor` in
`app/packages/shell/src/pictograms/bring.ts`, `ChooseWord` in `app/ui/src/pictograms/`).

Selection and order are **hers and only hers** — the builder never suggests, completes or
reorders. That is not a missing feature: a model proposing her Monday is the
wrong-pictogram failure at the level of the whole day.

**Where the builder runs**: in `core`, pure, no filesystem — the set arrives as a
`PictogramSet` the shell already knows how to load, names arrive via `nameWordSet` as in
`jobs/adapt.ts`. The shell's `jobs/structure.ts` does the writing (inside the vault, via
the existing `Vault`), and IPC registration stays in `ipc/` per the boundary test.

**Alternatives considered**: building in the UI and saving rendered HTML — rejected,
render must stay a function of the saved IR or reprint-identical (FR-2603) is a promise
about a cache. A builder that calls `candidatesFor` directly — rejected: `core` cannot
import the shell; the screen uses `candidatesFor` to *offer*, the builder uses
`matchWord` to *resolve*, and the chooser records her pick as vocabulary/override exactly
as `024` does, so the two cannot disagree.

---

## R3 · What are the minimal render templates, and where do they live?

**Decision**: **block classes in the one renderer**, not a template engine and not a
second renderer. Three, matching the spec's assumption:

| Kind | IR shape | CSS |
|---|---|---|
| agenda | one block per moment, class `agenda-moment`, `data-picto` | horizontal/vertical strip: large picto (≈35mm), word beneath, order = document order |
| secuencia | one block per step, class `secuencia-step`, `data-number` | numbered rows: number, picto, short label |
| historia | ordinary paragraphs with `data-picto` over key words | what adapted material already gets |

The styles land beside the existing `.pictos`/`.picto` rules in
`app/packages/core/src/render/html.ts`, in millimetres because this stylesheet is for
paper, and sized **up** from the 20mm inline minimum: an agenda is read across a room,
not inside a sentence.

**Rationale**: Principle IV. `renderHTML` already renders pictogram cells, named gaps,
the photocopy-safe word-under-drawing rule and the derived attribution line — a separate
strip renderer would re-implement all four and drift on the first change. The historia
needs **nothing new at all**: it is text with pictogram support, which is what
`applyPictograms` + `renderHTML` do today. `checkPhotocopy` and `renderHTML`'s existing
contrast rules cover FR-2607's photocopy half; the attribution half is already
unavoidable (`attributionFor` is derived from the document and takes no option).

**Alternatives considered**: per-kind HTML templates in the corpus — rejected: layout is
mechanics, not judgement; the corpus carries what a teacher would correct, and «35mm»
is not that. A dedicated `renderStrip()` — rejected as the parallel pipeline Principle IV
names.

---

## R4 · How does the historia social inherit redaction, cost and signature without new machinery?

**Decision**: a **compose-shaped job** in `app/packages/shell/src/jobs/structure.ts` that
assembles nothing itself:

- **Prompt** = `loadInstruction('hard-rules')` + `loadInstruction('social-story')` — the
  judgement (first person, short sentences, present tense, concrete situation, what must
  not be invented as fact) is a new corpus file, `instructions/social-story.md`, readable
  and correctable by a teacher (Principle I). The only string in the job is the output
  format, as in `jobs/adapt.ts`.
- **Her situation text is the instruction; anything attached is content**, delimited
  through the same annotation the adapt path uses (`annotateInjection`,
  `injectionNotices`) — FR-2610, Principle IX.
- **Egress** through `sendRedacted` (`@rampa/providers`) with the same name gate
  (`nameWordSet`) that notes pass — the P17-hardened rule, no second chokepoint.
- **Cost** through `addCost`/`recordCost`, shown in `006` FR-403's terms, like any job.
- **Output** is written as an **unsigned structure job** (R1's front matter,
  `structure: historia`): the draft mark is derived from the document by the renderer,
  removable only by the existing sign-off IPC — FR-2609 with zero new code.
- **The report** carries the anti-anchoring line — concrete details are the model's
  invention until she edits them (FR-2611) — and the line's wording lives in the corpus
  file, not in `jobs/`.
- **Pictogram support** over the drafted text is `applyPictograms` + `matchWord` with her
  vocabulary, exactly as adapted material — one mechanism (spec US3 scenario 3).

**Rationale**: every one of those six is a defence this project has already built and, in
several cases, already repaired after it was once bypassed (the draft-mark parameter, the
prompt-as-string). Re-deriving any of them for a new job kind is how the repaired defect
returns wearing a new feature.

**And the deterministic kinds sign too.** Principle VII says output is a draft until a
human signs; an agenda she assembled is human-authored, but a «born signed» save would be
a **second way the mark disappears**, which is exactly the structural defence rule 5 of
AGENTS.md protects. So agendas and sequences save unsigned and she signs through the same
one IPC — one extra click, and the invariant «the mark is cleared by one call» survives
this feature intact.

**Alternatives considered**: routing the story through `runCompose` — rejected: compose
verifies exercises against objectives; a story has neither, and the verifier would either
reject it or be weakened to admit it (weakening a gate to make a change pass is
forbidden outright). A "light" provider call without the redaction wrapper for such a
"small" text — rejected without discussion; the situation text is *about* a concrete
child's week, which makes it the most identifying prose in the feature.
