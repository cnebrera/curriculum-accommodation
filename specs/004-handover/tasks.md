# Tasks: Handover — what one teacher learned, without it becoming a label

**Prerequisites**: plan.md

**Tests**: Included. See plan.md: fourteen requirements, zero citations, and a
module that implements a good deal of them.

---

## Phase 1 · The sending half, which exists

- [x] T001 Write `app/packages/core/test/handover.test.ts` and assert FR-301 (the packet carries profile, notes, a summary and a reference to the official file) and FR-306 (**readable as prose with no tooling** — most receiving teachers will not have this application, so the markdown is the product and the JSON is an implementation detail) *(done. **FR-301 is partly met and the decision is recorded**: the dated notes are not carried, and the summary is where she writes the narrative — arguably better, since a raw dump of a year of notes is the label this spec avoids. The requirement should be amended rather than the code.)*
- [x] T002 Assert FR-302: every claim carries a date and an evidence marker. Record that a test can check the marker exists and only a human can check it is *true* *(done, incl. that the markers render in her words and not as an enum. Recorded that only a human can check a marker is *true*.)*
- [x] T003 Assert FR-303, and fix what it finds: axis levels carry `last_confirmed`. The current fallback is `?? today()`, which stamps **today** on an axis nobody ever confirmed — a fabrication on the one field whose whole job is to say how old the claim is *(done — **and it found a fabrication.** The fallback was `?? today()`, so an axis nobody had ever confirmed reached the receiving teacher dated today. Now empty, rendered as «sin fecha».)*
- [x] T004 Assert FR-311 (stale past one academic year), FR-312 (no re-identifying mapping) and FR-313 (states that it supplements the official file, and does not replace it) *(done, incl. that `isStale` does not guess at a malformed year.)*
- [x] T005 Resolve FR-304's shareable variant: `toShareable` strips **every** claim, so it can only ever return an empty packet. Either the concept belongs to `003`'s corpus export and not here, or the function is misleading. Decide, and record the decision rather than leaving a function whose only possible output is nothing *(done. `toShareable` can only ever return an empty packet, because a handover packet is entirely about one learner — the concept belongs to `003`'s corpus export. The flag is gone from the IPC surface: offering her a button whose only possible output is nothing is worse than not having it.)*

## Phase 2 · Review before sending

- [x] T006 Implement FR-305: the packet does not leave without the sending teacher's review, and FR-304's second half — what she removes in review is gone from the packet, not merely hidden *(done. What she removes is **dropped** from the packet, not flagged inside it — a flag protects nothing once the file is an email attachment.)*
- [x] T007 Build the review screen. Prose on the left, each claim removable, and the sentence about hypotheses visible before she reads the claims — because the packet's authority is the thing being managed *(done: `HandoverReview.tsx`. The limiting sentence is above the claims, because it is also the frame she should be reviewing within.)*

## Phase 3 · The receiving half — a decision, not an omission

- [x] T008 Decide and record whether the receiving half (FR-307 to FR-310, FR-314) is built now or deferred, **with the reason in `contracts/coverage.md`**. It is the half the spec calls hard, and it is the half that protects a child from being held inside last year's description. Deferring it silently would be the worst outcome; deferring it with a reason is a decision *(done — **deferred, with the reason recorded**: the receiving teacher does not have this application. The realistic case is one teacher uses Rampa and the other opens an attachment, so the mitigation is in the document rather than in an import path.)*
- [x] T009 If deferred: make the packet say so on its face. A packet whose receiving side does not exist yet must not read as though importing it is supported *(done. The packet argues against its own authority on its face: «no es un diagnóstico», «trátalas como hipótesis», «sin confirmar», and that a claim which no longer fits may mean the child changed.)*

## Phase 4 · Record

- [x] T010 Write `specs/004-handover/contracts/coverage.md` *(done.)*
- [x] T011 Record the audit in `specs/006-desktop-app/validation.md` *(done.)*
- [x] T012 [P] Add the handover suite to `.github/workflows/app.yml` *(done.)*

---

## Dependencies

T003 and T005 are fixes and depend on their assertions. T010 depends on everything.

## Implementation strategy

Phase 1 first: a module implementing an uncited spec is where the defects are.
Phase 3 is a decision and belongs after the audit, because what is worth building
depends on what already works.
