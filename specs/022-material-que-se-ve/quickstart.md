# Quickstart — proving a diagram is right, his, and not a way in

Ordered so the attack surface is checked before the feature, everything offline before
anything that spends money, and paper and people last.

## Prerequisites

```bash
cd app
npm ci
npm test          # typecheck + the whole offline suite, including isolation + injection
```

A vault with two learners whose profiles record **different interests** (one with none),
and objectives that hit the arithmetic verifiers: «multiplicar con llevadas» does.

---

## §1 · The tests to write first — US3, red

```bash
npx vitest run packages/core/test/figures-refuse.test.ts packages/core/test/figures-never-a-way-in.test.ts
```

Written **before** the validator or the drawer exist, because a security check written
after the renderer works is a check written to fit what the renderer already does.

| Given markup containing | Expected |
|---|---|
| `<script>`, `onclick=`, `onload=` | refused; the rendered sheet contains no script and no `on*` attribute anywhere |
| `href`, `xlink:href`, `<image>`, `<use>`, `url(#…)`, `url(http…)`, `data:` | refused; the rendered output contains no `href`, no `url(`, no `http` |
| `<style>`, `style=`, `<foreignObject>`, `<animate>`, entities, CDATA, comments | refused |
| An allowed element with a hostile value (`fill="url(#x)"`, `d="M0 0 <"` ) | refused — values are validated, not just names |
| Any of the above | **refused, not sanitised**: no output resembles a cleaned version of the input; the report quotes the offending token (FR-2008, Principle IX) |
| Any of the above, in a document | the sheet still renders, minus the diagram, with the refusal reported (FR-2011) |
| Raw SVG in an ordinary block's content | escaped text on the page — the fence-and-branch channel is the **only** road from model markup to drawing |

## §2 · Offline · the quantities invariant

```bash
npx vitest run packages/core/test/figures-quantities.test.ts
```

- Across a generated corpus (every verifier, every kind): **every diagram's quantities
  equal its exercise's** — SC-2001 as an invariant, not a sample.
- A request whose stated numbers disagree with the exercise: drawn with the exercise's,
  and the report says the quantity was corrected (FR-2002).
- An unverified group: exercises, no key entry, **no diagram** (FR-2003).
- A grid past `max_cells`: no diagram, the bound named in the report — never a clamped
  grid, which would be a wrong-quantity diagram wearing a bound (FR-2015).
- Same document rendered twice: byte-identical SVG (FR-2004).

## §3 · Offline · every rendering of the same document

```bash
npx vitest run packages/core/test/ packages/shell/test/
```

Over one composed document carrying all four kinds:

- **HTML**: four inline SVGs, each `role="img"` with the description.
- **ODT**: four embedded SVG pictures with manifest entries, each with its description
  paragraph — and the glyph fence appears **nowhere as text** (research R5: today it
  would print as prose).
- **Audio-ready and braille-ready**: each diagram appears as its description; no markup,
  no announcement-instead-of-description (FR-2012, asserted rather than delegated to
  `019`).
- **Learner data**: a code, a name, a school planted in theme/label positions → the
  existing egress check fires on SVG text too (FR-2014).
- **Photocopy**: `checkPhotocopy` over a sheet with diagrams — no colour-collapse, and
  counting is by discrete shapes, not hue (FR-2013).

## §4 · With a window · nothing fetches, nothing runs

```bash
npm run build && RAMPA_TEST=1 npx playwright test e2e/figures.spec.ts
```

1. Compose arithmetic material for the learner with interests: diagrams beside
   exercises, quantities right, theme his.
2. View it and print it: **a real PDF exists**, not a typecheck — say so.
3. Plant a document whose figure tries a script, a handler, a remote image and a
   navigation: the viewer (its `seal()`) and the PDF path load it with **zero network
   requests and zero execution** — asserted from the request log, not from absence of
   symptoms (FR-2010, SC-2002).
4. Correct the composition so an exercise's numbers change: the new sheet's diagram has
   the new numbers; no diagram with the old ones survives anywhere (FR-2016).

## §5 · The one that costs money

Compose for the two learners, same objective (SC-2003):

- Two sheets whose **quantities agree** and whose **themes differ**.
- The learner with no recorded interest gets **plain** diagrams — not themed at random
  (FR-2006).
- The report traces each diagram to its exercise, and lists any refusal, correction or
  bound with its reason.

## §6 · Looked at, not asserted

```bash
npm run shots
```

Open them, and also open the exported ODT **in LibreOffice** — «embedded SVG renders in
LibreOffice» is a claim about somebody else's software. Look at: a themed grid at
arm's length (is it countable?); the number line at `xlarge` text scale; a refused
diagram's sheet (does the page read as whole?).

## §7 · The photocopier (SC-2005)

Print a sheet with all four kinds and photocopy it in black and white. Every diagram
still readable, every count still countable. The second criterion in this project to
need a physical machine; a test asserts luminance distances, only the machine asserts
the machine.

## §8 · The verdict I cannot produce (SC-2006)

Show a teacher the themed sheet and the plain one, no preamble: which would she put in
front of the child, **and why**. Whether a diagram helps a nine-year-old start is not
answerable here, and «it looked nice» is not the question. If the answer is «the plain
one», that is worth more than the feature.
