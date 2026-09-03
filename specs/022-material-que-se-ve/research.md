# Phase 0 · Research

Five questions. R2 shapes the data flow — a request becomes a figure only where the
verified quantities already are. R5 exists because the review caught FR-2012 landing on a
renderer that would print the markup as prose.

---

## R1 · Which markup subset does the model write?

**Decision**: **SVG**, and only for the optional **glyph** — the themed shape that the
code then repeats and positions. Never HTML, never CSS, never a whole diagram.

The allowlist (the exact table is in [contracts/figures.md](./contracts/figures.md)):

- **Elements**: `g`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`,
  `text`. Nine, all of them geometry or a word.
- **Attributes**: geometry (`x`, `y`, `cx`, `cy`, `r`, `rx`, `ry`, `x1`…`y2`, `width`,
  `height`, `points`, `d`), paint (`fill`, `stroke`, `stroke-width`, `stroke-dasharray`),
  text (`font-size`, `text-anchor`), and `transform` restricted to
  `translate(...)/scale(...)/rotate(...)` with numeric arguments.
- **Values are validated too**: paints are hex or a named colour — `url(` anywhere is a
  refusal; `d` and `points` must match numeric path grammar; no attribute value may
  contain `<`, `&`, `http`, `javascript` or a `data:` scheme.
- **Refused by absence**: `script`, every `on*` handler, `href`/`xlink:href`, `image`,
  `use`, `style`, `animate*`, `set`, `foreignObject`, `filter`, `mask`, `clipPath`,
  `marker`, `a`, `metadata`, `switch`. Not stripped: **the whole diagram is refused**
  (FR-2008), the offending token quoted in the report (Principle IX: surfaced, located,
  never silently removed).
- **Bounded**: element count and byte size capped, so a glyph cannot be a payload by
  volume.

**Rationale**: SVG is one namespace with a small, enumerable element set whose safe
subset is purely declarative geometry — an allowlist over it can be *closed*. It is
native to the existing pipeline three times over: inline in the HTML `renderHTML`
already emits, printed by the same bundled Chromium (`renderPdf`), and embeddable in an
ODT as a picture. And it satisfies the spec's founding argument: markup can be counted
before it is drawn.

**Alternatives considered**: **HTML+CSS** («montaría HTMLs internos», Carlos's first
sketch) — rejected for the boundary, not the idea: layout-by-CSS makes the dangerous
surface (`url()`, `position`, `content`, custom properties) part of the drawing surface,
so the allowlist cannot be closed without neutering it. The idea survives — internal
markup rendered by our own engine — with SVG as the dialect. **A JS/canvas channel** —
executes, forbidden outright by FR-2009. **Generated images** — the spec's own «Why the
model writes markup» section already buried this: opaque, uncountable, a new dependency.
**Letting the model write the whole SVG diagram and counting its elements afterwards** —
rejected because counting shapes to reverse-engineer quantities makes the *check*
enforce what the *construction* should make impossible; the glyph split means the model
physically has nowhere to put a quantity.

---

## R2 · How does the diagram request travel without carrying quantities?

**Decision**: two stages, and the quantities are attached at the second, by code.

**Stage 1 — the request, in the compose response.** The propose prompt (whose wording
lives in `instructions/figures.md`, Principle I) tells the model it may add, after its
exercise lines, lines of the form:

```
figura: 47 × 8 | tipo: rejilla | tema: cartas | glifo: <rect .../>
```

Keyed to the **expression**, not to a number — the same decision the answer key made,
and for the same reason: positions shift, the expression survives. Parsed by
`parseDiagramRequests` in `packages/core/src/compose/figures.ts` with `parseProposals`'s
tolerance: an unparseable line is **no request**, never a guessed one. The type has no
quantity field; if the model writes counts anywhere in the line they are discarded, and
where they disagree with the exercise the report says the quantity was corrected
(FR-2002).

**Stage 2 — the figure, stamped by `buildSheet`.** For each request whose expression
matches an **accepted** exercise in a **verified** group, `buildSheet` emits a `.figure`
block whose quantity attributes are computed from the exercise's own parsed operands and
verified answer — `002`'s `arithmetic` parser already yields `{a, b, op}`. Requests
pointing at rejected exercises, unverified groups, or nothing are dropped and reported
(FR-2003). The block:

````markdown
::: {#g1-e3-fig .figure data-figure="grid" data-of="g1-e3" data-rows="4" data-cols="3"
     data-theme="cartas" data-description="Una rejilla de 4 filas por 3 columnas: 12 casillas de cartas."}
```svg
<rect width="10" height="14" rx="2" fill="#fff" stroke="#333"/>
```
:::
````

The validated glyph sits in the content as a fenced `svg` code block — readable in
Obsidian, and **inert everywhere by default**: `markdown-it` runs with `html: false`, so
if any renderer forgot the figure branch the markup would appear as escaped text, not
execute. Only the figure branch in `renderHTML`/`renderODT` turns it into drawing, and
only **after re-validating**, because a vault document is hand-editable and therefore
content (`007`).

**Rationale**: quantities never exist in anything the model produces, so FR-2001 is
enforced by construction rather than by a check; and the render stays deterministic
(FR-2004) because everything the drawer needs — kind, quantities, theme, glyph — is in
the document itself.

**Alternatives considered**: quantities in the request, verified against the exercise —
rejected: a check where a construction is available is the weaker defence, and FR-2002
would become a dialogue. Figures resolved at render time from the exercise's text —
rejected: the renderer would parse expressions on every render, and an adaptation that
legitimately rewords an exercise would silently change a drawing nobody re-reviewed.
Storing the finished SVG in the IR — rejected: unreadable to the teacher, unverifiable
without re-deriving, and a hand-edit could not be told from an attack.

**One deliberate cross-check stays at render time**: if the `data-of` exercise block
exists and its expression still parses, its operands must match the figure's stamped
quantities; a mismatch refuses the figure with a notice. This is FR-2016's second net —
a hand-edited or adapted document whose numbers moved cannot keep its old picture.

---

## R3 · The four figure kinds, and where their quantities come from

**Decision**: four kinds, all computable from `{a, b, op, answer}`:

| Kind | Draws | Quantities (all code's) | For |
|---|---|---|---|
| `grid` (rejilla) | a rows × b columns of glyphs | `rows=a`, `cols=b` | × |
| `groups` (grupos) | a groups of b glyphs | `groups=a`, `perGroup=b` (for ÷: `answer` groups of `b`) | ×, ÷ |
| `number-line` (recta) | a line from 0 past the result, a start mark at `a`, `b` unit jumps | `start=a`, `jumps=b`, `end=answer` | +, − |
| `part-whole` (barra) | a bar of `answer` (or `a`) split into labelled parts | `parts=[a,b]`, `whole=answer` | +, − |

**Which kind suits which operation is corpus, not code.** `instructions/figures.md`
declares the table above (it is pedagogy: *why* a grid teaches multiplication is
judgement a PT may correct); code enforces whatever the corpus declares, and a request
whose kind does not suit its exercise's operation is refused and reported, not remapped
— remapping is sanitising a pedagogical choice.

**Bounds are corpus too, enforcement is code's** (FR-2015): `max_cells` (a grid of
thirty is not a picture — the spec's own edge case), `max_line_span`, `max_part`. An
exercise whose verified quantities exceed the bound gets **no diagram plus a report
sentence** — never a clamped one, because a clamped grid is a diagram whose quantities
no longer match its exercise, which would trade FR-2015 for an SC-2001 violation.
Same shape as `compose.md`'s budget front matter: numbers that move with real material,
read at run time, clamped against typos.

**Alternatives considered**: starting with grids only — rejected, the four together
cover all four operations `002` verifies and share one drawing core, so three more kinds
is mostly geometry. Kind chosen by code from the operation (no model choice) — rejected
for the same reason the theme is the model's: between grid and groups for one
multiplication there is a pedagogical choice tied to how the material explains it, which
is exactly what the request is for. Letting the model define new kinds — rejected: a
kind nothing can verify does not belong in the first version (spec assumption).

---

## R4 · How the description reaches audio and braille (`019`)

**Decision**: every figure block is stamped with `data-description` at compose time, and
`019`'s existing linear renderer does the rest — `renderLinear` already renders a
described figure **as its description** and announces an undescribed one, in both
modalities (FR-1709/FR-1714's machinery).

The description is assembled by code from **corpus templates** in
`instructions/figures.md` — per kind, with quantity and theme slots:

```
grid: "Una rejilla de {rows} filas por {cols} columnas: {cells} casillas{tema}."
```

**Rationale**: the sentence a learner hears is judgement (the wording is a PT's to
correct — the same reason `instructions/audio.md` supplies `spatialPhrases`), but the
numbers in it are facts, so code interpolates and the corpus phrases. Stamped into the
document rather than derived at render time so the linear renderings work on the
document alone, the teacher can read and fix the sentence in Obsidian, and audio and
braille cannot disagree with print about what the picture says.

**What must be asserted rather than assumed**: the review (CONS) found FR-2012 leaning
on `019` for more than it demonstrably does. So the tasks assert, over a composed
document with a diagram of each kind: the audio-ready text contains each description,
the braille-ready text contains each description, and **no rendering contains the glyph
markup as text**. Not «019 handles it» — shown.

**Alternatives considered**: the model writes the description — rejected: it would write
the quantities, which is FR-2001's back door, and an invented description is an invented
fact beside a verified number. A blockquote in the block content (docs/ir.md's ingest
convention) — rejected here: `renderLinear` reads `data-description` cleanly, while the
blockquote path would put the glyph fence into the spoken body; the attribute is the
single source.

---

## R5 · What does the ODT do with a diagram? (explicit, because the review asked)

**Finding**: today `odt.ts` maps `figure` to the `Cuerpo` paragraph style — a composed
diagram would export as **the raw glyph fence printed as prose**, in the exact modality
`019` calls the one with the most users. FR-2012 names audio and braille and is silent
on the editable export; the constitution is not (Principle IV: *every* output modality),
and «one document, N renderings» with a rendering that prints markup is the promise
broken quietly.

**Decision**: the ODT renders a figure block as **the same SVG, embedded as a picture,
with the description as the paragraph beneath it**.

- The drawer's output bytes go into the ZIP as `Pictures/<block-id>.svg` with a manifest
  entry, referenced by a `draw:frame`/`draw:image`. LibreOffice — the editor the ODT
  path was designed around — renders embedded SVG natively. `zip()` and the manifest
  already exist; no new dependency.
- The description paragraph is unconditional, not a fallback: in the editable document
  it is also the thing she can *fix*, and an editor that cannot show the SVG still
  leaves her a sheet that says what the picture was.
- A figure that fails render-time validation exports as the refusal sentence, the same
  as HTML (FR-2011) — the modalities must not disagree about whether a diagram exists.
- Quickstart §6 opens the ODT in LibreOffice and **looks at it**, because «embedded SVG
  renders in LibreOffice» is a claim about somebody else's software and this project has
  a rule about claims nobody rendered.

**Alternatives considered**: description-only in ODT — rejected as the quiet version of
the gap `022` exists to close: the learner who gets the editable route would get sheets
of prose again. Rasterising to PNG for the ODT — rejected: a second rendering path for
one modality (Principle IV), plus a rasteriser dependency. Skipping figure blocks in ODT
— rejected outright: silently dropped is the exact phrase FR-2012 forbids.
