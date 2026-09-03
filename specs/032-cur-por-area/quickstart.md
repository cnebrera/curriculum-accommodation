# Quickstart — proving the desfase lives where the desfase lives

Ordered so the promise to existing vaults is checked before anything changes, and the
person is asked last. Everything here is offline (Principle II) — nothing in this feature
calls a model.

## Prerequisites

```bash
cd app
npm ci
npm test          # typecheck + the whole offline suite, green BEFORE starting
```

A vault with one learner whose profile carries only the old single `axes.CUR` — every
vault in existence is in this state, which is the point.

---

## §1 · The test to write first — the old semantics, pinned

```bash
npx vitest run packages/core/test/cur-compat.test.ts
```

Written against **today's code**, green **before** `cur_areas` exists, and never edited
after (SC-3002). It pins what an unmodified profile does: `axisLevelOf` over CUR, recipe
selection, the prompt's axis line, the presentation map in `print.ts`, and a load→save
round-trip that changes nothing on disk. A baseline written after the field exists is
written to fit what the field already does — the same reason `021` wrote the answer-key
test before the key was printable.

## §2 · Offline · the lookup

```bash
npx vitest run packages/core/test/cur-areas.test.ts
```

| Case | `curFor(profile, area)` |
|---|---|
| Pair exists for the area | the pair's value |
| No pair for the area | the general — **fallback, never zero-by-omission** |
| No area given | the general |
| No pair, no general | `null` — unobserved, and recipes keyed on it stay off |
| Old profile (only `axes.CUR`) | the general for every area — bit-for-bit today |

Plus the structural ones: **no other axis has area machinery** (FR-3002), and an old-app
simulation — parse a profile with `cur_areas` through the schema minus the field — keeps
the whole `axes` record intact and carries `cur_areas` verbatim through a save.

## §3 · Offline · Marco composes at two levels

```bash
npx vitest run packages/core/test/compose-level-by-area.test.ts
```

One profile: `CUR` general 2, `cur_areas: {Matemáticas: 2, Lengua: 0}`.

1. Compose for **Lengua**: the enrolled course stands quietly — his own observation says
   he is at level there. Nothing about Lengua treated as delayed, in the level, the
   report or the prompt line.
2. Compose for **Matemáticas** with no chosen year: the enrolled fallback is *not*
   silent — the ask fires, and `explainTarget` names the Mates gap, not a generic one.
3. She answers a year: it is `she-chose`, corpus bounds attach (FR-122), P32 intact.
4. She declines: it still composes at enrolled — **asking is never blocking** — and the
   report says nobody chose the level.
5. Compose for **inglés** (no pair): the general applies. Fallback, never zero (SC-3001).
6. **The tripwire (FR-3006)**: no code path keys a refusal on any CUR value, per-area or
   general — asserted as an absence, the way `021` asserted `jobs/compose.ts` reaches for
   `runAdaptation` nowhere. The stop stays request-keyed (P12), in the corpus.

## §4 · Offline · the normative surfaces speak per area

```bash
npx vitest run packages/core/test/acns-gap-by-area.test.ts
```

Fixtures per SC-3003: one learner, two areas, different CURs. The ACNS draft for
Matemáticas cites the Matemáticas gap; the one for Lengua cites Lengua's — and where
Lengua is at 0, nothing suggests an ACNS for it. The general is cited **only** where no
pair exists, and the draft says which it used. `acns.ts`'s «desfase curricular is not
sourceable» sentence survives for areas nobody assessed — named as missing, not filled.

## §5 · Offline · the packets, both directions

```bash
npx vitest run packages/core/test/packet-cur-areas.test.ts packages/shell/test/
```

- Export (004 handover, 030 coordination): the pairs travel as profile data, name-free,
  each an individually acceptable item on import; the packet states its vault schema
  version.
- Import on a **current** app: pairs land with provenance, per item.
- Import simulated on an **older** schema: `cur_areas` carried verbatim, general value in
  effect, and the version mismatch produces a sentence, not a silence.
- The vault marker itself: absent file reads as version 1; the first per-area write bumps
  it; a read never does.

## §6 · With a window · recording it without ceremony

```bash
npm run build && RAMPA_TEST=1 npx playwright test e2e/cur-areas.spec.ts
```

1. Open Marco's profile: the CUR row shows the general **and** the pairs at a glance.
2. Add an area: suggestions come from her roster subjects and his record — typing
   «Mates» with «Matemáticas» known gets a flag and a choice, and **her spelling wins if
   she insists**. No silent merge, no silent rename (FR-3007).
3. Set Matemáticas 2, Lengua 0, save. The vault file is readable by eye; the marker
   bumped; reopening shows the same values.
4. A profile she never touches: zero writes, vault stays version 1.

## §7 · Looked at, not asserted

```bash
npm run shots
```

Open them. The profile screen with three detailed areas at the narrowest width and at
`xlarge` — the question is whether the general-plus-pairs reads as one fact about one
axis or as clutter, which no assertion can answer.

## §8 · The verdict that needs a teacher (SC-3004)

Sit a teacher at the profile screen and say only: «apunta que va bien en Lengua y lleva
dos cursos de desfase en Mates». Time it — under a minute is the criterion — and keep her
words for the labels. This is the axis a tutor updates after an evaluation; if it has
ceremony, it will simply not be updated, and the general value will quietly govern
everything again.
