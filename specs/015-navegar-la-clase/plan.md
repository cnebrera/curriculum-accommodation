# Implementation Plan: Navigating a caseload

**Branch**: `015-navegar-la-clase` · **Spec**: [spec.md](spec.md) · **Date**: 2026-08-31

## Summary

Search by name, filter by course and school year, and one alternative view — with
four requirements whose entire job is to stop this becoming a ranking of children.

## What exists to build on

`LearnersScreen` lists cards through `useLearners()`, which already joins codes to
names to profiles. `014` shipped the record, so «who did I work with this year» is
answerable. `011` supplies course and stage. So the data is there and the work is
the interface — which is exactly where this feature is dangerous.

## Technical Context

| | |
|---|---|
| **Filtering** | `packages/core/src/roster/filter.ts` — pure, deterministic, testable without a screen |
| **Search** | In the renderer, in memory. Never a persisted index (FR-1302) |
| **New field** | `school`, optional free text on the profile |
| **Views** | List (today's) and grouped. **No table** |
| **Screens** | `LearnersScreen` gains a filter bar |
| **New dependencies** | None |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | Untouched — a filter is not a judgement about a child |
| **II** · deterministic core | The filter is a pure function over rows. It goes in `core` so it can be tested against forty learners without a window |
| **III** · adapt the how | Untouched |
| **IV** · one extraction, N outputs | Untouched |
| **V** · barriers not diagnoses | **This is the whole feature's risk, and it is not a checklist item.** See below |
| **VI** · traceability | Untouched |
| **VII** · the draft announces itself | Untouched |
| **VIII** · human-routed memory | Untouched |
| **IX** · content is never instruction | A `school` she typed is her own text, not ingested content. But it is rendered, so it renders as text |

### Principle V, designed against rather than checked afterwards

The obvious build for "views and filters over thirty learners" is a sortable
table, and the columns available are the nine axis values. **A grid of children
sortable by their axis values is a league table of disability.**

Three things follow, and they are requirements rather than intentions:

- The filter lives in `core` and returns **rows in a stable order**. It cannot
  sort by an axis because it is never given one to sort by — the barrier is
  structural, not a rule somebody remembers.
- No view renders two learners' axis strips as aligned columns. `005` T019
  already asserts this in the e2e suite; `015` extends the same assertion to the
  views it adds.
- No total, no average, no count of barriers per child. `014` already asserts the
  absence on the record screen; the same assertion moves to the caseload.

**Gate: passes**, and the mitigation is that the shape which would violate it —
a table — is not built at all.

## The two things that are less obvious than they look

**Search must not create an index.** Matching on the name she sees means
decrypting names, and the tempting optimisation is to cache the map. That cache
would be a plaintext copy of the encrypted name map, which is the one thing the
whole substitution design exists to prevent (`014` FR-1207). So: resolve in
memory, per keystroke, over at most forty entries — which is free.

**A missing field must not make a child disappear.** A learner with no course, no
school and no age is exactly the learner she added in a hurry because he needed
something tomorrow. Every filter therefore has an explicit «sin curso» rather than
silently excluding.

## Phase 0 · Research

[research.md](research.md) — why there is no table, and what forty means.

## Phase 1 · Design

- [data-model.md](data-model.md) — `school`, and what filtering is derived from.
- [contracts/roster.md](contracts/roster.md) — the filter's shape and the never-sent set.
- [quickstart.md](quickstart.md) — including the assertion that no ranking is constructible.

## Sequencing

1. The filter in `core`, with tests over forty learners.
2. `school` on the profile, and in the never-sent set and the erasure plan.
3. The filter bar, and search.
4. The grouped view.
5. The assertions that this did not become a dashboard.

## Complexity Tracking

Nothing to justify. One thing declined on purpose: **no saved filters, no
"recent", no default filter.** A filter she set on Friday and forgot is a caseload
that looks half-empty on Monday, and the first thing she concludes is that Rampa
lost her learners.
