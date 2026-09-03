# Implementation Plan: Cómo llegan las versiones — la app avisa, el corpus viaja solo

**Branch**: `034-como-llegan-las-versiones` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-03

## Summary

One structural decision governs this feature, and it is an **asymmetry kept on
purpose**: two channels that must never converge.

| | App | Corpus |
|---|---|---|
| Arrives as | **a notice** — version, plain summary, link | **content** — read in full, then accepted |
| Who installs | she does, outside Rampa | Rampa does, after she has read it |
| Can it execute? | never: the channel carries no code (FR-3201, SC-3203) | never: Markdown is data, scanned like any import (FR-3211, Principle IX) |
| Reversible? | her act, her OS | **first-class revert** (FR-3208) |

The app channel mostly **exists already**: `checkForUpdate` in
`app/packages/providers/src/releases.ts` (006 FR-414) checks GitHub releases on her
button press, reports, and deliberately installs nothing. This feature gives its answer a
summary, a dismissal that sticks, and a destination declared in the corpus instead of a
constant — it does not change what the check may do.

The corpus channel is the genuinely new thing, and its shape is a **versioned local
overlay that wins over the bundled corpus**: accepted updates land as whole snapshots
under `userData/corpus/versions/<n>/`, an `active.json` pointer says which one governs,
and `corpusRoot()` (in `app/packages/shell/src/corpus/bundle.ts`) grows into a
resolution — active snapshot if one governs, bundled otherwise. Nothing is patched in
place, nothing touches the vault, and reverting is moving a pointer to a directory that
never left the disk. The teacher's own edits (`recipes-local/` in the vault, 006 FR-415)
keep winning over *whatever* corpus governs — that precedence is the existing answer to
FR-3209, and this feature adds the screen that makes the shadowing visible instead of a
merge engine.

This is also the vehicle two other places have been promising: `cost/index.ts` says of
`USD_TO_EUR` «shipped as data with the corpus… a moving rate is an update and not a
release» (BACKLOG G29), and the BACKLOG's own words at line ~744 name an «update»
mechanism that until now did not exist.

## Technical Context

**Language/Version**: TypeScript 5, Electron. **One new dependency: none** — Ed25519
verification is `node:crypto.verify`, and the wire format is JSON plus raw Markdown
files, so no archive library enters the build (research R2, R6).

**Storage**: `userData` — the established home for machine-level state (credentials,
display settings, pictogram settings, logs). **Never the vault**: the vault is hers,
synced and shared across machines with different app versions (review CRIT-02), and
update-delivered policy inside it would let one machine's acceptance silently change
another's judgement — see research R1.

**Testing**: `vitest` with injectable transports (the `transportFor(gate)` shape from
`pictograms/download.ts` — a test can fail if the network is touched at all); fixture
feeds and a tampered fixture; Playwright for the offer/accept/revert walks.

| Feeds | What it gives |
|---|---|
| `006` · desktop app | `checkForUpdate`/`isNewer`/`UpdateStatus` in `releases.ts`, the button in the UI, and the never-automatic rule with its DPO reasoning written down |
| `023`/`024` · pictograms | The only non-model network precedent: gate-minted transport, `writeAtomic` (temp + run id + rename), main-process-only fetch, bounded concurrency, 404-is-an-answer |
| `029` · normativa corpus | Scan-before-activate for imported policy (FR-2707/2708): shown in full, scanned as untrusted, refused by default. An update is an import with better provenance, not a bypass |
| `007` (amended, P23) · FR-511 | Network destinations are the ones the corpus declares — `instructions/pictograms.md` is the declaration pattern this feature copies for its own hosts |
| `006` FR-415 · local overrides | `loadLocalOverrides()` already makes her `recipes-local/` win by id — the precedence FR-3209 stands on |
| `035` · ensayo | Notices stay out of a rehearsal |

**Where the work lands:**

| | What |
|---|---|
| `app/packages/core/src/corpus-update/` | Manifest type, canonical bytes, Ed25519 verify, hash checks — pure, offline-testable |
| `app/packages/providers/src/corpus-feed.ts` | The fetch: manifest, then files, through a gate-minted transport, beside `releases.ts` |
| `app/packages/shell/src/corpus/bundle.ts` → `active.ts` | `activeCorpusRoot()`: the one place that answers «which corpus governs?» |
| `app/packages/shell/src/corpus/updates.ts` | Store, verify-then-publish, apply, revert, conflict detection — IPC per [contracts/updates.md](./contracts/updates.md) |
| `app/scripts/bundle-corpus.mjs` | `CORPUS-VERSION.json` gains `version` and `formatVersion` |
| `instructions/updates.md` | The declared destinations, corpus-side (the `pictograms.md` pattern) |
| `app/ui/src/updates/` | The quiet notice, the offer that shows everything, the history with revert |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | **This feature is the missing half of the principle.** Judgement being editable Markdown was always half the point; the other half is that corrected judgement *arrives*. And the update hosts are declared in `instructions/updates.md`, not in code — changing where updates come from is a Markdown edit |
| **II** · deterministic core | Verification, hashing, diffing and resolution are deterministic and offline-testable. The only network code sits in `@rampa/providers` behind an injectable transport; no model is ever called by anything here |
| **III** · adapt the how | Not engaged: no adaptation content is produced. The nearest analogue is honesty about versions — an incompatible update says so rather than half-applying (FR-3210) |
| **IV** · one extraction, N outputs | Not engaged. No new pipeline; the corpus the pipeline reads changes provenance, not shape |
| **V** · barriers not diagnoses | Not engaged. Nothing here reads a profile — asserted: the update surface has no vault reference for learner data |
| **VI** · traceability | **FR-3207 is this principle**: every report cites the corpus version that governed the job, and a revert is as recorded as an update. A report traceable to «whatever the corpus was that day» is not traceable |
| **VII** · the draft announces itself | Engaged at the edge: a corpus update must never touch signed documents or existing outputs (FR-3207) — history is immutable, `029` FR-2710's sentence |
| **VIII** · human-routed | Acceptance is hers, decline is stable, revert is hers. Nothing applies itself; the only automation on offer is a *check*, opt-in, default off (research R5) |
| **IX** · content is never instruction (NON-NEGOTIABLE) | **The sharpest risk here.** A corpus update is policy that enters prompts — the `029` injection vector with a distribution channel. So: untrusted until verified (signature, hashes), scanned like an import before activation, refused whole on any doubt (FR-3211, SC-3204). And the app channel carries no code at all, so the worst a compromised feed can attempt is Markdown that still has to get past the scan and past her reading it |

**Gate: passes.** Two reservations recorded rather than resolved:

**SC-3205 needs a teacher.** Whether the offer reads as «what will change about the
material» in her own words is the Principle I claim itself, and nobody here can answer it.

**The signing key's lifecycle is release infrastructure, not app code.** The public key
ships in the app; the private key lives in the release workflow. Key rotation and the
installer-signing question are `COLA` P52's item — adjacent, deliberately separate, and
this plan only requires that a corpus release is signed, not who holds the pen.

## Phase 0 · Research

[research.md](./research.md) — six questions. R1 (where the updated corpus lives) shapes
the feature; R2 (integrity, and what the trust root is) is the one where a wrong answer
is a security hole rather than a refactor.

## Phase 1 · Design

- [data-model.md](./data-model.md) — the manifest, the store, the pointer, and what
  deliberately gains no field.
- [contracts/updates.md](./contracts/updates.md) — the IPC surface and the four rules
  neither channel may break.
- [quickstart.md](./quickstart.md) — the walks: offline invariant first, tampered fixture
  second, money never (nothing here calls a model).

## Sequencing

**The offline suite and the tampered fixture before any machinery.** SC-3202 (everything
works with the machinery present and no network) and SC-3204 (a tampered update changes
zero files) are invariants, and an invariant test written after the feature works is a
test written to fit what already happens — `021` T001's argument, applied to the two
failures here that would be silent: a check that quietly interrupts offline work, and a
tampered update that quietly half-lands.

**The resolution before any consumer moves.** `corpusRoot()` has one definition and many
callers through `bundle.ts`; `activeCorpusRoot()` must exist and be green before any
update can be applied, or applying one changes some readers and not others — partial
application by architecture, which is exactly what FR-3210 forbids on the wire.

**Verification before fetching is wired to a real host.** The verify path is pure core
code, testable against fixtures; the fetch is written against it, never the other way
around, so there is no commit in which bytes from the network can reach disk unverified.

**US1 lands independently.** The notice is small and its rules already exist in
`releases.ts`; it must not wait for the corpus channel, and nothing in it may grow a
dependency on the store (the channels stay asymmetric by construction, not by
discipline).
