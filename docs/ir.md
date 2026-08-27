# Intermediate Representation (IR)

The IR is the single normalised form of a piece of material. Source files of any
kind are converted into it once; adaptation operates on it; every output modality
is rendered from it.

> **Status: v0, open for review.** This is the format everything else hangs off.
> Changes to it are constitution-level decisions, not implementation details.

## Format: Pandoc-flavoured Markdown

The IR is Markdown with YAML front matter, using Pandoc's
[fenced divs](https://pandoc.org/MANUAL.html#divs-and-spans) and attribute
syntax. We are not inventing a format.

Why: Pandoc already converts this to HTML, ODT, PDF and plain text, it round-trips
without loss, a teacher can read and correct it in any text editor, and `git diff`
on it is legible — which is what makes the adaptation report honest.

## Front matter

```yaml
---
source: unidad-4-fotosintesis.pdf   # original filename, for provenance
lang: es                            # BCP-47; selects recipes/lang/<code>/
subject: ciencias-naturales
grade: "5"                          # free text; school systems differ
kind: worksheet                     # worksheet | lesson | exam | reading
                                    # or `generated` — see Generated IR below
extraction:
  method: ocr                       # ocr | text | vision | manual
  verified: false                   # set true only by a human, in /rampa.ingest
---
```

`extraction.verified` gates the pipeline: `/rampa.adapt` refuses to run while it
is `false`. An OCR error in step one contaminates all five outputs.

## Blocks

Every meaningful unit is a fenced div with a class and an id.

```markdown
::: {#b1 .explanation}
Las plantas fabrican su propio alimento mediante la fotosíntesis.
:::

::: {#e4 .exercise data-number="4" data-response="short" data-criterion="CE.3.2"}
Escribe dos ejemplos de seres vivos autótrofos.
:::
```

| Class | Meaning |
|---|---|
| `.explanation` | Content being taught |
| `.example` | Worked example illustrating the explanation |
| `.instruction` | Tells the learner what to do (often precedes exercises) |
| `.exercise` | A task the learner performs |
| `.assessment` | An exam or graded item — stricter rules apply |
| `.note` | Marginal note, tip, callout in the original |
| `.reference` | Glossary, index, bibliography |

Attributes:

| Attribute | On | Meaning |
|---|---|---|
| `data-number` | exercise, assessment | The number the original printed. **Preserve it** — the teacher and the class refer to it out loud |
| `data-response` | exercise, assessment | `short`, `long`, `choice`, `match`, `fill`, `oral`, `manipulative`, `draw` |
| `data-criterion` | exercise, assessment | Assessment criterion, when known |
| `data-points` | assessment | Marks allocated |

## Figures

An image's **role** decides what happens to it in every non-visual output.

```markdown
::: {#f1 .figure data-role="essential"}
![Esquema del proceso de la fotosíntesis](assets/p12-f1.png)

> **Description.** El sol emite luz sobre la hoja. La hoja toma dióxido de
> carbono del aire y agua de la raíz, y libera oxígeno.
:::
```

| `data-role` | Meaning | Non-visual rendering |
|---|---|---|
| `decorative` | Adds nothing; pure layout | Dropped |
| `informative` | Illustrates content stated elsewhere too | Short description |
| `essential` | The task cannot be solved without it | Full description; if it cannot be described, the exercise is flagged, never silently kept |

The blockquote after the image is the long description. `alt` is the short one.
Both are written during ingest and reviewed by the teacher.

## Maths

Formulae stay in LaTeX (`$...$`, `$$...$$`), never as images. This is what makes
them speakable for audio and convertible for braille.

> Extracting and voicing mathematics is the project's hardest open problem. Phase 0
> is scoped to text-based subjects; see `docs/ESPECIFICACION-V0.md` §12.

## Adapted IR

`/rampa.adapt` writes `adapted.md`: the same format, plus provenance on every
block it touched.

```markdown
::: {#e4a .exercise data-number="4a" data-response="short"
     data-from="e4" data-recipe="one-task-per-item" data-axis="COG:3"}
Escribe **un** ejemplo de ser vivo autótrofo.
:::
```

| Attribute | Meaning |
|---|---|
| `data-from` | Id(s) in the original IR this block derives from |
| `data-recipe` | Recipe that produced the change |
| `data-axis` | Axis and level that justified it |

Rules:

- A block with no `data-from` is **new content**, which is only legitimate for
  scaffolding (a worked example, a step list, a word bank) — never for curricular
  content. Mark it `.scaffold`.
- A dropped block is recorded in `report.md`. Blocks never disappear silently.
- **A change with no `data-recipe` and no `data-axis` must not be made.** That is
  the mechanical form of "every change is traceable".

`report.md` is generated from these attributes: grouped by decision, not by
paragraph, so the teacher reviews about fifteen decisions instead of re-reading
twelve pages.

## Generated IR

`/rampa-compose` produces the same format from learning objectives rather than
from source material. Two differences, and nothing else in the pipeline changes.

```yaml
---
kind: generated
lang: es
objectives:
  - id: o1
    text: "Explicar qué es la fotosíntesis y para qué le sirve a la planta"
  - id: o2
    text: "Distinguir seres vivos autótrofos y heterótrofos"
anchor:
  kind: teacher-notes        # teacher-notes | textbook-summary | official-criteria | approved-reference
  ref: "material/unit4/source/apuntes-profe.md"
  approved_by_teacher: true
---
```

Blocks carry `data-objective` where adapted blocks carry `data-from`:

```markdown
::: {#g3 .exercise data-number="3" data-objective="o2" data-response="short"}
Escribe un ser vivo que fabrique su propio alimento.
:::
```

Rules:

- **No anchor, no generation.** `anchor.approved_by_teacher` must be `true`
  before any curricular content is produced. Composing from the model's own
  knowledge alone is out of scope.
- A claim that could not be tied to the anchor is marked `.unsupported` in the
  material and listed first in the report.
- `.scaffold` means the same as elsewhere: support, not curricular content.

See `specs/002-compose/spec.md` and
`docs/decisions/0003-two-entry-points-one-pipeline.md`.

## Draft marking

Rendered output carries a visible pending-review mark until `/rampa.review`
records sign-off in the front matter:

```yaml
review:
  signed_off: true
  by: "PT"          # role, never a name
  date: 2026-09-04
```
