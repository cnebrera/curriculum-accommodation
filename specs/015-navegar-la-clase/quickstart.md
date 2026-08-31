# Quickstart: proving the caseload is navigable and not a ranking

## Offline

```bash
cd app && npx vitest run packages/core/test/roster.test.ts
```

- forty learners, filtered by course, in stable order
- a learner with no course is findable: unfiltered, and under «sin curso»
- a learner with no school and no age is findable in every view
- the school-year filter uses the **work's** year, so a learner who changed course
  is still found under last year
- combining filters narrows; clearing restores
- **the signature admits no ordering**: `filterRoster` takes no axis and no sort
  key, so a ranking is not expressible

## The assertions that matter more than the features

```bash
cd app && npx vitest run packages/core/test/roster.test.ts -t 'ranking'
```

Principle V, stated as impossibility rather than as intention:

- no exported function in `core/roster` accepts an axis
- no view renders two learners' axis strips as aligned columns (extends `005`
  T019's e2e assertion to the new views)
- no total, average or count of barriers per child appears on the caseload

## End to end

Deferred until asked — the e2e suite launches real windows. It runs with
`RAMPA_TEST=1` so they open inactive and out of the dock, but the honest thing is
still to batch it rather than run it after every change.

## What none of this proves

**SC-1301**: that a named learner is reached in three seconds with two
interactions, by somebody who did not write it. And **SC-1304**: that a reviewer
given the screens cannot construct a ranking from anything the interface offers.
One person, once, and it is the criterion this feature is actually judged on.
