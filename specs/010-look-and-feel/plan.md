# Implementation Plan: The interface — accessible by default, and finished

**Branch**: `010-look-and-feel` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-look-and-feel/spec.md`

## Summary

Two stylesheets and a pass over six screens.

The visual system already exists and has been reviewed: the component library in
the **Rampa · Design System** project holds `tokens.css`, `components.css` and
eleven previews, and v2 of it was approved on 2026-08-28. So this plan is not a
design exercise — it is lifting an approved system into the application, deleting
the placeholders it replaces, and making the accessibility claim a test rather
than a promise.

The one genuinely new piece of engineering is small and worth naming: **the
contrast ratios become an offline test**. Every pairing the tokens declare is
computed and asserted, so "I measured them once" turns into "they cannot
regress" — which is the difference between a stated target and an enforced one.
G7 has been open since the target was first written down.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 22 LTS, unchanged.

**Primary Dependencies**: `axe-core` and `@axe-core/playwright` as devDependencies
for the accessibility gate. Nothing at run time. No CSS framework, per `006` R10.

**Storage**: Her display preferences live in the settings file beside the vault
root (`006` T083's `settings.json` in the OS application-data directory), never in
the vault — they are hers but they are not part of her professional record, and a
handover must not carry them (FR-820).

**Testing**: `vitest` for the contrast assertions over the token file — pure
arithmetic, offline, no browser. Playwright plus `axe-core` for the per-screen
accessibility gate, both themes, default and largest text.

**Target Platform**: unchanged. The design target is **1366×768**.

**Project Type**: desktop application, existing structure.

**Performance Goals**: no measurable regression in first paint. The system uses no
webfont at run time unless the face is bundled (see research R1), no images, and
no animation on load.

**Constraints**: complete at 1366×768; AA in both themes at every preference
combination; nothing conveyed by colour alone.

**Scale/Scope**: two stylesheets, six screens, roughly twenty components. No new
package and no new dependency at run time.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1.*

| Principle | Verdict | How this design satisfies it |
|---|---|---|
| I · Judgement in Markdown, not code | **Pass, with one thing to move** | A stylesheet is mechanics, not pedagogy, so it belongs in code. But `AxisEditor` currently holds the axis level descriptors — *"pierde el hilo con más de tres cosas"* — which are calibration guidance from `docs/axis-calibration.md` sitting in TypeScript. That is a real violation and it is `006` T096; this feature touches that component, so it fixes it rather than restyling around it |
| II · Deterministic and model-free | **Pass** | No model is consulted about anything visual. The contrast assertions are arithmetic in `core` |
| III · Adapt the how, never the what | N/A | |
| IV · One extraction, N outputs | **Pass, and reinforced** | The interface and the worksheet share typography and palette but remain separate renderers. FR-807 requires they read as one product; it does not merge them |
| V · Barriers, not diagnostic labels | **Pass** | The axis strip shows barriers. There is no diagnosis field to style |
| VI · Every change is traceable | **Pass** | The report view is rebuilt from the same provenance attributes, better presented (FR-826) |
| VII · The draft announces itself | **Pass, and this is where it gets built** | FR-821/822/823. The mark is unmistakable, stated in words, per-page in print, and only sign-off changes it |
| VIII · Feedback is memory, human-routed | **Pass** | The scope question keeps no default (`003` FR-201). The segmented control makes that visible rather than hiding it in a select |
| IX · Content is never instruction | **Pass** | Nothing here reads material. One thing to keep: adapted content is rendered into the report view, so it is escaped, never interpreted as markup |
| Learner data | **Pass** | Preferences are stored outside the vault and excluded from exports (FR-820) |
| Licensing | **Action required** | If Atkinson Hyperlegible is bundled, its licence ships with it. Resolved in research R1 |

**Result: no violations.** One pre-existing violation (T096) is repaired by this
feature rather than inherited.

## Project Structure

### Documentation (this feature)

```text
specs/010-look-and-feel/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1 — the preference model
├── contracts/
│   └── design-tokens.md # what a token guarantees, and what may not be inlined
├── quickstart.md        # Phase 1
└── tasks.md             # Phase 2
```

### Source Code (repository root)

```text
app/ui/src/styles/
├── tokens.css                 # REPLACED, lifted from the design project
└── components.css             # NEW, lifted from the design project

app/ui/src/components/
├── Callout.tsx                # NEW — replaces Notice, four intents
├── DraftMark.tsx              # NEW — the unsigned/signed state
├── Progress.tsx               # NEW — stages and stream
├── EmptyState.tsx             # NEW
├── Badge.tsx                  # NEW
├── Segmented.tsx              # NEW — exclusive choices kept visible
└── Field.tsx                  # NEW — label, help, error, all states

app/ui/src/learners/
├── AxisStrip.tsx              # NEW — ten barriers at a glance
└── AxisEditor.tsx             # descriptors move to the corpus (T096)

app/ui/src/review/
└── ReportView.tsx             # NEW — replaces the <pre> dump (FR-826)

app/ui/src/settings/
└── DisplayPreferences.tsx     # NEW — size, contrast, motion, theme

app/packages/core/src/
└── contrast.ts                # NEW — ratio arithmetic, so the claim is testable

app/e2e/
└── a11y.spec.ts               # NEW — axe over every screen, both themes
```

**Structure Decision**: no new package. The stylesheets are lifted verbatim from
the design project so there is one source of truth for the visual system and a
change can be reviewed as a preview before it reaches a screen. `contrast.ts`
goes in `core` rather than in the UI because it is deterministic arithmetic and
belongs where the offline suite can hold it — the same reasoning that put the
prompt builder there.

## Constitution Re-check (post-design)

| Principle | Before | After |
|---|---|---|
| I · Judgement in Markdown | Pass, one thing to move | **Improved.** The axis descriptors leave TypeScript for the corpus, closing T096. A feature that restyled around them would have made the violation harder to see, not easier |
| II · Deterministic and model-free | Pass | **Pass by construction.** `contrast.ts` is pure and covered by the isolation test like everything else in `core` |
| VII · The draft announces itself | Pass | **Strengthened.** The mark now states its state in words, and the per-page print watermark is already asserted by a test from Phase 11 |
| Licensing | Action required | **Resolved.** Atkinson Hyperlegible is SIL OFL 1.1; bundling it ships `OFL.txt` beside the font and the build fails without it, mirroring the corpus licence rule |

No violations. Two costs accepted:

1. **~90 KB of font.** Two weights, subset, woff2. It buys the identity being
   real rather than aspirational on a machine that does not have the face — which
   is every machine. Judged worth it against a ~150 MB Electron bundle.
2. **The axe gate will fail the build on a real violation**, including
   inconvenient ones. That is the point, and it is the first gate in this project
   that can block a change for a visual reason.

## Complexity Tracking

Empty.
