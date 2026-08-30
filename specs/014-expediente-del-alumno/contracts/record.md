# Contract: the learner's record

## IPC

```ts
record.forLearner(code: string): Promise<RecordEntry[]>   // newest first
record.rebuild(code: string): Promise<string>             // writes record.md, returns its path
record.search(q: RecordQuery): Promise<RecordEntry[]>
```

```ts
interface RecordQuery {
  learner?: string;
  schoolYear?: string;
  kind?: string;
  /** Matched against title, subject, objectives and the material's own text. */
  text?: string;
}
```

**`record.search` never takes a name.** Names are resolved in the renderer, in
memory, from the decrypted map — so a search *by* name filters codes before
calling (`015` FR-1302). Passing a name across this boundary would put one in the
main process's logs the first time anybody debugged it.

## Guarantees

| | |
|---|---|
| **Derived** | `forLearner` reads the vault. Deleting `record.md` changes nothing about what it returns |
| **Complete** | A job that produced an adaptation for this learner is in the list, including one made before this feature existed |
| **Honest** | A document that is not on disk appears in `missing`, never omitted |
| **Shared** | One source appears in several learners' records, and is stored once |
| **Nameless** | No name reaches the main process, any file it writes, or any log |
| **Read-only** | `forLearner` and `search` write nothing — not even `record.md` |

The last one matters: `rebuild` is the only writer, and it is called on the
events in FR-1215, never from a read. A screen that wrote a file every time it
was opened would put a synced vault into conflict from being looked at.

## What this contract does NOT add

No `record.delete`. Erasure belongs to `003`'s `memory:forget`, extended rather
than duplicated — two ways to delete a learner is two things to keep correct,
and one of them would eventually stop covering something.
