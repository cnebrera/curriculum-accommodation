# Implementation Plan: El registro, y cómo llega ella a él

**Branch**: `036-el-registro` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/036-el-registro/spec.md`

## Summary

Write down the rules a log subsystem has been obeying without a requirement, and give her
a way to reach the file — inside «Acerca de», with its location, its recent lines and a
copy, plus opening the folder so she can attach it herself.

The approach is deliberately thin: **three IPC channels already exist and are called by
nothing** (`diagnostics:path`, `diagnostics:reveal`, `diagnostics:tail`). So this is one
section, three hooks, a clipboard write, and the tests that make thirteen requirements
checkable. No logger change (FR-3414), no new channel, no new destination.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 22, React 18, Electron — as the rest of the
repository. No new dependency.

**Primary Dependencies**: none added. The clipboard is `navigator.clipboard`, which is in
the renderer already; the folder opens through the existing `shell.showItemInFolder`
channel.

**Storage**: the log file in the OS application-data directory, and its one rotation
beside it. **Not the vault** (FR-3402), which is the whole point of where it lives.

**Testing**: `vitest` for the log's rules, `playwright` for the screen, `035`'s network
counter for SC-3404.

**Target Platform**: the desktop application, all three platforms.

**Project Type**: desktop application (renderer + main process over IPC).

**Performance Goals**: the screen renders a bounded tail — 200 lines — of a file that may
be 2 MB. Reading 2 MB to show 200 lines is the shape to avoid; the existing channel
already returns a tail rather than the file.

**Constraints**: offline. Opening the screen must reach nothing (FR-3413), which `035`'s
counter measures rather than asserts.

**Scale/Scope**: one section inside an existing screen. Thirteen requirements, most of
them descriptions of behaviour that already ships.

## Constitution Check

*GATE: passed before Phase 0. Re-checked after Phase 1 — see the bottom of this file.*

This is where the check earned its keep, and it produced three findings rather than a tick.

### IX · Content is never instruction (NON-NEGOTIABLE) — **the sharp one**

A log line can carry a fragment of a document. `logger.error('uncaught', { message:
e.message.slice(0, 200) })` records an exception message, and an exception thrown while
handling untrusted material can quote that material. **So the log is content when
displayed**, and this feature puts it on a screen and in her clipboard.

Consequences, and they are requirements rather than good intentions:

- Shown as **text**, never rendered as markup (FR-3410). React escapes by default, so the
  defence is «do not reach for `dangerouslySetInnerHTML`» — which is exactly the kind of
  instruction the principle says is weaker than structure. So the plan adds a test that
  asserts the section renders no HTML from the log, not a comment asking future authors
  to be careful.
- The **copy** goes the same way: what reaches her clipboard is the text of the log.

### Learner data · pseudonymisation is structural, not advisory — **a positive finding**

The check asked whether «the log never contains a learner's name» is enforced or merely
intended, and the answer is **enforced, at one chokepoint**: `sanitise()` runs inside
`Logger.log`, with a forbidden-key list (`name|nombre|content|text|body|payload|prompt|
material|quote|source`) and a rule that any string over 120 characters is «material until
proven otherwise» and is replaced by its length.

That is the structural defence Principle IX asks for, and it means FR-3401 describes
something real. **But the check also found its edge**, and it matters more now that the
file is displayed:

> The forbidden-key list is structural for the keys it knows and advisory for the ones it
> does not. A short string under an unlisted key — `logger.info('x', { child: 'Lucía' })` —
> is neither long enough for the length rule nor named in the list, and would be written.

There are 114 call sites. So the plan does not trust the list: **SC-3402 becomes a test
over a real session** — adapt material for a named learner, then assert the file contains
zero occurrences of that name. That is the difference between «the sanitiser has a good
list» and «no name reached the file».

### II · Code is deterministic and model-free

No model, no key, no provider. The screen reads a file. Trivially satisfied and recorded
because the check is a gate and not a formality.

### VIII · Memory is plain files the teacher owns

Worth stating what this feature is **not**: the log is not memory. Memory is hers, lives in
her vault, and she routes it. The log is a diagnostic that lives outside the vault
precisely so it does not travel with her work (FR-3402). Two different things that both
happen to be plain files, and conflating them is how a diagnostic ends up in a handover.

### No gate violated. Two things the design must carry

1. The log-as-content test (Principle IX), not a comment.
2. The name test over a real session (learner data), not the sanitiser's list.

## Project Structure

### Documentation (this feature)

```text
specs/036-el-registro/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── checklists/
│   └── requirements.md  # from /speckit-specify, re-validated at /speckit-clarify
└── tasks.md             # /speckit-tasks — not created here
```

### Source code

```text
app/
├── packages/core/src/
│   └── log.ts                        # UNCHANGED (FR-3414). Its rules become FR-3401/3403/3405
├── packages/shell/src/ipc/
│   └── diagnostics.ts                # UNCHANGED. Its three channels finally get a caller
├── ui/src/data/
│   └── diagnostics.ts                # NEW · three hooks over the three existing channels
└── ui/src/about/
    └── LogSection.tsx                # NEW · the section: where it is, its lines, copy, open folder

app/packages/core/test/
└── log-carries-nothing.test.ts       # NEW · FR-3401's edge, and the sanitiser's chokepoint

app/packages/shell/test/
└── log-rules.test.ts                 # NEW · FR-3402 (outside the vault), FR-3403, FR-3405

app/e2e/
└── log.spec.ts                       # NEW · US1 and US2, and SC-3404 with the counter
```

**Why `LogSection.tsx` and not more of `AboutScreen.tsx`**: that screen is already 230
lines carrying the version, the licences, the update consent and the declared
destinations. A fifth subject inside it is how a screen becomes a file nobody can review,
and `020` spent a whole specification undoing exactly that in `LearnersScreen`.

## Constitution Check · re-evaluated after Phase 1

*The template asks for this and it is not a formality: the design is where a principle
gets broken by a convenience.*

**Still no gate violated**, and the design surfaced one thing the pre-design check had not
seen:

### The clipboard is a second egress and nobody had called it one

`034` FR-3204 and the amended `007` FR-511 make network destinations **declared, all of
them**, and this repository has a test that reads the declared list and compares it with
the code that reaches out. A clipboard is not on that list and does not belong on it — it
is not a host and there is no connection.

But it *is* a way content leaves the screen, and the design nearly missed the consequence:
**what reaches the clipboard must be the same text that is on screen**. Copying a rendered
version — markup, a link or styling that a document fragment talked its way into — would
break Principle IX at the one point where nobody would look, because a clipboard has no
appearance to inspect. Written into FR-3410 and into research R4, and it will be a task
rather than a comment.

### And one thing the design confirms rather than finds

Reading `packages/core/src/log.ts` to write the data model confirmed the pre-design
finding: `sanitise()` is at the chokepoint inside `Logger.log`, not at the call sites. So
FR-3401 describes something real, its edge is a short string under an unlisted key, and
extending the key list is **out of scope by FR-3414** — recorded in research R1 so it
arrives as its own decision instead of riding in on this one.

Codes stay allowed on purpose, and that is the subtlety worth keeping: a code is the
pseudonym, and it is the only way a log line can say *which* job. Forbidding it would
blind the diagnostic to the one identifier it is entitled to.

## Complexity Tracking

Nothing here needs justifying against the constitution. The one judgement worth recording
is what was **left out**: no search, no severity filter, no colouring, no log level
selector. She is reading it to check what she is about to send, not to debug — and every
one of those would be a reason to render the log as something other than text, which is
the one thing Principle IX forbids here.
