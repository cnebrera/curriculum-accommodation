# Phase 0 · Research

Six questions. R1/R2 shape the packet; R3 keeps the second look from becoming an
approval workflow; R5 found the erasure walk was already missing the directory this
feature writes to.

---

## R1 · What is the packet, on disk?

**Decision**: **one human-readable Markdown file** — YAML front matter for the machine,
prose body for the person — written to `handover/`, named
`<code>-coord-<date>.md` (coordination) or `<code>-review-<job>-r<N>.md` (second look).

**Rationale**: the two readers of a packet are a teacher auditing it as text (US1
acceptance 4 — «readable Markdown a teacher could audit») and the receiving Rampa parsing
it for the door. One file serves both only if the structure and the prose travel
together: front matter carries the items with their dates and kinds, the body renders
the same items the way `packetToMarkdown` renders the handover — framing sentences
first, then the content. This is also the shape the vault already speaks everywhere
(`ir.md`, profiles, journal entries): front matter + body, `readDoc`-parseable, Obsidian-
readable.

Parsing is **tolerant and deterministic**: unknown fields are kept and shown, a
malformed packet produces a readable refusal («no he podido leer este paquete: …»),
never a crash and never a partial import. A packet is untrusted input before it is
anything else.

**Alternatives considered**: JSON payload with a rendered .md beside it — two files that
can disagree, and the one she audits would not be the one the machine reads; prose-only
with the import re-parsing tables — the import would be a scraper of its own renderer,
brittle against the exact file a teacher is invited to touch; zip/bundle — opaque to the
audit that SC-2801 demands («inspection of the bytes») and to the school platform's
preview.

---

## R2 · What does this share with `buildPacket`, and what not?

**Decision**: share the **family rules and primitives**; do not share the builder.

| Shared (from `004`) | Not shared |
|---|---|
| Prose-first rendering, anti-anchoring framing on the document's face | `buildPacket` itself — it snapshots the whole profile for a year boundary; this packet is a **period delta** |
| Codes only, no names — the export check (R6's `isClean` gate) applies identically | `toShareable` — already found to be an empty-packet generator and removed from the IPC surface (`004` T005) |
| `isStale`'s academic-year rule, reused verbatim on import | The handover's confirmed/unconfirmed lifecycle — `004` deferred its receiving half; this feature builds a *simpler* door (accept/skip), not that machinery |
| The two-step IPC shape: draft for review → write what survived (`memory:handoverDraft`/`handoverWrite`) | The June job: where both instruments could apply, **the handover wins** (spec assumption) — nothing here replaces it |
| The `handover/` directory (FR-2803: «where exports live today») | |

**Rationale**: `004`'s hard-won rules are about *any* document leaving a vault about a
child; its builder is about one specific document. Copying the builder and filtering by
date would leave two functions whose disagreement is invisible until a September packet
and a Tuesday packet describe the same child differently. A new `buildCoordinationPacket`
in the same module family (`core/src/memory/coordination.ts`, beside `handover.ts`)
collects: notes sections dated within the period (from `notes.md`'s `## <date> · <head>`
structure that `appendNote` guarantees), material references from `record`'s `entryFor`
(titles and dates, never content), profile deltas (axis levels whose `axes_confirmed`
falls in the period; `works`/`avoid` entries with their real annotation dates per P44 —
and «sin fecha» where none exists, **never a fabricated one**: the `?? today()` lesson
from `handover.ts` is written in that file at length, and this builder inherits it).

**Claims are `reported` on arrival, structurally.** P44 just made the handover's
evidence markers honest — this packet must not undo that from the other side: whatever
the sender's confidence, on the receiving machine a packet item is something a colleague
*said*, which is the dictionary definition of `004`'s `reported`. The importer writes
`reported` unconditionally; there is no code path by which a packet item becomes
`observed` (FR-2805, asserted in test).

**Alternatives considered**: parametrise `buildPacket(period?)` — rejected: the two
documents diverge on content (delta vs snapshot), framing (colleague vs successor) and
review flow, and one function with two personalities is how `job:revise` almost ate
composed material (`021` R3); a shared abstract «packet» base — speculative structure
for exactly two concrete cases, both already legible.

---

## R3 · The second look: what travels, what comes back, what gets recorded?

**Decision**: three legs, no gate.

1. **Out**: the tutor exports an unsigned draft — the document as it stands (draft mark
   derived from the document, so it travels marked), its report, the job id, the
   **revision number and a content fingerprint** (hash of the document bytes). Same
   name-free check as any export.
2. **Annotation**: the PT opens the packet in her Rampa. The sheet renders read-only in
   the sealed viewer (`021`'s `seal()` — packet content is Principle IX content), and
   she writes corrections as a list, each optionally anchored to a block. Export back
   produces a **review packet**: corrections + the job id + the revision they are about.
3. **In**: the tutor imports it. Corrections display **beside the draft**; accepting
   them persists them as recorded corrections in `material/<job>/<learner>/second-look.md`
   (role, date, revision, packet file, the corrections) — `review.md`'s rule: «a
   correction not written down will be made again». Applying one runs the existing
   correction path (`runAdaptation` with corrections for adapted sheets, re-compose for
   composed ones), producing a **new revision** (FR-2809, `026` FR-2402's rule).
4. When he signs, `job:signOff` reads `second-look.md` and writes **two facts** into the
   one review block: his signature (`signed_off/by/date`, one person's — `005` FR-512)
   and `second_look: {by, date, revision}`. Nothing anywhere blocks signing without a
   review (FR-2810): the record says what happened, it does not manage what should.

**Rationale for the fingerprint**: FR-2811. Revision numbers alone lie across machines —
the tutor can produce r3 twice if r2 was restored. Byte-hash of the exported document is
cheap, deterministic, and makes «these corrections were about a document you no longer
have» a mechanical sentence instead of a guess. On mismatch the import **declares it and
still offers the corrections** (they may still be right); it never silently attaches
them to the current revision.

**Alternatives considered**: co-signature — rejected by the spec itself (`005` FR-512:
the signature stays one person's); making the review a gate on signing — rejected, the
spec's edge case says why (the PT becomes a bottleneck for material she never sees);
corrections as free prose the tutor re-types — the exact hallway-and-paper failure
FLU-06 documented; annotating the PDF — corrections would live outside the system that
must remember them.

---

## R4 · A packet for a code this vault does not know: what is «held»?

**Decision**: **hold = a verbatim copy in `handover/received/`**, listed, unlinked,
inert. Linking is a separate explicit act that annotates the *copy's* front matter
(`linked: <local-code>`, date), shown for confirmation, and reversible (the annotation
is removed) at any point before the first accept. Only after a confirmed link can items
be accepted, and they are attributed to the linked learner.

**Rationale**: three constraints triangulate this. (1) *No auto-match* — codes are
opaque by design and names are absent by construction, so matching is human (FR-2807);
the sender says which child by voice, as `004` already assumes. (2) *Nothing writes to
learner data without accept* — holding must therefore not touch `profiles/`; a byte-
identical copy of the packet file is storage of the packet, not acceptance of its
claims. (3) *Erasure must be able to see it* — and this rules out the obvious
alternative, `.rampa/`: COD-18 already found learner data hiding in the machine
directory that `verifyForgotten` skips by design. In `handover/received/`, the copy is
inside R5's extended walk; once linked, the `linked:` annotation carries the **local**
learner's code, so `forget(<local-code>)`'s code-grep finds a packet whose own internal
code (the sender's) it could never match.

A wrong link before any accept: unlink removes the annotation and nothing else changed,
because nothing else happened — the undo is trivial *because* the door is the only
writer.

**Alternatives considered**: keep only a path reference to wherever she opened the file
from — a Downloads folder is not a vault; the packet vanishes with the next cleanup and
the «held» list points at ghosts; auto-create a provisional learner — a vault write
nobody asked for, and exactly the auto-link FR-2807 forbids; fuzzy-match on period/year
overlap — a guess wearing a heuristic's clothes.

---

## R5 · How does the packet enter the plan of deletion?

**Decision**: extend `planForget` and `verifyForgotten` to reach `handover/` — the
sent packets (`<code>-…` files for the forgotten code), the received copies (via their
`linked:` annotation), and the walk itself: `verifyForgotten` currently walks only
`profiles/material/output/memory` (`forget.ts:122`), so **`004`'s own packets are
already invisible to it** — P38 confirmed the five residues and this is one of them.
This feature ships its part of that fix: the walk gains `VAULT.handover`, the plan gains
the packet paths, and the export screen says once that copies which already left the
machine are the sender's responsibility (the `003` «backups are out of reach» sentence,
extended to the thing this feature mails).

**Rationale**: FR-2803 is not satisfiable by a new list somewhere — the coordination
packet joins the *same* plan the handover packet was always supposed to be in
(`003`'s edge case: «the packet is removed too»). One walk, one plan, one honesty
check. The full five-residue fix (names.enc entry, roster row, compose requests,
archived journal) is `003`'s revision per P38 and stays there; this feature must not
ship a packet that widens the already-open gap.

**Alternatives considered**: a per-feature erasure hook — a second deletion mechanism is
a second place to forget one; deleting received-but-unlinked packets on forget — they
cannot be attributed to the learner (that is what unlinked means), so the plan cannot
honestly claim them; it can and does list linked ones.

---

## R6 · How is «no real name in the bytes» enforced, and how is packet content scanned?

**Decision**: two existing detectors, applied at the two boundaries.

**Export (FR-2802, SC-2801)**: the final packet bytes pass `redact()` with the full
known-names map (every learner on this machine, not just the packet's subject — a note
about Marco can mention Vega), then `isClean()` as the **refusal gate**: a packet in
which a known name survives is not written, and the refusal names the finding without
printing the name. `findProbableNames` runs over the result and its flags are shown in
the export review step — asked, not blocked, exactly as at the provider chokepoint,
because a heuristic that blocks on false positives is one she learns to disable. The
teacher's own name is not in the map: the packet carries **role only** (`review.md`'s
standing rule: role, never a name), so there is no field for it to leak from, and the
probable-names pass covers the prose.

**Import (FR-2806)**: every item's text passes `detectInjection` before display — the
same two-tier scanner (machine-addressed directives, capability asks) every untrusted
material passes, reused by wrapping the item text as a block, **not** by a second
scanner with its own opinions. Flagged items display quoted and located, are never
removed and never auto-skipped: deletion hides an attack (Principle IX), and the door
means even an unflagged attack has no effector — the only thing any packet text can
cause is a write the teacher explicitly accepts, reading it as she does.

**Alternatives considered**: a packet-specific name regex — a third implementation of
the project's most safety-critical check, guaranteed to drift from the accent-folding
one that was found by test; scanning only on export and trusting inbound packets from
colleagues — the sender's Rampa may be older, absent (hand-written packet), or the file
altered in transit; trust is not a property of files.
