# Data model

One type in memory, **nothing new on disk**. That ratio is the finding of Phase 0: a
composed job already records who it was for, so «which document?» is a question the
filesystem can already answer (research R1).

## `ResolvedDocument` — the answer to «which document, and whose?»

```ts
export type ResolvedDocument =
  | {
      of: 'adapted';
      /** `material/<job>/<code>/adapted.md` */
      path: string;
      job: string;
      /** From the directory name: an adaptation is per learner by construction. */
      learner: string;
    }
  | {
      of: 'composed';
      /** `material/<job>/ir.md` */
      path: string;
      job: string;
      /**
       * From `for_learner`, or `composed_for` as the older spelling (`020` T006).
       * Absent for a job composed before either existed — see the rule below.
       */
      learner?: string;
    }
  | {
      of: 'none';
      job: string;
      /** Why there is nothing, so the caller can say it in her words. */
      because: 'not-adapted-for-this-learner' | 'no-document-at-all';
    };
```

### Rules

**It returns the case, not just a path.** Printing needs the learner for the presentation
and the two cases get it from different places — the directory name, or the front matter.
A resolver that returned a string would push that decision back out to the eight callers
it exists to unify.

**`of: 'none'` says which kind of nothing.** «This job has not been adapted for Lucía» and
«this job has no document at all» are different sentences to a teacher, and today both
produce «Este trabajo todavía no está adaptado» — which for composed material was simply
wrong.

**An adaptation wins when one exists.** She adapted it for this learner, so that is the
document for this learner. The composition remains reachable in its own right.

**A composed document with no learner is still viewable and printable.** It renders with
the default presentation and the report says nobody was recorded. Every job composed
before `020`/`021` is in this state, and refusing to print them would be the limbo this
feature exists to end, with a newer date on it.

## What deliberately gains no field

| | Why |
|---|---|
| `current_document` on the job | A stored copy of what the filesystem says. `014` established that as this project's most-repeated defect |
| A copy of the composed sheet under the learner | Two files with one content, and it would make `005`'s «one extraction, N adaptations» layout lie |
| «Printed at» / «viewed at» | Nothing needs it, and it is usage tracking a teacher did not ask for |
| A signature field outside the document | `isSignedOff` is derived from the document (`007` FR-509), and a parameter or a side-file is exactly the structural hole that requirement closed |

## The material kind, and where it now comes from

Unchanged on disk — the sheet's front matter already carries `kind`. What changes is
**who decides it**:

| | Before | After |
|---|---|---|
| Adapting | She chooses (`012` FR-1001) | unchanged |
| Composing | Derived from what came out | **She chooses** (FR-1907), and the derivation becomes the fallback for material composed before this feature |

And when the two disagree, the **kind she asked for is what is recorded** (FR-1923). The
report says what actually came out (FR-1910). Relabelling to match the request would be
falsifying the *what*, and relabelling to match the content would take a decision that is
hers.

## The answer key

Already a separate file at the job level (`material/<job>/answers.md`), and it stays
there: one composition, N presentations, and the key belongs to the composition rather
than to any learner's adaptation.

What is new is that it **renders** — to its own file, with a heading that states it is the
solutions and is not to be handed out (FR-1921/FR-1922), and never sharing a file or a
page with the sheet.
