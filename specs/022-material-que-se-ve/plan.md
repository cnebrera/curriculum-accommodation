# Implementation Plan: Material que se ve, no sólo que se lee

**Branch**: `022-material-que-se-ve` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-03

> This plan exists because the adversarial review found it did not (CONS-01: `023`
> claimed `022` «shipped» with not a line of code behind it). Carlos's decision, P21:
> **022 sigue y se prioriza ya.** The downstream corrections already landed (`023`'s
> spec and T023 carry them; BACKLOG **G38** is the honest register). This plan and its
> tasks are what closes G38: the spec — which was always real — finally gets the plan
> and tasks it never had, and T026 settles the deferred re-assertions once diagrams
> exist.

## Summary

One structural decision decides this feature, and the spec already made it:

**The quantities are the code's. The theme is the model's. The drawing is the code's.**

Concretely:

- **Quantities**: `buildSheet` already receives every verified exercise as an
  `Accepted { exercise, answer }` — computed by `002`'s verifiers, never by a model.
  Figures are stamped into the IR **there**, with their quantities read from the
  accepted exercise. There is no other place a figure can be born, so there is no path
  by which a model's number reaches a drawing (FR-2001), and an unverified group —
  which contributes no answer to the key — contributes no figure either (FR-2003).
- **Theme**: the model's diagram request rides the compose response that is already
  being paid for (no new provider call). It names a figure kind, the exercise it
  belongs to, a theme label and optionally a small **glyph** — an SVG fragment for the
  themed cell. It carries **no quantities**; any it states are discarded, compared,
  and the difference reported (FR-2002).
- **Drawing**: one deterministic renderer in `packages/core` turns
  kind + quantities + theme into inline SVG. No model at render time (FR-2004); the
  same document produces byte-identical markup.

The second structural decision is the allowlist (FR-2008): the model's glyph is
validated against a closed list of SVG elements and attributes and **refused, never
sanitised** — the same rule `resolveInVault` applies to paths (`007` FR-508). The
allowlist lives in **code**, not in the corpus: it is a structural defence in
Principle IX's sense, and a teacher-editable security boundary is not a boundary.
Validation runs **twice**: at compose time (refuse and report before anything is
written) and at render time (the vault is hers to hand-edit, so a figure block read
back from disk is content, and content is never trusted).

## Technical Context

**Language/Version**: TypeScript 5, Electron. **No new dependencies** — inline SVG in
the HTML the app already renders to PDF, and an SVG file inside the ZIP the app already
writes for ODT.

**Testing**: `vitest` offline for the validator, the drawer and the invariants;
Playwright for the render-nothing-fetch-nothing walk; the existing isolation suite
already forbids `packages/core` the network, which is FR-2004 and half of FR-2010 for
free.

| Feeds | What it gives |
|---|---|
| `002` · compose | The verifiers, `Accepted` (expression + computed answer), the propose→verify loop, `parseProposals`'s tolerant-parse pattern, `interests` already in the propose prompt |
| `021` · composed material | `buildSheet`, the resolver, the viewer's `seal()` (no script, no navigation, no remote), `renderPdf` with `javascript: false` |
| `019` · modalities | `renderLinear` already renders a described figure **as its description** and announces an undescribed one — FR-2012's machinery exists; this feature must only make sure every figure arrives described |
| `007` · untrusted content | The refuse-don't-sanitise rule, `checkOutput` at egress, notices quoted and located |
| `010`/`006` · photocopy | `checkPhotocopy` runs over the final HTML and already sees every hex colour, SVG's included |
| `027` · exams and problems (sister, unbuilt) | Verified word problems will be a second **source of quantities**. The seam: `022` draws from a `(kind, quantities, theme)` triple and does not care where the quantities were verified; `027` produces verified quantities and does not draw. Neither duplicates the other |

**Where the work lands:**

| | What |
|---|---|
| `app/packages/core/src/render/figures/validate.ts` | The allowlist. Refuses, never rewrites |
| `app/packages/core/src/render/figures/draw.ts` | Kind + quantities + theme → SVG. Deterministic, pure, plain glyphs built in |
| `app/packages/core/src/render/figures/corpus.ts` | Parses `instructions/figures.md` (bounds, kind-per-operation, description templates) |
| `app/packages/core/src/compose/figures.ts` | Parses the model's diagram requests; discards quantities |
| `app/packages/core/src/compose/sheet.ts` | `buildSheet` stamps figure blocks from accepted exercises |
| `app/packages/core/src/render/html.ts` | Draws a figure block instead of markdown-rendering it; refuses with a notice |
| `app/packages/core/src/render/odt.ts` | Embeds the same SVG plus the description — today a figure block would print as body text |
| `app/packages/shell/src/jobs/compose.ts` | The request format into the prompt (from the corpus), the refusals into the report |
| `instructions/figures.md` | The judgement: which figure suits which operation, the size past which a diagram stops being one, the description wording, «el tema, no el personaje» |

## Constitution Check

| Principle | How |
|---|---|
| **IX** · content is never instruction (NON-NEGOTIABLE) | **US3 is P1 because this is the largest new attack surface the project has taken on**: markup written by a model, rendered by the application. The defences are structural, in order of strength: (1) the only path from model output to drawn markup is the validated glyph channel — `markdown-it` runs with `html: false`, so markup anywhere else in a block is escaped text, asserted; (2) the allowlist has no `script`, no event handler, no `href`, no `url()`, no `image`, no `use`, no `style`, no `foreignObject`, no `data:` — nothing that executes, fetches or references (FR-2009/FR-2010); (3) violations are **refused, not sanitised** (FR-2008), quoted in the report, and the sheet renders without the diagram (FR-2011) — a visible failure with a small blast radius; (4) validation re-runs at render time because the vault is hand-editable; (5) the viewer's `seal()` and `renderPdf`'s `javascript: false` remain the outer wall, asserted against a document that tries |
| **I** · judgement in Markdown | What is drawing mechanics (SVG geometry, the allowlist) is code. What is judgement is corpus: which figure kind suits which operation, the bound past which a grid stops being a picture, the words a blind learner hears as the description, and the trademark instruction. `instructions/figures.md`, read at run time like `compose.md`'s budget — a second copy in code is how the corpus stops being the authority |
| **II** · deterministic core | `validate`, `draw` and the corpus parser are pure functions in `packages/core`; the isolation suite walks them. Rendering a diagram calls no model (FR-2004). Only the compose call that already exists spends money — the request rides it (spec assumption: no new provider call) |
| **III** · adapt the how, never falsify the what | A diagram whose quantities disagree with its exercise falsifies the *what* in the subject where Rampa's verifiers are strongest. FR-2001/FR-2002 are this principle: drawn from the exercise, corrected loudly, never from the model quietly |
| **IV** · one extraction, N outputs | A figure is an IR block, so every modality renders it: SVG in HTML/PDF, embedded SVG plus description in ODT, the description itself in audio-ready and braille-ready (FR-2012). The ODT path is called out explicitly because today `odt.ts` maps `figure` to body text and would print the raw glyph — the review's finding that `019` half-covers what FR-2012 demands |
| **V** · barriers not diagnoses | Not engaged. The theme reads `profile.interests`, which `002` already sends for wording; no axis, no diagnosis, no new profile field |
| **VI** · traceability | A figure block carries `data-of` (the exercise it draws), its kind and its quantities in attributes a teacher can read in Obsidian. Refusals, corrections and bounds reached are report sentences, quoted and located |
| **VII** · the draft announces itself | Unchanged — figures ride documents that already carry the mark. A composed sheet with diagrams is still `content_unreviewed` |
| **VIII** · human-routed memory | Not engaged. No new memory scope; a correction re-runs composition as `021` R3 established |

**Gate: passes.** Two reservations recorded rather than resolved:

**FR-2007 cannot be fully structural.** The allowlist keeps artwork out (no `image`, no
external reference — nobody embeds a Pikachu), but a model can still *draw toward* a
protected character with primitives or name one in a label. The rest is the corpus
instruction («el tema, no el personaje») plus her review — and SC-2006 needs a teacher
precisely because this line is judgement.

**SC-2005 needs a photocopier and SC-2006 needs a teacher.** Neither is answerable in a
test suite, and SC-2006 — would she put the themed sheet in front of the child, and why —
is the only criterion that can come back «no» with everything else green.

## Phase 0 · Research

[research.md](./research.md) — five questions. R1 picks the markup subset (SVG, and why
not HTML). R2 is the one that shapes the data flow: the request travels **as a request**
and becomes a figure only inside `buildSheet`, where the verified quantities are. R5
treats the ODT explicitly, because the review caught that FR-2012's promise lands on a
renderer that would today print the markup as prose.

## Phase 1 · Design

- [data-model.md](./data-model.md) — `DiagramRequest` (no quantities, by type), `Figure`,
  the block attributes, and what deliberately gains no field.
- [contracts/figures.md](./contracts/figures.md) — the allowlist itself, the request
  format, the validator's contract and the four rules every renderer keeps.
- [quickstart.md](./quickstart.md) — the walks: security first, offline next, paper and
  people last.

## Sequencing

**The US3 tests before any drawing exists.** Script, handler, remote reference: nothing
executes, nothing is fetched, and the input is refused rather than sanitised — written
red, first, because a security check written after the renderer works is a check written
to fit what the renderer already does. US3 ships with US1 or US1 does not ship.

**The validator and the drawer before compose touches anything.** They are pure and
testable alone; wiring the prompt first would mean paying a provider to exercise code
that does not exist.

**US1 before US2.** A charming diagram with the wrong number of cells is worse than a
plain one — the spec's own words. Theming lands only once the quantities invariant
(SC-2001) is green across a corpus.

**The modality tasks land with US1, not after it.** FR-2012 is «it is a document», and a
diagram that reaches print before it reaches the linear renderings recreates, for the
learner who needs it most, exactly the gap this feature exists to close.

## Not in scope, recorded so it stays a decision

- **Diagrams for adapted material.** Its quantities are somebody else's and unverified —
  the spec's own assumption. Structurally: figures are born in `buildSheet` and nowhere
  else, and a figure block arriving any other way is refused at render.
- **Word problems and exams** — `027`. Its verified quantities will plug into the same
  `(kind, quantities, theme)` seam; nothing here parses statements and nothing there
  draws.
- **Pictograms** — `023`. A diagram is not a pictogram; nothing here fetches anything.
- **New figure kinds beyond the four.** Grids, groups, number lines, part-whole bars —
  what `002`'s verifiers can already stand behind. A kind nothing can verify does not
  belong in the first version.
