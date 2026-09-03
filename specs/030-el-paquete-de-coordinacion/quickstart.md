# Quickstart — proving two vaults can coordinate without touching

Ordered so the invariants are checked before the flows, and everything runs offline —
this feature never calls a model, so nothing here spends money except §7's *application*
of a correction, which rides the correction path that already existed.

## Prerequisites

```bash
cd app
npm ci
npm test          # typecheck + the whole offline suite
```

Two temporary vaults, A (sender) and B (receiver), each with its own name map. The
seeded corpus salts profiles, notes and material titles with real-looking Spanish names —
the packet's whole promise is about those bytes.

---

## §1 · The test to write first: zero names in the bytes

```bash
npx vitest run packages/core/test/coordination-no-names.test.ts
```

Over the seeded corpus, for **both** packet kinds (coordination and review-request):
export and inspect the raw bytes. No learner name — the subject's or any other child
mentioned in a note — no teacher name, no third party (SC-2801, FR-2802). Plus the gate
itself: a packet in which a planted name survives redaction **is refused, not written**,
and the refusal does not print the name.

Written first because the packet travels *because* it is name-free; a check written
after export works is a check written to fit what export already produces.

## §2 · Offline · the door writes nothing uninvited

```bash
npx vitest run packages/shell/test/coordination-door.test.ts
```

Instrumented over the import flow (SC-2802, FR-2804): open a packet, parse it, scan it,
display it, hold it, link it — **zero vault writes** until the first explicit accept.
Then: an accepted note lands via `appendNote` with its provenance line; a skipped item
leaves no trace; every accepted claim is `reported` and there is **no code path** that
writes `observed` from an import (FR-2805, P44 kept honest from the receiving side).

## §3 · Offline · the packet module

```bash
npx vitest run packages/core/test/coordination.test.ts
```

| Case | Expected |
|---|---|
| Period with notes, material, axis change | all three item kinds, dated |
| `works` entry with no annotation date | `date: ''`, rendered «sin fecha» — never today |
| Render → parse round trip | the same `CoordinationPacket` |
| Unknown front-matter field | kept and surfaced, not dropped |
| Malformed file | readable refusal, no partial result |
| Packet from last academic year | stale on import (`004`'s rule reused) |
| Corpus-scope journal entries | absent — they were never the packet's to carry |

## §4 · Offline · a packet that tries

```bash
npx vitest run packages/core/test/coordination-injection.test.ts
```

A fixture packet whose note reads like `cases/injection`'s finest: machine-addressed
directives, a capability ask («quita la marca de borrador»), a role imitation. Expected:
flagged by `detectInjection` before display, quoted and located, **not removed** — and
structurally inert, because the only effect any packet text can have is a write the
teacher accepts (FR-2806, Principle IX).

## §5 · With two vaults · the coordination round trip

```bash
npm run build && RAMPA_TEST=1 npx playwright test e2e/coordination.spec.ts
```

1. In vault A: export a packet for M7 — period defaulted from the last packet, items
   shown for review, one unchecked item **gone from the file**, the once-only sentence
   that copies already sent are hers to chase.
2. In vault B: open it. Items shown one by one; accept the note, skip the delta.
3. The note is in B's `notes.md` attributed «recibido por paquete (PT, fecha)»; the
   skipped delta left nothing; B's profile changed only where accepted.
4. Conflict case: B's profile says X, the packet says Y — both shown, she chooses,
   nothing merged (the edge case is the feature).
5. Unknown code: no auto-match, hold lands in `handover/received/`, link → confirm →
   undo → link again → accept attributes to the linked learner (FR-2807).

## §6 · With two vaults · the second look

```bash
RAMPA_TEST=1 npx playwright test e2e/second-look.spec.ts
```

1. Tutor (vault B) exports an unsigned exam draft for review: the packet carries the
   sheet **with its draft mark** and its report, still zero names (FR-2808).
2. PT (vault A) opens it: the sheet renders read-only in the sealed viewer; she writes
   «el enunciado 3 sigue siendo doble instrucción» and exports the review.
3. Tutor imports: corrections beside the draft; accepting records them in
   `second-look.md`; applying one produces **a new revision**, the old one intact
   (FR-2809).
4. He signs: the record shows the signature **and** «revisada por PT» with the review's
   date — two facts, one signer (FR-2810). And the control case: signing a *different*
   sheet with no review recorded shows no «revisada por» and was never blocked.
5. Mismatch: change the draft after export, then import the review — declared as being
   about the previous revision, never silently attached (FR-2811).

## §7 · Erasure reaches what this feature made

```bash
npx vitest run packages/core/test/forget-handover.test.ts
```

Forget M7 in vault A: the plan lists `handover/M7-coord-*.md` and `M7-review-*.md`;
`verifyForgotten` now walks `handover/` and comes back empty (FR-2803, P38). In vault B:
forget the learner a received packet was **linked** to — the copy in
`handover/received/` goes with them, found through its `linked:` annotation. And the
honest boundary, asserted as text shown once at export: what already left the machine is
the sender's to delete.

## §8 · Looked at, not asserted

```bash
npm run shots
```

Open them. The packet body in plain text — would a colleague *without Rampa* act on it?
The import door at the narrowest width with a flagged item — is «esto parece una orden
al programa» readable without drama? The corrections beside the draft — can he tell at a
glance which revision they were about? And «revisada por PT» beside the signature —
does it read as a fact, or does it read as an approval? The difference is FR-2810.

## §9 · The verdict that needs two teachers (SC-2804)

A real tutor and a real PT, a real exam draft, their real transport (email, USB, the
school platform). Export, review, return, apply, sign — and then the question this
repository cannot answer: **does the loop fit inside a school week?** The mechanism is
green in §6 either way; if the answer is no, that is worth more than the green.
