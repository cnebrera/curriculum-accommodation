# Contract — two channels, and the four rules neither may break

`034`'s whole surface: one existing check that learns to say more, one new corpus
channel, and one resolution that every corpus reader goes through.

## The resolution

```ts
activeCorpus(): Promise<ActiveCorpus>   // { root, source, version, formatVersion }
```

**The only place that answers «which corpus governs?».** Every reader that today calls
`corpusRoot()` (`app/packages/shell/src/corpus/bundle.ts` — recipes, instructions,
checklists, material kinds, services, education, licences) asks it; none decides on its
own. Checkable the way `021` checked its resolver: a grep for `corpusRoot(` outside the
resolution module returns nothing.

Her `recipes-local/` overrides (006 FR-415) are loaded after and win by id — over
whichever source governs. That precedence is FR-3209's floor and no channel may lower it.

## The IPC surface

| Channel | Does | Never does |
|---|---|---|
| `updates:check` | One act, both feeds: app releases + corpus manifest, through gate-minted transports. Silent in failure and absence (FR-3202) | Run during a job; run inside ensayo (`035`); send anything beyond the request (FR-3204) |
| `updates:dismissNotice` | Records the dismissed app version in `userData` (FR-3203) | Suppress a *newer* version's notice |
| `updates:read` | The verified offer: summary, per-file full content and local diff, conflicts marked (FR-3206) | Show anything whose signature has not verified |
| `updates:apply` | Her explicit acceptance → fetch, hash-check, atomic publish, pointer move (FR-3205) | Touch the vault; touch `output/`; proceed past any failed check (FR-3211); apply part of an update (FR-3210) |
| `updates:revert` | Pointer to a retained earlier version; recorded in history (FR-3208) | Delete anything |
| `updates:resolveConflict` | Per file: keep / take — take renames her override aside, dated, in her vault (FR-3209) | Merge; delete her file; block the update on `undecided` |
| `corpus:version` (existing) | Now reports the **governing** corpus's `CorpusVersionInfo` | — |

The **app** channel's entire capability is `updates:check` + `updates:dismissNotice` +
opening the releases page via `shell.openExternal` (the `links.ts` pattern: URL from the
declared destinations, https only, never from the renderer).

## The four rules

### 1 · The app channel carries no code — structurally

FR-3201, SC-3203. The notice can name, summarise and link. There is **no IPC that
downloads a binary, no installer spawn, no `electron-updater`** in the dependency tree.
Asserted as an absence (the `021` T032 shape): the test fails if any of the three
appears. «Notify-only» enforced by what does not exist, not by what is documented —
Principle IX's own argument applied to this project's update path.

### 2 · Nothing unverified is shown, and nothing partial lands

FR-3211, FR-3210, SC-3204. Signature before display; per-file hashes before write;
one atomic rename publishes a complete snapshot or nothing. A failed signature, a failed
hash, a truncated download, an unsupported `formatVersion` — all the same outcome:
refused whole, said plainly, **zero files changed**. And a verified update is still
content: it passes the `029` scan before activation, findings shown, refused by default.

### 3 · An update governs new jobs only, and every job says who governed it

FR-3207, Principle VI/VII. Signed documents and existing outputs are untouchable — there
is no code path from the update store to `output/`, asserted as an absence. Every report
cites the corpus `version` that governed the job; a revert changes what the *next* report
cites, never what a previous one said.

### 4 · Her judgement outranks shipped policy on her machine

FR-3209, Principle I. `recipes-local/` wins by id over any governing corpus. A conflict
is shown per file — keep (default, free) / take (her file set aside visibly, never
deleted) / view both — and is never merged and never a gate: an undecided conflict means
her version keeps winning, which is the safe state by definition.

## What is refused outright

| Asked for | Response |
|---|---|
| Auto-install of the app, «just this once» | Not a capability. The channel has no code path to grow it from (rule 1) |
| Applying the compatible half of an incompatible update | Refused whole, with the reason and a pointer at the app notice (FR-3210) |
| Re-offering a declined corpus update on a schedule | Declining is stable; the offer stays available, not recurring (FR-3206) |
| A check from inside a job or a rehearsal | Checks are their own act, or launch-with-consent (research R5) |
| An update touching a signed document | No path exists (rule 3) |
