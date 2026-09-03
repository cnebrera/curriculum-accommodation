# Data model

Three entities. One is a new file, one is a section inside it, and one already exists —
the finding of Phase 0 is that `005` and `021` had already built the revision half, twice,
and this feature's job is to make it once (research R4).

## `Conversation` — the sequence of turns about one document

One per document (`026` FR-2401): one job × one learner for adapted material, one job for
composed material before it is adapted. On disk it is `conversation.md` in the directory
`resolveDocument` answers with — so it is the child's data where the sheet is the child's
data, and the existing deletion path erases it with everything else (research R2).

```markdown
---
job: mates-11
learner: L4T7        # absent for a conversation about a composition
---

## 2026-09-03 10:12 · turno 1 → revisión 2

**Ella:** quita los tres últimos y deja más espacio para responder

**Cambios:** he quitado 3 ejercicios (e7, e8, e9) · más espacio de respuesta en e1–e6

**Coste:** unos 2 céntimos
```

In memory:

```ts
export interface Conversation {
  job: string;
  /** Absent when the document is a composition (resolveDocument's 'composed' case). */
  learner?: string;
  turns: Turn[];
}
```

### Rules

**Append-only.** A turn is history the moment it happened; nothing rewrites an earlier
entry. The file is hers to read in Obsidian, so the format is prose-first, not a log
format she would need this application to decode.

**One conversation per document, and one turn in flight.** A second turn while one runs
is refused at the shell, the `023` single-download rule. The guard is per document, so a
turn about Marco's sheet does not block a turn about Lucía's.

**It stores no document content.** The turn text is hers; the changes line is derived;
the revisions themselves live where they always lived. A conversation that quoted the
sheet would be a second copy of the document, growing stale line by line.

## `Turn` — her request and what became of it

```ts
export type TurnOutcome =
  | { kind: 'revision'; revision: number }
  | { kind: 'refusal'; /** The rule the refusal stands on, in her language. */ because: string }
  | { kind: 'no-change' };

export interface Turn {
  /** From the process clock, never from the model (the `014` FR-1203 rule). */
  at: string;
  /** Her words, verbatim. The only instruction the model received. */
  text: string;
  outcome: TurnOutcome;
  /** Derived by `revisionDiff`, never taken from the model (026 FR-2404). */
  changed: string[];
  /** Cents, or null when nobody knows — formatted by `formatCost`, said as «no lo sé». */
  costCents: number | null;
}
```

### Rules

**A refusal has no revision.** The guarantee is structural: `runTurn` writes nothing to
the document path on a refusal, so the previous revision remains the working document
without anyone having to restore it (`026` FR-2406/FR-2407, research R5).

**`no-change` mints nothing.** When `revisionDiff` finds an empty diff, the turn reports
«no he cambiado nada» and no identical revision appears — an identical file with a new
number would make the revision list lie about how many times the document changed.

**The cost is recorded even when the turn failed.** Money spent is a fact about her
month whatever the outcome — the same rule `runAdaptation` applies when a retry is
rejected (`recordCost` is called on the failure path too).

## `Revision` — already exists; composed documents get the same one

`005` defined it for adapted sheets (`adapted.md` working, `adapted.rN.md` archived);
`021` gave compositions `ir.rN.md`. This feature adds **no third shape** — it adds the
one module both families use (research R4):

```ts
export interface Revision {
  /** From the filename; the working file is implicitly the highest. */
  n: number;
  path: string;
  /** Derived from the document (isSignedOff), never stored beside it. */
  signed: boolean;
  current: boolean;
}
```

### Rules

**A turn never edits in place** (`026` FR-2402). The order is fixed and verify-first:
gates and verifiers run on the candidate in memory; only then is the previous working
file archived and the new one written. A provider failure mid-turn therefore leaves the
vault exactly as it was — the revision is complete or absent (`026` FR-2409).

**The draft mark is restored structurally** (`026` FR-2403). The new revision's front
matter never carries a `review` block across from the model's output or the previous
revision — stripped in code and asserted by test, the same pattern `021` T029 used for
corrections. `isSignedOff` stays derived from the document; no parameter, no side-file.

**A signature never moves** (`005` FR-511). It lives in the signed document's own front
matter, so it survives on that revision's file forever and appears on no other. Restoring
a signed revision restores a signed document; asking for another change after signing
starts a new, unsigned revision.

**Restore archives, never deletes** (research R4): the current working file is archived
as its own revision, then the chosen revision's content becomes the working file.
Numbers only grow; the record can always say which revision was signed and that later
unsigned ones exist (`026` FR-2412).

**The reading fingerprint carries over.** A turn does not re-read the source, so the
revision it produces was made from the same reading as the revision it edited —
`stampReading` with the inherited fingerprint, which is what keeps `005` FR-520's stale
detection honest across turns (and why the panel warns before a turn on a stale sheet:
iterating bakes the stale reading in deeper).

## What deliberately gains no field

| | Why |
|---|---|
| A `current_revision` pointer | A stored copy of what the filesystem says — the defect `014` catalogued and `021`'s data model refused. The working file *is* the pointer |
| The model's own summary of a turn | `026` FR-2404 forbids showing it; storing it invites a future screen to show it. The diff is recomputed from files that do not lie |
| A conversation id | The document is the identity (`026` FR-2401); an id would permit two conversations about one document, which the spec rules out |
| Turn ids in the document's front matter | The document must stay printable, signable and hand-editable without knowing conversations exist; provenance of the *revision* is the conversation file's job |
| Anything in memory (`memory/`) | `026` FR-2411: nothing is remembered as a side effect of a turn. The offer goes through the human-routed door and lands wherever she routes it, by the `003` machinery, not by this feature |
