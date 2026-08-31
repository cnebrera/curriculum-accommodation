# Research — 019, the reading-order question (T011)

**T011 blocked all of Phase 3, and it is a design question rather than a task.**
This answers it, written before any audio code exists so the answer cannot be
retrofitted to whatever got built.

## The question

What is the reading order when the visual layout **was** the point — a matching
exercise, a number line, a two-column comparison?

Everywhere else the IR's block order *is* the reading order and nothing has to be
decided. These are the cases where linearising is not a rendering decision but a
claim about what the exercise is.

## Three candidate answers

**A · Guess a linearisation.** Read the left column, then the right; read the
number line left to right; read each matching pair as «uno: rana — a: anfibio».

Rejected, and it is the one the spec warns about in so many words: *«a guess
produces an audio file nobody uses»*. Worse than unused — a matching exercise read
as pairs **has been answered aloud**. The linearisation is the answer key. A
two-column comparison read column-first loses every row's correspondence, which is
the entire content. And it would be invisible: the audio sounds complete.

**B · Refuse the whole document.** If any block cannot be linearised, produce no
audio.

Rejected as the opposite failure. A ten-block worksheet with one matching exercise
is nine blocks a learner could use, withheld for the tenth. That is the shape of
over-caution this project has already rejected once, in `002`'s decision to compose
an unverifiable skill as a labelled draft rather than refuse.

**C · Linearise what is honestly linear; announce what is not, and say why.**
Adopted.

## The decision

**An audio-ready rendering carries an explicit order (FR-1708), and where the order
is not expressible it says so in the place the block would have been.**

Three cases, in order of how often they occur:

| | Order | How it is decided |
|---|---|---|
| Ordinary prose, instructions, exercises | Document order | The IR's block order. Nothing to decide, and this is almost everything |
| A block a recipe restructured | Explicit | `data-order` on the block, written by whatever produced it. If a recipe reorders a page it already knows the order it meant |
| A structure whose meaning is spatial | **Not expressible** | Announced and not read: «Aquí hay un ejercicio de unir con flechas. Éste no te lo puedo leer en orden.» |

### What the third case says, and what it must never do

It names **what kind of thing it is** and stops. It does not paraphrase it, does not
read its parts in an invented order, and does not skip it silently — a silent skip
is a learner who finishes an exercise that had eleven questions believing it had
ten.

That is the same rule three other parts of this project already follow:

- `002`'s exhaustion: it surfaces, it never ships.
- `018`'s ambiguous pictogram: omitted **and named**, never guessed.
- FR-1714's braille-ready: anything that cannot be honestly linearised is **named
  for the transcriber**, never dropped.

So Phase 3 and Phase 4 share the mechanism rather than each inventing one. That is
also the answer to SC-1707 — the IR needs no modality-specific field, because
«spatial» is a property of the block's class and content, not a new field.

### Which structures are spatial

Decided from the block's own class and content, deterministically, in code:

- A `figure` with no description — already `001` FR-011's case, and it becomes
  «hay una imagen sin describir» rather than silence (FR-1709).
- A block whose content is a table with more than one column of data.
- A block whose instruction is about spatial arrangement: «une con flechas»,
  «relaciona», «coloca en la recta numérica», «completa el esquema», «rodea en el
  dibujo».

**Corpus, not code**, for the last one: which Spanish phrasings mean «the layout is
the exercise» is a judgement a PT can correct, and it goes in
`instructions/audio.md` beside the rest of the modality's rules.

## What this cannot settle

Whether a learner finds the resulting file usable. The spec's own success criterion
for the heard modality is not in this document's power, and no amount of reasoning
here substitutes for one blind or low-vision learner and their teacher listening to
one sheet.

What this **does** settle is that the file will not contain a confidently wrong
reading order, which is the failure that would be discovered late and by the wrong
person.
