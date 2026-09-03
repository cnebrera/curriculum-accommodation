# Contract · the packet file, and the door it must pass

Two installations that never meet share exactly one thing: this file format. The other
side may be a newer Rampa, an older one, or a person with a text editor — so the format
is versioned by tolerance, not by number: **unknown fields are kept and shown, missing
optional fields degrade to prose, and a file that cannot be parsed is refused readably.**

## The file

```markdown
---
rampa_packet: coordination        # or review-request | review
code: "M7"                        # sender's learner code. Opaque to the receiver
role: "PT"                        # a claim. No name field exists
academic_year: "2026-27"
period: { from: "2026-10-01", to: "2026-10-14" }
created: "2026-10-14"
items:
  - of: note
    date: "2026-10-12"
    heading: "arranque"
    text: "No arranca sin el primer paso hecho."
  - of: material
    date: "2026-10-10"
    title: "u4-fracciones"
    signed: true
  - of: profile-delta
    date: ""                      # «sin fecha», never invented
    text: "works: + empezar con el ejemplo resuelto"
---

# Paquete de coordinación · M7

> **Esto viene de otra aula.** Son observaciones que otra docente te cuenta,
> no hechos comprobados en la tuya. Al aceptarlas quedarán como «me lo contaron».

## Notas del periodo (1–14 oct)
…same items, as prose and tables, rendered from the same structure…
```

`review-request` adds `draft:` (job, revision, fingerprint, the document and its report,
fenced); `review` adds `review:` (job, revision, fingerprint, corrections list).

**Invariants of the bytes** (SC-2801, FR-2802):

1. No real name — learner's, teacher's, third parties'. Enforced at write: `redact()`
   over every item with the machine's full name map, then `isClean()` as a refusal gate,
   then `findProbableNames` flags surfaced in the export review. A packet that fails the
   gate **is not written**.
2. The subject travels as `code` only. Re-identification is a human act at the school
   (`004` FR-312's rule, inherited).
3. Prose-readable with no tooling: the body alone must let a colleague act on the packet
   (`004` FR-306's rule, inherited — the receiving teacher may not have Rampa).

## The door (import contract)

For any packet, in order:

| Step | Rule |
|---|---|
| Parse | Deterministic, tolerant, offline. Malformed → readable refusal, zero writes |
| Scan | Every item text through `detectInjection` before display (FR-2806). Flags shown quoted and located; nothing removed, nothing auto-skipped |
| Stale | `academic_year` older than the current one → marked stale on sight (`004` FR-311's rule) |
| Link | Unknown `code` → **no auto-match** (FR-2807). Hold copies the file verbatim to `handover/received/`; link is explicit, confirmed, reversible until the first accept |
| Accept | Per item, explicit (FR-2804). **No vault write happens before this line**, instrumented by SC-2802 |
| Provenance | Every write carries packet, role, date — and `reported`, assigned by the receiver, never read from the file (FR-2805) |
| Conflict | «tu perfil dice X, el paquete dice Y» — shown, chosen, never merged |
| Reviews | Corrections bind to (job, revision, fingerprint). Fingerprint mismatch is **declared**, and the corrections are still offered — about revision N, said so (FR-2811) |

What the door never does: execute anything, apply anything unattended, write outside the
accepted item's own destination, or let a packet change how the door itself behaves.
Packet text is content, end to end (Principle IX).

## Compatibility promises

- A field this version does not know is displayed under «lo que no he entendido», not
  dropped: the packet is the teacher's document before it is our schema.
- A packet written by hand (a colleague without Rampa answering by email) that carries
  valid front matter imports like any other; one that carries none is still openable as
  text — Rampa offers to show it, and the teacher types what she takes (the door again,
  manually).
- Nothing in this contract depends on both machines running the same version, sharing a
  name map (they cannot — encryption is per machine), or ever syncing.
