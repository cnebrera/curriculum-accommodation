# Feature Specification: Composition — a page, a data layer, and a boundary

**Feature Branch**: `013-composicion-del-front`

**Created**: 2026-08-29

**Status**: Draft — clarifications below, then `/speckit-plan`

**Input**: Carlos opened the application and said the front end looked terrible.
He was right, and none of the 667 tests could have told him — see
[ADR 0009](../../docs/decisions/0009-composition-not-tokens.md).

Three findings, and they are the same finding at three scales:

1. **There is no page layer.** Each screen renders its own `<h1>` and its own
   content with `stack gap4` chosen by eye. No shell, no measure on form controls,
   no vertical rhythm, no use of the middle of the type scale.
2. **There is no data layer.** 19 of ~25 components call `window.rampa.*`
   directly, so every screen reinvents loading, error and empty, and none does it
   the same way.
3. **The back end has grab bags.** `ipc/corpus.ts` is 330 lines doing eight
   unrelated things; `jobs/*.ts` mix orchestration with IPC registration.

That is why adding a screen produces *cosas raras*: **there is nowhere for it to
fit**, so it invents its own everything.

## What this is not

**Not a redesign.** The palette, the typeface, the tokens and the scales are fine
and stay. They were never composed into a page, which is a different problem with
a different fix.

**Not a framework change.** [ADR 0008](../../docs/decisions/0008-electron-not-tauri.md):
the same screen renders identically in any Chromium, and it was ugly on its own
merits.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A screen looks like it was finished (Priority: P1)

She opens the application and it does not look unfinished. Fields are the width of
a field. Headings have air. Something on the screen is emphasised, and it is the
thing she should do next.

**Why this priority**: It is `010` SC-805, recorded as met-by-assumption and now
recorded as **not met**. It is also the first thing a teacher judges, in the first
ten seconds, before she has read a word.

**Independent Test**: Screenshot every screen at 1366×768 and look at them. Not a
pixel diff — a person, or an agent that can render and look.

**Acceptance Scenarios**:

1. **Given** any screen, **When** it renders, **Then** form controls are bounded by
   the measure rather than by the window.
2. **Given** any screen, **Then** the spacing between a section and the next is
   visibly larger than between a label and its field, and both come from the scale.
3. **Given** a screen with a primary action, **Then** exactly one control carries
   primary weight.
4. **Given** the rail, **Then** its foot is a composed block rather than two
   controls pinned to the floor.

---

### User Story 2 - Adding a screen does not mean inventing one (Priority: P1)

A new screen composes from a shell and existing primitives. It does not choose its
own gaps, its own max width, or its own way of showing a spinner.

**Why this priority**: This is the requirement that stops the problem coming back.
Fixing today's screens without it buys one clean release.

**Acceptance Scenarios**:

1. **Given** a new screen, **When** it is written, **Then** it uses the page shell
   and declares a title, not a layout.
2. **Given** a screen that loads data, **Then** loading, error and empty come from
   one place and read the same as every other screen.
3. **Given** a component, **Then** it does not call `window.rampa` directly.

---

### User Story 3 - The Electron boundary is one package, and stays one (Priority: P2)

Everything Electron-specific lives in `packages/shell`, and a test says so.

**Why this priority**: ADR 0008 chose Electron on one argument, against numbers
that favour the alternative. The honest response is to keep the exit affordable
rather than to defend the choice harder — and today the boundary holds by habit.

**Acceptance Scenarios**:

1. **Given** the source, **When** the boundary is checked, **Then** nothing outside
   `packages/shell` imports `electron`.
2. **Given** `packages/shell`, **Then** its Electron-specific surface is small
   enough to be worth measuring, and the measurement is recorded.

---

### Edge Cases

- **A screen that is genuinely one big text area** — the adapt screen. The measure
  applies to *fields*, not to a canvas she pastes a worksheet into.
- **The verification screen**, which is deliberately two columns and already has
  its own layout. The shell must not fight a screen that needs the full window.
- **A shell that becomes a straitjacket.** If a screen has to escape it, that is a
  fact about the shell and gets fixed there, not worked around per screen.

## Requirements *(mandatory)*

### Composition

- **FR-1101**: A page shell MUST own the title, the max width and the vertical
  rhythm. A screen declares what it is, not how it is laid out.
- **FR-1102**: Form controls MUST be bounded by a measure. A 1000 px input is not
  a design decision.
- **FR-1103**: Spacing MUST come from the scale and MUST distinguish at least three
  levels: between sections, between fields, and within a field.
- **FR-1104**: The type scale MUST be used between the heading and the body.
- **FR-1105**: Exactly one control per screen MAY carry primary weight. Emphasis
  that is everywhere is emphasis nowhere.
- **FR-1106**: The rail's foot MUST be a composed block.

### Data

- **FR-1107**: Components MUST NOT call `window.rampa` directly. Access goes
  through a hook per domain.
- **FR-1108**: Loading, error and empty MUST be handled in one place and read
  identically across screens.
- **FR-1109**: An error reaching a screen MUST already be decoded — a component
  MUST NOT be the thing that remembers to call `fromWire`.

### Structure

- **FR-1110**: `ipc/corpus.ts` MUST be split by subject.
- **FR-1111**: A job MUST NOT register its own IPC. Orchestration and wiring are
  different jobs.
- **FR-1112**: Nothing outside `packages/shell` may import `electron`, enforced by
  a test.

### The loop

- **FR-1113**: A UI change MUST be looked at before it is called done. The agent
  can render the application and screenshot it, and a change that has not been
  looked at is not finished.
- **FR-1114**: There MUST NOT be a pixel-diff regression suite. See ADR 0009: it
  fails on every intentional change, gets updated without being read, and then
  asserts whatever the last commit produced.

## Success Criteria *(mandatory)*

- **SC-1101**: `010` SC-805 becomes true: a teacher's first ten seconds do not
  produce "this looks unfinished". Judged by a person, once, and only once.
- **SC-1102**: A new screen can be written without choosing a max width, a gap, or
  a spinner.
- **SC-1103**: Zero components call `window.rampa` directly.
- **SC-1104**: Zero files outside `packages/shell` import `electron`.
- **SC-1105**: The screenshots taken before and after this feature are both in the
  record, so the change is visible rather than asserted.

## Assumptions

- The tokens are right. If composition exposes a token that is wrong, that is a
  finding and a small change, not a redesign.
- One shell fits every screen except the two named above, and those are shell
  variants rather than exceptions.
- The data layer is hooks, not a store. Nothing here needs shared client state
  that IPC and the vault do not already hold.
