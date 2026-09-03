# Contract · the conversation channels

Three IPC channels, registered in `packages/shell/src/ipc/conversation.ts` — never by the
job itself (`packages/shell/test/boundary.test.ts` holds the registration rule). The UI
reaches them only through a hook in `ui/src/data/conversation.ts`; no component calls
`window.rampa` (asserted by `ui/test/data-layer.test.ts`).

Every channel takes the document's identity as `{ job, learner? }` — the same pair
`resolveDocument` (`021`) answers for, so «which document?» is decided in exactly one
place. `learner` is present for an adapted sheet and absent for a composition.

---

## `conversation:turn` — one turn, one provider call

**Who calls**: the conversation panel, on send.

**Request**:

```ts
{ job: string; learner?: string; text: string }
```

**Response** (mirrors `AdaptResult`'s register — she is told cost and outcome the same
way every job tells her):

```ts
{
  outcome:
    | { kind: 'revision'; revision: number }
    | { kind: 'refusal'; because: string }
    | { kind: 'no-change' };
  /** Derived by revisionDiff — never the model's account (026 FR-2404). */
  changed: string[];
  /** Everything she must be shown, quoted and located (007 FR-503), including
   *  verifier corrections («he corregido la cantidad de e4 desde el enunciado»). */
  notices: Array<{ block: string | null; notice: Notice }>;
  costCents: number | null;
}
```

**Errors** (as `RampaError` codes, decoded to her language by the data layer):
`turn-in-flight` (one turn per conversation, the `023` rule), `stale-reading` (the sheet
is stale per `005` FR-520 — sent only if she has not confirmed the warning),
`key-missing`, `output-incomplete`, `name-unconfirmed` (her turn text is scanned like
every channel she writes into, `006` FR-419).

**Guarantees**: on any error or refusal the vault is untouched — the working revision is
the one she had (`026` FR-2409). On success the previous revision is archived, never
overwritten (`026` FR-2402), and the new one carries the draft mark (`026` FR-2403).

---

## `conversation:list` — the turns and the revisions

**Who calls**: the panel on mount, and the revision list (US3).

**Request**:

```ts
{ job: string; learner?: string }
```

**Response**:

```ts
{
  turns: Turn[];                 // from conversation.md, oldest first
  revisions: Revision[];         // from the filesystem via listRevisions
}
```

Read-only and deterministic: it parses the conversation file and lists files. It never
touches the provider and is safe to call on every render.

---

## `conversation:restore` — an earlier revision becomes the working one

**Who calls**: the revision list, on «volver a esta».

**Request**:

```ts
{ job: string; learner?: string; revision: number }
```

**Response**:

```ts
{ nowCurrent: number }   // the restored content's new position as working file
```

**Guarantees**: the current working file is archived before anything is written —
restore deletes nothing and renumbers nothing (research R4). A signed revision restored
is a signed document; an unsigned one restored is unsigned; the signature never moves
(`005` FR-511). Deterministic: no provider, no cost.

**Errors**: `revision-missing` when the number does not exist on disk (she may have
tidied the folder by hand — the vault permits it, so the channel must answer it).
