# Implementation Plan: CUR por área

**Branch**: `032-cur-por-area` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-03

## Summary

One decision shapes everything here: **the old single CUR does not migrate — it is
promoted**. A profile that says `axes: { CUR: 2 }` already says exactly what FR-3005
requires it to keep saying: *this is the general value*. So there is no migration of
meaning, no rewrite of files on read, and SC-3002 — zero behaviour change for unmodified
profiles across the whole offline suite — is not a hope, it is the design: the general
value stays **exactly where it lives today** (`axes.CUR`), and the per-area pairs arrive
as a **new, optional, sibling field** that every existing reader ignores and every
existing writer carries through verbatim (`validateWithRepair` already preserves unknown
keys, and `ProfileEditor` already spreads them back on save — that machinery was built
for her hand-written fields, and it is what makes this change safe on an old app too).

The second decision is a refusal: **CUR 2 and 3 are deliberately unquantified**
(«contenidos de cursos anteriores», «muy alejado»), so no code may compute a target year
from a CUR value. What the area's CUR decides is whether the *silent* fallback to the
enrolled course is honest — with the area at 0/1 it is; with the area at ≥2 her own
recorded observation contradicts it, and the one person who can name the level is her.
That keeps P32 intact: she names the course, the corpus defines what it contains, and
nothing here is «the application's own judgement about the child».

And the third is a tripwire, not a feature: **P12 just untied the significant-adaptation
stop from CUR** (the trigger moved from the profile to the request). Per-area CUR must
not quietly re-tie it at finer grain. FR-3006 lands as a structural test on day one, so
any future code path that keys a refusal on any CUR value — general or per-area — argues
with a test instead of shipping.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Electron. No new dependencies.

**Storage**: the vault. One new optional profile field (`cur_areas`), one new vault-level
schema-version marker (P50 / COLA 1.17 — this feature is its first motivating change, so
this feature builds it; COLA 1.17 will cite these tasks rather than duplicate them).

**Testing**: `vitest`, offline. The compatibility test (SC-3002) is written **before any
schema change**, green against today's code, and must stay green untouched.

| Feeds | What it gives |
|---|---|
| `011` · profile | `profileSchema`, `axisLevelOf`, the no-guessing rule (absent ≠ 0) |
| `002` · compose | `targetYear`/`explainTarget` (the chosen → overlay → enrolled chain), `levelFrom`, FR-122/FR-129 as reconciled by P32 |
| `012` · kinds | Subjects as the vault already knows them; no new taxonomy |
| `014` · record | `subject` best-effort on entries (`record/scan.ts:170`) — the suggestion source |
| `017`/`029` · guide | `draftAcns` and `AcnsInput.subject` — the surface FR-3004 corrects |
| `004`/`030` · packets | Profile deltas already travel; per-area CUR rides them (FR-3008) |
| P50 · vault version | Does not exist yet. Built here, in `packages/core/src/vault/` |

**Where the work lands:**

| | What |
|---|---|
| `app/packages/core/src/vault/schema.ts` | `cur_areas` on `profileSchema`; `curFor(profile, area?)` beside `axisLevelOf` |
| `app/packages/core/src/vault/` (new small module) | The vault schema-version marker (P50) |
| `app/packages/core/src/vault/profile.ts` + `record/` | `knownAreas` — the suggestion vocabulary (roster `subjects` + record `subject`s) |
| `app/packages/core/src/compose/level.ts` | The enrolled fallback becomes area-aware; `explainTarget` names the area's gap |
| `app/packages/shell/src/jobs/compose.ts` | The job's area, written to the sheet's front matter as `subject` — an existing reader finally gains a writer |
| `app/packages/core/src/guide/acns.ts` | The desfase section gains its first honest source: the draft's own area's CUR |
| `app/ui/src/learners/ProfileEditor.tsx` (+ `AxisEditor`) | Per-area CUR visible at a glance, editable without ceremony (SC-3004) |
| `instructions/axes.md`, `docs/profile-schema.md` | The corpus note: CUR is the one axis that is a relationship with a subject |

**What is deliberately not touched:** `recipes/index.ts`. No shipped recipe conditions on
CUR (checked: zero occurrences across `recipes/`), so `applies`/`selectRecipes` keep
reading the general value through `axisLevelOf`, unchanged. A future CUR-conditioned
recipe would have to answer «which area?» first — recorded in tasks as a BACKLOG note,
not solved here.

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | What CUR *means* per level stays in `instructions/axes.md`; what a gap «en esa área» implies for an ACNS stays in `instructions/guide.md`. Code gains only mechanics: a field, a lookup, a fallback. The sentence explaining why the enrolled course is asked about is corpus/i18n, not a string born in `compose.ts` |
| **II** · deterministic core | A record lookup with a fallback. No model anywhere in this feature; every test offline |
| **III** · adapt the how | **The feature exists to stop a falsification**: composing Lengua below a child who reads fine is changing the *what* invisibly. Per-area CUR is the datum that prevents it |
| **IV** · one extraction, N outputs | Not engaged. No pipeline changes; the sheet's front matter gains one field an existing reader already parses |
| **V** · barriers not diagnoses | **This is Principle V catching up with its own justification** («one learner needs different things in different subjects»). Areas are subjects, never diagnostic categories; the functional axes stay per-learner (FR-3002), because they travel with the child |
| **VI** · traceability | The compose report says which area's CUR was consulted and whether it was the per-area value or the general fallback — «composing at a stated level is a different act from quietly lowering someone's worksheet, and the difference is who decided» |
| **VII** · draft announces itself | Not engaged. No rendering or sign-off changes |
| **VIII** · human-routed memory | A per-area value is an observation **she** records, with `011`'s honesty rules: nothing invented for areas nobody assessed, absent means fallback and never zero |
| **IX** · content is never instruction | Area names come from her roster and her records — but a record's `subject` was read out of a worksheet somebody else wrote, so suggestions render as **text** (the rule `RecordScreen` already keeps) and near-duplicates are *flagged*, never auto-merged: a silent merge is content deciding structure |

**Gate: passes.** Two reservations recorded rather than resolved:

**SC-3004 needs a teacher.** Whether «bien en Lengua, dos cursos en Mates» takes under a
minute is measurable; whether the phrasing on the screen is *her* phrasing is not
answerable here.

**The general value can now be stale in a new way.** Once she details Mates and Lengua,
the general keeps covering inglés and música — which may be exactly wrong for the
specialist-gap case the review named. This feature makes that visible (the editor shows
what the general still covers); deciding more than that would be inventing observations
(`011`'s no-guessing), so it stays her call.

## Phase 0 · Research

[research.md](./research.md) — five questions. R1 (the YAML shape) is the one that makes
SC-3002 structural rather than aspirational: putting the pairs *inside* `axes` would make
an old app set the **whole** `axes` field aside on parse — every recipe off, silently —
which is the exact catastrophe `validateWithRepair`'s field-level repair semantics would
inflict on a nested change. A sibling field costs nothing and is carried verbatim.

## Phase 1 · Design

- [data-model.md](./data-model.md) — `cur_areas`, `curFor`, the vault version marker, and
  what deliberately gains no field.
- [quickstart.md](./quickstart.md) — the walks: compatibility first, everything offline,
  the teacher last.

## Sequencing

**The compatibility test before the schema change.** SC-3002 promises the old semantics
are provably the fallback; a baseline written after the field exists is written to fit
what the field already does. It is green on today's code first, and never edited after.

**The tripwire lands in the foundational phase, not the polish phase.** FR-3006 guards
against a *future* regression; the moment per-area CUR exists is the moment someone can
first be tempted to key a stop on it.

**The vault version marker before the first write.** FR-3005 says writing a per-area
value upgrades the profile under the schema version — so the marker (P50) must exist
before the writer does, which is also COLA 1.17's own stated ordering.

**US1 before US2.** The material-level correctness is the daily value; the normative
phrasing rides on the same `curFor` and the same area vocabulary, and US2's fixtures are
cheaper to write once US1's profiles exist.
