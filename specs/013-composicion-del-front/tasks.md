# Tasks: Composition

**Prerequisites**: plan.md, contracts/page-shell.md

**Tests**: The existing axe and layout gates run on every screen and catch
regressions loudly. What this feature adds is not a test — it is **looking**
(FR-1113), and the before/after screenshots are the record.

---

## Phase 1 · Look first

- [x] T001 Take and keep screenshots of every screen at 1366×768, before anything changes. The success criterion of this feature is visual, so the baseline is the deliverable that makes the change reviewable rather than asserted (SC-1105) *(done: `docs/screenshots/013-before/`, and `app/scripts/screenshot.mjs` makes it one command from now on.)*

---

## Phase 2 · The shell, built by fixing the worst screen with it

- [x] T002 Write `ui/src/styles/composition.css`: three spacing levels, the measure applied to controls, and the middle of the type scale. Separate from `components.css`, which stays about what a thing looks like rather than where it sits *(done. Three named rhythms and the measure. **Tightened after looking**: the first version pushed the primary action below the fold on 1366×768, which is the machine this is for — a rhythm that puts «Continuar» off the bottom is worse than the crush it replaced.)*
- [x] T003 Build `ui/src/shell/Page.tsx` per the contract — title, lede, max width, rhythm — with the `wide` and `canvas` variants the two screens that need them *(done, with the `wide` and `canvas` variants.)*
- [x] T004 [P] Build `Section`, `Field` and `Actions`. `Actions` enforces one primary control (FR-1105) *(done. `Actions` takes a singular `primary` prop, which is how FR-1105 is enforced rather than requested.)*
- [x] T005 Recompose **the adapt screen** with it. Worst screen, and the one a teacher opens first — a shell designed in the abstract fits nothing, so it is designed against this *(done. Fields are a field wide, the file button dropped to secondary weight, and the disabled primary now says **why** it is disabled instead of just looking broken.)*
- [x] T006 Fix the rail's foot: a composed block rather than two controls pinned to the floor (FR-1106) *(done: a rule and a block, not two controls pinned to the floor.)*
- [x] T007 **Screenshot and look.** If the adapt screen is not visibly better, the shell is wrong and Phase 2 is not done *(**done, and it was a real gate.** The first pass looked better and put «Continuar» below the fold; the section heading was also nearly the size of the page title, so the page read as two titles. Both found by looking, neither by any test.)*

---

## Phase 3 · Outward

- [x] T008 [P] Recompose `LearnersScreen` and `ProfileEditor` *(done. `ProfileEditor` keeps its own long form; the shell gave it a title and a lede and took its hand-rolled width away.)*
- [x] T009 [P] Recompose `NotesScreen` and `AboutScreen` *(done — and `AboutScreen` needed a real fix: it carried its own `<h1>` around the wordmark from before the shell existed, so the recomposed page had two. The wordmark moved to the shell's `banner` slot and the title became the heading.)*
- [x] T010 [P] Recompose `ConnectionScreen` and the onboarding steps *(done.)*
- [x] T011 Recompose `IngestScreen`, and `VerifyScreen` on the `wide` variant — **the verification screen's two columns are the feature**, so the shell must serve it rather than flatten it *(done, on `variant="wide"`. The pair still stacks when it must, but the threshold is now a container query — see T026.)*
- [x] T012 Recompose `ReviewScreen`, and check the draft mark is still the loudest thing on it. A calmer page invites calming the one element whose job is to be unmissable *(done. `Page` gained a `banner` slot so the draft mark stays **above** the title: Principle VII says a draft announces itself before anything else does, including the page.)*
- [x] T013 Screenshot every screen again and put both sets in the record *(done: `docs/screenshots/013-before/` and `013-after/`, and `npm run shots` is one command. The after set now also carries seven widths and both modes.)*

---

## Phase 7 · The window is a size nobody chose

Added after Carlos dragged the frame narrow and the application became its own
navigation. Not a new feature — the same finding as the rest of 013, at the one
scale nobody had rendered.

- [x] T025 Write the width sweep in `e2e/layout.spec.ts` **first**: every screen at every width from the window's minimum to 1920, asserting no sideways scroll and that neither region of the shell swallows the other (SC-1106) *(done, and it failed on the first run at 560px exactly as reported.)*
- [x] T026 Replace the shell's media queries with container queries in `em` (FR-1116/1117) — `body` is the `window` container, `.main` is the `page` container, and the `:root[data-text="xlarge"] .verify-pair` override disappears because the mechanism now covers it *(done. `--text-base` is 17px, so 52em is 884px at the normal scale and 1248px at `xlarge` — the same window, a third less text.)*
- [x] T027 Fix the strip layout it exposed, and lower `minWidth` from 900 to 560 *(done. Three separate defects, and two of them were cascade order, not CSS: `.rail button { width: 100% }` came **after** the narrow block and won; `.rail-foot`'s column rule is in composition.css, which is imported **after** components.css, so the strip override written beside its siblings lost silently. The second was invisible to every test and was found by looking at a screenshot.)*
- [x] T028 Make a stale build impossible: `playwright test` builds first, via `globalSetup`, not via remembering the longer npm script *(done, and it immediately surfaced two defects committed green against an old `out/` — see the Phase 3 notes and the dark-mode ground tokens.)*
- [x] T029 Put the widths and the two modes in the record (FR-1118) *(done: `w-*.png` and `m-*.png` in `docs/screenshots/013-after/`.)*

---

## Phase 4 · The data layer

- [x] T014 Build `ui/src/data/`: one hook per domain over the IPC surface, with loading, error and empty resolved once (FR-1107/1108) *(done: `ui/src/data/`, one module per domain over `useAsync`/`useCommand`, plus `Loaded` for the three states. Ten domains, 24 files off direct IPC.)*
- [x] T015 Decode errors in the hook, not in the component (FR-1109) — a component must not be the thing that remembers to call `fromWire`, which is exactly how the raw IPC wrapper reached a teacher's screen in `008` *(done. Three screens called `fromWire` and looked the kind up in `es.errors` — correctly, which is exactly why the sixteen that did not go unnoticed. Now nothing outside the layer may import it, and a test says so.)*
- [x] T016 Move all 19 components off direct `window.rampa` calls *(done, all 19. Four modules that were already data access but lived in feature folders moved too — `services.ts`, `preferences.ts`, `axisDefs.ts`, `state.ts` — and `useLearnerName.ts` was deleted: a hook with a branded type and no callers anywhere.)*
- [x] T017 Assert it: zero components call `window.rampa` directly (SC-1103) *(done: `ui/test/data-layer.test.ts`. Four assertions, and writing it surfaced that `vitest.config.ts` collected only `ui/test/**/*.test.tsx`, so a `.test.ts` under `ui/test/` ran nowhere and passed by being absent.)*

---

## Phase 5 · The back end, and the boundary

- [x] T018 Split `ipc/corpus.ts` by subject: corpus, services, education, links *(done: `packages/shell/src/corpus/` — `bundle` (where it is), `recipes`, `services`, `education`, `links` (the two handlers that reach the network, filed together because «what leaves the machine, and when» is the question a DPO asks first). 330 lines → six files, largest 111.)*
- [x] T019 Separate orchestration from IPC registration in `jobs/` (FR-1111) *(done. `jobs/adapt.ts` and `jobs/ingest.ts` no longer import `electron` at all — the file picker, the progress send and the userData path were the only uses and all three were wiring. `jobs/signoff.ts` turned out to be **entirely** an IPC handler and moved to `ipc/`: it had never been a job. `jobs/print.ts` keeps its import, and that is the honest outcome — the offscreen `printToPDF` is ADR 0008's one surviving argument.)*
- [x] T020 [P] Assert the Electron boundary: nothing outside `packages/shell` imports `electron` (FR-1112, SC-1104). ADR 0008 chose Electron against the numbers, so the exit stays affordable by test rather than by habit *(done: `packages/shell/test/boundary.test.ts`. It found a real leftover on its first run — `jobs/adapt.ts` still importing `handle` — which is the entire point of writing it.)*
- [x] T021 [P] Record the size of the Electron-specific surface, so a future migration is a known number *(done, and asserted rather than described: the exact list of twelve files with a comment each saying what it needs Electron **for**, plus a 1,400-line ceiling. Recorded at 1,010 lines of a ~15,000-line application.)*

---

## Phase 6 · Close it honestly

- [x] T022 Update `specs/006-desktop-app/validation.md`: SC-805 moves from **not met** to whatever is now true, with both screenshot sets referenced *(done. SC-805 moves from met-by-assumption → not met → **not met, and here is exactly what is now true**, with both screenshot sets, the widths and the two modes referenced. It stays unmet because only a teacher can meet it.)*
- [x] T023 Add the composition rules to the CI reviewer checklist — a screen that declares its own width or gap is the regression this feature exists to prevent *(done, and the task named a file that does not exist: there is no CI reviewer checklist in this repository — `checklists/review.md` is the **teacher's**, and it is corpus. So the rules went to `AGENTS.md`, where contributors already look, and three of the four are tests rather than prose: `ui/test/data-layer.test.ts`, `packages/shell/test/boundary.test.ts` and the container-query rule. The fourth is «look at it», which cannot be a test — that is ADR 0009.)*
- [x] T030 The application has no icon: the dock shows Electron's default, which announces the framework rather than the product on the one surface a teacher sees before she has opened anything. `Logo.tsx` already holds a designed mark with a thesis behind it — ground, ramp, threshold, door — so this is rendering it to `.icns`/`.ico`/`.png`, wiring `BrowserWindow` and `electron-builder`, and checking it at 16px where the arched top stops resolving (the component already draws a separate small variant for exactly this reason) *(done. Rendered from `Logo.tsx` rather than drawn again — two marks drifting apart is this project's most familiar defect — and redrawn for the size rather than scaled: a solid teal plate with the mark in white, because a hairline in the accent colour disappears at 32px. First attempt filled the plate edge to edge with no margin; found by generating it and looking at it, twice. Rendered by Electron's own Chromium, since Playwright's browsers are not installed and one PNG does not justify a dependency.)*
- [ ] T024 SC-1101 needs a teacher's first ten seconds. Still unmet, still only collectable once, and still the only verdict that counts *(**not done, and it cannot be done by me.** SC-1101 needs a practising teacher's first ten seconds, once. Carlos went from «se ve como el puto ano» to «mucho mejor, no es la hostia pero no es horrenda» — evidence, and not the criterion. Recorded in `006`'s validation as still unmet.)*

---

## Dependencies

- T001 blocks nothing and must happen first anyway.
- T003 blocks all of Phase 3. T005 and T007 come **before** Phase 3: prove the
  shell on one screen before applying it to nine.
- Phase 4 and Phase 5 are independent of Phases 2-3 and of each other.

## Implementation strategy

**MVP = Phases 1-3.** That is the visible half and the one Carlos is blocked on.

**T007 is a gate, not a checkbox.** If the adapt screen does not look better after
the shell, applying the shell to nine more screens makes nine screens consistently
wrong. Stop and fix the shell.

**Do not skip T001.** A visual change with no before is a change nobody can
review — including the person who made it, who by then remembers only the after.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here.
The reason is the one `002` learned the hard way: **a requirement nobody can point
at is a requirement nobody is keeping.**

| | Where it is satisfied |
|---|---|
| FR-1101 | `ui/src/shell/Page.tsx` — `Page` owns the title, the measure and the rhythm; a screen declares what it is |
| FR-1102 | `Field` owns the measure, so no screen decides how wide an input is |
| FR-1103 | `tokens.css`'s spacing scale, with `--rhythm-*` for the three levels. `ui/test/styles.test.tsx` fails on any off-scale padding, margin or gap |
| FR-1104 | `tokens.css`'s type scale, and `styles.test.tsx` fails on a literal font size |
| FR-1108 | `ui/src/data/Loaded.tsx` — one component for loading, error and empty, so the three read identically everywhere |
| FR-1110 | T018 · `packages/shell/src/corpus/` — bundle, recipes, services, education, links |
| FR-1114 | **Satisfied by absence, deliberately.** There is no pixel-diff suite and ADR 0009 says why: it fails on every intentional change, gets updated without being read, and then asserts whatever the last person accepted |
| FR-1115 | `e2e/layout.spec.ts`'s width sweep, plus `015` T016's filter-bar case — which found that the sweep had never rendered the bar, because it seeds one learner and the bar appears from six |
| FR-1117 | `e2e/layout.spec.ts` · «the text scale moves the thresholds»: at 1100 px the rail is a column at `normal` and a strip at `xlarge`, with no second rule saying so — which is why the thresholds are containers in `em` |
