# Data model

One new optional field on the profile, one helper beside `axisLevelOf`, one vault-level
version marker. The general CUR **does not move** — that immobility is the design
(research R1): every existing reader keeps reading it, and SC-3002 is structural.

## `cur_areas` — the pairs, beside the axes and never inside them

```yaml
# profiles/<code>/profile.yaml
axes:
  CUR: 2            # unchanged: the general value, same key, same 0–3, same meaning
cur_areas:          # new, optional
  Matemáticas: 2
  Lengua: 0
```

In `profileSchema` (`app/packages/core/src/vault/schema.ts`):

```ts
/**
 * CUR per area (032 FR-3001). Keys are subject names as the vault knows
 * subjects (roster `subjects`, record `subject`) — free-named, no taxonomy.
 * Values are the same 0–3 as `axes.CUR`, same calibration, same corpus.
 *
 * Optional and a SIBLING of `axes`, never inside it: a nested change would make
 * an old app's repair set aside the whole `axes` field — every recipe off,
 * silently. As an unknown sibling key it is carried verbatim instead (research R1).
 */
cur_areas: z.record(z.string(), axisLevel).optional(),
```

### Rules

**An absent pair means fallback, never zero.** The lookup is one helper, used by every
consumer, so the fallback cannot be re-derived differently twice:

```ts
/** The CUR that governs one area: the pair, else the general, else unobserved. */
export function curFor(
  p: Pick<Profile, 'axes' | 'cur_areas'>,
  area?: string,
): 0 | 1 | 2 | 3 | null;
// curFor(p, 'Matemáticas') → 2      (the pair)
// curFor(p, 'Inglés')      → 2      (no pair → the general)
// curFor(p)                → 2      (no area → the general)
// with no general either   → null   (unobserved — NEVER 0)
```

`null` keeps `011`'s rule: nothing is invented for areas nobody assessed, and 0 remains
an assertion («al nivel de su curso») a person made.

**The old single value IS the general (FR-3005).** A profile with only `axes.CUR` is not
an old format — it is the current format with no areas detailed. Reading performs no
migration; `curFor` over such a profile returns the general for every area, which is
bit-for-bit today's behaviour.

**Exact-string keys.** «Mates» and «Matemáticas» are two keys if both exist — the flag
against that happens at *entry time* in the editor (FR-3007), never by canonicalising
stored data. Stored data is hers.

**Only CUR (FR-3002).** No `areas` map appears on any other axis, no generic
`axes_by_area` structure exists, and `curFor` is CUR's alone. The functional axes
describe barriers that travel with the child between subjects; a per-area DEC would be a
category error in the opposite direction — asserted by test, because the temptation is
structural.

## The job's area

**No new field.** The compose flow writes the area she picked into the sheet's front
matter as `subject` — the key `record/scan.ts:170` has read best-effort since `014`, and
`AcnsInput.subject` already receives for guide drafts. An existing reader gains a writer.
A job with no `subject` composes against the general CUR: fallback, never a refusal.

## What the level derivation gains — and refuses

`TargetSource` gains **no new case**: her answer to the area-aware question arrives as
`she-chose`, the overlay stays the overlay, `enrolled` stays the record nobody chose.
What changes is around the `enrolled` fallback (research R3):

| `curFor(profile, jobArea)` | `enrolled` fallback |
|---|---|
| 0 · 1 · `null` | stands, as today |
| 2 · 3 | the screen asks her first; declining still composes at `enrolled`, and `explainTarget` names **this area's** gap |

**Refused, permanently: no arithmetic from CUR to a year.** CUR 2 does not mean
«enrolled − 2»; it means «cursos anteriores», count unknown. A computed year would be an
invented number on the one property of composed material a teacher cannot check at a
glance.

## The vault schema version (P50 / COLA 1.17)

```yaml
# .rampa/vault.yaml
schema: 2
```

- **Absent file ⇒ version 1.** Every existing vault is versioned without being touched.
- **Version 2 ⇒ profiles may carry `cur_areas`.** One integer, monotonic.
- **Bumped on the first write of a per-area value** — never on read, never on install
  (FR-3005). A vault she never details areas in stays at 1 forever, honestly.
- Read/written by one module in `packages/core/src/vault/`; packets state the version
  they were written under (research R4), so an older receiver gets a sentence instead of
  a silent difference.

## What deliberately gains no field

| | Why |
|---|---|
| Per-area anything on DEC, ATE, COG, REG, PER, LIN, EJE, MOT | FR-3002. Functional barriers travel with the child; the spec exists to make CUR the *only* exception |
| Area on `notes`, `works`, `avoid` | The review noted they also lack area — real, separate, and «folding it in here would triple the surface for a datum nobody asked to split yet» (spec Assumptions) |
| A per-area *target year* in the profile | The overlay already carries a stated level for the recurring (ACS) case; a second stored level goes stale against the first |
| An upward/enrichment direction | P9 is future. The shape (a record of 0–3) does not preclude widening the value type later; nothing here builds it |
| A canonical area list | The refused taxonomy (spec Key Entities). Suggestion vocabulary is derived from roster + record at read time, stored nowhere |
| Any CUR-derived flag for the significant-adaptation stop | FR-3006. The stop is request-keyed (P12); this table row is the reminder and a test is the enforcement |
