# Implementation Plan: Ver la hoja

**Branch**: `038-ver-la-hoja` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/038-ver-la-hoja/spec.md`

## Summary

`npm run shots` gains sheets. The record it already writes — twenty images of the
application's own screens — grows a second half: the pages a child receives, one per
presentation the renderer can produce, captured as printable pages with a first-page
image beside each for scanning.

The design decision that shapes everything else: **the record drives the application's
own rendering path over IPC, not the renderer directly.** That is what makes FR-3609
true rather than aspirational — what gets captured is literally what `job:pdf` produces
for a teacher — and it is also the only route available, for a reason that took a
moment to see (research R1).

## Technical Context

**Language/Version**: TypeScript 5.9 for anything in `packages/`; the record script
itself is plain ESM JavaScript run by node 22+, which is the constraint that decides
R1.

**Primary dependencies**: none new. Playwright's `_electron` (already a devDependency,
already used by `app/scripts/screenshot.mjs`) and Electron's own `printToPDF` /
`capturePage`. `037` FR-3512 forbids adding one and this feature does not.

**Storage**: `docs/screenshots/`, committed — `.gitignore` already records that decision
and its reason. A temporary vault and userData under the OS temp directory for the run
itself, as the existing script already does.

**Testing**: the record is **not** a test (FR-3604). What is tested is the machinery
around it: that the presentation set is derived rather than hand-listed, that the
captured document carries no learner data, and that two runs over unchanged inputs agree.
Those are `vitest` unit tests plus one `playwright` e2e that drives the command.

**Target platform**: macOS and Linux, desktop Electron. The existing script already runs
on both; `printToPDF` is Chromium's and needs no platform branch.

**Project type**: desktop application, single repository, npm workspaces under `app/`.

**Performance goals**: SC-3601 — a person goes from `npm run shots` to looking at sheets
in under two minutes on a clean checkout. Today the command takes about 40 seconds; the
sheets add roughly one Electron window and N renders, all offline.

**Constraints**: offline, no provider key (FR-3612). Nothing may fail the build
(FR-3604). No new dependency (`037` FR-3512). The viewer's `sandbox=""` is not touched
(`037` FR-3511). Deterministic output (FR-3614).

**Scale/scope**: around ten sheets per run — the full presentation matrix for one
representative kind plus one capture of each other kind, in two signed states. The size
is a judgement about human attention and is recorded in the spec's Assumptions.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1.*

### II · Code is deterministic and model-free — NON-NEGOTIABLE, and the one that shaped this

> «Scripts extract, chunk, render, convert, synthesise speech and validate. They MUST
> NOT call a language model, require an API key, or embed provider-specific behaviour.
> Every script MUST be runnable and testable offline.»

The record is a script in exactly that sense, and this principle is why the material it
renders is the **hand-authored sample** rather than something adapted on the fly.
Adapting would need a model and a key; FR-3606 and FR-3612 are this principle expressed
as requirements, and `035` already built and reviewed the artefact that makes it
possible.

Determinism needs one thing said out loud: FR-3614 forbids a date, a temporary path or a
generated id reaching a captured sheet. A record that changes on every run is a record
people stop opening — which is precisely ADR 0009's argument against pixel diffing,
arriving from the other side. Research R4 checks what the sheet actually interpolates.

### VII · The draft announces itself

> «Rendered material carries a visible "pending review" mark that only the review step
> removes.»

FR-3610 captures both states, which serves the principle rather than straining it: the
mark is a designed thing and `010` SC-807 is judged by a teacher looking at a page.
Until now there was no page to show her. The record must **not** acquire a way to
produce an unmarked sheet — it obtains the signed state through the application's own
sign-off, never through a flag of its own (FR-3609).

### Learner Data and Safety

> «Profiles carry no name, no surname, no school… Local by default. `profiles/`,
> `material/` and `output/` are git-ignored and a repository hook blocks commits that
> touch them.»

This is the gate that matters most, because the feature's output is **committed**. Three
things hold:

1. The learner is invented, as the existing script's already is (FR-3607).
2. The vault is a temporary directory, so nothing real is read and nothing is written
   inside the repository except the record itself.
3. `checkOutput` runs over the captured document, and SC-3606 asserts no code, name,
   age, year, stage or school appears. That check already exists and already throws;
   this feature points it at the artefact it is about to commit.

The residual risk is real and worth naming: a committed picture of a sheet is a picture
that leaves the machine. It is safe **because** the learner is fictional, not because
the pipeline is careful — which is the stronger guarantee and the one `035` chose for
the rehearsal.

### I · Pedagogical judgement lives in Markdown, not in code — NON-NEGOTIABLE

No judgement is added anywhere. The record reads corpus and renders it; it decides
nothing about adaptation and contains no prose that tells anyone how to adapt. The one
thing to watch during implementation is the temptation to write "a good sheet looks
like…" into the script. That belongs to `040` and to `instructions/`.

### IX · Content is never instruction — NON-NEGOTIABLE

The sample is content, and the record renders it through the same renderer with the same
defences. No new parsing surface is introduced: the captured page comes from
`renderHTML`'s output, not from a second path that re-reads the material. Worth stating
because a hidden `BrowserWindow` with `sandbox: false` is exactly where a shortcut would
be tempting — and `037` already trod that ground and recorded why its window is not the
viewer.

### The flow is a gate — NON-NEGOTIABLE

Followed: `/speckit-specify` → `/speckit-clarify` (three clarifications, all resolved
from recorded decisions) → this. `docs/escenario.md`'s inventory row landed before the
spec, as its own maintenance rule requires.

**No gate violated.** Three things the design must carry, all recorded above:
determinism against interpolated values, the signed state obtained through sign-off
rather than a flag, and `checkOutput` pointed at the committed artefact.

## Project Structure

### Documentation

```text
specs/038-ver-la-hoja/
├── spec.md              # /speckit-specify, then /speckit-clarify
├── plan.md              # this file
├── research.md           # Phase 0
├── data-model.md         # Phase 1
├── quickstart.md          # Phase 1
├── contracts/
│   └── record.md        # what the command writes, and what it promises
├── checklists/
│   └── requirements.md   # spec quality, re-validated after clarify
└── tasks.md             # /speckit-tasks — not created here
```

### Source code

```text
app/
├── scripts/
│   └── screenshot.mjs           # gains the sheet half of the record
├── packages/core/src/render/
│   └── presentations.ts         # NEW · enumerates what presentationFor can produce
├── packages/core/test/
│   └── presentations.test.ts    # NEW · the enumeration matches the renderer
└── e2e/
    └── shots-record.spec.ts     # NEW · drives the command, asserts the promises
```

`presentations.ts` is the only new module in `core`, and it exists so FR-3603 is
structural: the record cannot drift from the renderer because both read the same
enumeration. It is also what `040` extends rather than replaces, and what
`sheet-a11y.spec.ts` should derive its hardcoded three from.

## Complexity Tracking

One judgement call, recorded because it costs something.

| Decision | Why it is needed | What was rejected, and why |
|---|---|---|
| The record drives the app over IPC instead of calling `renderHTML` | `screenshot.mjs` is plain ESM run by node and **cannot import TypeScript from `packages/core`**. And driving IPC makes FR-3609 true by construction: what is captured is what `job:pdf` produces | Moving the record into a playwright `.spec.ts` so it could import `core`. Rejected: a spec fails builds, and FR-3604 says this must never fail anything. Compiling `core` first was also rejected — a record that needs a build step is a record nobody runs |

## Constitution Check · re-evaluated after Phase 1

Writing `data-model.md` and the contract moved one thing, and it is the same shape of
finding `037` recorded at this gate.

### Principle II nearly lost its own guarantee

The obvious enumeration is a literal list of presentations in `presentations.ts` —
`[{ name: 'texto grande', presentation: { fontSize: '24pt', … } }, …]`. Writing the data
model made the cost visible: that is a **second copy** of what `presentationFor` decides,
and the two would drift exactly as `sheet-a11y.spec.ts`'s hardcoded three already have.
A record whose presentations disagree with the renderer's is worse than no record,
because it is confidently wrong.

So the enumeration lists **axis level combinations** and calls `presentationFor` on each,
which makes the presentation values impossible to state twice (research R2). The name is
derived from the axes, not written beside them.

### And the modality boundary is now a stated absence, not an omission

The clarify session found that the editable document carries no presentation at all, so
`040`'s parity work has no review surface here. FR-3617 records the boundary and the
checklist records the consequence. That is deliberately **not** fixed here: widening this
record to a modality that needs an external converter would make FR-3612 conditional,
and a record that sometimes cannot run is a record nobody trusts.
