# Phase 0 · Research

Five questions. R1 shapes the feature; R3 found that one word was hiding two operations.

---

## R1 · What is «the document» of a job, and does answering it need a new stored fact?

**Decision**: a resolver, and **no new stored fact**.

```
resolveDocument(vault, job, learner?)
  → material/<job>/<learner>/adapted.md   when it exists
  → material/<job>/ir.md                  otherwise, if it was composed
  → nothing, and say which case it is
```

**Rationale**: a composed job already records everything the resolver needs.
`compose.ts` writes the sheet to `material/<job>/ir.md` and stamps `composed_for` with
the learner's code, which is why `014`'s record already lists a composed job before it is
adapted. So «which document, and whose presentation?» is answerable from what is on disk
today.

That matters beyond tidiness: a **new** field would need writing at composition time and
would be absent from every job already in a vault, so the feature would arrive working
only for material made after it shipped — for a teacher who has already composed
something, that is the same limbo with a newer date on it.

**What the resolver must return, not just the path**: which case it took. Printing needs
the learner for the presentation, and the two cases get it from different places — the
directory name for an adaptation, `composed_for` for a composition. A resolver that
returned only a string would push that decision back out to the eight callers.

**Alternatives considered**: a `current_document` field in the job — rejected, it is a
stored copy of what the filesystem already says, and `014` established that pattern as a
defect this project has found repeatedly. Symlinking or copying the composed sheet into a
learner directory — rejected: two files with the same content is the two-copies defect
with extra disk, and it would make `005`'s «one extraction, N adaptations» layout lie.

---

## R2 · Who implements `startedFor()`, since `020` also needs it?

**Finding**: `020` T006 specifies `startedFor(frontMatter)` — reading `for_learner` first
and `composed_for` as the older spelling — and it sits in **`020` US2**, unimplemented.
`021` needs the same function now.

**Decision**: **`021` implements it**, in `packages/core`, and `020` T006 cites it instead
of creating it. Whichever feature arrives first owns it; today that is this one.

**Rationale**: the alternative is two functions that answer «who was this job started
for?», which is the defect both specifications were written to avoid. Recording it here
means the coverage tables of both features point at one implementation.

**Consequence for `020`**: its T006 shrinks to «write `for_learner` at ingest», because
the reader will already exist. Noted in this file so the change to that task has a source.

---

## R3 · Is iterating on composed material the same operation as revising an adaptation?

**Finding**: **no**, and the word «revise» was hiding it.

| | Adapted material | Composed material |
|---|---|---|
| What runs | `runAdaptation` with corrections | `runCompose` again |
| What the model is asked | adapt this document | compose from these objectives |
| What must be re-derived | nothing else | **the answer key, and its verification** |

`job:revise` calls `runAdaptation(jobId, learner, onProgress, corrections)`. Pointing it
at a composed job would ask a model to *adapt* the sheet — producing an adaptation, which
is not what she asked for, and leaving `answers.md` describing exercises that no longer
exist.

**Decision**: a separate operation for composed material, which re-runs the composition
with her correction and **regenerates and re-verifies the answer key in the same step**.
`ComposeRequest` already carries everything needed to re-run (`objectives`, `perObjective`,
`anchor`, `targetYear`, `sessions`), so the request is stored with the job or reconstructed
from the sheet's own front matter — decided in Phase 1.

**Why this is the finding that justifies FR-1919**: a stale answer key is worse than no
answer key. She takes it to class and marks against exercises that changed.

**Alternatives considered**: reusing `job:revise` with a branch inside it — rejected, one
channel doing two different things to two different documents is how the caller ends up
guessing; and the branch would sit in the file that already had the worst version of this
problem.

---

## R4 · How does the viewer show a document without executing anything in it?

**Decision**: the HTML that `renderHTML` already produces, in a **sandboxed frame with no
script permission**, with the document supplied inline rather than loaded from a path.

**Rationale**: FR-1905 asks for «the document as it will print», so rendering the IR a
second time in React would be a second renderer — two implementations of what the page
looks like, and the one she checks would not be the one she prints. Using the real HTML
means the viewer and the printer cannot disagree.

Checked, and it is why this is affordable: `renderHTML` emits **no `<script>` at all**
(zero occurrences). So the sandbox is not compensating for something we generate; it is
the structural guarantee for what the *document* might contain, which is Principle IX —
a composed document rests on an anchor she pasted, and `007` treats that as content.

**What the sandbox must deny**: scripts, navigation, form submission, and any remote
reference. Anything the document asks to fetch is a document reaching the network, which
in this application is a chokepoint with exactly one legitimate location.

**Alternatives considered**: open in her browser — that is what `openInVault` already does
and it is what she complained about; a Markdown preview — not what will print; rendering
the IR in React — two renderers, above.

---

## R5 · Where do the composed material's outputs go on disk?

**Decision**: `output/<job>/<learner>/`, the same place adapted material's outputs go,
with the learner taken from `composed_for`.

**Rationale**: the learner is known, the directory already exists in the layout, and
`014` already lists everything under it as «lo que imprimí». A second location would make
the record's own listing incomplete for exactly the material this feature is about.

**The answer key is the exception, and deliberately**: it is the teacher's copy, not the
learner's, so it renders to its own file with its own heading (FR-1921/FR-1922) and never
shares a file or a page with the sheet. `002` already writes `answers.md` at the job level
rather than under a learner for the same reason — one composition, N presentations, and
the key belongs to the composition.
