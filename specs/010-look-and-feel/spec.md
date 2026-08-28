# Feature Specification: The interface — how Rampa looks, and who it looks right for

**Feature Branch**: `010-look-and-feel`

**Created**: 2026-08-28

**Status**: Planned 2026-08-28 · ready for `/speckit-implement`

**Input**: `006` specifies what the interface must *say* (FR-406: her language, no
jargon) and what the output must survive (FR-427: a black-and-white photocopier).
It says nothing about what the application looks like. Six screens exist, built
from a hand-written token file, and none of them has had a design pass.

## Clarifications

### Session 2026-08-28

Recorded rather than asked: these came out of the design review, which is where
this particular feature's clarification actually happens — a visual direction
cannot be settled in prose.

- Q: Density and target screen? → A: Generous, small screen. 17px body, 44px
  targets, complete at 1366×768, because the machine is a school laptop several
  years old and she is between classes.
- Q: Where does the design spend its boldness? → A: **Everywhere.** No screen is
  a placeholder and none is treated as throwaway. Hierarchy still means some
  things are quieter than others — that is what makes the prominent ones read,
  and it is not the same as neglect.
- Q: How should the draft mark feel? → A: Unmistakable but calm. She will see it
  on every worksheet before every signature; an alarm would make the product
  feel permanently broken, and an alarm that always fires stops being seen.
- Q: An accessibility mode, chosen at first run? → A: **No.** A toggle means the
  default is the inaccessible one, and it is a question she cannot evaluate at
  the worst possible moment. What is real is that people differ, so size,
  contrast, motion and theme are *her preferences* on top of a default that
  already meets AA.
- Q: Is a muted palette a consequence of accessibility? → A: **No, and the first
  proposal was wrong about this.** AA constrains contrast ratios, which are
  luminance differences; it says nothing about saturation. The rule that makes
  vivid and accessible the same thing: **bright colours go where they never
  carry small text** — fills, borders, icons, glows, dark grounds, progress —
  **and deep saturated colours carry the text.** Depth returns as real
  elevation tinted with the brand hue rather than black. Approved as v2 of the
  design system.

## Scope, stated first

This feature is **the application's own interface**. The worksheet it produces is
a different thing with a different reader and is already specified: `006` FR-427
for photocopy legibility, and the WCAG 2.2 AA target recorded in
`packages/core/src/render/html.ts`. Confusing the two would mean designing a
child's worksheet to please a teacher's eye, which is the whole failure this
project is built around, one level down.

## The premise, corrected

An earlier framing of this work treated accessibility and attractiveness as a
tension to be balanced. **That framing was wrong and is rejected here.** Generous
type, real contrast, clear hierarchy and unambiguous state are what good design
*is*; the "modern" look that fails WCAG — hairline grey on white, 11px labels,
low-contrast accents — is not more beautiful, it is less finished.

So there is no tradeoff to manage, and consequently:

**Accessibility is the floor, not a mode.** There is no "accessibility mode"
switch, and asking at first run whether she wants one is specifically rejected.
Two reasons, and the first is fatal on its own:

1. **A toggle means the default is the inaccessible one.** An application that
   adapts material for learners with disabilities, whose own interface ships with
   accessibility off by default, is a contradiction that no amount of good
   intention survives.
2. **It is a question at the worst moment.** `006` SC-407 makes every hesitation
   in the first run a logged defect, and "¿quieres el modo accesibilidad?" is a
   question she cannot evaluate before she has seen anything.

**What is real is that people differ**, and one design cannot serve every eye at
once. Those are **display preferences** — text size, contrast beyond AA, reduced
motion, dark theme — adjustable, discoverable, and never a gate. A teacher with
low vision is a plausible user of this application, not a hypothetical one.

There is a symmetry worth taking: `presentationFor(levels)` already derives
typography, measure and spacing for a *worksheet* from a learner's barrier levels.
The same vocabulary can adjust the interface for the person reading it.

## Who is looking at it

- A special-education teacher, commonly 45–55, on a school laptop that is several
  years old, frequently **1366×768**.
- Working in a 45-minute gap between classes, or on a Sunday evening.
- Sometimes with her own visual or motor needs.
- Who has never used AI and will judge whether this is a serious professional tool
  in about four seconds.

"Modern" for this person is not the same as modern for a developer with a 27-inch
display. The design target is **1366×768 with generous type**, and anything that
only works on a large screen has failed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - It reads as a serious professional tool (Priority: P1)

She opens it and it looks like something made for her job — not a demo, not a toy,
not a developer's admin panel.

**Why this priority**: She decides whether to trust this in the first seconds, and
that judgement gates everything the project wants to learn from her. A tool that
looks unfinished makes every subsequent flaw feel predictable.

**Acceptance Scenarios**:

1. **Given** any screen, **When** it is shown at 1366×768, **Then** it is complete
   at that size with no horizontal scrolling and no clipped controls.
2. **Given** every screen, **When** reviewed, **Then** none is a placeholder: no
   raw `<pre>` dumps standing in for a designed view, no unstyled default
   controls, no screen visibly less finished than the others.
3. **Given** the interface, **When** she reads it, **Then** its typography, colour
   and spacing are one coherent system rather than per-screen decisions.
4. **Given** the application, **When** compared with the worksheets it produces,
   **Then** they are recognisably the same product.

---

### User Story 2 - Accessible by default, with no mode to find (Priority: P1)

Every screen meets WCAG 2.2 AA out of the box, for every teacher, with no
setting to discover and no question at first run.

**Why this priority**: Equal P1, and it is the credibility of the whole project.
An application about access whose own interface fails access has said something
about itself that no feature can retract.

**Acceptance Scenarios**:

1. **Given** any screen in either theme, **When** measured, **Then** text contrast
   is at least 4.5:1 and non-text indicators at least 3:1.
2. **Given** any interactive control, **When** focused by keyboard, **Then** the
   focus state is clearly visible against its own background, and every action is
   reachable and operable by keyboard alone.
3. **Given** any state — error, warning, success, draft, selected — **When** shown,
   **Then** it is conveyed by more than colour alone.
4. **Given** the interface at 200% text zoom, **When** used, **Then** nothing is
   lost or overlapped and no content becomes unreachable.
5. **Given** a screen reader, **When** it traverses a screen, **Then** headings,
   labels, live regions and error associations are correct and the order is
   meaningful.
6. **Given** first run, **When** it happens, **Then** **no accessibility question
   is asked**, because the default already is one.

---

### User Story 3 - She can adjust it to her own eyes (Priority: P2)

Text size, contrast, motion and theme are hers to change, in one obvious place,
without hunting.

**Why this priority**: Not needed for the first ten minutes, and needed for the
teacher who cannot use the default comfortably — including the teacher who has a
disability herself.

**Acceptance Scenarios**:

1. **Given** the preferences, **When** she opens them, **Then** she finds text
   size, higher contrast, reduced motion and theme, described in her words and not
   as standards ("Letra más grande", not "escala tipográfica").
2. **Given** any preference, **When** she changes it, **Then** the whole interface
   responds immediately, and the choice survives a restart.
3. **Given** the operating system's own settings for contrast, reduced motion and
   theme, **When** the application starts, **Then** they are respected as the
   initial values without her being asked.
4. **Given** the largest text size, **When** applied, **Then** every screen still
   works at 1366×768 — the setting is not a trap that breaks layouts.
5. **Given** reduced motion, **When** set, **Then** no animation conveys meaning
   that is then lost.

---

### User Story 4 - The draft mark is unmissable and calm (Priority: P1)

Adapted material announces that nobody has signed it, in a way she cannot
overlook and that does not make the application feel broken.

**Why this priority**: It is Principle VII made visible, and she will see this
mark on every worksheet she ever produces, before every signature. Loud enough to
be an alarm would make the product feel permanently in error; quiet enough to miss
would defeat the rule.

**Acceptance Scenarios**:

1. **Given** unsigned material on screen, **When** shown, **Then** the state is
   unmistakable at a glance and is stated in words, not only in colour.
2. **Given** unsigned material printed, **When** printed, **Then** **every page**
   carries the mark, because pages get separated.
3. **Given** the mark, **When** she has seen it many times, **Then** it still reads
   as a state of the document rather than as a warning about a fault.
4. **Given** sign-off, **When** recorded, **Then** the change of state is
   immediately legible on screen and in print.

---

### User Story 5 - What she is deciding is what stands out (Priority: P1)

On every screen, the thing she must decide is the most prominent thing, and the
machinery around it recedes.

**Why this priority**: This is where "clean" earns its keep. The review screen is
the case that matters most — her professional judgement is the product — and today
it is a grey box with a text dump inside it.

**Acceptance Scenarios**:

1. **Given** any screen, **When** she looks at it, **Then** the primary action or
   decision is identifiable without reading everything.
2. **Given** the review screen, **When** shown, **Then** the adaptation report is
   a designed reading experience grouped by decision, and what was **not** done
   leads it.
3. **Given** a screen with one decision, **When** shown, **Then** it does not
   present competing calls to action of equal weight.
4. **Given** anything the application asks her to confirm, **When** shown, **Then**
   the consequence is stated before the button, not after it.

### Edge Cases

- **1280×720 or a scaled display.** Below the target; must degrade gracefully
  rather than break, and be stated as the floor.
- **A Windows high-contrast theme.** Respected rather than overridden by our own
  colours.
- **Atkinson Hyperlegible is not installed**, which is the common case: the
  fallback must be chosen and tested, not inherited. Bundling the face is a
  licensing and size question for the plan.
- **A very long report, or a very long list of learners.** Designed states, not
  accidental scrollbars.
- **Empty states** — no learners, no jobs, no notes. These are the first thing she
  sees, so they are designed, and each says what to do next.
- **A failure mid-adaptation.** The error is part of the design, not a red box
  bolted on.
- **Text at 200% with the largest preference set** — the compounding case, which is
  where layouts break.
- **Long Spanish strings.** Spanish runs 15–25% longer than English; buttons and
  labels must not clip, and a future locale must not either.

## Requirements *(mandatory)*

### The system

- **FR-801**: One token system MUST define colour, typography, spacing, radius and
  elevation, and every screen MUST derive from it. No per-screen values.
- **FR-802**: The system MUST be hand-written CSS with custom properties, per
  `006` R10 — no utility framework, so a contributor reading a stylesheet can see
  what a colour does.
- **FR-803**: The type scale MUST be explicit and finite, and every text size in
  the application MUST come from it.
- **FR-804**: Base body text MUST be at least 17px at the default preference, and
  interactive targets at least 44×44px.
- **FR-805**: The design MUST be complete and correct at 1366×768. A layout that
  requires more MUST NOT ship.
- **FR-806**: Light and dark themes MUST both be designed, not derived by
  inversion, and MUST both meet the contrast requirements.
- **FR-807**: The interface and the worksheets it produces MUST read as one
  product, sharing typography and palette while remaining distinguishable.

### Accessibility as the floor

- **FR-808**: Every screen MUST meet WCAG 2.2 level AA by default, with no
  setting required.
- **FR-809**: There MUST NOT be an "accessibility mode", and first run MUST NOT
  ask any accessibility question.
- **FR-810**: Text contrast MUST be ≥4.5:1 and non-text indicators ≥3:1, in both
  themes and at every preference combination.
- **FR-811**: Every action MUST be keyboard-operable with a visible focus state
  that meets contrast against its own background.
- **FR-812**: No state MUST be conveyed by colour alone.
- **FR-813**: The interface MUST remain usable at 200% text zoom with no loss of
  content or function.
- **FR-814**: Headings, labels, error associations and live regions MUST be correct
  for a screen reader, and reading order MUST be meaningful.
- **FR-815**: Automated accessibility checks MUST run in CI over every screen, and
  MUST fail the build. This closes `006` T075, which has been pending since the
  target was stated.

### Her own preferences

- **FR-816**: The application MUST offer text size, higher contrast, reduced motion
  and theme, in one place, described in her words rather than as standards.
- **FR-817**: Operating-system preferences for theme, contrast and reduced motion
  MUST be respected as initial values without asking.
- **FR-818**: A preference change MUST apply immediately across the interface and
  MUST survive a restart.
- **FR-819**: Every preference combination MUST satisfy FR-805 and FR-810 — a
  preference that breaks a layout or drops contrast is a defect, not a choice.
- **FR-820**: Preferences MUST be stored as her settings, outside the vault, and
  MUST NOT travel in a handover or a backup of learner data.

### State, and the draft mark

- **FR-821**: The draft state MUST be unmistakable on screen, stated in words as
  well as in form, and MUST NOT read as an application error.
- **FR-822**: Printed unsigned material MUST carry the mark on **every page**.
- **FR-823**: Sign-off MUST produce an immediately legible change of state, on
  screen and in print.
- **FR-824**: Error, warning, success, empty and loading states MUST be designed
  parts of the system, not per-screen improvisations.

### Hierarchy

- **FR-825**: Every screen MUST have exactly one primary action or decision, and
  it MUST be the most prominent element.
- **FR-826**: The adaptation report MUST be a designed reading experience grouped
  by decision, leading with what was not done. A raw text dump MUST NOT ship.
- **FR-827**: Any confirmation MUST state its consequence before its control.
- **FR-828**: Empty states MUST be designed and MUST each say what to do next.

## Success Criteria *(mandatory)*

- **SC-801**: Automated accessibility checks pass on every screen, in both themes,
  at default and largest text size — zero violations, enforced in CI.
- **SC-802**: Every screen is fully usable at 1366×768 with no horizontal scroll,
  verified in the end-to-end suite.
- **SC-803**: Keyboard-only completion of the whole first-run journey, from install
  to a printed worksheet, with no mouse.
- **SC-804**: At 200% zoom with the largest text preference, no screen loses
  content or function.
- **SC-805**: A teacher shown the application says, unprompted, that it looks like
  a professional tool. Asked as an open question during Phase 0 observation, and
  recorded verbatim — including if the answer is unflattering.
- **SC-806**: She finds the display preferences without being told where they are.
- **SC-807**: Shown an unsigned worksheet, she correctly says it has not been
  reviewed, without being prompted about the mark.
- **SC-808**: No screen contains an undesigned state: every empty, loading and
  error state has a specified appearance, verified by inspection against a list.

## Assumptions

- **The palette is v2 of the design system, approved 2026-08-28.** Teal keeps the
  brand hue but with real chroma, and there are five families each carrying a
  bright end (fills, borders, icons, glows, dark grounds, progress) and a deep end
  (anything that carries text). Depth is real elevation tinted with the brand hue.
  The typeface is Atkinson Hyperlegible — designed for low-vision reading, in an
  application about access, which makes the identity mean something rather than
  decorate, and it is what the worksheets already render in.
- **The component library is the source of truth for the visual system**, and it
  lives outside `app/` until this feature is implemented. `tokens.css` and
  `components.css` are lifted from it verbatim; the previews are how a change is
  reviewed before it reaches a screen.
- **Craft applies to every screen.** There is no screen where a placeholder is
  acceptable. Hierarchy still means some things are quieter than others — that is
  what makes the prominent things read, and it is not the same as neglect.
- **Atkinson Hyperlegible will not be installed on her machine.** Whether to bundle
  it — licence, file size, and the fallback if it is absent — is a decision for the
  plan.
- **This is not a rebrand.** There is no logo, no marketing site and no brand
  guideline in scope. It is the interface of a tool.
- **Motion is used sparingly and never carries meaning**, so that honouring reduced
  motion costs nothing.
- **Phase 0 measures SC-805 and SC-806 with the same teacher and the same session**
  as everything else. No separate design review with people who are not the user.
