# Data model · Ver la hoja

Two entities, and neither is persisted state. The record is derived output; the
enumeration is a constant. That is the whole model, and its smallness is the point —
a record that carried state of its own would be a thing to keep in sync.

---

## `SheetPresentation` — an input to the renderer, named

Lives in `app/packages/core/src/render/presentations.ts`. New module, and the only new
code in `core`.

```ts
export interface SheetPresentation {
  /** Stable, filename-safe, in her language. Never printed on a sheet. */
  id: string;
  /**
   * Why this one exists: the rule in `presentationFor` it represents. Prose for a
   * person reading a directory listing, not a key.
   */
  because: string;
  /** The axis levels that produce it. THE input — never the resulting values. */
  levels: Partial<Record<Axis, 0 | 1 | 2 | 3>>;
}

export const SHEET_PRESENTATIONS: readonly SheetPresentation[];
```

### Fields, and the one rule that matters

`levels` is the field, and `Presentation` values are **deliberately absent**. Research R2
records why with the measurement: `sheet-a11y.spec.ts` already holds a literal that is a
*subset* of a real presentation — four properties short, including the `#000` ink a
`PER-V:2` learner actually receives — so its axe sweep runs over a sheet less adapted
than any learner's. Nothing said so, because a stale literal is plausible.

So there is no field in which a presentation value can be written twice. The values come
from `presentationFor(levels)`, at the call site, every time.

### The members

One per rule in `presentationFor`, plus the baseline. Six, and the set is small because
only four of the ten axes touch presentation at all.

| `id` | `levels` | The rule it represents |
|---|---|---|
| `sin-barreras` | `{}` | The baseline. Nothing set, everything default |
| `ve-poco` | `PER-V: 1` | 18pt, narrower measure |
| `ve-muy-poco` | `PER-V: 2` | 24pt, maximum-contrast ink, narrowest measure |
| `descifra-con-esfuerzo` | `DEC: 1` | Double line height, letter and word spacing |
| `una-tarea-por-pagina` | `COG: 2` | The page break after every exercise |
| `satura` | `REG: 2` | The muted accent |

`ATE: 2` is not a member: it produces the same `oneTaskPerPage` as `COG: 2` and nothing
else, so a seventh picture would be identical to the fifth. The test asserts that
equality rather than the enumeration asserting the absence — an identical picture added
later is waste, not a defect, and the test says which.

### Validation

- Every `id` is unique, filename-safe, and contains no digits that could read as a
  learner code.
- Every member produces a `Presentation` that differs from every other member's.
- Every axis that `presentationFor` reads appears in at least one member's `levels`.
  This is the anti-drift assertion: a rule added to the renderer without a member here
  fails it.

---

## `RecordEntry` — one captured sheet

Not a type in the codebase; the shape of what a run writes. Described here because the
naming *is* the interface — FR-3608 says a person must be able to tell what a file is
without opening the script.

```text
docs/screenshots/latest/
  hoja--ficha--ve-muy-poco--borrador.pdf
  hoja--ficha--ve-muy-poco--borrador.png
  hoja--ficha--ve-muy-poco--firmada.pdf
  hoja--ficha--ve-muy-poco--firmada.png
  hoja--examen--sin-barreras--borrador.pdf
  …
```

| Segment | Values | Why it is in the name |
|---|---|---|
| `hoja` | fixed | Sorts the sheets together, apart from the twenty application screens already there |
| kind | `ficha`, `examen`, `pictogramas`, `agenda` | The four that render differently (FR-3602) |
| presentation | a `SheetPresentation.id` | So a difference can be attributed without opening two files |
| state | `borrador`, `firmada` | The draft mark is the only structural difference between them (FR-3610) |

Double hyphens as the separator because the ids themselves contain single hyphens.

### The set a run writes

Around ten, per the spec's Assumptions: the full presentation matrix applies to **one**
representative kind, and the other kinds get one capture each at the baseline
presentation.

| | Count |
|---|---|
| `ficha` × 6 presentations × 2 states | 12 |
| `examen`, `pictogramas`, `agenda` at `sin-barreras`, unsigned | 3 |
| | **15 pages, 15 images** |

Fifteen rather than the "around ten" the spec assumed. Recorded rather than smoothed
over: the spec's number was an estimate made before the presentations were enumerated,
and the honest figure follows from the enumeration. Still a set a person opens; forty
was the number that made it not one.

### Lifecycle

There is none, and that is deliberate. A run overwrites the whole set. There is no
history, no index, no manifest and no baseline — those are the machinery of a pixel-diff
suite, which `013` FR-1114 forbids and FR-3604 restates. Git holds the history, and a
`git diff` on a binary tells a person to open both files, which is the intended
interaction.

---

## What is deliberately not modelled

- **No manifest file.** A JSON index of what was captured would be a second source of
  truth about the directory, and the directory is already legible.
- **No baseline, no hashes, no comparison.** FR-3604.
- **No per-run directory.** The record is `latest` and git is the history, following the
  existing convention rather than inventing a second one.
- **No learner.** The fictional profile the script seeds is an input to the run, not a
  member of the record, and nothing about it survives into a captured file — which
  `checkOutput` asserts over the artefact (SC-3606).
