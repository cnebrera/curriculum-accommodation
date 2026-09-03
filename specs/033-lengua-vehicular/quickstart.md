# Quickstart — proving the mark adapts without falsifying anything

Ordered so the tripwire is checked before anything can trip it, everything offline
before anything spends money, and the verdict only a person can give comes last.

## Prerequisites

```bash
cd app
npm ci
npm test          # typecheck + the whole offline suite
```

A vault with one learner whose profile carries **only the vehicular mark** — no
axis observed. That is Amina in February, and it is the profile that today produces
either nothing or a lie.

---

## §1 · The tripwire, first

```bash
npx vitest run packages/core/test/no-inferred-language.test.ts
```

Both halves of FR-3102 / SC-3103:

- **Behavioural**: profiles with names-in-notes, interests, origins-in-free-text —
  no prompt, no gloss lookup and no report ever contains a language the profile's
  `vehicular.languages` does not name.
- **Structural**: a grep over `app/` asserting no source maps names, countries or
  nationalities to languages, and that `vehicular.languages` is read from
  `profile.yaml` and nowhere else.

Written first, red against nothing, so every later task lands inside it. A check
written after the feature works is a check written to fit what already happens.

## §2 · Offline · the mark selects, the axes' rules hold

```bash
npx vitest run packages/core/test/mark-selection.test.ts
```

| Case | Expected |
|---|---|
| Mark at 2, no axis observed | the vehicular recipes, selection non-empty (SC-3101; this case's P1 stop never fires) |
| Mark absent | nothing vehicular — absent is *not observed*, never 0 |
| Mark at 0 | nothing vehicular, and the block still present with its date |
| Mark at 2 + ATE:2 | vehicular and ATE recipes compose; conflicts, if declared, resolve in the recorded order |
| Mark at 3, no DEC, no LIN | `lectura-facil-es` is **not** selected — not by side effect, not at all |
| A recipe with `axes: []` and `marks: [vehicular>=1]` | an adaptation, **not** a guard |

## §3 · Offline · glosses come only from the set

```bash
npx vitest run packages/core/test/bridge.test.ts
```

- A word whose pictogram id has keywords in the bridge language → the gloss, with
  the id that joins them.
- Bridge language not downloaded → `language-not-in-set`, zero glosses, and the
  degradation named for the report.
- No languages in the profile → the lookup is not even consulted; the prompt has
  **no gloss section at all**, not an empty one.
- The prompt's gloss data is exactly the resolved list — nothing else gets in.

## §4 · Offline · intensity scales down, the WHAT never moves

```bash
npx vitest run packages/core/test/vehicular-intensity.test.ts packages/core/test/completeness*.test.ts
```

Same fixture source at intensities 3, 2, 1, 0: the applied supports decrease
monotonically, at 0 nothing vehicular applies (FR-3107) — and at every level the
**existing completeness gate** finds zero curricular elements absent (SC-3102).
No new gate, no exemption: the same check every adaptation passes.

## §5 · Offline · the report tells the truth about why

- Vehicular supports grouped under their own heading, attributed to the mark,
  distinguishable from disability-driven changes (FR-3108) — his record never
  reads as if a disability was observed.
- Where the bridge degraded to visual-only, the report says which language and why
  (FR-3106).
- A request for full translation is refused **with the reason**, citing the
  amended rule 12 — a refusal with an argument, not a silent omission (FR-3109).

## §6 · With a window · the profile editor

```bash
npm run build && RAMPA_TEST=1 npx playwright test e2e/vehicular-mark.spec.ts
```

1. The mark is edited **beside** the axes — its own control, never a row in the
   barrier list.
2. Setting it writes `noted_on` with today's date; lowering it re-dates. Real
   dates, both times (P44).
3. Recording a known language is typing or picking a language **she** names —
   nothing pre-filled, nothing suggested from any other field.
4. Enabling pictograms remains **her separate click** (`018` SC-1603); the screen
   may point at the setting, never press it.
5. The mark appears in handover and coordination packets as profile data, dates
   intact (FR-3110).

## §7 · Looked at, not asserted

```bash
npm run shots
```

Open them. The mark's control beside the axes — does it read as «something
temporary about language», or does it look like an eleventh barrier? And a
week-one sheet at intensity 3: is the visual support *usable*, or decoration?

## §8 · The one that costs money

Adapt the fixture ficha de naturales for the mark-only profile, with a set that has
`es` only:

1. Transitional supports visible — short direct sentences, visual structure on
   instructions. Not a copy (SC-3101).
2. The report: supports attributed to the mark; glosses degraded to visual-only
   **and it says so**; nothing invented.
3. Then download a second metadata language, re-run, and watch glosses appear —
   from the set, with pictogram ids to point at.

## §9 · The verdict I cannot produce (SC-3104)

Give a PT with a late-incorporation learner the week-one sheet, no preamble, and
ask whether she would use it with the child — ideally a PT with interculturalidad
experience, because the supports' pedagogical fit is not answerable in this
repository. The recipes stay `reviewed_by_teacher: false` until someone with
AL/interculturalidad background disagrees with something concrete in them; «why
not» is worth more than the answer.
