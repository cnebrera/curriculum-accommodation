# Tasks: El paquete de coordinación — dos docentes, dos vaults, un alumno

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-03

Twenty-nine tasks, and the first one is a test about a child's name in a file that gets
emailed. The packet travels *because* it is name-free; the check on its bytes is written
**before** any packet can be written.

The shape of the rest follows the plan's two decisions: one packet module that both
screens read (derived from `004`'s family rules, not from its builder), and one door
through which anything from a packet must pass a human — which is both Principle VIII
and the entire security model.

---

## Phase 1 · Setup · the two invariants, red first

- [x] T001 Write `app/packages/core/test/coordination-no-names.test.ts` **first**, red,
      per [quickstart.md](quickstart.md) §1. Over a seeded corpus whose profiles, notes
      and material titles are salted with real-looking names: export both packet kinds
      and inspect the **raw bytes** — no learner name (subject's or any other child
      mentioned in a note), no teacher name, no third party (SC-2801, FR-2802). Includes
      the gate case: a packet where a planted name survives redaction is **refused, not
      written**, and the refusal does not print the name
- [x] T002 [P] Write `app/packages/shell/test/coordination-door.test.ts` **first**, red,
      from quickstart §2: parse, scan, display, hold and link a packet with **zero vault
      writes** until the first explicit accept (SC-2802, FR-2804); a skipped item leaves
      no trace; every accepted claim is `reported` and **no code path writes `observed`
      from an import** (FR-2805 — P44 just made these markers honest in the handover;
      this test keeps the import from unmaking that from the other side)

---

## Phase 2 · Foundational · the packet module, before either screen

**Blocking**: nothing in Phase 3+ may start until this phase is green. Export and import
built against two ad-hoc formats is the two-copies defect between two *machines*, where
nobody can see the drift.

- [x] T003 `app/packages/core/src/memory/coordination.ts` · types per
      [data-model.md](data-model.md) and `buildCoordinationPacket(learner, period, role,
      record)` — notes sections dated within the period (from `appendNote`'s `## <date> ·
      <heading>` structure), material references from `record`'s `entryFor` (titles and
      dates, never content), profile deltas (axes via `axes_confirmed`; `works`/`avoid`
      with their real annotation dates and `''` where none — the `?? today()` fabrication
      lesson is written at length in `handover.ts`, and this builder inherits it). Corpus-
      scope journal entries never enter: they were never the packet's to carry (FR-2801)
- [x] T004 The renderer: front matter for the machine and prose body for the person,
      **written from the same `CoordinationPacket` in one pass** so the audited text and
      the imported data cannot diverge. Anti-anchoring framing on the document's face
      («esto viene de otra aula… quedará como “me lo contaron”») lives with the corpus
      templates, not as string literals in core (Principle I). Prose-readable with no
      tooling — the receiving colleague may not have Rampa (`004` FR-306's rule) (FR-2801)
- [x] T005 `parseCoordinationPacket(raw)` — deterministic, tolerant, offline per
      [contracts/packet.md](contracts/packet.md): unknown fields kept and surfaced,
      malformed file → readable refusal and no partial result, `academic_year` older
      than current → stale (reusing `004`'s `isStale` rule). Round trip asserted:
      render → parse → the same packet (quickstart §3)
- [x] T006 The export gate: final bytes through `redact()` with the **full** known-names
      map (a note about Marco can name Vega), `isClean()` as refusal — refusal, never
      sanitisation, the vault-boundary house rule — and `findProbableNames` flags
      surfaced for the export review step (FR-2802). The role field is the only sender
      identity: no name field exists on the type
- [x] T007 [P] Packet content through `detectInjection` before display — item texts
      wrapped as blocks and passed to **the existing scanner**, not a second one with
      its own opinions; flags quoted and located, never removed, never auto-skipped
      (FR-2806, Principle IX). Fixture packet from `cases/injection`'s patterns, per
      quickstart §4: `app/packages/core/test/coordination-injection.test.ts`

**Checkpoint**: T001 red→green for the module, T002 still red (no door exists yet), the
offline suite untouched.

---

## Phase 3 · User Story 1 · What I learned this week, to your vault (P1) 🎯 MVP

**Goal**: export from vault A, import into vault B, every accepted item attributed,
every skipped item traceless, no name anywhere in the file.

**Independent Test**: quickstart §5 end to end over two temporary vaults.

- [x] T008 [US1] `app/packages/shell/src/ipc/coordination.ts` · the export two-step,
      mirroring `memory:handoverDraft`/`handoverWrite`'s shape (the reviewed-export
      pattern is `004`'s, reused not duplicated): `coordination:exportDraft(code,
      period, role)` returns items for review; `coordination:exportWrite` writes only
      what survived — an unchecked item is **gone from the file**, not flagged in it.
      Written to `handover/<code>-coord-<date>.md`, period defaulting from the newest
      such file (the filesystem is the pointer — no stored `last_packet` field)
      (FR-2801, FR-2803)
- [x] T009 [US1] `ui/src/coordination/` export screen: learner, period, items with
      per-item uncheck, `findProbableNames` flags shown beside their items, and the
      once-only sentence that copies already sent are outside erasure's reach (the
      `003` «backups» honesty, extended to the thing this screen mails). Through a
      `ui/src/data/` hook, never `window.rampa` directly (013's rule)
- [x] T010 [US1] `coordination:open(path)` — parse, scan, stale-check, return items
      plus the door state. **Writes nothing.** Electron's file dialog stays in
      `packages/shell`; `boundary.test.ts`'s list grows by the one file that needs it,
      with its reason written (FR-2804, FR-2806)
- [x] T011 [US1] The door screen: items presented individually for accept/skip; an
      accepted note lands via `appendNote` with «→ recibido por paquete (<rol>,
      <fecha>)»; an accepted profile delta lands via `saveProfile` plus the dated note;
      the conflict case shows «tu perfil dice X, el paquete dice Y» and **she chooses —
      never a merge** (the edge case is the feature). Accept is the only writer
      (FR-2804, FR-2805)
- [x] T012 [US1] Provenance asserted structurally in T002's suite: packet filename,
      role, date on every accepted item, `reported` assigned by the receiver — the
      importer does not read an evidence marker from the file, because a packet
      asserting its own credibility is the anchor `004` exists to avoid (FR-2805)
- [x] T013 [P] [US1] Exported packets are **listed** — beside `004`'s in whatever
      surface lists handover today, with kind and date, so «what have I sent about this
      child» is answerable without a file manager (FR-2803)
- [x] T014 [US1] `app/e2e/coordination.spec.ts` from quickstart §5 over two temp
      vaults: export → import → accept/skip → attribution, the conflict choice, and the
      stale packet marked on sight

**Checkpoint**: the weekly reality works — two machines, one child, no hallway.

---

## Phase 4 · User Story 2 · «¿Me lo miras antes de firmarlo?» (P1)

**Goal**: draft out with its mark, corrections back beside it, applying makes a
revision, signing records «revisada por <rol>» as a fact — and never as a gate.

**Independent Test**: quickstart §6 round trip.

- [x] T015 [US2] Export-for-review: `coordination:exportDraft` gains the draft payload —
      the unsigned document **with its draft mark derived from the document** (`007`
      FR-509: the mark travels because the document does, never as a parameter), its
      report, job id, revision number and a byte fingerprint. Same name gate as any
      export; refuses a signed document (a second look at a signed sheet is a different
      conversation) (FR-2808)
- [x] T016 [US2] The annotation screen in the receiver's Rampa: the sheet rendered
      read-only in the **sealed viewer** (`021`'s `seal()` — packet content is
      Principle IX content and this document came from another machine), corrections
      composed as a list, exported back as a `review` packet bound to (job, revision,
      fingerprint) (FR-2808)
- [x] T017 [US2] Import of a review: corrections displayed **beside the draft**;
      accepting records them in `material/<job>/<learner>/second-look.md` (role, date,
      revision, packet file, corrections) — `review.md`'s own warning is the
      requirement: a correction not written down will be made again (FR-2808)
- [x] T018 [US2] Applying a returned correction runs **the existing correction path** —
      `runAdaptation` with corrections for adapted sheets, re-compose for composed ones
      — producing a new revision with the previous kept (`026` FR-2402's no-in-place
      rule; this feature adds no third mutation path, and composes with `026` when that
      spec is planned) (FR-2809)
- [x] T019 [US2] `app/packages/shell/src/ipc/signoff.ts` · at sign-off, if
      `second-look.md` exists for the resolved document, the review block gains
      `second_look: {by, date, revision}` — **two facts, one signer**: the signature
      stays one person's (`005` FR-512) and nothing anywhere reads `second_look` to
      allow or block signing. The control case is part of the test: signing with no
      review recorded shows nothing and was never impeded (FR-2810)
- [x] T020 [US2] Fingerprint mismatch: a review returned for a superseded revision is
      **declared** on import — «estas correcciones eran sobre la revisión 3; vas por la
      4» — and the corrections still offered, never silently attached to the current
      revision (FR-2811)
- [x] T021 [P] [US2] The record (`014`) shows «revisada por <rol> · <fecha>» beside the
      signature line for sheets that have it — a fact in the listing, styled as
      information and not as a badge of approval (FR-2810)
- [x] T022 [US2] `app/e2e/second-look.spec.ts` from quickstart §6, including the
      mismatch case and the no-review control case

**Checkpoint**: the tutor's blocking question — found verbatim by the persona review —
has an answer that is not «por el pasillo, en papel».

---

## Phase 5 · User Story 3 · A packet about a child I don't have (P2)

**Goal**: unknown code → nothing auto-links, hold exists, linking is explicit and
undoable, accepting attributes correctly.

**Independent Test**: quickstart §5 step 5.

- [x] T023 [US3] Unknown `code` on open: **no automatic match attempted** — codes are
      opaque and names absent by design, so matching is human; the screen says what the
      packet claims and offers link-or-hold. Hold copies the file **verbatim** to
      `handover/received/`, listed with the held ones (FR-2807)
- [x] T024 [US3] Link: explicit act, shown for confirmation before any item can be
      accepted, recorded as `linked: <local-code>` in the **local copy's** front matter
      (never in a file that travels), reversible until the first accept — undo removes
      the annotation and nothing else changed, because nothing else happened (FR-2807)
- [x] T025 [US3] Test the walk in T002's suite: import unknown → hold → link → undo →
      link → accept attributes to the linked learner; and the erasure hook — the
      `linked:` annotation carries the local code so `forget` can find a packet whose
      internal code it could never match

---

## Phase 6 · Erasure, the advice, and the parts that need people

- [x] T026 `app/packages/core/src/memory/forget.ts` · `planForget` lists
      `handover/<code>-*.md` and linked received copies; `verifyForgotten`'s walk gains
      `VAULT.handover` — it currently walks only profiles/material/output/memory, so
      **`004`'s packets were already invisible to it** (P38's finding; the full
      five-residue fix is `003`'s revision, but this feature must not ship a packet
      that widens the open gap). Test per quickstart §7:
      `app/packages/core/test/forget-handover.test.ts` (FR-2803)
- [x] T027 [P] FR-2812, the deliberate absence: no shared-vault mode is offered
      anywhere, and the documentation (`docs/memory.md`, the vault-choice interface
      copy) **advises against** two writers on one synced folder, naming the packet as
      the coordination channel — «un vault = una docente, siempre». Satisfied by a
      sentence and by nothing to point at: the coverage row below is the record that
      the absence is a decision (FR-2812)
- [ ] T028 **Look at it** (`013`'s untestable rule), per quickstart §8: the packet body
      as plain text through a colleague's eyes; the door with a flagged item at the
      narrowest width; corrections beside the draft; and whether «revisada por PT»
      reads as a fact or as an approval — the difference is FR-2810. Plus `axe` over
      the three new screens
- [ ] T029 **SC-2804 needs two teachers**: a real tutor and a real PT run the second
      look on a real exam draft over their real transport, and the question is whether
      the loop fits a school week. The arrangement is the task; the verdict cannot come
      from this repository. Record the outcome (and «why not», if not) in
      `specs/030-el-paquete-de-coordinacion/checklists/` and anything found on the way
      in `specs/BACKLOG.md`

---

## Not in scope, recorded so it stays a decision

- **Merging.** «Tu perfil dice X, el paquete dice Y» ends in a choice, by design. A
  three-way merge is the shared vault wearing a diff.
- **A class of packets.** One packet, one learner; a class is a loop of US1, and the
  small unit is what keeps the review honest.
- **Sender authentication.** The role is a claim between colleagues who know each other;
  cryptographic authorship would be theatre (spec assumption).
- **`004`'s confirmed/unconfirmed lifecycle on imports.** That is the deferred receiving
  half of the handover, for the year boundary; the weekly door is accept/skip.

## Dependencies

- T001 and T002 before everything; both red first.
- **Phase 2 blocks Phases 3–5 entirely.** T003 before T004–T007; T005 before T010.
- T006 before T008 can write a file (the gate exists before the writer).
- T008 before T009; T010 before T011; T011 before T012.
- T015 before T016 before T017; T017 before T018 and T019; T019 before T021.
- T023 before T024 before T025.
- **T026 lands with US1, not after it** (plan · Sequencing): a feature that can export a
  child's barriers before erasure can reach the export is P38's finding rebuilt.
- T029 is the arrangement, not the verdict.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here. Written
**with** the tasks, per the lesson `002` taught on 2026-08-31.

| | Where it is satisfied |
|---|---|
| FR-2801 | T003 (builder: one learner, one period, notes/material/deltas) · T004 (one readable .md) · T008 (export flow) · T015 (the optional draft) |
| FR-2802 | T001 (the byte test, first) · T006 (the refusal gate, full name map, role-only identity) |
| FR-2803 | T008 (written to `handover/`, where exports live today) · T013 (listed) · T026 (inside the erasure plan and `verifyForgotten`'s extended walk, per P38) |
| FR-2804 | T002 (zero writes without accept, instrumented) · T010 (open writes nothing) · T011 (accept is the only writer) |
| FR-2805 | T002 + T012 (packet, role, date on every accepted item; `reported` assigned by the receiver, `observed` unreachable from an import — P44's honesty kept) |
| FR-2806 | T007 (the existing scanner, reused) · T010 (scanned before display) · quickstart §4's fixture packet |
| FR-2807 | T023 (no auto-match, hold) · T024 (explicit, confirmable, reversible link) · T025 (the walk, tested) |
| FR-2808 | T015 (draft out with derived mark and report) · T016 (annotation in the second vault) · T017 (corrections beside the draft, persisted in `second-look.md` so they are not remade) |
| FR-2809 | T018 (existing correction paths, new revision, previous kept — `026` FR-2402's rule, no third mutation path) |
| FR-2810 | T019 (`second_look` beside the signature, two facts, no gate, control case tested) · T021 (visible in the record) |
| FR-2811 | T020 (fingerprint mismatch declared, corrections still offered, never silently attached) |
| FR-2812 | T027 (the absence as a decision: nothing offered, documentation advises against, this row is the record) |
