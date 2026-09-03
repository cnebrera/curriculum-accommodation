# Implementation Plan: Lengua vehicular en adquisición

**Branch**: `033-lengua-vehicular` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-03

## Summary

One structural decision decides most of this feature: **the mark lives beside the
axes, not inside them, and it activates recipes by itself.**

Beside, because it has semantics no axis has — it is transitory by design, expected
to expire by observation, and a profile representation that cannot say «he is
progressing out of this» teaches the tool to keep a bilingual child in scaffolding he
has outgrown. The schema already holds the precedent: `pictograms` is profile state
beside the axes, dated, hers. The mark takes the same shape (research R1).

By itself, because PROD-07's two failure modes are the same failure seen from both
sides: a falsified profile (LIN:3 forcing adaptations that are not his) or an empty
one that activates nothing. A `marks:` condition in recipe front matter, satisfied by
the mark's 0–3 intensity, makes a mark-only profile select real recipes — **closing,
for this case, the empty-selection stop that P1 decided** (research R2). The stop
itself is untouched; this case simply never reaches it.

The recipes are corpus files in Spanish (P28), mono-condition (P1's own decision
applied to a mark instead of an axis), and the code changes are mechanics only:
parse a second condition list, read one new profile block, print one new report
grouping. Nothing in `app/` says how to adapt for a child acquiring the language —
that text is the three recipes, and a teacher can correct every word of it.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Electron. No new dependencies.

**Storage**: the vault. One new optional block in `profile.yaml` (`vehicular`), with
repair semantics like every other field. No new file.

**Testing**: `vitest` for schema, selection, gloss lookup and prompt; the existing
completeness gate for SC-3102; a structural grep-test for FR-3102; Playwright for
the profile editor walk.

| Feeds | What it gives |
|---|---|
| `011` · who the learner is | The no-guessing rule this feature sharpens: absent rather than inferred, and nothing derived from name or origin |
| `018`/`023`/`024` · pictograms | The local set, its per-language metadata (`pictograms.<lang>.json`), the download flow, and the rule that no axis — and now no mark — enables pictograms |
| `001`/`012` · adaptation | `selectRecipes`, `buildAdaptPrompt`, `buildReport`, the completeness gate SC-3102 runs through |
| `004`/`030` · packets | The mark travels as profile data, like any observation |
| P1, P27, P28, P44 | AND kept + mono-condition recipes; declared conflicts; corpus in Spanish; real dates |

**Where the work lands:**

| | What |
|---|---|
| `app/packages/core/src/vault/schema.ts` | The `vehicular` block, beside `pictograms` |
| `app/packages/core/src/recipes/index.ts` | `marks:` conditions; `applies` and `isGuard` learn about them |
| `app/packages/core/src/pictograms/bridge.ts` | New: deterministic gloss lookup across the set's languages, joined on pictogram id |
| `app/packages/core/src/prompt/adapt.ts` | The mark's section and the resolved-glosses-only data |
| `app/packages/core/src/report/index.ts` | Vehicular supports attributed to the mark, distinguishable (FR-3108) |
| `app/ui/src/learners/ProfileEditor.tsx` | The mark, edited beside the axes, dated at save |
| `recipes/core/` | Three new recipes, in Spanish, `reviewed_by_teacher: false` |
| `instructions/axes.md`, `instructions/hard-rules.md` | The dated LIN boundary (FR-3103); rule 12 amended for the refusal (FR-3109) |
| `scripts/validate-recipes.sh` | The `marks:` grammar; accepts «Anti-patrones» |

**Whether it renders as «eje» or «marca»**: the spec left the widget to the plan. It
renders as its own control beside the axes — same 0–3 interaction the teacher already
knows from `AxisEditor`, its own heading, level descriptions read from the corpus.
Not a row inside the axis list: visually filing it under the barriers would say
«disability» on screen, which is FR-3108's concern arriving one screen earlier.

## Constitution Check

| Principle | How |
|---|---|
| **III** · adapt the *how*, never falsify the *what* — **first, because it is this feature's sharpest edge** | Simplified *transitional* wording is the recipe most likely to shave curriculum while looking helpful. FR-3105 puts Principle III in each recipe's own text; **SC-3102 runs through the completeness gate that already exists** — zero curricular elements absent relative to source, the same check every adaptation passes, no new gate and no exemption. And FR-3109 is this principle applied to translation: a full translation is an unverifiable substitution of the *what*'s carrier, so it is refused with the reason, never performed |
| **I** · judgement in Markdown | What visual support means, which words get a bridge, how far wording simplifies per intensity — all in three recipes and two instruction amendments a teacher can edit. The code parses one new front-matter key and reads one new profile block; it decides no pedagogy |
| **II** · deterministic core | The gloss lookup is a pure join over metadata already on disk. Schema, selection, prompt assembly, report: no model, no network, offline tests. Only the adaptation itself spends money, as today |
| **IV** · one IR, N outputs | Nothing modality-specific. Glosses and visual supports are IR content; every renderer renders them |
| **V** · barriers not diagnoses | The mark describes a functional relationship (instruction arrives in a language he is acquiring), not an origin, a nationality or a category. FR-3102 sharpens `011`: **language is never inferred from name, origin or anything else**, and the tripwire test is written first |
| **VI** · traceability | Vehicular changes record `recipe@version` and the mark that activated them, like every change. FR-3108 makes the attribution *distinguishable*: the report groups transitional supports so his record never reads as if a disability was observed |
| **VII** · draft announces itself | Untouched — same pipeline, same mark, same sign-off |
| **VIII** · human-routed memory | Corrections on vehicular material ask the scope like any correction. Lowering the intensity is her observation, dated as observed (P44) |
| **IX** · content is never instruction | Glosses are **data the code resolved**, not text the model produces: the prompt carries only the resolved list, and no-bridge is a fact the code states, never a judgement delegated to the model. The bridge language names come from the profile she wrote, through the same schema-with-repair path as everything else |

**Gate: passes.** Two reservations recorded rather than resolved:

**SC-3104 needs a teacher — ideally with interculturalidad experience.** Whether the
week-one sheet is usable with a late-incorporation child is not answerable in this
repository, and the recipes ship `reviewed_by_teacher: false` until a person with
AL/interculturalidad background disagrees with something concrete in them.

**Amina's Arabic glosses are not day-one, and the plan says so.** The publisher
declaration in `instructions/pictograms.md` names seven languages — `[es, en, ca,
gl, eu, fr, pt]` — and the download refuses any other. Extending it is a corpus edit
gated on checking the live API (research R3), and until then the supports degrade to
visual-only **with the report saying so**, which is FR-3106 doing exactly its job.
The feature's promise is «no invented gloss, ever», not «every language, now».

## Phase 0 · Research

[research.md](./research.md) — four questions. R3 is the one that corrected the
spec's assumption against the code: ARASAAC-the-service carries many languages, but
the set on disk carries only what she downloaded, one metadata file per language,
and the corpus caps what is downloadable at seven European languages today.

## Phase 1 · Design

- [data-model.md](./data-model.md) — the `vehicular` block, `MarkCondition`,
  `BridgeGloss`, and what deliberately gains no field.
- [quickstart.md](./quickstart.md) — the walks, tripwire first, offline before
  money, the teacher's verdict last.

## Sequencing

**The tripwire before anything can trip it.** FR-3102's test — no path infers a
language from name, origin or anything else, asserted behaviourally and by
structural grep — is written first, red against nothing, so every later task lands
inside it. `021` wrote the answer-key test first for the same reason: the check
written after the feature works is a check written to fit what already happens.

**The mechanics before the corpus can activate.** Schema, `marks:` parsing and
selection (Phase 2) block the recipes: a recipe keyed on a condition the parser
cannot read is silently never selected, which is this project's most repeated
defect shape (the unread field).

**US1 before US2.** The mark producing a real adaptation is the week-one need;
scaling down is what makes May honest. And US2's monotonic test exercises the same
selection US1 builds.

**The refusal lands with the recipes, not after them.** FR-3109's boundary — bridge
vocabulary yes, full translation no — is written into the recipes' own text and
into hard rule 12 in the same phase the recipes ship, because a recipe that asks
for bridges without stating the boundary is an invitation to cross it.
