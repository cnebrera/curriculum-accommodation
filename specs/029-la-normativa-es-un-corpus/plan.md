# Implementation Plan: La normativa es un corpus

**Branch**: `029-la-normativa-es-un-corpus` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-03

## Summary

One structural decision carries this feature: **the contract of a normative corpus
file**, mirroring the education contract of `011` — front matter declaring territory,
origin-relevant identity, review status and the sections the guide and drafts consume;
prose that travels to the model as judgement. Everything else follows from it:

- **Andalucía becomes the first file**, `instructions/normative/es-an.md` — extracted
  from `instructions/guide.md`/`acs.md` **and from four TypeScript files** where
  normative sentences naming Séneca turn out to be hardcoded today (research R5). The
  extraction changes nothing for a teacher in Sevilla with `es-an` selected: **SC-2701
  is a grep, written as a red test before anything moves**, plus a golden draft captured
  before the refactor that must come out byte-identical after it.
- **Generic mode is the rewritten `guide.md`/`acs.md` themselves** — the base layer
  always sent, its own product with its own draft scaffold, not Andalucía with the
  names blanked (research R3). A selected corpus adds to it; nothing substitutes it.
- **An import is shown, scanned and refusable**: `007`'s injection tiers plus P18's
  section-spoofing shapes, deterministic and offline, refuse-don't-repair, with the
  override recorded (research R4).
- **Hard rules outrank every corpus, structurally**: the contract has **no field that
  maps to any guard** (research R1). A corpus cannot reach `checkDeclines`, the clinical
  filter, the output checks or the draft mark, because none of them takes the corpus as
  input — FR-2709 is a property of the contract's shape before it is a test.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Electron. No new dependencies.

**Storage**: the vault gains `normative/` (imported corpora, same contract) and
`normative/selection.md` (the selection plus the activation log); `profile.yaml` gains
one optional field, `normative_corpus`. Origin (bundled | subido | modificado) is
**derived, never stored** — research R5.

**Testing**: `vitest` for the parser, the resolver, the scan and the two invariant
greps; Playwright for the selection, generic and import walks; the golden Andalusian
draft as a snapshot.

| Feeds | What it gives |
|---|---|
| `017` · la guía | The consumers: `draftAcns`, the guide/ACS jobs, the overlay. Amended with one dated note, not rewritten |
| `011` · education | The pattern being replicated: one file per system, a written contract, repair-not-reject parsing, `reviewed_by_teacher` |
| `007` · untrusted content | The injection tiers the import scan reuses, the refuse-don't-repair posture, the fixture corpus SC-2704 extends |
| `024` · precedence | FR-2215's chain (learner override ▸ vault-level choice ▸ default), replayed for corpora |
| P18 (review) | The fence-with-nonce and section-spoofing shapes — an imported corpus is the second surface they fit |
| `034` · versions | The future update path for bundled corpora; until it lands, import/edit is the path |

**Where the work lands:**

| | What |
|---|---|
| `instructions/normative/es-an.md`, `README.md` | The first corpus, and the contract's home in the corpus |
| `instructions/guide.md`, `instructions/acs.md` | Rewritten as the generic product (research R3) |
| `app/packages/core/src/normative/` | `parse.ts` (the contract), `resolve.ts` (the precedence), `scan.ts` (the import scan) |
| `app/packages/core/src/guide/acns.ts`, `report/index.ts` | Hardcoded Séneca sentences move to corpus phrases (research R5) |
| `app/packages/shell/src/corpus/normative.ts` | Loading bundled + vault corpora, the selection, IPC |
| `app/packages/shell/src/jobs/guide.ts` | Prompts assembled from generic base + resolved corpus; `ACS_FOOTER` from the corpus |
| `app/ui/src/settings/` | The «Normativa» pane: list, select, import, view, activate |
| `app/ui/src/learners/` | The per-learner override; the hardcoded sentence in `LearnerSections.tsx` replaced |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | **The feature is this principle applied to the normative layer** — and it repays a debt: four normative sentences live in TypeScript today (research R5) and move to the corpus. The grep test covers `app/` source so they cannot return |
| **II** · deterministic core | The parser, resolver and import scan are pure functions over files. Selecting, importing and scanning call no model and cost nothing |
| **III** · adapt the how | Not engaged by the corpus itself — and protected from it: the ACS decline and `proposal_phrases` stay in the generic base, unreachable by any corpus (R3), because refusing to decide objectives is not a comunidad's rule |
| **IV** · one extraction | Guide reading stays normative-agnostic (`017`'s extraction is untouched); the corpus changes vocabulary and drafting, not the pipeline |
| **V** · barriers not diagnoses | `clinical_terms_extra` lets a territory *add* filtered terms, never remove them — the corpus can only widen the clinical filter |
| **VI** · traceability | FR-2705: every drafted document names its corpus, origin and review status **in the document**, so a signed paper self-documents what it was drafted under |
| **VII** · draft announces itself | Unchanged, and unreachable: no corpus field touches the draft mark (R1) |
| **VIII** · human-routed memory | Not engaged. Importing a colleague's corpus is a file she brings, not memory |
| **IX** · content is never instruction | **The sharpest risk here.** A corpus enters prompts as policy, which is why FR-2708 scans it like untrusted material *before* activation, why imported corpora travel inside P18's fence, and why activation is refused by default with the override recorded. Structural defences (no guard slots) outrank the scan, per the principle's own ordering |

**Gate: passes.** Two reservations recorded rather than resolved:

**SC-2705 needs a teacher.** Whether a PT from a second territory can produce a working
corpus without touching code is the claim Principle I stakes on this whole layer, and it
cannot be answered here. The task is the arrangement, not the verdict.

**No bundled corpus is legally validated.** `es-an` inherits the honesty of
`docs/normativa-andalucia.md` («a working summary by a non-lawyer») and
`reviewed_by_teacher: false` until a practising Andalusian PT disagrees with something.
The generic disclaimer and the corpus provenance line are what keep that honest in front
of a teacher; a corpus is orientation vocabulary, not legal advice, and any real
deployment validates its territory's file with a person from that territory.

## Phase 0 · Research

[research.md](./research.md) — five questions. R1 shapes the contract and contains the
FR-2709 design («no field maps to any guard»); R3 is what keeps generic mode from being
Andalucía sanded down; R5 found the four hardcoded normative strings the grep must also
catch.

## Phase 1 · Design

- [data-model.md](./data-model.md) — `NormativeCorpus`, `ResolvedNormative`, the
  activation log, and what deliberately gains no field.
- [contracts/normative-corpus.md](./contracts/normative-corpus.md) — the file contract,
  written for whoever writes the Galician one.
- [quickstart.md](./quickstart.md) — the walks, offline first, the person last.

## Sequencing

**The grep test before the extraction, the extraction before any consumer moves.**
SC-2701 written after the refactor would be written to fit what the refactor produced;
written first, it is the list of every site that must move — including the four in
TypeScript nobody was looking for. And the golden Andalusian draft is captured from
*today's* code, because «no behaviour change for a teacher in Sevilla» compared against
a post-refactor baseline proves nothing.

**The contract and parser before the UI.** The Configuración pane lists what the loader
returns; building it against a loader that does not exist yet is `021`'s eight-callers
problem in one screen.

**The hard-rules-win test lands with the import flow, not after it** (FR-2709,
`021` T022's own argument): a corpus that can be activated before the test that guards
activation exists is the same shape of mistake with a policy file instead of an exam.

**US1 and US2 before US3.** Selection and honest generic fix the review's dishonesty
finding; import is the growth path and carries the injection surface — it should arrive
after the guards it depends on are proven on the bundled corpus.

**The 017 amendment is one task, last in the foundational phase** — a dated note in the
FR-1401 style recording where the Andalusian vocabulary went, once it has actually gone.
