# Data model

Everything new lives in `userData` or in the corpus itself. **Nothing new in the vault**
— the one write this feature ever performs there is renaming *her own* override aside
when she chooses «take the update» (research R3), and that is her explicit act.

## `CorpusVersionInfo` — what `CORPUS-VERSION.json` becomes

Written by `app/scripts/bundle-corpus.mjs` at build time and present in every snapshot;
already exposed by the `corpus:version` IPC.

```ts
export interface CorpusVersionInfo {
  /** Monotonic integer. What reports cite (FR-3207) and what «newer» compares. */
  version: number;
  /** The contract the app's parsers must understand (FR-3210). See the sibling rule. */
  formatVersion: number;
  bundledAt: string;            // existing
  contents: string[];           // existing: recipes, instructions, checklists
  codeLicence: string;          // existing
  contentLicence: string;       // existing
  attribution: string;          // existing
}
```

**The sibling rule** (spec assumption, research R4): `formatVersion` and the vault's
schema version (P50) are **different numbers owned by different work**. The corpus format
versions the project's publications against this app's parsers; the vault schema versions
her data against every app that opens it. Nothing in this feature reads or writes the
vault's number.

## `UpdateManifest` — what a corpus release says about itself

Published as `manifest.json` + `manifest.sig` (Ed25519 over the canonical manifest
bytes, research R2). **Nothing from it is shown or stored before the signature
verifies.**

```ts
export interface UpdateManifest {
  version: number;
  formatVersion: number;
  /** Plain language, Spanish — she reads this before anything else (FR-3206, P28). */
  summary: string;
  publishedAt: string;
  files: Array<{
    /** Corpus-relative: `recipes/core/…`, `instructions/…`, `checklists/…`. */
    path: string;
    sha256: string;
    bytes: number;
  }>;
}
```

**`files` is the complete corpus at that version, not a delta.** Refuse-whole and
revert-whole fall out of that (a snapshot is either complete or not published), and «what
changed» is computed locally against the governing corpus — a diff is a view, never the
payload.

## The store — `userData/corpus/`

```
userData/corpus/
  versions/<version>/        one complete verified snapshot per accepted version,
                             published by a single atomic rename (SC-3204)
  active.json                the pointer, and the history
  tmp-<runid>/               in-flight downloads; discarded on any failure
```

```ts
export interface ActivePointer {
  /** The accepted version that governs, or null: bundled corpus governs. */
  active: number | null;
  /** Every change of governor, oldest first. Reverting is as recorded as updating. */
  history: Array<{
    at: string;
    to: number | 'bundled';
    act: 'accepted' | 'reverted' | 'superseded-by-bundled';
  }>;
}
```

**Retention**: every accepted version is kept (research R1). Deleting history would
orphan the version number a January report cites.

## `ActiveCorpus` — the answer to «which corpus governs?»

Returned by the resolution in `app/packages/shell/src/corpus/` (successor of
`corpusRoot()`), and it returns **the case, not just a path** — `021`'s resolver lesson:

```ts
export interface ActiveCorpus {
  root: string;
  source: 'bundled' | 'update';
  version: number;          // what every job report cites (FR-3207)
  formatVersion: number;
}
```

Rules, in order:

1. A snapshot governs only if `active.json` names it, it is complete on disk, and its
   `formatVersion` is supported — an unsupported or broken snapshot never governs;
   bundled does, and the screen says why.
2. **The newer of bundled vs active wins** (by `version`): installing an app that bundles
   a newer corpus must not silently downgrade judgement to a stale snapshot. The switch
   is written to `history` as `superseded-by-bundled`.
3. Her `recipes-local/` overrides (006 FR-415) load after and win by id, over whichever
   source governs. Unchanged, and it is what FR-3209 stands on.

## `ReleaseNotice` — the app channel's whole state

```ts
export interface ReleaseNoticeState {
  /** The newest version she dismissed. The notice returns only for something newer. */
  dismissedVersion?: string;
}
```

In `userData`, beside the display settings. Not in the vault: which notice she dismissed
on *this machine* is a fact about this installation.

`UpdateStatus` (existing, `app/packages/providers/src/releases.ts`) gains one field:
`summary?: string` — the release's plain-language notes, for the one quiet line
(FR-3201).

## `FileConflict` — an update meeting her edit

```ts
export interface FileConflict {
  /** The update file whose id/path a local edit shadows. */
  path: string;
  recipeId?: string;
  /** `keep` is the default and what doing nothing means (research R3). */
  resolution: 'keep' | 'take' | 'undecided';
}
```

Shown per file in the offer; `undecided` blocks nothing — the update applies, her file
keeps winning until she says otherwise.

## What deliberately gains no field

| | Why |
|---|---|
| Anything in the vault | The vault syncs between machines and app versions (CRIT-02); update state syncing would let one machine's acceptance change another's policy — an update applying itself |
| A machine/install identifier in any request | The check sends nothing beyond the request itself (FR-3204). The existing `releases.ts` header comment is the rule |
| `checkedAutomatically` on `UpdateStatus` | `releases.ts` says it «does not exist and must not be added»; consent lives in settings (R5), not in the status of a check |
| The signing public key in the corpus | The corpus cannot vouch for itself — a key delivered by the channel it protects verifies nothing (R2). It ships in the app |
| A `latest_seen` phone-home timestamp server-side | Nothing here has a server of the project's; GitHub sees an anonymous request, full stop |
| Any rewrite machinery for signed documents | FR-3207: an update governs **new jobs only**. There is deliberately no code path from the store to `output/` — an absence, asserted |
