# Tasks: The interface — accessible by default, and finished

**Input**: Design documents from `specs/010-look-and-feel/`

**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included, and two of them are the point. The contrast arithmetic turns
a stated target into an enforced one, and the axe gate is the first check in this
project that can block a change for a visual reason.

**Organization**: By user story.

> **The visual system already exists and is approved.** `tokens.css` and
> `components.css` are lifted verbatim from the **Rampa · Design System** project
> (v2, 2026-08-28). This feature is not a design exercise — it is landing an
> approved system, deleting the placeholders it replaces, and making the
> accessibility claim testable.

---

## Phase 1 · Setup

- [x] T001 Add `axe-core` and `@axe-core/playwright` as devDependencies in `app/package.json`, and an `npm run test:a11y` script. No runtime dependency is added
- [x] T002 Add the bundled typeface: `app/ui/src/assets/fonts/` with Atkinson Hyperlegible regular and bold as subset woff2, plus `OFL.txt`, and `@font-face` rules in `tokens.css`. Make the build fail if `OFL.txt` is absent, mirroring the corpus licence rule (research R1) *(47 KB for both weights, better than the 90 KB estimated — and the real OFL from the Braille Institute, not a placeholder)*
- [x] T003 Assert the font licence ships, in `app/packages/shell/test/build-layout.test.ts` — a bundled face without its licence is a distribution defect, and this project already has that check for the corpus

**Checkpoint**: `npm run build` succeeds and the font files are in the bundle with their licence.

---

## Phase 2 · Foundational — blocks every user story

- [x] T004 Lift `tokens.css` verbatim from the design project into `app/ui/src/styles/tokens.css`, replacing the current file
- [x] T005 Lift `components.css` verbatim into `app/ui/src/styles/components.css` and import it from `app/ui/src/main.tsx`
- [x] T006 Implement contrast arithmetic in `app/packages/core/src/contrast.ts`: relative luminance and WCAG ratio, plus the `PAIRINGS` declaration from data-model.md *(the arithmetic was duplicated in `render/photocopy.ts`; the two copies collided at the export and are now one)*
- [x] T007 Write `app/packages/core/test/contrast.test.ts` asserting every pairing in all four palettes — light, dark, high-contrast light, high-contrast dark. The failure message MUST name the pairing and its measured ratio, because "contrast failed" is not actionable. Include a count assertion so a role added without its row is caught *(**found two real defects on its first run** — see validation.md)*
- [x] T008 [P] Implement `app/ui/src/components/Field.tsx` — label, help, error and ok states, with the message associated via `aria-describedby` (FR-814)
- [x] T009 [P] Implement `app/ui/src/components/Callout.tsx` with four intents, replacing `Notice.tsx`, and migrate its call sites
- [x] T010 [P] Implement `app/ui/src/components/Badge.tsx`, `Segmented.tsx`, `EmptyState.tsx` and `Progress.tsx`

**Checkpoint**: `npm test` passes including the contrast assertions; the app builds and renders with the new system.

---

## Phase 3 · User Story 1 — it reads as a serious professional tool (P1) 🎯 MVP

**Goal**: No screen is a placeholder, and the whole interface is one system.

**Independent test**: `grep -rn "<pre" app/ui/src` returns nothing in a screen, and every screen is complete at 1366×768.

- [x] T011 [US1] Build `app/ui/src/review/ReportView.tsx` from `buildReport()`'s structures rather than its markdown, grouped by decision and leading with what was not done (FR-826, research R4). Report text is rendered as **text, never markup** — it is model output derived from third-party material
- [x] T012 [US1] Replace the `<pre>` dumps in `ReviewScreen.tsx` with `ReportView`, and the checklist dump with a designed disclosure
- [x] T013 [US1] Rebuild `app/ui/src/learners/AxisStrip.tsx` — ten barriers at a glance, bars **and** number **and** word, with unobserved as dashed and empty because it is not zero
- [x] T014 [US1] Move the axis level descriptors out of `AxisEditor.tsx` into the corpus and read them from there, closing `006` T096. They are calibration guidance from `docs/axis-calibration.md` living in TypeScript, and this feature touches the component — restyling around a Principle I violation would make it harder to see, not easier
- [x] T015 [US1] Restyle `AdaptScreen`, `LearnersScreen`, `NotesScreen` and `AboutScreen` against the system, with every empty state designed and each saying what to do next (FR-828) *(done: `LearnersScreen` rebuilt with the axis strip, skeleton loading and a designed empty state; `AboutScreen` rebuilt with the wordmark as its `h1` — it had none — and the licences, including the SIL OFL. The remaining `<pre>` is `.licence`, a legal notice whose line breaks are part of the document.)*
- [x] T016 [US1] Restyle the onboarding steps, and add the wordmark and mark as `app/ui/src/components/Logo.tsx` — inline SVG, one colour, with the 16px variant drawn separately rather than scaled *(done. Also found: the onboarding buttons were still on the v1 `.primary` class the v2 system dropped, so they rendered at 22px of browser default. See T031.)*
- [x] T017 [US1] Add the layout assertions to `app/e2e/layout.spec.ts`: 1366×768, every screen, no horizontal scroll, no clipped control (SC-802) *(done: `e2e/layout.spec.ts`, 3 tests. Caught a `<code>` element pushing the page sideways at 200% zoom — invisible at 100%, which is why only this suite could find it.)*

**Checkpoint**: every screen designed; the layout suite passes.

---

## Phase 4 · User Story 2 — accessible by default (P1)

**Goal**: AA on every screen with no setting required, enforced by CI.

- [x] T018 [US2] Write `app/e2e/a11y.spec.ts`: axe over every screen × both themes × default and largest text. Zero violations (SC-801) *(done: `e2e/a11y.spec.ts`, 6 tests, 4 modes × every screen. `@axe-core/playwright` cannot run against Electron — `Target.createTarget: Not supported` — so `axe-core` is injected into the window instead. First run found a critical unlabelled `<textarea>`.)*
- [x] T019 [US2] Add the a11y and layout suites to `.github/workflows/app.yml`, failing the build. This closes `006` T075 and backlog G7, open since the WCAG target was first written down *(done. `xvfb-run npm run test:e2e` on Linux, failing the build. **G7 and `006` T075 are closed.**)*
- [x] T020 [US2] Audit and fix heading order, landmark roles and `aria-live` on the streaming and validation regions (FR-814) *(done. axe tags `heading-order` and `region` as best practice rather than WCAG, so the tag filter excludes them and they are asserted explicitly. Found: the About screen had no `h1`.)*
- [x] T021 [US2] Verify the keyboard path end to end and fix what it finds: every action reachable, the ring visible at every stop, focus never lost after a state change (SC-803, quickstart §4) *(done: tabs the whole screen, asserts a visible ring at every stop, no landing on `<body>`, and that focus survives the re-render when the preferences panel opens.)*
- [x] T022 [US2] Confirm no accessibility question appears at first run (FR-809) — an assertion in the onboarding e2e, so a well-meaning future addition trips it *(done, in `e2e/a11y.spec.ts`.)*

---

## Phase 5 · User Story 4 — the draft mark (P1)

- [x] T023 [US4] Implement `app/ui/src/components/DraftMark.tsx` for both states, stating the state in words, with the hatch at `--ramp-angle` so the mark and the product's most important signal share a geometry
- [x] T024 [US4] Use it wherever adapted material appears, and make sign-off change it immediately on screen (FR-823) *(done. Sign-off flips one boolean and the mark is a pure function of it, so there is no path that can show the wrong one.)*
- [x] T025 [US4] Assert in e2e that unsigned material shows the mark and signed material does not. The per-page print watermark is already asserted by `core.test.ts` from Phase 11 *(done in `ui/test/draftmark.test.tsx`, 6 tests, rendered with `react-dom/server` — what matters is what the markup *says*, and a screenshot could not check that.)*

---

## Phase 6 · User Story 3 — her preferences (P2)

- [x] T026 [US3] Extend the settings file with the `display` block per data-model.md, in `app/packages/shell/src/ipc/vault-settings.ts`, outside the vault *(done, with 4 tests in `vault-settings.test.ts` — including that the vault directory stays empty, and that saving one key does not drop the other.)*
- [x] T027 [US3] Apply preferences as `data-*` attributes on the root element, reading the OS as initial values for theme, contrast and motion with no question asked (FR-817, research R3) *(done: `ui/src/settings/preferences.ts`, applied before the first frame.)*
- [x] T028 [US3] Build `app/ui/src/settings/DisplayPreferences.tsx` — size, contrast, motion, theme, described in her words and not as standards ("Letra más grande", never "escala tipográfica") *(done.)*
- [ ] T029 [US3] Make it findable without being told, and verify by asking a teacher rather than by asserting it (SC-806) **(NOT done — needs a teacher. Recorded in `specs/006-desktop-app/validation.md` rather than ticked: the panel is in the rail under "Aa · Cómo se ve", and whether she finds it is an observation, not an assertion.)**
- [x] T030 [US3] Add the compounding case to the test matrix: `xlarge` + `high` + `dark` at 200% zoom, nothing lost or overlapped (FR-819, SC-804) *(done, and it is one test with all four preferences at once plus 200% zoom, not four separate passes.)*

---

## Phase 7 · Polish

- [x] T031 [P] Add the token contract to the CI reviewer checklist: no literal colour, no off-scale space or type, no hand-rolled shadow, no `outline: none` *(done, and stronger than planned: three of the four rules are now machine-checked in `ui/test/styles.test.tsx`, which also asserts that every class in a `className` is defined in a stylesheet. That check found fifteen buttons unstyled since the v2 rewrite, `.app`/`.main` used and defined nowhere, and `.axis` meaning two different things.)*
- [x] T032 [P] Add a one-command diff between the design project's stylesheets and `app/ui/src/styles/`, so drift is a check rather than a judgement (research R5) *(done: `scripts/design-diff.sh`. Not in CI — the design project is not in this repository, so a CI job could only skip or lie.)*
- [x] T033 Record in `specs/006-desktop-app/validation.md` what was verified and what was not — in particular that SC-805 and SC-807 need a teacher and are not machine-checkable *(done.)*
- [x] T034 [P] Update `docs/escenario.md` where it describes screens that this feature changed *(done: scenario 0 gains what she is never asked, scenario 1 the restyled report and the draft bar, and a new scenario 10 for her own display preferences.)*

---

## Dependencies

- **Phase 1** blocks everything. T002 blocks T004 (the `@font-face` rules live in the token file).
- **Phase 2** blocks all user stories. T006 blocks T007.
- **US1 (Phase 3)** is the MVP. T013 blocks T014.
- **US2 (Phase 4)** depends on Phase 3: axe over a screen that is still a `<pre>` dump measures nothing worth measuring.
- **US4 (Phase 5)** depends on Phase 2 only.
- **US3 (Phase 6)** depends on Phase 2 and on `006` T083's settings file.

## Parallel opportunities

- T008, T009, T010 together once the stylesheets land.
- Phase 5 in parallel with Phase 3 — different components.
- T031, T032, T034 together at the end.

## Implementation strategy

**MVP = Phase 1 + Phase 2 + Phase 3.** That is the interface no longer looking
unfinished, which is what SC-805 measures.

Order after MVP: **Phase 4 (the gate) → Phase 5 → Phase 6 → Phase 7.** The gate
comes straight after the MVP because a violation is cheapest to fix the day it is
introduced, and every subsequent screen inherits the guarantee.

**Do not defer T014.** Moving the axis descriptors into the corpus is the one task
here that fixes a constitutional violation rather than adding a feature, and it is
also the one most likely to be dropped as unrelated tidying. It is not tidying:
it is the reason this feature was allowed to touch that component.
