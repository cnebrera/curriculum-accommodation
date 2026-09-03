# Quickstart — proving versions arrive without breaking anything that already works

Ordered so the two invariants are checked before the machinery that could break them
exists, and everything runs offline against fixtures — **nothing in this feature calls a
model, so nothing here spends money.**

## Prerequisites

```bash
cd app
npm ci
npm test          # typecheck + the whole offline suite
```

Fixtures: a fixture release feed, a fixture corpus feed (manifest + files + signature
made with a **fixture keypair**), and a tampered variant of each failure shape.

---

## §1 · The invariant to check first: offline changes nothing (SC-3202)

```bash
npx vitest run packages/shell/test/updates-offline.test.ts && npm test
```

With the update machinery present and the transport replaced by one that **fails the test
if called at all** (the `transportFor` pattern from `pictograms/download.ts`):

- The full existing offline suite passes untouched.
- A check with no network produces silence — no error surfaced, no interruption, and the
  next job runs exactly as before (FR-3202).
- Nothing in the update surface holds a vault reference to learner data.

This is the `006` promise («everything keeps working forever offline») extended to the
machinery that most tempts a project to break it.

## §2 · The second invariant: a tampered update changes zero files (SC-3204)

```bash
npx vitest run packages/core/test/corpus-update-verify.test.ts
```

Every failure shape, and after each one an assertion that `userData/corpus/` is
**byte-identical** to before:

| Fixture | Expected |
|---|---|
| Wrong signature | refused before anything is shown |
| Valid signature, one file's bytes altered | refused whole at hash check |
| Truncated download (a file missing, a file short) | refused whole; temp discarded |
| Valid update, `formatVersion` above supported | refused whole, with the reason and the pointer at the app notice (FR-3210) |
| Valid update carrying an injection-shaped instruction | scan finding shown, activation refused by default (FR-3211, the `029` fixtures) |
| Valid update, interrupted mid-fetch | nothing published; retry starts clean |

«Zero files changed» is checked as a hash of the store before and after — not as the
absence of an error, because a half-landed update that apologises is still half landed.

## §3 · Offline · the resolution

```bash
npx vitest run packages/shell/test/active-corpus.test.ts
```

| Case | Expected |
|---|---|
| No snapshot | bundled governs; `corpus:version` says so |
| Accepted snapshot, supported format | snapshot governs; every reader reads it |
| Snapshot present, bundled corpus **newer** (app was reinstalled) | bundled governs; history records `superseded-by-bundled` |
| Snapshot incomplete or unsupported on disk | bundled governs; the screen says why; nothing crashes |
| Her `recipes-local/` override vs any governing source | hers wins, both sources (FR-3209's floor) |
| Revert to an earlier retained version | it governs new jobs; history records it (FR-3208) |

Plus the structural one: **no reader resolves a corpus path outside the resolution
module** — a grep, asserted, the `021` resolver lesson.

## §4 · Offline · the app channel is words and a link, and nothing else

```bash
npx vitest run packages/providers/test/releases.test.ts packages/shell/test/notify-only.test.ts
```

- Fixture feed newer → notice with version, plain summary, link (FR-3201). Same version →
  silence. 404/garbage/offline → silence (FR-3202).
- Dismissed → stays dismissed for that version; a *newer* version notices again (FR-3203).
- **The absence (SC-3203)**: no binary download path, no installer spawn, no
  `electron-updater` anywhere in the dependency tree. The test fails if any appears.

## §5 · With a window · the corpus walk, end to end (SC-3201)

```bash
npm run build && RAMPA_TEST=1 npx playwright test e2e/corpus-update.spec.ts
```

Against the fixture feed:

1. Check. The offer appears: summary in her language, **every changed file readable in
   full** before any accept button does anything (FR-3206).
2. Decline. Jobs keep running under the old corpus; the offer stays available and does
   not come back on its own.
3. Accept. The next job's **report cites the new corpus version** (FR-3207); a document
   signed before the update is byte-identical after it.
4. One updated file is shadowed by a `recipes-local/` edit: the conflict is marked per
   file; *keep* costs nothing and her file governs; *take* sets her file aside **visibly,
   dated, in her vault, not deleted**; *view both* shows both (FR-3209).
5. Revert from the same screen. The prior version governs the next job and the report
   says so; the history shows the revert as plainly as the update (FR-3208).

## §6 · With a window · consent and disclosure

- The launch check exists only behind the Configuración toggle, **default off**, its copy
  saying what leaves the machine; on, it runs at most weekly, never mid-job, never in
  ensayo (research R5).
- `about`/DPO lists both destinations, and they match what `instructions/updates.md`
  declares (FR-3204, the amended `007` FR-511) — compared in a test, not by eye, because
  a disclosure that drifts from the code is worse than none.

## §7 · Looked at, not asserted

```bash
npm run shots
```

Open them. The notice at its quietest — is it one line, or is it a nag? The offer with a
long recipe diff at the narrowest width and at `xlarge`. The conflict screen: do «la tuya»
and «la nueva» read as *hers* and *the project's* without jargon? The history with a
revert in it — is going back as dignified as updating, or does it look like an apology?

## §8 · The verdict nobody here can produce (SC-3205)

Give a teacher a real corpus update offer, no preamble, and ask her to say **in her own
words what will change about the material**. If she cannot, the offer failed Principle I's
own claim — the judgement was supposed to be readable — and the fix is the offer's
writing, not her reading.
