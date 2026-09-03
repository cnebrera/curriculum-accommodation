# Implementation Plan: El paquete de coordinación — dos docentes, dos vaults, un alumno

**Branch**: `030-el-paquete-de-coordinacion` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-03

## Summary

Two decisions shape everything here, and both were made before this plan — this plan's
job is to keep them structural rather than aspirational.

**First: derive from the handover, do not duplicate it.** `004` already built the
year-boundary packet and, more importantly, already learned its lessons: prose first
because the receiving teacher may not have the application, codes and never names,
anti-anchoring framing on the document's own face, a two-step IPC (draft for review →
write what survived review) so nothing leaves unreviewed. The coordination packet is the
same *family* — smaller, period-scoped, more frequent — so it reuses the family's rules
and primitives (`isStale`'s year rule, the evidence vocabulary, the name-free export
check, the `handover/` directory) and **does not reuse `buildPacket`**, because a whole-
profile June snapshot and a «what changed since the last packet» delta are different
documents that happen to be cousins (research R2). Notably, `004` **deferred its
receiving half** with a recorded reason (its T008): this feature builds the first import
path in the project, so there is no import machinery to duplicate — only `004`'s
reviewed-import *pattern*, specified but unbuilt, to finally build.

**Second: the human door is the security boundary.** Nothing from a packet is written to
the receiving vault without an explicit per-item accept (Principle VIII) — and that same
door is what contains the injection vector (Principle IX): packet content is scanned and
flagged before display, but even unflagged content *cannot do anything*, because the only
thing a packet can cause is a write the teacher explicitly chose. There is no auto-apply
to fail open. The blast radius of a hostile packet is one shown item, quoted and located.

The whole feature is deterministic: **no step of it calls a model.** Export is a read of
the vault; import is a read of a file plus writes the teacher chose. Only *applying* a
returned correction spends money, and that rides the correction paths that already exist.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Electron. No new dependencies.

**Storage**: the vault. Packets in `handover/` (where exports live today, FR-2803);
received-and-held packets in `handover/received/`; second-look corrections beside the
draft they are about. No database, no registry, no new top-level directory.

**Testing**: `vitest` for the packet module, the door and erasure; Playwright for the
two round trips (coordination and second look), driven over **two temporary vaults**,
because the feature's whole claim is about two machines.

| Feeds | What it gives |
|---|---|
| `004` · handover | The family rules: prose-first Markdown, codes only, anti-anchoring framing, the review-before-send two-step, `isStale`. And the deferred receiving half whose pattern this builds |
| `003` · memory | `appendNote` (dated, append-only), `saveProfile`, the erasure plan this feature's artifacts must fall inside (P38) |
| `006` · names | `redact`, `isClean`, `findProbableNames` — the export-time guarantee behind FR-2802; the encrypted map is per machine, which is *why* the packet travels by code |
| `007`/IR · injection | `detectInjection` — the same two-tier scanner every untrusted material passes (FR-2806) |
| `005`/`021` · revisions & sign-off | `jobAdaptedRevision`, `resolveDocument`, `isSignedOff`, the one sign-off chokepoint in `ipc/signoff.ts` that FR-2810 extends with a second fact |
| `026` · conversation | The rule, not the code (it is unplanned): a correction applied is a new revision, never an edit in place (FR-2809 rides today's correction paths and composes with `026` when it lands) |
| `014` · the record | `entryFor`/`scanRecord` supply the «recent material» item type without a second scanner |

**Where the work lands:**

| | What |
|---|---|
| `app/packages/core/src/memory/coordination.ts` | The packet: build, render to Markdown, parse back, fingerprint. Deterministic, offline |
| `app/packages/core/src/memory/forget.ts` | The erasure walk gains `handover/` — the plan and `verifyForgotten` both (FR-2803, P38) |
| `app/packages/shell/src/ipc/coordination.ts` | Export (draft → write), open, hold, link, accept — the door, one handler per act |
| `app/packages/shell/src/ipc/signoff.ts` | «revisada por <rol>» recorded beside the signature, from the imported review, never as a gate |
| `ui/src/coordination/` | Export screen, import screen (the door), the second-look annotation screen |
| `docs/memory.md` + interface copy | The advice against shared vaults (FR-2812) — a sentence, because there is deliberately nothing to build |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | The packet's framing sentences (what a `reported` claim is, «esto viene de otra aula») are document text a teacher must be able to read and correct — they live with the corpus/templates, not as string literals in `coordination.ts`. Nothing here encodes adaptation policy |
| **II** · deterministic core | **The entire feature calls no model.** Build, render, parse, scan, accept: filesystem and regexes. Every test runs offline with no key |
| **III** · adapt the how | Not engaged: the packet moves knowledge, it does not touch material content. Corrections *applied* go through the existing adaptation paths |
| **IV** · one extraction, N outputs | The draft travels for review as the document it already is; corrections come back and re-enter through the one revision mechanism. No parallel pipeline |
| **V** · barriers not diagnoses | The packet carries axis levels, works/avoid and notes — the same barrier language as the profile. Nothing diagnostic is added in transit |
| **VI** · traceability | FR-2805 **is** this principle at the vault boundary: every accepted item records packet, role, date — and `reported`, so the next report can say what it leaned on and how strongly |
| **VII** · the draft announces itself | The exported draft carries its mark because the mark is derived from the document (`007` FR-509) and the packet carries the document. The second look removes nothing: only the tutor's own sign-off does, and «revisada por» is a fact beside the signature, never a substitute for it |
| **VIII** · human-routed memory | **The feature's spine.** Import presents items; nothing writes without accept; scope and conflict («tu perfil dice X, el paquete dice Y») are her choice. SC-2802 instruments it |
| **IX** · content is never instruction | Packet content passes `detectInjection` before display (FR-2806), flagged text is quoted and located, never removed — and structurally, a packet has no executable path: the only effect it can have is a write a human chose. The door is the boundary |

**Gate: passes.** Two reservations recorded rather than resolved:

**SC-2804 needs two teachers.** The mechanism round-trips in tests; whether the loop fits
a school week — export, email, review, return, sign — is not answerable in this
repository, and it is the criterion the whole feature exists for.

**The sender's role is a claim.** The spec says so (asserted, not authenticated), and the
plan keeps it honest: the interface says «dice ser PT», the provenance marker stores the
claim as a claim, and no task adds cryptography-shaped reassurance. Theatre declined.

## Phase 0 · Research

[research.md](./research.md) — six questions. R1 and R2 shape the packet (one Markdown
file, front matter for the machine and prose for the person; family rules shared with
`buildPacket`, the builder itself not). R3 is the one that keeps the second look from
becoming an approval workflow: two facts, no gate. R5 found that erasure's current walk
**already misses `004`'s packets** (P38's finding), so this feature's task extends the
walk rather than adding its own directory to a list that was already wrong.

## Phase 1 · Design

- [data-model.md](./data-model.md) — `CoordinationPacket`, the provenance marker, the
  `second_look` fact, and what deliberately gains no field.
- [contracts/packet.md](./contracts/packet.md) — the packet file format (the interchange
  contract between two installations that never meet) and the import door's contract.
- [quickstart.md](./quickstart.md) — the walks: bytes first, the door second, money never.

## Sequencing

**The zero-names byte test before any packet can be written.** SC-2801 is the invariant
the whole design leans on — the packet travels *because* it is name-free — and a check
written after export works is a check written to fit what export already does.

**The door test before the import screen.** SC-2802 (zero writes without accept) is
asserted against the accept API, not the UI, so the screen is built against a rule that
already fails loudly.

**The packet module before either screen.** One builder, one renderer, one parser; two
screens reading them. Export and import implemented against different ad-hoc formats is
the two-copies defect between two *machines*, where it is hardest to see.

**US1 before US2.** The coordination round trip is the weekly reality; the second look
reuses its transport, its door and its provenance, adding only the draft payload and the
`second_look` fact.

**Erasure lands with US1, not after it.** FR-2803 makes packets erasable; a feature that
can export a child's barriers before erasure can reach the export is P38's finding
rebuilt on purpose.
