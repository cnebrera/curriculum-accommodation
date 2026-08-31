# Contract — what the door produces

The door's whole output is one value. Every screen downstream **reads** it and none
of them asks again.

```ts
export type Work = 'adapt' | 'compose';

export interface Intent {
  /**
   * The learners, in the order she picked them. The first is the first — never
   * the only one (FR-1411).
   */
  learners: string[];
  /** What she is doing. There is no third value and no default. */
  work: Work | null;
  /**
   * What the material is (`012`). `null` until she says, for the adapt branch.
   *
   * The compose branch fills this in itself — composed practice is a worksheet —
   * and that is not a default: it is a fact about what was produced.
   */
  kind: string | null;
}
```

## Rules

1. **No screen re-asks what the intent already holds.** The failure this prevents
   is the one every wizard has: she answers "for whom" on screen one and is asked
   again on screen three, and concludes the first answer did not register.

2. **`work` has no default.** Neither door is the normal one. A pre-selected
   «adaptar» is how `002` stays unreachable while appearing to be offered.

3. **`kind` is never defaulted on the adapt branch** (`012` FR-1001, FR-1403). A
   defaulted «ficha» is how an exam gets adapted as a worksheet.

4. **The intent is not persisted across restarts.** Same reasoning as `015`'s
   filters: a half-finished intent restored on Monday is a screen that looks wrong
   with no visible cause. What *is* persisted is the job, by the jobs that write it.

5. **The intent carries no axis and no barrier.** Not an omission — Principle V.
   There is nowhere in the flow that needs one, and a field that existed would
   eventually be rendered.

6. **Going back does not clear it** (FR-1408). She may switch doors having typed an
   objective and come back to find it still there.

## What the door does not do

- It makes **no provider call**. Both branches end in a job that does.
- It creates **no adaptation behaviour** (FR-1410). If a diff to this feature
  touches `recipes/`, `instructions/` or `packages/core/src/prompt/`, it is
  specifying something `001`, `002` or `012` owns.
