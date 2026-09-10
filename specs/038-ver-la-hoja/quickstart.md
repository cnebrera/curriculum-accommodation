# Quickstart · proving that somebody can see the sheet

Ordered so the thing that cannot be automated comes last and everything before it is
cheap. Every step runs offline with no provider key — that is FR-3612 and it is also
what makes this list runnable on a fresh clone.

## Prerequisites

```bash
cd app
npm ci
npm run bundle:corpus   # includes sample/, which is what gets rendered
```

No key. No network. No LibreOffice.

---

## §1 · The anti-drift assertion, first and red

```bash
npx vitest run packages/core/test/presentations.test.ts
```

| Case | Expected |
|---|---|
| Every axis `presentationFor` reads appears in some member's `levels` | **passes** — and fails the day a rule is added to the renderer without a picture |
| Every member produces a `Presentation` distinct from every other | passes |
| `ATE: 2` produces the same presentation as `COG: 2` | passes — asserted as an equality, so a seventh identical picture is visible as waste rather than hidden |
| Every `id` is unique and filename-safe | passes |

Written before the record exists, and red, because an enumeration written after the
script works is an enumeration shaped to whatever the script happened to capture.

## §2 · The drift that already exists, closed

```bash
RAMPA_HIDDEN=1 npx playwright test e2e/sheet-a11y.spec.ts
```

Its three hardcoded presentations are now derived from `SHEET_PRESENTATIONS`. The sweep
therefore runs over **six** real presentations instead of three approximate ones,
including the `#000` ink a `PER-V: 2` learner actually receives — which research R2
measured as missing.

**This is the step most likely to find something**, and finding something is the point:
the axe sweep has never run over a maximum-contrast sheet. If it fails here, the failure
is real and predates this feature.

## §3 · The record itself

```bash
npm run shots
ls -la ../docs/screenshots/latest/hoja--*
```

| Check | Expected |
|---|---|
| Count | 15 pages and 15 images |
| Names | `hoja--<kind>--<presentation>--<state>` · legible without opening the script |
| The command's own output | says how many and where (FR-3613) |
| Exit code | `0`, whatever the sheets look like |
| Time | the whole command under two minutes (SC-3601) |

## §4 · The promises a machine can check

```bash
RAMPA_HIDDEN=1 npx playwright test e2e/shots-record.spec.ts
```

- **No learner data on a captured sheet** — `checkOutput` over the rendered document,
  with the fictional learner's code, name, age, year and stage as needles (SC-3606).
- **Determinism** — two runs, and the pages agree (FR-3614).
- **Nothing fails on ugly** — a deliberately awful presentation still exits `0`
  (FR-3604).
- **Offline** — the run is driven with the network counter installed and asserts zero
  requests, the same way `035`'s rehearsal does.

## §5 · The retrospective test of the instrument

This is the one that says whether the feature works, and it can be run because the
defects and their fixes are both in the history (SC-3604).

```bash
git stash list   # or a worktree at the commit before each fix
```

For each of the three defects the first printed PDF revealed, check out the parent of its
fix, run `npm run shots`, and open `hoja--ficha--sin-barreras--borrador.png`:

| Defect | Fixed in | What the image should show |
|---|---|---|
| **G74** the number twice | `0878008` | «1.» and under it «1. 3 × 6 = 18» |
| **G75** the code block | `0878008` | Monospace, raw `*asterisks*`, a line running off the card |
| **G76** Verdana | `0878008` | The wrong typeface — compare against the same capture at `HEAD` |

**If any of the three is invisible in the record, the record is the wrong shape** and
this feature has not done its job. That is a real possible outcome and it is why the
criterion is written this way rather than as «the record is useful».

## §6 · The verdict only a person can give

Open the fifteen pages and say what is wrong with them.

That is not a formality: it is SC-3602, and the protocol is `010` SC-805's — **recorded
verbatim, including when it is unflattering**. The sentence that produced this whole
feature was «¿en serio eso es material para un niño?», and it was said by somebody
looking at a page for the first time. This step is the one that makes such a sentence
possible before a child is holding the paper rather than after.

Two things to look at deliberately, because they are what `040` will change and this is
the baseline it will be judged against:

- `hoja--ficha--una-tarea-por-pagina--borrador.pdf` — six pages for six exercises. It is
  the accommodation working as specified, and it is also what looks absurd. Both are
  true, and `040` decides what to do about it.
- `hoja--ficha--ve-muy-poco--borrador.pdf` at 24pt — the same sheet a six-year-old and a
  seventeen-year-old receive today, identically. That is the gap `040` closes and the
  reason `018`'s recorded principle is already being broken by absence.
