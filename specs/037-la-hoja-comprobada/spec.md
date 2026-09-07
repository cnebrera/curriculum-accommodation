# Feature Specification: La hoja que recibe el niño, comprobada

**Feature Branch**: `037-la-hoja-comprobada`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: «Rampa declara WCAG 2.2 AA para su HTML de salida y nada lo
comprueba. Y al medirlo apareció que `data-heading` lo escribe el ingest y no lo lee
nadie: la hoja no tiene ni una cabecera.»

## Why this specification exists

**The product is the sheet, and it is the one thing nobody was checking.**

`packages/core/src/render/html.ts` declares its own conformance target in a comment —
«Accessibility target: WCAG 2.2 level AA» — and no test anywhere asserts it.
`contrast.test.ts` checks the **application's** palette. `a11y.spec.ts` sweeps every
screen of the application at four modes and three widths, and explicitly excludes the
sheet:

> The frame's **contents** are deliberately out of scope: that is a rendered worksheet,
> whose accessibility is `007`/`019`'s business and **is checked where those renderers
> are**.

It is not checked where those renderers are. It is not checked anywhere. The sweep
exempted itself by pointing at a coverage that does not exist — which is the same defect
class as a task note claiming to be blocked by a shipped feature, in the place where it
costs the most.

### What measuring found, on 2026-09-07

| Level | Result |
|---|---|
| WCAG 2.2 A/AA over a real adapted sheet | **zero violations** |
| Best practice | **one** — «Page should contain a level-one heading» |

So the declared target **is met**, and what is missing is the proof. But the second row is
a real defect, and it is invisible at A/AA:

**`data-heading="true"` is written by the ingest (`ingest/to-ir.ts`) and the renderer
never reads it.** A heading on the original worksheet — «Los ecosistemas» — comes out as
a paragraph inside a `<section>`. **The sheet has no headings at all.**

That is the sixteenth instance of this project's signature defect — a field written,
typed and read by nothing — and the first one found in the artefact a child receives.

And it is not cosmetic:

- For a learner with an executive-function barrier, headings are **how a page becomes
  navigable**, and `recipes/core/signpost-the-page.md` is a core recipe firing on
  `EJE>=2` that promises exactly that. The corpus promises signposting and the renderer
  flattens it.
- For a learner using a screen reader, headings are the primary means of moving through a
  document. A flat wall of paragraphs is a document that can only be read start to finish.

### The lesson this specification is built on

**«axe is green» is not «the sheet is navigable».** A conformance checker cannot tell that
the structure of the source was lost, because the result is valid HTML that says something
different. So the checking has two layers and neither replaces the other.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The sheet keeps the shape the original had (Priority: P1)

A worksheet arrives with a title and two section headings. She adapts it. What comes out
still has a title and two section headings — so a learner who navigates by them can, and
one who is finding his place on the page has something to find it by.

**Why this priority**: it is the defect. Everything else here is proof; this is the
repair.

**Independent Test**: adapt a document whose IR carries `data-heading` blocks and confirm
the rendered sheet contains real headings, in the source's order.

**Acceptance Scenarios**:

1. **Given** an IR block marked as a heading, **When** the sheet is rendered, **Then** it
   is a heading element and not a paragraph.
2. **Given** several heading blocks, **When** the sheet is rendered, **Then** their order
   is the source's and the levels do not skip.
3. **Given** an IR with no heading blocks, **When** the sheet is rendered, **Then** no
   heading is invented — a document without headings is rendered as one (Principle III).

---

### User Story 2 - The declared target is proven, not claimed (Priority: P2)

The sheet's conformance target stops being a comment and becomes a measurement, over the
three shapes a sheet actually takes: a draft, a signed one, and one set for large text.

**Why this priority**: the target is already met, so this is insurance rather than
repair — but it is the insurance whose absence let US1's defect live in the output for
weeks.

**Independent Test**: run a conformance check over each of the three presentations and
find nothing.

**Acceptance Scenarios**:

1. **Given** an adapted sheet, **When** it is checked against WCAG 2.2 A and AA,
   **Then** nothing is found — in the draft, the signed and the large-text presentation.
2. **Given** a sheet carrying pictograms, **When** it is checked, **Then** every image
   still carries its description.

---

### User Story 3 - What a conformance checker cannot see is checked too (Priority: P3)

The properties that make a sheet usable and that no automated conformance level covers:
one document language, a heading structure that does not skip, every image described,
tables with header cells, nothing that steals the keyboard.

**Why this priority**: US1's defect passes A/AA cleanly. Without this layer the same class
of loss happens again and the suite stays green.

**Independent Test**: assert each property over the rendered markup, and confirm that
re-introducing US1's defect fails it.

**Acceptance Scenarios**:

1. **Given** the rendered sheet, **When** its structure is examined, **Then** the document
   declares its language, headings do not skip a level, every image has a description, any
   table has header cells, and nothing carries a positive tab index or an inline handler.

---

### Edge Cases

- **A document with no headings at all.** Nothing is invented. Rendering a heading the
  source did not have is falsifying the *what* (Principle III), and it is the tempting fix
  for the best-practice warning.
- **A heading that is the only block.** Renders as a heading, and the sheet is one line.
- **A heading carrying markup-shaped text.** It is a heading whose text is that text; it
  is not parsed for structure (Principle IX).
- **A heading in a composed sheet**, where the content is Rampa's own rather than a
  teacher's document. Same rendering; the draft mark already says more there.
- **Pictograms inside a heading.** The heading keeps its text and the image keeps its
  description.

## Requirements *(mandatory)*

### Functional Requirements

#### The repair

- **FR-3501**: A block the IR marks as a heading MUST render as a heading element, not as
  a paragraph.
- **FR-3502**: Heading levels MUST NOT skip. A learner using a screen reader navigates by
  level, and a jump from one to three is a level he will look for and not find.

  **And the IR carries no level**, which makes this a decision rather than a lookup: the
  extraction records «this block is a heading» and nothing about hierarchy. So **every
  heading block renders at the same level**. Deriving a hierarchy — first one is the
  title, the rest are inside it — would assert that «Parte 2» is contained in «Parte 1»,
  which the source did not say. Adapting the *how* does not include inventing a structure
  the *what* never had (Principle III).

  The consequence, accepted with its eyes open: a conformance checker's **best-practice**
  level will keep asking for a level-one heading, and the sheet will keep not having one,
  because it has no title to put there. That is the honest end state and FR-3503 is why.
- **FR-3503**: A heading MUST NOT be invented where the source had none (Principle III).
  A sheet whose source was a flat wall of text is rendered as one.
- **FR-3504**: The order of headings MUST be the source's.
- **FR-3505**: A heading's text MUST be rendered as text (Principle IX): it is never
  parsed for further structure, and never becomes a link or a style.

#### The proof

- **FR-3506**: The rendered sheet MUST be checked against **WCAG 2.2 levels A and AA**,
  which is the target `render/html.ts` already declares, and the check MUST find nothing.
- **FR-3507**: The check MUST cover the three presentations a sheet actually takes: the
  draft, the signed one, and one set for the largest text.
- **FR-3508**: The check MUST run offline and MUST NOT require installing a browser
  (Principle II: every script runnable and testable offline, and a suite a contributor
  cannot run is a suite that stops being run).
- **FR-3509**: Beyond conformance, the sheet's structural properties MUST be asserted
  deterministically: one declared document language, headings that do not skip, a
  description on every image, header cells on any table, no positive tab index, no inline
  event handler.
- **FR-3510**: The two layers MUST be independent. Neither may be presented as covering
  the other — this specification exists because US1's defect is clean at A/AA.

#### What this MUST NOT do

- **FR-3511**: The viewer's `sandbox=""` MUST NOT be weakened. It executes no scripts on
  purpose (Principle IX), and a structural defence is not relaxed to make a test possible.
- **FR-3512**: No browser MUST be added to the toolchain, and no dependency added at all.
- **FR-3513**: The palette, the tokens and the presentation defaults MUST NOT change. This
  feature proves and repairs structure; a change of appearance riding along would be
  unreviewable.

### Key Entities

- **A heading block**: an IR block the extraction marked as a heading. It carries its text
  and its page, and **no level** — which is the whole of what makes FR-3502's answer a
  decision rather than a lookup.
- **A presentation**: the knobs a profile resolves to — size, measure, spacing, colours.
  Three of them are checked; they are the same document.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-3501**: A sheet adapted from a document with headings contains **the same number of
  headings** as the source marked, in the same order.
- **SC-3502**: A conformance check over the three presentations reports **zero** WCAG 2.2
  A/AA violations.
- **SC-3503**: Re-introducing the defect — rendering heading blocks as paragraphs — **fails
  the suite**. Verified by mutation, because the whole point is that the previous suite was
  green with the defect in it.
- **SC-3504**: The whole check runs with **no network access and nothing installed** beyond
  what the repository already carries.
- **SC-3505**: A document with no headings renders with none, and the suite is green — so
  nothing in this feature pressures the renderer into inventing structure.

## Assumptions

- **The check runs in the Chromium that Electron already carries**, from a hidden window in
  the main process. Measured before writing this: it works, it takes about four seconds,
  and it needs nothing installed. That is what makes FR-3508 and FR-3512 compatible rather
  than a tension.
- **The three presentations are draft, signed and largest-text.** Those are the three a
  sheet takes on paper; the rest of the knobs are numbers within the same structure.
- **`data-heading` stays the IR's spelling.** `ingest/to-ir.ts` already writes it and
  documents have it on disk. Changing the field would make every existing sheet's source
  unreadable for no gain.
- **A sheet with no visible title is a separate question, and not this one's.** The
  `<h1>` a best-practice check wants has nowhere to come from: the sheet's `<title>` is
  the constant «Material adaptado», nothing passes a real one, and inventing one is
  FR-3503. Whether the material a child receives should carry a name at all — «Ficha ·
  Los ecosistemas · 3.º de Primaria» — is a **content** decision rather than an
  accessibility one, so it is recorded in the BACKLOG rather than smuggled in here. If it
  is ever decided, the `<h1>` gets a home and this warning closes as a side effect.
- **The best-practice level of a conformance checker is not adopted wholesale.** It is
  where US1's defect showed up, and it is also full of advice this project has already
  decided against on purpose. FR-3509 enumerates what is asserted instead, so each property
  is a decision.

## Dependencies

- `001` — the IR and the renderer this repairs.
- `019-modalidades` — the modality work whose accessibility this was assumed to cover.
- `035-modo-ensayo` — the network counter, for SC-3504.
- `013-composicion-del-front` — the width and text-scale discipline the application's own
  screens are held to, and which the sheet has never been held to.

## Out of Scope

- Weakening the viewer's sandbox, in any way, for any reason.
- Installing a browser, or any dependency.
- Changing the palette, the tokens, or any presentation default.
- **A human audit of the printed artefact** — paper, a photocopier, a child in front of
  it. That is `022` SC-2005 and no automated check replaces it. This specification makes
  the machine-checkable part checked; it does not claim the rest.
- Braille, audio and ODT (`G8`, and `001` scopes them out).
