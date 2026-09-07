# Contract · what `renderHTML` promises about the sheet

The output of `renderHTML` is the artefact a child receives, printed or on a screen. This
is what it guarantees, and every line here is a requirement of `037` rather than a
description of the current code — two of them are not true yet.

## Structure

1. **The document declares its language.** From the IR's `lang`, defaulting to `es`.
2. **A block the IR marks as a heading renders as a heading element** (FR-3501), inside
   the block's own `<section>`, which keeps its id, its classes and its whole `data-*` set
   (Principle VI).
3. **Every heading is at the same level** (FR-3502). The IR carries no level and deriving
   one would assert a containment the source never stated.
4. **No heading is invented** (FR-3503). A source with no headings renders with none, and
   the document has no `<h1>` because it has no title (research R3, BACKLOG G59).
5. **Order is the source's** (FR-3504).
6. **A heading's text is text** (FR-3505, Principle IX): it is not a second parsing
   surface, and never becomes a link or a style.

## What the sheet may never contain

Stated here because this contract is the last thing between the pipeline and the paper, and
because each is already a requirement somewhere else that this artefact is where it lands:

- No learner name, no school, no code beyond the pseudonym (`011` FR-910, `015` FR-1306).
- No answer key on the sheet itself (`012`, `027`).
- No positive tab index and no inline event handler (FR-3509).
- Nothing remote: images are `data:` URIs, never links (`018` FR-1615) — a sheet emailed
  to a colleague without the set must still show its pictures, and a `file://` path would
  leak where her set lives.

## Conformance

7. **WCAG 2.2 levels A and AA, with nothing found** (FR-3506), over the draft, the signed
   and the largest-text presentations (FR-3507).
8. **Checked offline, with nothing installed** (FR-3508).

## And what conformance does not cover

9. The properties of clause 1–6 are asserted **deterministically and separately**
   (FR-3509/FR-3510), because a sheet with **no headings at all** passes A/AA cleanly.
   Measured, not assumed — it is what this feature was written from.

## What this contract does not promise

- That the **printed** artefact works on paper, through a real photocopier, in front of a
  child. That is `022` SC-2005 and it needs a person.
- Braille, audio or ODT. `001` scopes them out and `G8` records it.
