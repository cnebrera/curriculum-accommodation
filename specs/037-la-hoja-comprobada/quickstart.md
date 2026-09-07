# Quickstart · validating `037`

Nothing here needs a provider, a key or money, and nothing needs installing. Worth stating,
because most quickstarts in this repository have a paid section.

## §1 · The heading survives the adaptation (US1, SC-3501)

1. Take a fixture whose IR marks a block as a heading —
   `cases/003-ingest-fixtures/01-ecosistemas-torcida/ground-truth.md` has one:
   «Los ecosistemas», with `data-heading="true"`.
2. Render it.
3. Look at the markup.

**Expect**: `<section … data-heading="true"><h2>Los ecosistemas</h2></section>`. The
heading is an element; the section and every `data-*` attribute are still there.

**Before this feature** it was `<p>Los ecosistemas</p>` and the sheet had no headings at
all.

## §2 · Nothing is invented (SC-3505, FR-3503)

1. Render a document whose IR marks **no** block as a heading.

**Expect**: no heading element anywhere, and no `<h1>`. A best-practice checker will ask
for a level-one heading and not get one — that is the honest answer, because the document
has no title (BACKLOG G59).

## §3 · The declared target, measured (US2, SC-3502)

1. Run the conformance check over the three presentations: draft, signed, largest text.

**Expect**: zero WCAG 2.2 A/AA violations in all three. This passed before the feature
too — the point is that now something says so.

## §4 · What the checker cannot see (US3)

1. Run the structural assertions over the rendered markup.

**Expect**: one declared language, headings that do not skip, a description on every image,
header cells on any table, no positive tab index, no inline handler.

## §5 · The mutation that matters (SC-3503)

1. Change `renderBlock` back: render heading blocks as paragraphs.
2. Run both layers.

**Expect**: the **structural** layer fails and the **conformance** layer stays green.

That asymmetry is the whole argument of this specification. If both went red, one layer
would be redundant; if both stayed green, the suite would be theatre. The previous suite
was green with this defect in the output for weeks.

## §6 · Nothing was installed and nothing left the machine (SC-3504)

1. Run the suite with no network access.

**Expect**: it passes. The conformance layer uses the Chromium that Electron already
carries; `npx playwright install` is never needed and the viewer's `sandbox=""` was never
touched.
