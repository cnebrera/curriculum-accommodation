# Contract: `pictograms:affected` — the exact count before a change

The one new IPC this feature adds. Everything else reuses channels that exist
(`job:staleSheets` and the record read change **payload shape**, not channel).

## Channel

```
pictograms:affected
```

Registered in `packages/shell/src/ipc/pictograms.ts` beside `pictograms:chooseWord`,
exposed through `preload.ts`, consumed only via a hook in `ui/src/data/pictograms.ts`
(a component never calls `window.rampa` — `013`).

## Request

```ts
{
  word: string;        // the word whose resolution is about to change
  language: string;    // her vocabulary is per language (024 FR-2220)
  /**
   * What the resolution is about to become:
   * an id  — she is choosing a (different) drawing
   * null   — she is un-choosing (the word returns to ambiguous/none)
   */
  next: string | null;
  /**
   * Present when the change is one learner's override rather than the global
   * vocabulary. Scopes the walk to that learner's sheets — a global change must
   * not count sheets an override pins, and vice versa (spec edge case).
   */
  learner?: string;
}
```

## Response

```ts
{
  /** Sheets that would become stale by drawing under `next`. The number she sees. */
  count: number;
  /** By learner code, so the warning can say whose — codes, never names (013 FR-1107). */
  byLearner: Array<{ learner: string; jobs: string[] }>;
}
```

## Rules

1. **Same deriver, prospective state.** The handler builds `CurrentState.drawingFor`
   as the real ladder (`matchWord`) with this one rung hypothetically set to `next`,
   and runs `sheetFreshness` — the identical function the record and the verification
   surface run. SC-2902 (count == subsequently marked, 100%) is guaranteed by
   construction, not by testing alone.
2. **Read-only.** The handler writes nothing. SC-2903's byte-wise vault invariant
   covers this channel explicitly.
3. **One walk.** One listing of `material/`, sheets parsed once, short-circuit on
   sheets whose pairs do not mention `word` (`020` FR-1828's cost shape).
4. **Unknown is not counted.** A sheet on the honest-unknown path (FR-2906) is not in
   `count` — the warning promises «quedarán marcadas como desactualizadas», and an
   unknown sheet will be marked *unknown*, not stale. Claiming it would reintroduce a
   number the record then contradicts.
5. **`next` is validated** against the same id allowlist as every other id
   (`[A-Za-z0-9_-]{1,40}`, Principle IX); `language` against `[a-z]{2,3}`.

## Callers

- `ChooseWord` — when the word already has a choice and she picks a different drawing.
- `MyVocabulary` — changing a choice, and «Dejar de elegir» (un-choose, `next: null`).
- The per-learner override editor (COLA 2.4 / P48), **when it exists**: same channel
  with `learner` set. Recorded here so that screen arrives already knowing its warning.

A first-ever choice for a word needs no warning: no sheet carries a recorded drawing
for it, `count` is 0 by definition, and US1's rule («sheets that never used the word
are untouched») says nothing changes for existing sheets.
