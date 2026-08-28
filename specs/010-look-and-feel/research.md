# Phase 0 — Research

---

## R1 · Bundle Atkinson Hyperlegible, or hope it is installed

**Decision: bundle it. Two weights, subset to Latin plus Spanish, woff2, with its
licence beside it.**

**Rationale.** It will not be installed on her machine — that is the normal case,
not the edge one. Without bundling, the typeface that carries the whole identity
argument is a fallback to Verdana on every real installation, which makes the
argument decorative.

The licence is not an obstacle: Atkinson Hyperlegible is **SIL Open Font License
1.1**, which permits bundling and redistribution provided the licence travels
with it. That mirrors a rule the build already enforces for the corpus, so the
mechanism exists: the build fails if `OFL.txt` is missing, exactly as it fails
without `LICENSE-CONTENT.md`.

Cost: roughly 90 KB for regular and bold as woff2, subset. Against an Electron
bundle of ~150 MB that is not a number worth optimising, and the alternative is a
different typeface on every machine — which means the design is never the design
anyone tested.

**Alternatives rejected.**

- **System stack only** (what v1 did). Verdana is a genuinely good fallback with
  unusually distinct letterforms, which is why it stays as the fallback — but
  shipping it as the *actual* face means the accessibility typeface is a claim
  rather than a fact.
- **Fetch from a CDN.** Requires network for the interface to look right, and
  `006` FR-424 says everything except adaptation works offline. Also an outbound
  request the application does not otherwise make (007 FR-511).
- **Variable font.** One file, more weights — but larger than two subset statics
  for the two weights actually used, and this system uses exactly two.

---

## R2 · Making the accessibility claim enforceable

**Decision: two gates at different levels. Arithmetic in `vitest` over the token
file; `axe-core` through Playwright over every rendered screen.**

**Rationale.** They catch different failures and neither substitutes for the other.

- **The token test** computes the WCAG ratio for every pairing the tokens declare
  — every text role against its ground, in both themes, at every contrast
  preference — and fails on anything under 4.5:1 for text or 3:1 for non-text.
  It is pure arithmetic, runs in milliseconds offline, and it means a designer
  changing a hex value learns immediately rather than at review. This is the gate
  that converts *"I measured them once"* into *"they cannot regress"*.
- **The axe pass** catches what a palette cannot: a missing label, a heading
  level skipped, an error not associated with its field, a focus order that makes
  no sense, a live region that does not announce. Those are structural and only
  visible once rendered.

Run over: both themes × default and largest text size. That is four passes per
screen, and the combinatorial case — largest text at 200% browser zoom — is where
layouts actually break (FR-813, FR-819).

**Alternatives rejected.**

- **Axe only.** It would not catch a hex value edited to something that still
  renders but no longer passes, because axe checks computed contrast on rendered
  text and would only flag it where that exact pairing happens to appear on a
  screen it visits.
- **Manual review against a checklist.** This project's whole record says
  otherwise: the defects it has found were found by tests, and the ones review
  missed were in seams exactly like this one.
- **A contrast linter on the CSS.** Would need to model the cascade to know which
  pairs actually occur. The token file declares its pairings explicitly, which is
  cheaper and more honest.

---

## R3 · Where her preferences live, and how they apply

**Decision: `data-*` attributes on the root element, persisted in the settings
file in the OS application-data directory.**

**Rationale.** Attributes on `<html>` mean a preference is one attribute change
and the entire interface responds, with no component subscribing to anything —
which is what makes FR-818 ("applies immediately") true without state plumbing.
The tokens already redefine themselves under `[data-text]`, `[data-contrast]` and
`[data-motion]`.

Persisted **outside the vault**, in the settings file `006` T083 already
established: preferences are hers but they are not her professional record, and a
handover packet or a vault backup must not carry them (FR-820). It also means a
teacher who moves machines gets sensible defaults rather than someone else's
choices.

**Initial values come from the operating system** — `prefers-color-scheme`,
`prefers-contrast`, `prefers-reduced-motion` — with no question asked (FR-817).
Her explicit choice, once made, wins over the OS.

**Alternatives rejected.** A CSS class per preference (multiplies combinations);
`localStorage` (survives less predictably and is renderer-scoped); asking at
first run (specifically rejected by the spec).

---

## R4 · The report view, which is the reason this feature matters

**Decision: a rendered, grouped view built from provenance, not a text dump.**

**Rationale.** FR-826 forbids the `<pre>` block that ships today. The report is
where the teacher's judgement is the product: she reviews about fifteen decisions
instead of re-reading twelve pages, and that is what makes the time saving real
(`001` US2).

The data is already there. `buildReport()` returns `decisions`, `notDone` and
`notices` as structures and *then* flattens them to markdown for the file. The
view consumes the structures directly; the markdown stays for the file in her
vault, which she must be able to read without the application.

One escaping note, because the content is model output derived from third-party
material: report text is rendered as text, never as markup. `007`'s reasoning
applies to a rendered view as much as to a prompt.

**Alternatives rejected.** A markdown renderer over `report.md` — turns
adapted content into interpreted markup for no gain, and loses the grouping the
structures already carry.

---

## R5 · Where the component library lives

**Decision: the design project stays the source of truth for the previews;
`tokens.css` and `components.css` are lifted verbatim into `app/ui/src/styles/`.**

**Rationale.** A component gallery route inside the application would be a second
thing to build, style and keep honest, and it would ship to a teacher who has no
use for it. The previews exist to review a change *before* it reaches a screen,
which is a contributor need, not hers.

The cost is that the two can drift. Mitigation is that only the two stylesheets
cross over, and they cross verbatim — a diff between the project and `app/` is a
one-command check rather than a judgement.

---

## Remaining NEEDS CLARIFICATION

None. The five design decisions were settled in the review recorded in the spec's
Clarifications, and R1–R5 close the technical ones.
