# 0009 — A design system is not a design

**Status:** Accepted · 2026-08-29

## Context

Spec `010` produced a design system: a token file with a five-family palette,
tinted elevation, a type scale, a spacing scale, a bundled accessible typeface,
and component primitives. It produced tests: 19 contrast pairings computed from
the shipped `tokens.css`, axe over every screen in four modes, layout assertions
at 1366×768 including 200% zoom, and a check that every class name in a
`className` exists in a stylesheet.

All of it passes. On 2026-08-29 the person who asked for it opened the application
and said the front end looked terrible.

**He was right, and the tests could not have told him.**

## What actually happened

Every test written for `010` checks a **property**: a contrast ratio, an absence
of overflow, a present label, a defined class. Not one checks **composition** —
how a page is put together out of the parts.

So the suite cannot fail on a page that is correctly coloured, correctly labelled,
free of overlap, and ugly. That is precisely what was built, and the agent that
built it **never once looked at the rendered screen** across the whole feature.

Concretely, on the screen a teacher opens first:

| Symptom | Cause |
|---|---|
| Form controls 1000 px wide | `--measure` exists and is applied to prose, never to inputs |
| No vertical rhythm | Screens compose with `stack gap4` chosen ad hoc, with no page-level rhythm distinguishing section from field from inline |
| Giant `h1`, 15 px body, nothing between | The type scale has a middle and no screen uses it |
| Nothing is emphasised | Every primary button is the same heavy gradient slab, so weight carries no information |
| Content stranded top-left in a void | There is no page shell: each screen renders its own `<h1>` and content, with no shared header, no max width, no centring |

None of these is a token problem. **The tokens are fine.** They were never composed
into a page.

## The general shape of the mistake

This project's recurring defect is *two artifacts that are each correct alone*.
This is that pattern in a new place: a **correct design system** and a **correct
set of screens**, with nothing checking the thing that only exists between them.

It is also the second time in this feature that a guarantee turned out to be
narrower than its name. `010` claimed WCAG 2.2 AA and tested nothing until an axe
gate was added, which then found a critical unlabelled field on its first run.
"Looks finished" (SC-805) got the same treatment: asserted in a spec, checked by
nothing, and quietly assumed to follow from the parts being good.

## Decision

**Three things, and the third is the one that matters.**

### 1 · Composition is a layer, and it is missing

A page shell, a form layout with `--measure` applied, an explicit vertical rhythm,
and weight allocated so that emphasis means something. Specified in `013`.

This is not a redesign. The palette, the typeface and the scales stay.

### 2 · A data layer, because 19 of ~25 components call `window.rampa` directly

Every screen reinvents loading, error and empty states, and none does it the same
way. That is why adding a screen produces "cosas raras": there is nowhere for it to
fit, so it invents its own.

### 3 · Looking at the screen is part of the loop

The agent can render the real application and screenshot it. It did so for the
first time *after* the complaint, and the diagnosis above took one screenshot.

So: **a visual pass is part of finishing a UI change**, and a change that has not
been looked at is not finished. Not a test — a test that asserts "looks good" is
either a screenshot-diff that fails on every legitimate change, or a lie.

## What this ADR refuses

**A visual regression suite.** Pixel-diff tests on a young interface fail on every
intentional change, get updated without being read, and then assert whatever the
last commit produced. They convert judgement into ceremony.

The honest mechanism is weaker and truer: **someone looks.** For now the agent
looks, because it can and it did not; later a teacher looks, and hers is the only
verdict `010` SC-805 ever accepted.

## Consequences

- `010` is complete as specified and its success criterion **SC-805 — "it does not
  look unfinished" — was never met.** It was recorded as needing a teacher; it
  turned out not even to need one.
- The property tests stay. They caught real defects — fifteen unstyled buttons, a
  missing `h1`, an unlabelled field, `.app` and `.main` defined nowhere — and none
  of that is undone by their being insufficient.
- No framework change. See [ADR 0008](./0008-electron-not-tauri.md): the same
  screen renders identically in any Chromium, and it was ugly on its own merits.
