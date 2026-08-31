# Contract: filtering a caseload

```ts
interface RosterFilter {
  course?: string;      // an `011` year id, or the sentinel below
  stage?: string;
  school?: string;
  schoolYear?: string;  // from the work, not the profile
}

/** The explicit "field absent" value. */
const UNSET = '__sin__';

function filterRoster(
  rows: readonly LearnerRow[],
  filter: RosterFilter,
  workedIn?: (code: string) => readonly string[],
): LearnerRow[];
```

## Guarantees

| | |
|---|---|
| **Stable order** | The output preserves the input's order. There is no sort argument, and adding one would be a change to this contract |
| **No axis** | The signature admits no axis and no ordering. A ranking is not expressible |
| **Findable when empty** | `UNSET` matches a learner whose field is absent. A missing field never removes a child from every view |
| **Pure** | No IO, no clock, no state. Forty rows, deterministic |
| **Nameless** | Takes codes. Name matching happens in the renderer, in memory (`014` FR-1207) |

## Why `UNSET` is a sentinel rather than `undefined`

`{ course: undefined }` means "do not filter by course". `{ course: UNSET }` means
"show me the learners with no course recorded". They are different questions, and
conflating them hides exactly the learners she added in a hurry — which are the
ones who needed something tomorrow.

## What this contract refuses

No `sortBy`. No `limit`. No `groupBy` — grouping is a rendering decision made from
the same filtered rows, and pushing it in here would be the first step toward a
view that can order children.
