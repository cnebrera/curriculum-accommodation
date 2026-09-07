---

description: "Tasks for 036 · El registro, y cómo llega ella a él"
---

# Tasks: El registro, y cómo llega ella a él

**Input**: `specs/036-el-registro/` — spec.md, plan.md, research.md, data-model.md,
contracts/diagnostics.md, quickstart.md

**Tests are requested.** Every requirement here is either a description of behaviour that
already ships — and therefore worthless unless something asserts it — or a screen. Both
need tests to mean anything, and the plan's Constitution Check named two specifically:
the log-as-content test and the name test over a real session.

## Format: `[ID] [P?] [Story] Description`

`[P]` = parallelisable (different files, no dependency on an incomplete task).

## Path Conventions

Paths are repository-relative. The application lives in `app/`.

---

## Phase 1: Setup

Nothing to set up. No dependency is added, no directory is created, and the three
channels this feature needs are already implemented and exposed — which is the defect it
exists to close. Recorded rather than omitted: a Setup phase with nothing in it is
information.

---

## Phase 2: Foundational (Blocking Prerequisites)

**These come first because they are the requirements that already govern and nothing
asserts.** If any of them turns out to be false, the screen is the wrong thing to build
next — a way in to a log that leaks a name is worse than no way in.

- [ ] T001 Write `app/packages/core/test/log-carries-nothing.test.ts`: `sanitise()` at the
      chokepoint (FR-3401) — a forbidden key becomes `[omitido]`, a string over 120
      characters becomes its length, a non-primitive is stringified and cut, and **a code
      survives** because a code is the pseudonym and the only way a line can say which job
      it is about (research R1)
- [ ] T002 [P] In the same file, assert the **edge the Constitution Check found**: a short
      string under an unlisted key is written through. Asserted as the current behaviour
      with the reason written — extending the key list is FR-3414's out-of-scope, and a
      test that pretended otherwise would make the next reader think it is handled
- [ ] T003 Write `app/packages/shell/test/log-rules.test.ts`: the log path is **outside any
      vault** (FR-3402), checked as a path relationship and not as a string — the same
      shape as `024` T022's «by content, not by filename». And **FR-3404**: the uncaught
      handler is registered at startup and writes through the same sink — asserted that
      way rather than by provoking a real uncaught exception, which kills the runner
- [ ] T004 [P] In the same file, FR-3403: the log is bounded — a file over the limit is
      rotated to one generation and the current file starts again
- [ ] T005 [P] In the same file, FR-3405: a sink that throws does not propagate. `Logger`
      already swallows sink failures; this asserts it, because «the work wins» is the one
      rule here whose violation is invisible until the day it matters
- [ ] T006 Write `app/ui/src/data/diagnostics.ts` — three hooks over the three existing
      channels (contracts/diagnostics.md). `usePath` and `useTail` are reads;
      `useRevealLog` is a command. **No hook for `diagnostics:network`**: that is `035`'s
      counter and is a test's instrument, not a screen's

**Checkpoint**: the rules the log already obeys are written down and asserted, and the
renderer can reach the file. Nothing on screen yet.

---

## Phase 3: User Story 1 — Something broke and she wants to say what (Priority: P1) 🎯 MVP

**Goal**: from «Acerca de» she finds where the log is, reads its recent lines, copies them
and opens the folder — without leaving the application to hunt for a directory whose
location she has no reason to know.

**Independent Test**: cause a failure, open «Acerca de», produce the file. Quickstart §1.

### Tests for User Story 1

- [ ] T007 [P] [US1] `app/e2e/log.spec.ts`: the section shows the path and the recent
      lines, and offers copy and open-folder (FR-3406/3407/3408/3409, SC-3401) —
      quickstart §1
- [ ] T008 [P] [US1] In the same spec, the **three empty states are three sentences**
      (research R5): nothing logged yet, unreadable, and an existing file with an empty
      tail. An empty box is the shape of a rendering fault, and this is the screen she
      opens when she already suspects something is broken — quickstart §2
- [ ] T009 [P] [US1] In the same spec, SC-3404 with `035`'s counter: opening the section,
      copying and opening the folder produce **zero** requests, counted in **both** stacks
      — a provider call leaves through Node's `fetch` and a listener on Chromium's session
      would sit at zero while something escaped — quickstart §6. This is where
      **FR-3411**, **FR-3412** and **FR-3413** are measured rather than claimed: nothing
      is transmitted, no destination was added, and opening the screen reaches nothing

### Implementation for User Story 1

- [ ] T010 [US1] Write `app/ui/src/about/LogSection.tsx`: where the log is, its last 200
      lines, «Copiar», «Abrir la carpeta», and the sentence that the folder holds the
      previous rotation too (FR-3408, clarified 2026-09-07 — no selector, and the
      measurement behind that is in the Clarifications)
- [ ] T011 [US1] Render it from `app/ui/src/about/AboutScreen.tsx`. **Its own component
      and not more of that file**: it already carries the version, the licences, the
      update consent and the declared destinations at 230 lines, and a fifth subject
      inside it is how a screen becomes a file nobody can review — `020` spent a whole
      specification undoing exactly that in `LearnersScreen`
- [ ] T012 [US1] The copy (FR-3409) writes **the text that is on screen**. One source, so
      the clipboard and the screen cannot diverge — the plan's post-design finding: a
      clipboard has no appearance to inspect, so a divergence there is invisible

**Checkpoint**: US1 is shippable. She can produce the log; nobody has yet asserted what
is in it.

---

## Phase 4: User Story 2 — She checks what she is about to send (Priority: P2)

**Goal**: what she reads is timestamps, event names and codes. No child's name, no
fragment of the worksheet. **This is the story the feature rests on** — the log's whole
safety argument is «it carries nothing about a learner», and today that is our claim about
a file she cannot see.

**Independent Test**: adapt material for a learner with a name set, then read the recent
lines and find neither the name nor the material. Quickstart §3.

### Tests for User Story 2

- [ ] T013 [US2] `app/e2e/log.spec.ts`: **SC-3402 over a real session.** Adapt for a
      learner whose name is set, then assert the file contains **zero** occurrences of
      that name and no fragment of the material. Over the **file**, not the screen: what
      must be true is that nothing was written, and a screen that filtered it would hide
      the defect instead of proving its absence
- [ ] T014 [P] [US2] In the same spec, FR-3410 and Principle IX: a log line carrying
      something markup-shaped — `<script>`, a Markdown link, `**bold**` — appears as
      **characters**. Nothing bold, nothing a link, nothing executed. Asserted over the
      rendered DOM rather than by reading the component, because «React escapes by
      default» is a property of what was written and not of what is there
- [ ] T015 [P] [US2] In the same spec, that the **copy** carries the same plain text
      (FR-3409 + FR-3410 together) — quickstart §5

### Implementation for User Story 2

- [ ] T016 [US2] Nothing to implement if T013 passes. **That is the point and it is why
      this task exists rather than being omitted**: US2 is a claim about behaviour that
      already ships, and the work is proving it. If T013 fails, the fix is at a call site
      writing something it must not — **not** in this feature, and not by filtering on
      the way to the screen

**Checkpoint**: the promise is hers. She can read what she is about to send and check it.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T017 [P] SC-3403: with the log directory unwritable, every flow completes and **no
      message about logging reaches her** — quickstart §7. Where the two conflict the work
      wins, and a tool that crashes because it could not write a diagnostic has turned its
      diagnostic into a defect
- [ ] T018 [P] SC-3405: **look at it** at 1366px, 900px and 560px and at `xlarge`, with a
      log at its size limit. A monospaced block of 200 lines is the widest thing this
      screen has ever held, and `013` FR-1115/FR-1117 is where this project has broken its
      own layout twice — quickstart §8
- [ ] T019 [P] `axe` on «Acerca de» with the section present, at every width. It is in
      `a11y.spec.ts`'s Configuración sweep already, so this is confirming the new section
      did not add a violation rather than a new case
- [ ] T020 [P] One primary control per screen (`013` FR-1105): «Acerca de» already has
      «¿Hay una versión más nueva?». The log's three controls are **secondary weight** —
      three solid buttons on the screen she opens when something is broken is emphasis
      everywhere and therefore nowhere
- [ ] T021 The guard shrinks: `ui/test/exports-have-readers.test.ts` and G58. The three
      `diagnostics:` channels stop being unread, so **BACKLOG G58's channel list loses
      them** — an inventory that does not shrink rots into a list of names that used to
      mean something, which is how `035` T020 spent a day claiming to be blocked by a
      shipped feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 before everything.** Deliberately: if FR-3401 turns out to be false, a way in
  to a leaking log is worse than no way in. The order is a safety property, not tidiness.
- **US1 before US2**: US2 reads what US1 put on screen. But T013 asserts over the *file*,
  so it could run first — and if it fails, US1 should not be built.
- Polish last.

### Parallel Opportunities

- T002, T004, T005 with T001/T003 (same files, different cases — write them together).
- T007–T009 are one spec file: written together, they are the US1 walk.
- T017–T020 are independent of each other.

---

## Implementation Strategy

**MVP is US1**: she can reach the log. That alone closes the defect this specification was
written for — a failure recorded with care in a file nobody can reach.

**US2 is what makes it safe to have built.** It adds no code if the log is already clean,
and if it is not, it stops the feature rather than papering over it. That asymmetry is why
it is a separate story instead of a test inside US1.

---

## Coverage · every requirement, and where it is

| Requirement | Where |
|---|---|
| FR-3401 | T001 (the chokepoint) · T002 (its edge, asserted as-is) · **T013** (over a real session, which is the one that matters) |
| FR-3402 | T003 — a path relationship, not a string comparison |
| FR-3403 | T004 |
| FR-3404 | T003 — the handler is registered and writes through the same sink; provoking a real uncaught exception in a test kills the runner |
| FR-3405 | T005 (the sink) · T017 (the whole application, with the directory unwritable) |
| FR-3406 | T007 · T010 |
| FR-3407 | T007 · T010 — inside the application, no editor, no knowing where application data lives |
| FR-3408 | T007 · T010, including the sentence about the previous rotation |
| FR-3409 | T012 (one source) · T015 (the same plain text reaches the clipboard) |
| FR-3410 | T014 — over the rendered DOM, because «React escapes by default» is a property of what was written rather than of what is there |
| FR-3411 | T009 — zero requests, both stacks. And structurally: this feature adds no channel that sends anything, which `contracts/diagnostics.md` states and T021's guard keeps true |
| FR-3412 | T009 · and `034`'s declared-destinations test already fails if the list grows |
| FR-3413 | T009 |
| FR-3414 | Satisfied **by absence**, and it is the most consequential row here: no task touches `packages/core/src/log.ts` or `packages/shell/src/ipc/diagnostics.ts`. T001–T005 assert their behaviour without changing it. A specification that quietly redesigned the thing it was written to describe would be worse than none |

| Success criterion | Where |
|---|---|
| SC-3401 | T007 — produced without leaving the application |
| SC-3402 | **T013** |
| SC-3403 | T017 |
| SC-3404 | T009 |
| SC-3405 | T018 |
