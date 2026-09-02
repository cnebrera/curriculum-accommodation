# Implementation Plan: Los pictogramas tienen su sitio

**Spec**: [spec.md](./spec.md) · **Created**: 2026-09-02

## Technical Context

No new capability at all. Everything `023` and `024` built stays; this is a **move**,
plus the second two-level destination in the shell.

| | |
|---|---|
| Route | `ui/src/nav/route.ts` gains a `settings` section with tabs — the same `reduceRoute` the learner already uses |
| Rail | five top-level entries become four; `Rail.tsx` already becomes the learner's, so it becomes Configuración's the same way |
| Moved | `PictogramSetSection` (full, not `compact`), `ConnectionScreen`, `AboutScreen` |
| Left behind | the switch, the scope, a hint, and one pointer |

**No NEEDS CLARIFICATION.**

## Constitution Check

| Principle | Verdict |
|---|---|
| **I · Judgement in Markdown** | Untouched. No judgement moves into code here |
| **II · Deterministic core** | Untouched |
| **III · Adapt the how, never falsify the what** | Untouched |
| **IV · One extraction, N outputs** | **This is the principle the feature is about.** The set and her vocabulary are one thing used for every learner; storing the *controls* for them inside one learner's page was the same category error as storing her vocabulary per learner, which `024` FR-2214 had just fixed one layer down |
| **V · Functional barriers** | FR-2313: moving the set out must not turn pictograms into a global switch. `018` FR-1605 still forbids an axis from enabling it, and the per-learner decision stays per learner |
| **VI · Traceability** | Untouched |
| **VII · The draft announces itself** | Untouched |
| **VIII · Human-routed memory** | Her vocabulary becoming *reviewable* is `024` FR-2214 finished. It is still only written when she clicks — never inferred |
| **IX · Content is never instruction** | Untouched. The download's guards do not move |

### The gate this feature has to pass

**Nothing that was reachable becomes unreachable** (SC-2305, FR-2306). A move is the
change most likely to silently lose something, and the e2e suite is the specification of
what is reachable — 102 tests, of which the a11y and layout sweeps walk «every screen
the rail reaches». They will break, and that is the signal the move is real.

## Phase 0: Research

None needed. The relevant prior art is in this repository:

- `020` built one two-level destination (the learner) with a tested reducer, precisely
  because two navigation defects had come from state held in the wrong place.
- `020`'s own plan sketched Configuración and its US2–US4 were never built, which is why
  the rail still mixes categories. This feature is the smallest honest slice of that.

## Phase 1: Design

**One reducer, one rail, two destinations.** `route.ts` already models
`{section: 'learners', code, tab}`; Configuración is `{section: 'settings', tab}`. The
rail already renames its own region by contents («Secciones de Rampa» / «Apartados de
Lucía»); a third name is one more branch, not a new component.

```
ui/src/nav/route.ts              + section: 'settings', SettingsTab
ui/src/nav/Rail.tsx              four top entries; Configuración's tabs
ui/src/settings/SettingsSections.tsx   new — the three sections
ui/src/pictograms/PictogramSetSection.tsx   loses `compact`; gains her vocabulary
ui/src/pictograms/LearnerPictograms.tsx     new — switch, scope, hint, pointer
ui/src/learners/ProfileEditor.tsx           the pictogram block shrinks to that
```

**The pointer carries where it came from**, so FR-2304 can return her. That is route
state, which is why it belongs in the reducer and not in a component's `useState` — the
two navigation defects `020` found were both exactly this.

**`compact` goes away.** It existed only to render this inside a form, and a prop whose
one job is «be smaller inside a page you should not be on» is the design defect in
prop form.

## What must not break

| | |
|---|---|
| `018` FR-1605, FR-1606 | Pictograms stay per learner and off by default |
| `020` FR-1801 | Mis alumnos is still the opening screen |
| `023` FR-2107 | Opening Configuración fetches nothing |
| `013` FR-1105 | One primary per screen — and G31 is still open, so this needs looking at rather than trusting |
| `013` FR-1113/1118 | A second level in the rail is a column: look at it narrow and at `xlarge` |
| `010` FR-812 | The active section not by colour alone |
| `e2e/a11y.spec.ts`, `layout.spec.ts` | Both walk «every screen the rail reaches». Their lists change |
