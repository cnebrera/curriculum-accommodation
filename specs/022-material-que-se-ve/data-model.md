# Data model

Two types in memory, one new block shape in the IR, **no new file, no new front-matter
field, nothing on the profile**. The quantities deliberately have no home of their own:
they are read from the verified exercise and stamped as block attributes, so there is no
second copy to drift.

## `DiagramRequest` — what the model asked for

```ts
/** Parsed from the compose response. Carries NO quantities — by type, not by discipline. */
export interface DiagramRequest {
  /** The exercise it belongs to, keyed by expression (positions shift; the expression survives). */
  expression: string;
  /** One of the four kinds. Anything else is no request. */
  kind: 'grid' | 'groups' | 'number-line' | 'part-whole';
  /** The theme in words — «cartas», «autobuses». Optional; absent means plain. */
  theme?: string;
  /**
   * The themed shape, as an SVG fragment — NOT yet trusted. It is validated
   * against the allowlist before anything is written, and refused whole
   * (never sanitised) if it strays (FR-2008).
   */
  glyph?: string;
}
```

There is no `count`, `rows`, `size` or any numeric field. A model that writes numbers
into the line writes them into nothing; where they visibly disagree with the exercise,
the report says the quantity was corrected (FR-2002).

## `Figure` — what is drawn

```ts
/** Assembled by buildSheet from an ACCEPTED exercise. Never constructed from a request alone. */
export type FigureQuantities =
  | { kind: 'grid'; rows: number; cols: number }
  | { kind: 'groups'; groups: number; perGroup: number }
  | { kind: 'number-line'; start: number; jumps: number; end: number }
  | { kind: 'part-whole'; parts: readonly number[]; whole: number };

export interface Figure {
  /** The exercise block this figure draws. */
  of: string;
  quantities: FigureQuantities;   // from {a, b, op, answer} — code's, always
  theme?: string;                 // the model's word, quantity-free
  glyph?: string;                 // already validated once; re-validated at render
  /** Corpus template + code-interpolated quantities. What audio/braille say. */
  description: string;
}
```

## `Refusal` — why there is no diagram

```ts
export interface FigureRefusal {
  of: string;                     // expression or block id, so she can find it
  reason:
    | 'markup-outside-allowlist'  // FR-2008 — the offending token quoted
    | 'kind-unsuited-to-operation'
    | 'no-verified-quantity'      // FR-2003
    | 'bound-exceeded'            // FR-2015 — the bound named
    | 'quantities-drifted';       // render-time cross-check (FR-2016's second net)
  /** Quoted and located, never paraphrased (Principle IX). */
  detail: string;
}
```

Every refusal becomes a report sentence and the sheet renders without the diagram
(FR-2011). Refusing is an outcome, not an error: nothing throws, nothing loses the page.

## The figure block in the IR

````markdown
::: {#g1-e3-fig .figure data-figure="grid" data-of="g1-e3" data-rows="4" data-cols="3"
     data-theme="cartas" data-description="Una rejilla de 4 filas por 3 columnas: 12 casillas de cartas."}
```svg
<rect width="10" height="14" rx="2" fill="#fff" stroke="#333"/>
```
:::
````

| Attribute | Written by | Meaning |
|---|---|---|
| `data-figure` | code | The kind. Its presence is what makes a `.figure` block a **drawn** figure rather than `001`'s ingested-image figure — the two coexist and neither path touches the other |
| `data-of` | code | The exercise block id. Traceability (Principle VI), and the hook for the render-time quantity cross-check |
| `data-rows`/`data-cols` · `data-groups`/`data-per-group` · `data-start`/`data-jumps`/`data-end` · `data-parts`/`data-whole` | code | The quantities, kind-specific, from the verified exercise. Readable by the teacher in Obsidian |
| `data-theme` | model (via request), recorded by code | Words only. Affects glyphs and labels, structurally cannot affect geometry |
| `data-description` | code (corpus template + quantities) | What audio, braille and the ODT caption say (FR-2012). Hers to correct by hand |

**Content** is the fenced glyph, or empty for a plain figure. Inert by default:
`markdown-it` runs `html: false`, so every renderer that does not deliberately take the
figure branch shows escaped text. Only `renderHTML` and `renderODT` draw it, and only
after **re-validating** — the vault is hand-editable, so a figure block read from disk
is content (`007`), whatever wrote it.

## Rules

**A figure is born in `buildSheet` and nowhere else.** Adapted material gets no invented
diagrams (spec assumption) not because a check refuses but because no code path exists:
adaptation never calls the stamping code. A figure block arriving any other way — hand
edit, injection, a recipe gone wrong — meets the render-time validation and the
`data-of` cross-check.

**Unverified groups stamp nothing.** The same branch that keeps their answers out of the
key (`answer: ''`) skips their figure requests (FR-2003) — one branch, two guarantees.

**The renderer draws from the block's own attributes.** No model, no corpus lookup, no
filesystem at render time: same document, same drawing (FR-2004). The corpus is consulted
at *compose* time — its judgement is baked into the stamped block, which is what makes a
composed document renderable anywhere, forever.

**A correction re-composes, so figures are rebuilt with the sheet** (`021` R3: correcting
composed material re-runs `runCompose`). There is no path that updates an exercise and
keeps its figure (FR-2016) — plus the render-time cross-check for documents edited by
hand.

## What deliberately gains no field

| | Why |
|---|---|
| Quantities on `DiagramRequest` | The whole point. A field that exists is a field somebody eventually reads |
| The finished SVG in the IR | Unreadable to her, unverifiable without re-deriving, and a hand-edit indistinguishable from an attack. The drawing is derived, like `isSignedOff` |
| A figure catalogue in the profile | The theme comes from `profile.interests`, which exists (`002` uses it for wording). A second interests-like field is a second thing to pseudonymise |
| `data-color` or any colour semantics | FR-2013: meaning never rides on colour. Counting rides on discrete shapes; the photocopy check watches the rest |
| A «diagram style» setting | Nobody asked for it, and it would be a preference the corpus should own if it ever exists |
