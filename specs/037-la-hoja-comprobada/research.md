# Phase 0 · Research

## R1 · What does the IR actually say about a heading?

**Decision: it says «this block is a heading» and nothing else — no level, no rank.**

`ingest/to-ir.ts:85` writes `attrs['data-heading'] = 'true'` when the extraction classified
a block as `heading`. There is no level field, and the extraction schema has none: the
model is asked *what a block is*, not how deep it sits.

**Consequence, which is FR-3502's whole content**: a level cannot be looked up, so it is
decided. One level for all, because a hierarchy derived from order asserts containment the
source never stated.

**Alternatives considered**: ask the extraction for a level. Rejected — it is a change to
the ingest schema, to the prompt and to every document already on disk, for a hierarchy the
model would be guessing at from a photograph. And a *wrong* hierarchy is worse than a flat
one: a screen-reader user navigating by level would be told the page is shaped in a way it
is not.

## R2 · Which element, and what happens to the `<section>`?

**Decision: the heading is emitted `<h2>` and the `<section>` stays.**

`renderBlock` wraps every block in `<section id class data-*>`, and that wrapper carries
the id, the classes and **the whole `data-*` set** — the recipe and the axis that justify
each change (Principle VI). Replacing the section with a bare `<h2>` would drop the
provenance, so the heading goes **inside** it: `<section …><h2>…</h2></section>`.

`<h2>` and not `<h1>`: there is no document title to be the `<h1>` (research R3), and a
sheet with several `<h1>`s is worse for navigation than one with several `<h2>`s.

**Alternatives considered**: `role="heading" aria-level="2"` on the section. Rejected —
a native element is the structural form, and ARIA on a container that also holds the
block's text would make the whole section the heading.

## R3 · Why no `<h1>`, and why that is not a defect

`renderHTML` writes `<title>${opts.title ?? 'Material adaptado'}</title>`, and **no caller
passes a title** — `jobs/print.ts` and `jobs/export.ts` both omit it. So the document has
no name, and there is nothing to be the `<h1>`.

**Decision: leave it absent, and leave the best-practice warning standing.** Inventing an
`<h1>` — from the first heading, or the constant «Material adaptado» — is FR-3503.

Recorded as BACKLOG **G59** because the question behind it is content and not
accessibility: whether the material a child receives should say what it is, what it may
carry (not the name, not the school — `015` FR-1306), and whether the title is hers or
inferred. If that is ever decided, this warning closes as a side effect.

## R4 · Where can a conformance checker actually run?

**Decision: a hidden `BrowserWindow` in the main process, loading the sheet from a file.**
Measured 2026-09-07: it works, ~4 seconds, nothing installed.

Three constraints have to hold at once, and only this satisfies all three:

| Constraint | Why the alternatives fail |
|---|---|
| A real DOM **with scripts** — axe evaluates computed styles and the accessibility tree | A string check cannot compute contrast or the accessibility tree |
| **Nothing installed** (FR-3512) | Playwright has no browser here on purpose — it drives Electron. `npx playwright install chromium` is ~150 MB and needs network |
| The viewer's **`sandbox=""` untouched** (FR-3511) | The application's own viewer executes no scripts by design. Relaxing it for a test is relaxing a structural defence, which Principle IX ranks above any instruction |

**Alternatives considered**: `jsdom` as a dev dependency (a DOM that does not compute
layout or contrast — axe's most valuable checks would silently no-op); a second Playwright
project with Chromium (the install); running axe over the string (not possible).

## R5 · Why the deterministic layer exists at all, given A/AA is clean

**Because the defect this feature repairs is invisible at A/AA.** Measured: zero WCAG
violations on a sheet with **no headings whatsoever**. A conformance checker cannot know
that the source had structure the render dropped — the output is valid HTML that says
something else.

So FR-3509's properties are enumerated rather than delegated to a checker's
«best-practice» tag, and each one is a decision:

| Property | Why it, specifically |
|---|---|
| one declared language | a screen reader picks its voice from it; wrong language is unintelligible speech |
| headings do not skip | a level a user looks for and does not find |
| every image described | `019`/`022` already require it; this is where it is checked on the artefact |
| tables have header cells | a data table without them is a grid of unlabelled numbers |
| no positive tab index | it reorders the page against its own reading order |
| no inline handler | a sheet is a document, and Principle IX says a document is not instruction |

**Not adopted wholesale**: the rest of a checker's best-practice tag. It carries advice
this project has already decided against on purpose — and a list nobody chose is a list
that gets silenced the first time it is inconvenient.
