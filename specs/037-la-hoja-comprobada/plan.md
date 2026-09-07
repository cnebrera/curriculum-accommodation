# Implementation Plan: La hoja que recibe el niño, comprobada

**Branch**: `037-la-hoja-comprobada` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/037-la-hoja-comprobada/spec.md`

## Summary

Make `renderBlock` read the heading flag the extraction already writes, and put the sheet
under two independent checks: a WCAG 2.2 A/AA run over three presentations, and
deterministic assertions over the markup for what conformance does not cover.

The repair is small — one branch in one function. The proof is the part with a design in
it, and its shape is set by two measured facts: the sheet is **already clean** at A/AA, and
the defect being repaired is **invisible** at that level.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 22, Electron — as the rest of the repository.

**Primary Dependencies**: **none added** (FR-3512). `axe-core` is already a dependency —
`a11y.spec.ts` injects it into the application's own window — and Electron already carries
Chromium.

**Storage**: none. `renderHTML` is a pure string function.

**Testing**: `vitest` for the structural layer (offline, no window, milliseconds) and
`playwright` driving Electron for the conformance layer.

**Target Platform**: the rendered sheet, which is HTML and a PDF printed from it.

**Project Type**: desktop application; this touches the core renderer and adds tests.

**Performance Goals**: the conformance layer opens one hidden window and runs three checks.
Measured before the spec was written: ~4 seconds.

**Constraints**: offline, nothing installed, and the viewer's `sandbox=""` untouched.

**Scale/Scope**: one branch in `renderBlock`, one new test file per layer.

## Constitution Check

*GATE: passed before Phase 0. Re-checked after Phase 1 — see the bottom.*

### III · Adapt the *how*, never falsify the *what* — **the one that shaped the design**

The repair recovers structure the source had. The temptation next to it is to **invent**
structure it did not have, and there are two forms and the check caught both:

1. **A hierarchy from a flat list.** The IR marks blocks as headings and carries no level.
   «First one is the title, the rest are inside it» would assert a containment the source
   never stated — «Parte 2» inside «Parte 1». So every heading renders at one level
   (FR-3502), and this is a decision recorded in the spec rather than a default.
2. **A heading where there was none**, to satisfy a best-practice check that wants a
   level-one heading. FR-3503 forbids it, the consequence is accepted in the open, and the
   content question behind it is BACKLOG **G59** rather than a quiet `<h1>`.

### IX · Content is never instruction (NON-NEGOTIABLE)

A heading's text comes from a document. Two consequences:

- It is rendered as **text** (FR-3505). The existing renderer passes block content through
  a markdown renderer, and a heading must not become a second parsing surface where a
  `[link](…)` or an `# extra heading` in the source text talks its way into structure.
- **The viewer's `sandbox=""` is not touched** (FR-3511). It executes no scripts on
  purpose, so `axe` cannot run there — and the answer is to run the check somewhere else,
  never to relax the defence for a test. That is the clause «structural defences outrank
  instructional ones» applied to the test suite instead of to the product.

### II · Code is deterministic and model-free

No model, no key. The structural layer is pure string work in `packages/core`, where
`npm run test:isolation` already walks for network reach. FR-3508's «offline and nothing
installed» is this principle applied to the suite: **a suite a contributor cannot run is a
suite that stops being run**, which is how the sheet went unchecked in the first place.

### VI · Every change is traceable

Unchanged and worth stating: `data-*` attributes carry the recipe and the axis, and a
heading keeps them. A block that becomes an `<h2>` must not lose the provenance a
`<section>` carried — `renderBlock` writes the whole `data-*` set, and the repair must keep
doing that rather than emitting a bare heading.

### No gate violated. Three things the design must carry

1. One level for all headings, from Principle III.
2. No heading invented, and the warning left honest.
3. The provenance attributes survive the new element.

## Project Structure

### Documentation (this feature)

```text
specs/037-la-hoja-comprobada/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/render-html.md
├── checklists/requirements.md
└── tasks.md   # /speckit-tasks
```

### Source code

```text
app/packages/core/src/render/
└── html.ts                             # one branch in `renderBlock`, and nothing else

app/packages/core/test/
└── sheet-structure.test.ts             # NEW · the deterministic layer (FR-3501…3505, 3509)

app/e2e/
└── sheet-a11y.spec.ts                  # NEW · WCAG 2.2 A/AA over three presentations
```

**Why the conformance layer is an e2e and not a unit test**: it needs a real DOM with
scripts, and the only one available offline is the Chromium inside Electron. `vitest` runs
with `environment: 'node'`.

## Constitution Check · re-evaluated after Phase 1

**No gate violated**, and the design surfaced one thing the pre-design check had not seen.

### Principle VI nearly lost the provenance

The obvious repair is «emit `<h2>` instead of `<section>`». Writing the data model made the
cost visible: `renderBlock`'s `<section>` carries the id, the classes and the **whole
`data-*` set** — the recipe and the axis that justify each change. A bare `<h2>` would drop
all of it, and «a change that cannot state which recipe and which axis justify it MUST NOT
be made» would become «a change that used to state it and stopped».

So the heading goes **inside** the section (research R2). One line more, and the difference
between a traceable document and one that lost its trail at the last step.

### And the block class stays orthogonal

A heading is **not a fifth block class**: it is a property of a block that already has one.
That is why the flag is an attribute, and it is why the rendered element keeps
`class="explanation"`. Nothing downstream that filters or styles by class changes
behaviour — which is what keeps this a repair rather than a change of shape (FR-3513).

## Complexity Tracking

One thing is worth justifying because it looks like cleverness: the conformance check opens
a **hidden `BrowserWindow` in the main process** and loads the sheet as a file, rather than
using the application's own viewer.

It is the only way that satisfies three requirements at once — a real DOM with scripts
(axe's requirement), nothing installed (FR-3512), and the viewer's sandbox untouched
(FR-3511). Measured before the specification was written, because proposing it without a
number would have been the same mistake as asking Carlos to choose between a browser and
no browser: **a question that cannot be decided without a number should arrive with the
number.**
