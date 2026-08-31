# Implementation Plan: The other outputs, and the route she answers by

**Branch**: `019-modalidades` · **Spec**: [spec.md](spec.md) · **Date**: 2026-08-31

> **Written after US1 and US4 were built**, which is the wrong order and is
> recorded as such in [spec.md](spec.md). The Constitution Check below therefore
> reports what *did* happen rather than what was going to, and the sequencing
> section is honest about the parts that are still ahead — which are the parts
> that needed a plan.

## Summary

Every modality is a rendering of the same adapted IR. Four are named: editable
(ODT), audio-ready, braille-ready, and the response route (`MOT`).

**Two are done.** The editable export ships, and `MOT` selects a recipe. The two
that remain are the two that need somebody who is not me.

## Technical Context

| | |
|---|---|
| **ODT** | `packages/core/src/render/odt.ts` + `render/zip.ts` — hand-written ODF, store-only ZIP, no dependency |
| **Wiring** | `jobs/export.ts` (no Electron), `ipc/print.ts`, `job:odt` |
| **`MOT`** | `recipes/core/response-route.md` — corpus, per Principle I |
| **Audio** | Not built. An audio-*ready* document, never a bundled speech engine |
| **Braille** | Not built. Needs a transcriber to say whether it is workable |
| **New dependencies** | None, and this was a decision — see below |

## Constitution Check, reported rather than predicted

| Principle | What actually happened |
|---|---|
| **I** · judgement in Markdown | `MOT`'s answer went to `recipes/core/`, not to code. The ODT's *styles* are code, correctly: how bold renders in ODF is not pedagogical judgement |
| **II** · deterministic core | The ZIP is byte-deterministic with fixed timestamps. Not tidiness: this project compares documents, and a container whose bytes move with the clock makes "is this the same sheet?" unanswerable |
| **III** · adapt the how | **The `MOT` recipe is Principle III at its sharpest.** A changed response route is access; a changed question is a different assessment. The recipe's anti-patterns carry that line |
| **IV** · one extraction, N outputs | **Tested for the first time, and it held.** The ODT needed no field the IR did not already have, which is the first evidence for a claim that had never been exercised |
| **V** · barriers not diagnoses | The recipe refuses to choose a route from the axis: `MOT: 2` does not say *why*, and cerebral palsy, a broken wrist and dysgraphia share the axis and share no solution |
| **VI** · traceability | Unchanged |
| **VII** · the draft announces itself | The mark is the **first paragraph**, not a page header — a header lives in the page style and whether a word processor carries it through an open-edit-save cycle depends on the editor. And it is derived from the document, never passed in (`007` FR-509) |
| **VIII** · human-routed memory | Unchanged |
| **IX** · content is never instruction | The ODT runs `checkOutput` on the same document as the HTML path. A modality that skipped it would be the first parallel pipeline Principle IV forbids, arriving as an omission |

**Gate: passes.** One thing it would have flagged in advance and did not have to:
`renderOdt` was written inside `jobs/print.ts`, which imports Electron — and the
boundary test failed on the line count before anybody reviewed it.

## The dependency decision

`node:zlib` exposes `crc32` natively in Node 24, so a store-only ZIP is sixty
lines. `jszip` (via `mammoth`) and `archiver` (via `electron-builder`) were both
resolvable and both rejected: **a dependency reached through somebody else's
`package.json` is a dependency nobody declared.** It upgrades without review and
disappears when the package that brought it changes.

Store-only rather than deflate: ODF permits it, a worksheet is a few kilobytes,
and compression is the one part of a ZIP writer that is easy to get subtly wrong.

## Sequencing

1. ~~ODT, with tests, including one that opens it~~ — **done**.
2. ~~`MOT` selects a recipe~~ — **done**.
3. **Audio.** Blocked on a question this feature has not answered: what the
   reading order is when the visual layout *was* the point — a matching exercise,
   a number line. That is where the IR's promise gets tested hardest, and guessing
   at it produces a file nobody uses.
4. **Braille-ready.** Blocked on a person: SC-1706 needs a transcriber or a blind
   learner's teacher to say whether the output is workable, and there is no
   substitute for that.

## Complexity Tracking

Nothing to justify. One thing declined: no bundled speech engine. It is a large
dependency with a per-language quality problem nobody here can judge, and the spec
already says audio means an audio-*ready* document.
