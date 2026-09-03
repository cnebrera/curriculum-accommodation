# Phase 0 · Research

Six questions. R1 shapes the feature; R2 is the one where a wrong answer is a hole, not a
refactor. R3 found that FR-3209 is mostly already answered by machinery `006` built, and
the honest work is a screen, not a merge engine.

---

## R1 · Where does an updated corpus live in userland, and how does it win over the bundled one?

**Decision**: whole versioned snapshots under **`userData/corpus/versions/<version>/`**,
one directory per accepted corpus version, plus **`userData/corpus/active.json`** — a
pointer naming the version that governs and the history of how it got there.
`corpusRoot()` in `app/packages/shell/src/corpus/bundle.ts` grows into
`activeCorpusRoot()`:

```
activeCorpusRoot()
  → userData/corpus/versions/<active>/     when active.json names one, its snapshot is
                                           complete, and its formatVersion is supported
  → <bundled corpus>                       otherwise — and also when the bundled corpus
                                           is NEWER than the active snapshot
```

**Rationale, piece by piece:**

- **`userData`, never the vault.** The vault is hers: synced by OneDrive, possibly shared
  with a tutor running a *different app version* (review CRIT-02), and carried between
  schools. The corpus is the project's policy for *this installation*. Putting accepted
  updates in the vault would let one machine's acceptance silently change another
  machine's judgement through a sync — an update applying itself, which FR-3206 exists to
  prevent — and would park content that is untrusted-until-verified (FR-3211) inside her
  data. `userData` is already the home for exactly this kind of machine-level state:
  credentials, display settings, pictogram settings, logs.
- **Whole snapshots, not patches.** A snapshot is refuse-whole and revert-whole *by
  construction*: either the complete verified version is on disk or nothing changed
  (SC-3204), and reverting (FR-3208) is moving a pointer to a directory that never left.
  A patch store would have to reconstruct states to revert, and a half-applied patch is
  the precise state FR-3210/FR-3211 forbid. The corpus is small Markdown (the entire
  bundle is under a few MB), so the cost of whole versions is noise.
- **The newer of bundled vs active wins.** She may accept corpus 7, then later install an
  app release that bundles corpus 9. Letting the stale snapshot keep governing would mean
  installing a new app *downgrades* her judgement layer silently. The comparison is by
  the corpus version number (R4), the switch is recorded in `active.json`'s history, and
  the updates screen shows it as an entry — visible, like every other change of governor.
- **Her edits still outrank everything.** `loadLocalOverrides()` (006 FR-415) loads
  `recipes-local/` from the vault *after* the corpus and wins by id. That layering is
  untouched: local edits ▸ governing corpus (active snapshot or bundled) ▸ nothing. R3
  builds FR-3209 on it.

**Retention** (the spec left depth to the plan): **every version she has accepted is
kept.** «One step back» is the spec's minimum; Markdown is small enough that pruning
would buy megabytes and cost her the exact version a January report cites. Nothing is
ever deleted implicitly.

**Alternatives considered**: writing into `process.resourcesPath` — rejected: not
reliably writable (installed under Program Files / /Applications), destroys the pristine
fallback, and makes revert a reinstall, which is the problem statement again. The vault —
rejected above. A patch/diff store — rejected above. Extending `recipes-local/` to hold
updates — rejected: it would put project-shipped policy and her own edits in one
namespace, and «keep hers» (FR-3209) stops being expressible the day the two are
indistinguishable.

---

## R2 · How is an update's integrity verified, and what is the truth it is verified against?

**Decision**: an **Ed25519 detached signature over a canonical manifest**, verified with
`node:crypto.verify` (no new dependency), against a **public key compiled into the
application**. The manifest lists the corpus version, format version, plain-language
summary, and every file with its SHA-256 and size. Order of operations, and it is the
contract:

1. Fetch manifest + signature. **Verify the signature first.** Unverified bytes are shown
   to nobody and written nowhere permanent.
2. Show her the offer from the verified manifest and verified file contents (FR-3206).
3. On acceptance, fetch every listed file into `userData/corpus/tmp-<runid>/`, checking
   each against its manifest hash.
4. Only when the snapshot is **complete and every hash matches**, one atomic `rename`
   into `versions/<version>/`, then the pointer. Any failure at any step: the temp
   directory is discarded and **zero files have changed** (SC-3204).

**Rationale — why a signature and why the key lives in the app:**

- HTTPS alone authenticates the *host*, not the *project*: the threat the spec names is
  «a malicious corpus update», which is the `029` import threat with a distribution
  channel — a compromised release account or feed serving well-formed hostile Markdown
  over perfectly good TLS. A pinned publisher key means a compromised host can serve
  nothing installable.
- The public key ships **in the application, not in the corpus**. The corpus cannot vouch
  for itself: a key delivered by the channel it protects verifies nothing. The app binary
  is the thing she (or her IT) already chose to trust by installing it — that act is the
  trust root, and it is the honest one this product has. (Signing the *installer* is
  `COLA` P52's separate item; this decision neither waits for it nor substitutes for it.)
- Ed25519 via `node:crypto` keeps Principle II's spirit: verification is a pure function
  over bytes, offline-testable with fixture keys, no provider, no dependency.
- **Signature is necessary, not sufficient**: a verified update is still *content*, so it
  passes the `029` scan-before-activation (injection tiers plus section-spoofing) before
  it can be accepted (FR-3211). The signature says «the project published this»; the scan
  and her reading say what it is.

**The signing side**: the release workflow signs the manifest with a key held in CI
secrets; publishing an unsigned corpus release is impossible by pipeline, not by memory.
Key rotation: a new app release carries the new public key — acceptable, because the app
channel is exactly the channel that already requires her deliberate act.

**Alternatives considered**: checksums published beside the files — catches truncation
and bitrot, not an attacker who controls the feed and can republish checksums; rejected
as the sole mechanism (the per-file SHA-256s remain, *inside* the signed manifest).
Sigstore/TUF — real infrastructure and dependencies for a project whose distribution is
«GitHub releases, which costs nothing and is not infrastructure the project has to
operate» (006 R11); rejected as disproportionate now, and the manifest format does not
preclude it later. Trusting GitHub's API TLS alone — rejected above.

---

## R3 · What happens when an update touches a file the teacher has edited?

**Finding first**: the update mechanism **cannot** overwrite her edits, because they live
in a different place — `recipes-local/` in *her vault*, which the update store never
writes to (R1). FR-3209's «MUST NOT be overwritten silently» is satisfied structurally.
What is *not* yet satisfied is the visible half: without this feature, an update that
corrects a recipe she has overridden would land, be silently shadowed by her override,
and she would never learn the correction exists.

**Decision**: conflicts are **surfaced per file at offer time, never merged**. For each
file in the update whose recipe id (or instruction path) is shadowed by a local edit, the
offer marks it and asks, per file:

| Choice | What happens |
|---|---|
| **Keep hers** (default, and what doing nothing means) | Update stored; her file keeps governing, and the offer says so in as many words |
| **Take the update** | Her file is renamed aside in `recipes-local/` with a dated suffix — set aside visibly in her own vault, never deleted; the update's file now governs |
| **View both** | Side by side, then decide — or decide later; deciding is never a precondition of applying the rest of the update |

**Rationale**: «her judgement outranks the shipped one on her machine» is Principle I's
posture, so *keep* must be the default and must cost nothing. *Take* must move her file
rather than delete it — it is her writing, in her vault, and the rename is her explicit
act, which is the one kind of vault write this feature performs. And there is
deliberately **no three-way merge**: a merged recipe is a recipe nobody wrote, carrying
neither her judgement nor the project's, in the one layer where authorship is the whole
point.

**Scope**: the same treatment covers `029`'s normative corpus once it lands — an update
to a corpus she imported or edited (`modificado por ti`) is a conflict on every changed
file, by definition, and the review status keeps printing honestly.

**Alternatives considered**: silent shadowing (status quo) — violates the spirit of
FR-3209, she never sees corrections to what she edited. Auto-merge — above. Blocking the
update until conflicts are resolved — rejected: it would train her to click «take» to get
past the door, which is worse than either honest choice.

---

## R4 · Corpus format version vs vault schema version — siblings, never the same number

**Decision**: `CORPUS-VERSION.json` (written by `app/scripts/bundle-corpus.mjs`) and the
update manifest both carry two numbers:

- **`version`** — monotonic integer, the corpus *content* version. What FR-3207 cites in
  reports, what R1 compares, what she reverts between.
- **`formatVersion`** — integer, the corpus *contract* version: the recipe front-matter
  fields, the instruction formats, the parsers' expectations. The application declares
  the highest `formatVersion` it understands; an update whose `formatVersion` is higher
  is **refused whole**, with the reason and a pointer to the app-channel notice
  («necesita una versión más nueva de Rampa») — FR-3210, the P50 discipline applied to
  the corpus.

The **vault schema version is a different number owned by different work** (P50, its own
item): the corpus format versions *the project's publications against this app's
parsers*; the vault schema versions *her data against every app that ever opens it*. They
move for different reasons — a corpus can add a front-matter field (format bump, vault
untouched) and a profile can gain per-area CUR (schema bump, corpus untouched) — and
coupling them would make every corpus format change imply a data migration and vice
versa. This feature reads neither number from the vault and writes nothing to it.

**Rationale for the split existing at all**: today `CORPUS-VERSION.json` has only
`bundledAt` — a timestamp orders releases but cannot express «this content is fine, your
parser is too old», which is exactly the sentence FR-3210 needs an update to be refused
with. Two numbers, two sentences.

**Alternatives considered**: reusing the app's semver — rejected: it makes every corpus
correction a release, which is the CRIT-01 world this spec exists to end (and the
`USD_TO_EUR` comment's exact complaint). One combined number — rejected above. Semver for
the corpus — rejected: nothing needs three components; «newer» and «compatible» are the
only two questions asked, and two integers answer them without interpretation.

---

## R5 · When does the check run — and who said yes?

**Decision**: **on demand stays the only path that needs no consent** — the existing
button, the existing rule in `releases.ts` («never automatic… `checkedAutomatically`
does not exist and must not be added») stays true *by default*. New: one toggle in
Configuración, **default off**: «comprobar si hay novedades al abrir Rampa» — and when
she turns it on, the check runs at launch, **at most once every 7 days**, covering both
channels in one act (two requests, both to declared hosts). Always:

- **Never during a job**, never triggered by adaptation flows — checking is its own act
  or a launch act, so «reachable only when checking» stays literally true.
- **Never inside ensayo** (`035`): a rehearsal shows no notices.
- Failure and absence are silent (FR-3202) whichever way the check started.
- The toggle's own copy says what leaves the machine and to whom; the `about`/DPO
  disclosure lists both destinations; and the destinations themselves are declared in
  `instructions/updates.md` — the amended `007` FR-511 (P23) rule, in the
  `pictograms.md` declaration pattern. The bundled corpus declares them; a corpus update
  can change them (it is corpus, and it arrives verified).

**Rationale**: the DPO reasoning in `releases.ts` is right and stays — a scheduled
phone-home from a machine handling children's data is not a default anyone else gets to
choose. But «she must remember to press a button» quietly recreates CRIT-01 for every
teacher who never presses it; consent given once, in her language, with the disclosure in
front of her, is Principle VIII's shape: the human routes it. Weekly at launch is the
least chatty schedule that still makes SC-3201's promise real for someone who never
thinks about versions.

**Dismissal** (FR-3203): per app version, stored in `userData` — a notice returns only
when there is something newer than what she dismissed.

**Alternatives considered**: automatic for everyone — rejected on the standing DPO
argument. On-demand only — rejected: it is the status quo with a nicer screen, and the
corpus corrections this review produced would still strand. Nagging re-offers of a
declined corpus — rejected by FR-3206's own words: decline is stable, the offer stays
*available*, not *recurring*.

---

## R6 · What travels on the wire, and where does the fetching code live?

**Decision**: **manifest-first, then raw files — no archive format.** A corpus release is
a GitHub release with tag `corpus-v<version>` whose assets are `manifest.json` and
`manifest.sig`; the files themselves are fetched per-path from the repository at that tag
and verified against the manifest's hashes (so the file host needs no trust of its own —
the hashes are inside the signed manifest). Discovery is a filtered release listing on
the same API host the app check already uses.

The client lives in **`app/packages/providers/src/corpus-feed.ts`**, beside
`releases.ts` — restoring for this feature the sentence written there: `@rampa/providers`
is the network-capable package. It copies `pictograms/download.ts`'s virtues wholesale,
because each one was paid for:

- **A gate mints the transport** (`transportFor(gate)`): there is no exported transport,
  so a second caller *cannot* make a request without the gate saying `may` — the gate
  being her press or the recorded consent (R5). The pictogram code's own history (the
  `checkUpdate` that walked past the gate) is the argument.
- **Injectable transport**, so SC-3202's test is «the suite passes while the transport
  fails the test if called at all», not «we didn't notice a request».
- **`writeAtomic`** — temp + run id + rename — for every write, and here strengthened to
  the whole snapshot: one rename publishes a complete verified version or nothing (R2).
- **Timeouts and redirect discipline**: bounded time per request, and asset URLs resolved
  through the same explicit-redirect handling the transport already needed — a redirect
  is followed to a declared host or not at all.
- **Main process only.** No fetch reachable from a renderer that also displays content
  (Principle IX).

**Rationale for no archive**: unpacking tar/zip means a new dependency parsing untrusted
bytes *before* verification can finish — the exact window R2 closes. Per-file fetch of
Markdown over HTTP/2 to one host is cheap at this size, resumable for free (present +
hash-valid files need no refetch — the pictogram `plan`/`present` pattern), and every
byte written has already matched a signed hash.

**Alternatives considered**: `electron-updater` — it is the app-installing machinery this
spec's app channel constitutionally refuses (FR-3201/SC-3203), and using its plumbing for
the corpus would put a code-install capable dependency inside the one channel that must
never install code. A signed archive — rejected above. Fetching in the shell like
pictograms do — rejected: two packages that fetch is two places to audit, and the
providers package is the one whose name already answers the DPO's first question.
