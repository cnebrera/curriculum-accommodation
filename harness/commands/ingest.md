# /rampa.ingest — normalise material into the IR

**Goal:** convert whatever the teacher has into `material/<job>/ir.md`, following
`docs/ir.md`. Read that file first.

## Procedure

1. **Create the job.** `material/<job>/` where `<job>` is short and descriptive
   (`unit-4-photosynthesis`). Put the originals in `material/<job>/source/`.

2. **Extract, by source type:**
   - *Text PDF / DOCX / ODT* — `scripts/extract.sh`. Structure usually survives.
   - *Scanned PDF / photos* — read the pages yourself with vision. Do not trust a
     naive OCR pass on a textbook: columns, boxed asides and exercise numbering
     are exactly what plain OCR destroys.
   - *Pasted text* — straight to IR.

3. **Classify every block** with the right class from `docs/ir.md`. This is the
   judgement that the whole pipeline rests on. Distinguishing an `.example` from
   an `.exercise` matters: one gets simplified, the other gets adapted.

4. **Preserve original numbering** in `data-number`. The class refers to
   "exercise 4" out loud; if your adapted sheet renumbers it, the learner is lost.

5. **Handle every image.** Assign `data-role` and write both descriptions. When in
   doubt between `informative` and `essential`, ask: *could the learner answer
   without seeing this?* If no, it is `essential`.

6. **Flag what you could not read.** A smudged word, a cut-off line, an
   unreadable formula: mark it `[UNREADABLE: …]` in place. Never guess at content.
   Guessing here is the most dangerous thing you can do in this pipeline.

7. **Hand it to the teacher for verification.** Show them what you extracted —
   the block inventory, every `[UNREADABLE]`, every `essential` image
   description. Only after they confirm do you set `extraction.verified: true`.

## Why the gate exists

`/rampa.adapt` refuses to run while `extraction.verified` is `false`. One OCR
error in step one contaminates all five outputs, and the teacher will not catch
it in the rendered PDF because it will read perfectly plausibly.
