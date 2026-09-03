# Contract: figures — the allowlist, the request, and the four rules

## 1 · The allowlist (FR-2008/2009/2010) — code, not corpus

Lives in `app/packages/core/src/render/figures/validate.ts`. It is a structural defence
(Principle IX): a teacher-editable security boundary is not a boundary, so unlike every
pedagogical table in this feature it is **not** read from `instructions/`.

### Elements — exactly these, in the SVG namespace, lowercase

`g` · `rect` · `circle` · `ellipse` · `line` · `polyline` · `polygon` · `path` · `text`

### Attributes

| Group | Allowed |
|---|---|
| Geometry | `x` `y` `cx` `cy` `r` `rx` `ry` `x1` `y1` `x2` `y2` `width` `height` `points` `d` |
| Paint | `fill` `stroke` `stroke-width` `stroke-linecap` `stroke-linejoin` `stroke-dasharray` `opacity` |
| Text | `font-size` `text-anchor` `dominant-baseline` |
| Transform | `transform`, restricted to `translate(…)` `scale(…)` `rotate(…)` with numeric arguments |

### Value rules (an allowed attribute with a hostile value is still a refusal)

- `fill`/`stroke`: `#rgb`/`#rrggbb`, a CSS named colour, or `none`. **`url(` anywhere in
  any value refuses the diagram** — paint servers, even local ones, are references.
- `d` and `points`: numeric path grammar only (`[MmLlHhVvCcSsQqTtAaZz0-9 ,.eE+-]` for
  `d`; numbers, commas and spaces for `points`).
- No value may contain `<`, `&`, `javascript`, `http`, `//`, or a `data:` scheme.
- `text` content: plain text; entities and embedded tags refuse.

### Refused by absence — never stripped, the whole diagram refused

`script`, every `on*` attribute, `href`/`xlink:href`, `image`, `use`, `style` (element
and attribute), `animate`/`animateTransform`/`animateMotion`/`set`, `foreignObject`,
`filter`, `mask`, `clipPath`, `pattern`, `marker`, `symbol`, `defs`, `a`, `metadata`,
`switch`, `view`, namespaced anything (`xmlns:*` beyond the default), XML comments,
processing instructions, `CDATA`.

### Bounds on the fragment itself

`maxElements: 20`, `maxBytes: 2000`, nesting depth ≤ 3. A glyph is a shape, not a scene.

### The contract

```ts
export type GlyphVerdict =
  | { ok: true }
  | { ok: false; offending: string; message: string };  // quoted, located, in her language

export function validateGlyph(fragment: string): GlyphVerdict;
```

- **Refuses, never rewrites** (FR-2008). There is no «cleaned» output type on purpose.
- Pure and deterministic; the isolation suite walks it.
- Called at **compose time** (refusal → report, nothing written) and again at **render
  time** by every renderer that draws (the vault is hand-editable; `007`).

## 2 · The request format (parsed by `compose/figures.ts`)

One line per diagram, after the exercise lines, format stated to the model by
`instructions/figures.md` (the wording is corpus; the parser is code):

```
figura: <expresión> | tipo: rejilla|grupos|recta|barra | tema: <palabras> | glifo: <fragmento SVG en una línea>
```

- `tema` and `glifo` optional. An unparseable line is **no request** — never a guess.
- No numeric field exists in the parsed type (`DiagramRequest`, data-model.md).
- `tipo` maps corpus-declared names to kinds; an unknown `tipo` is no request.

## 3 · The drawer

```ts
export function drawFigure(fig: Figure): string;  // one <svg …> element, inline
```

- Deterministic: same `Figure`, byte-identical SVG (FR-2004). No Math.random, no Date,
  no filesystem, no model.
- Geometry is computed **only** from `fig.quantities`; `theme`/`glyph` choose what a
  cell looks like, never how many there are (FR-2005, structurally).
- Plain figures (no glyph) use built-in shapes — drawing mechanics, so code.
- Repetition is by inlining N copies — no `defs`/`use`, so «the output contains no
  `href`, no `url(`, no `http`» stays a one-line assertion (FR-2010).
- Counting never rides on colour: every counted thing is a discrete outlined shape, and
  number-line jumps are arcs with tick marks (FR-2013).
- The `<svg>` carries `role="img"` and `aria-label` = the description.

## 4 · The four rules every renderer keeps

1. **Validate before you draw.** `validateGlyph` plus the quantity cross-check (`data-of`
   exercise parses → operands match the stamped attributes), on every render, in every
   modality. A refusal renders as the refusal sentence, and the sheet survives (FR-2011).
2. **Never markdown-render a drawn figure's content.** The fence is inert input, not
   body text. (And if a renderer forgets: `html: false` means escaped text, not
   execution — the failure is ugly, visible and safe.)
3. **The description always ships.** HTML: `aria-label`; ODT: the caption paragraph;
   audio/braille: the description *is* the rendering (FR-2012).
4. **Nothing remote, ever.** The rendered output for any document — hostile or not —
   contains no URL, no external reference, no fetchable anything (FR-2010). Asserted
   over the output string, not over intentions.
