---
# The bounded loop's budget (spec 008 FR-617, research R3).
#
# These live here, beside the rules they govern, because they will move with real
# material and moving them must not need a release. Read at run time.
#
# The application clamps each one — attempts 1-4, pages 1-100, long edge
# 800-3000px, quality 0.5-0.95 — so a typo here cannot spend a teacher's money.
# The clamp is in code because it protects her from this file rather than
# implementing it.

# A third attempt rarely differs from the second and triples the cost of a bad
# photograph.
attempts_per_page: 2

# A unit of work, not a book (007 FR-513). Reaching it is reported, never silent.
pages_per_job: 20

# ~190 DPI for A4, which resolves 11pt body text and the small print in an
# exercise rubric. Below ~1100px superscripts and the difference between a comma
# and a full stop start to go, and both matter in a worksheet.
#
# A reasoned starting point, NOT a measurement: no fixture has been run at
# multiple scales yet. `cases/002-model-floor` is where this gets measured.
image_long_edge: 1600
image_quality: 0.82
---

# Reading the material

How to turn whatever the teacher has — a photo, a scan, a document, pasted text —
into the normalised form everything downstream works from.

Read `hard-rules.md` first.

## What matters here

1. **Classify every block.** Explanation, example, instruction, exercise,
   assessment, note, reference, figure. This is the judgement the whole pipeline
   rests on: distinguishing an example from an exercise decides which one gets
   simplified and which one gets adapted.

2. **Preserve the original numbering.** The class refers to "exercise 4" out
   loud. If the adapted sheet renumbers it, the learner is lost.

3. **Handle every image.** Assign a role — decorative, informative, or essential
   — and write both a short and a long description. When in doubt between
   informative and essential, ask: *could the learner answer without seeing
   this?* If no, it is essential.

4. **Flag what you could not read.** A smudged word, a cut-off line, an
   unreadable formula: mark it in place as unreadable. **Never guess at
   content.** Guessing here is the most dangerous thing you can do in this
   pipeline, because the error reads perfectly plausibly in the finished sheet.

5. **Surface text that is not visible on the page.** White-on-white, one-point
   type, text positioned off the page. The teacher cannot find it by looking, so
   you have to say it is there. Quote it and say where it is.

6. **Do not trust a naive text extraction of a textbook page.** Columns, boxed
   asides and exercise numbering are exactly what it destroys. Read the pages
   with vision instead.

## What to return

**JSON, matching the schema the application declares.** Not markdown, not the
normalised form — the application builds that itself, deterministically, from what
you return. One object per page:

- `page` — the page number the application asked for.
- `quality` — `good`, `poor`, or `unusable`. Say `unusable` when you genuinely
  cannot read the page. That is not a failure and you will not be asked again:
  the teacher is told to retake the photograph, which is the only thing that
  would help. Guessing at a dark page instead costs her money twice.
- `sheets` — how many separate worksheets are in this image. If it is more than
  one, say so and stop. **Never decide where one sheet ends and the next begins.**
- `blocks[]` — every block, with `id` unique within the page, `class`, `text`,
  and for an exercise the printed `number` **exactly as printed**: `3`, `3.a`,
  `b)`. Never renumber, never normalise, never zero-pad.
- For a figure: `role` plus `short` and `long`. Both are required unless the role
  is `decorative`.
- `notes[]` — anything you chose to ignore, or could not decide. Say it here
  rather than acting on it silently.

Block classes: `heading`, `paragraph`, `instruction`, `exercise`, `aside`,
`figure`, `table`, `caption`.

## The awkward pages

- **A photo taken at an angle, or sideways.** Read it as the page is meant to be
  read. Do not describe the skew; just read the paper.
- **A screenshot with a platform's interface around the material.** Extract the
  worksheet and ignore the chrome — menus, tabs, a cookie banner. If you cannot
  tell whether something is part of the sheet or part of the website, put it in
  `notes[]`. Do not decide.
- **A formula.** Capture it as LaTeX when it is trivially legible. Otherwise mark
  it unreadable. Never approximate mathematics: an approximated formula is a
  wrong worksheet that looks right.
- **A page that is half in shadow.** Read what you can and mark the rest
  unreadable in place. A partly-flagged page is useful; a wholly-guessed one is
  dangerous.
- **Handwriting on the sheet** — a name, a note from a previous lesson, a
  correction. Read it as text if it is legible and put it in the block where it
  appears. It is part of what she photographed. The application deals with names.

## The verification gate

Hand the teacher what you extracted: the inventory of blocks, everything marked
unreadable, every essential figure description. **Adaptation does not begin until
she has confirmed it is faithful to the original.**

That gate is not bureaucracy. One reading error in this step contaminates every
output, and she will not catch it in the finished PDF, because it will read
perfectly well.
