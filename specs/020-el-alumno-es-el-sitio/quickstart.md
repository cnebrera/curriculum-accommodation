# Quickstart — proving the navigation

Ordered so that everything checkable offline is checked before anything spends money.

## Prerequisites

```bash
cd app
npm ci
npm test          # typecheck + the whole offline suite
```

A vault with **at least three learners** and one job already adapted. The e2e fixtures
build this; for the by-hand walks, use your own vault.

---

## §1 · Offline, no key, no window (the route)

```bash
npx vitest run ui/test/route.test.ts
```

The reducer answers these on its own, and each is a defect this project has already had
or is one move away from:

| Case | Why it is here |
|---|---|
| Entering a learner from the caseload lands on a **section**, never on nothing | A route with no tab is a blank panel |
| Pressing the current section returns to its start | FR-1809, shipped broken once |
| Changing learner mid-flow does not carry the previous learner's job | The door forgot the child; this is the same class of defect |
| `also` always contains the entered learner | FR-1811/`016` FR-1411, enforced by the reducer rather than by a screen |
| A flow cannot exist outside `prepare` | The type forbids it; the test proves the type is doing it |
| Nothing is persisted | Restart lands on the caseload |

## §2 · Offline, with a window (the shape)

```bash
npm run build && RAMPA_TEST=1 npx playwright test e2e/nav.spec.ts
```

1. The application opens on **her caseload**, not on a question about work.
2. Two top-level destinations. Not three.
3. Picking a learner shows their name and their sections.
4. **`Lo que le he preparado` is reachable without opening the profile editor** — the
   assertion this whole specification exists for.
5. Every section is reachable by keyboard alone, and announces which section it is.
6. The active section is distinguishable with colour removed.

## §3 · Offline (what must not have broken)

```bash
RAMPA_TEST=1 npx playwright test e2e/group.spec.ts e2e/record.spec.ts e2e/erasure.spec.ts
```

- No screen signs two sheets with one action (`005` FR-512).
- No screen shows two learners' axes as aligned columns (`015` FR-1310) — including the
  grouped view, which is the one that would grow a column.
- Erasing a learner from inside that learner lands somewhere that still exists.
- `017`'s refusals still refuse after the move: ask which objectives to remove, and it
  still declines and still names who decides.

## §4 · Offline (accessibility, every destination)

```bash
npm run test:a11y
```

Zero violations on each destination, old and new. The list of screens this walks is
**two plus the learner's sections** now, not five — a stale list here is a screen
nobody checks.

## §5 · Looked at, not asserted (`013` FR-1113/FR-1118, SC-1805)

```bash
npm run shots
```

Then open them. Specifically:

- The narrowest width the shell allows, **with the text scale at `xlarge`**. Three
  columns is the failure; the menu must have become a strip.
- A learner with nothing prepared: the empty state reads as *not yet*, never as a fault.
- A learner with thirty items in their record.
- The unfinished marker in a caseload of thirty.

## §6 · The one that costs money (last, deliberately)

Connect a service, then from inside a learner:

1. `Preparar` → adapt → bring a Word file → check the reading → **who else: add two** →
   three sheets.
2. Confirm the cost was stated **once, for the batch**, before it ran (`005` FR-514).
3. Sign one. Confirm the other two are still unsigned.
4. Leave a flow midway after the provider was paid: it says what was spent and does not
   block.
5. Correct the reading afterwards → the two other sheets are named as stale
   (`005` FR-520, yesterday's work, still working after the move).

## §7 · The verdict I cannot produce (SC-1803)

Put it in front of a teacher who has not seen Rampa, say nothing, and watch whether she
finds *prepare something for this child*.

**Collectable once.** The second time she looks she already knows where it is, so if
this is done badly the criterion is spent. Do not narrate the interface first, do not
ask «where would you click?» — give her a worksheet and a child and let her go.

If she does not find it, the model is wrong and not the implementation. That is the
outcome worth knowing, and it is why this is the last section rather than an appendix.
