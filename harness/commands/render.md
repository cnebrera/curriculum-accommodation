# /rampa.render — produce the output modalities

**Goal:** turn `adapted.md` into files in `output/<job>/`.

Every modality is a rendering of the same adapted IR. There is no per-modality
pipeline and no per-modality re-adaptation.

## Modalities

| Output | How | Driven by |
|---|---|---|
| `sheet.html` | `scripts/render.sh` with `templates/base.html` | Always |
| `sheet.pdf` | HTML → PDF, `scripts/html2pdf.sh` | Print |
| `sheet.odt` | Pandoc | Teacher wants to edit. **Harness only** — the application cannot ship Pandoc and will write OpenDocument XML instead (`006` R12) |
| `sheet.txt` | Plain text, braille-ready | `PER-V: 3` |
| `sheet.mp3` | Offline TTS over the text rendering | `PER-V >= 2` or `DEC: 3` |
| `report.html` | The adaptation report | Always |

Ask which are needed; do not generate all six by default.

## Profile-driven presentation

The HTML template takes variables from the profile — type size, line spacing,
line length, contrast, density, whether one task appears per page. Set them from
the axes; do not hand-edit the CSS per learner. If a profile needs something the
template cannot express, that is a template change, contributed back.

## Non-visual rendering

- `decorative` figures are dropped.
- `informative` figures become their short description.
- `essential` figures become their long description. **An `essential` figure with
  no long description blocks the render** — do not emit an exercise the learner
  cannot possibly answer.
- Formulae are voiced from LaTeX, not read as symbols.
- In audio, exercises are read with a pause after the question, and the item
  number is announced before it.

## Draft mark

Every rendered file carries a visible pending-review mark. `/rampa.render` never
removes it — only `/rampa.review` does, and only after human sign-off.
