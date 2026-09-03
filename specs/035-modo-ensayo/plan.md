# Implementation Plan: Modo ensayo — la primera noche no depende de una clave

**Branch**: `035-modo-ensayo` · **Spec**: [spec.md](./spec.md) · **Date**: 2026-09-03

## Summary

Two structural decisions carry this feature, and everything else is glue around them.

**The rehearsal store is another root, not another folder.** `Vault` is already a class
instantiated over a root (`new Vault(root)`), and `resolveInVault` already confines every
read and write to whatever root the instance holds. So the rehearsal store is a **second
`Vault` instance** over a directory that is not inside her vault — under Electron's
`userData`, beside the credential store and the display settings, which are the two
precedents for "machine state that is not part of her professional record" (`009` FR-725,
`010` FR-820). No filter, no `if (ensayo)` in front of a shared root: a rehearsal write
*cannot* name a real path, because the instance it writes through has never heard of one.
Discarding the rehearsal is deleting that root (research R1).

**The simulation seam is served jobs, not a fake provider.** The two steps that need a
model — reading the photo, adapting — are served from an embedded sample set whose
adaptation was **authored and reviewed like corpus, never generated at build** (spec
assumption; research R2, R3). Everything around those two steps runs the *real*
deterministic code over the rehearsal vault: the verification screen, the name question,
the draft mark, the sign-off, the renderers, print. A fake `Provider` was considered and
rejected — it would have to be registered where real providers are resolved, which puts
the real pipeline one configuration entry away from canned output (R2).

The consequence for the code is one honest refactor: the deterministic job functions that
today reach for `currentVault()` internally (`renderJob`, sign-off) take the vault as a
parameter, and **only the IPC layer decides which vault**. The real channels pass
`currentVault()`, unchanged in behaviour; the `ensayo:*` channels pass the rehearsal
vault, and a boundary test asserts the ensayo module can never import the real one.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Electron. No new dependencies.

**Storage**: a second root under `app.getPath('userData')/ensayo/`, laid out **exactly
like the vault** (`VAULT` paths from `packages/core/src/vault/paths.ts`), so every core
function that takes a `Vault` works over it unmodified. The real vault gains nothing —
not a file, not a field (data-model).

**Testing**: `vitest` for the store lifecycle, the boundary and the sample's integrity;
Playwright for the journey; the two invariants (SC-3302, SC-3303) written first, per
quickstart §1.

| Feeds | What it gives |
|---|---|
| `009` · connect wizard | The wall this feature stands beside: `ConnectStep`, the credential store, `activeProvider()` — the gate that says whether a provider is connected |
| `016` · una puerta | The no-default rule: trying and connecting are **both doors, neither pre-chosen** (its FR-1403 argument, applied to the offer) |
| `006` · desktop app | FR-403's cost register («unos 3 céntimos») for the would-be costs; FR-422's ledger, which the rehearsal must never touch; SC-401's 30 minutes, rehearsed at half |
| `007`/`021` · print & documents | `renderHTML`, `resolveDocument`, `isSignedOff` derived from the document — reused as-is over the rehearsal vault |
| `028` · pictogram materials | The deterministic features the rehearsal presents as **real**, because they are |
| `013` · shell | `Page`/`Section`, the data-layer rule (no component calls `window.rampa`), and `npm run shots` |

**Where the work lands:**

| | What |
|---|---|
| `app/packages/shell/src/ensayo/` | The rehearsal: store (root, lifecycle), `ensayo:*` IPC, the served sample. Imports **neither** `currentVault` nor `@rampa/providers` — asserted |
| `app/packages/shell/src/jobs/print.ts`, `ipc/signoff.ts` | The vault becomes a parameter; real callers pass `currentVault()` |
| `sample/ensayo/` (repo root) | The sample set: fictional profile, source photo, reading with its deliberate flaw, pre-computed adaptation and report, would-be costs. Authored, reviewed, CC BY-SA — bundled by `app/scripts/bundle-corpus.mjs` beside the corpus |
| `app/ui/src/ensayo/` + `ui/src/data/ensayo.ts` | The rehearsal screens inside `EnsayoFrame` (the mark, structurally), and the hook layer |
| `app/ui/src/onboarding/ConnectStep.tsx`, `ui/src/App.tsx` | The offer, beside connecting — never a step |
| `app/e2e/ensayo-invariants.spec.ts`, `e2e/ensayo.spec.ts` | SC-3302 and SC-3303 first; then the journey |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | The sample set is corpus-like content: authored Markdown, reviewed in PR, bundled with its licence. Its report cites real recipes at their bundled versions — a report inventing recipe ids would be code displacing the corpus. The «material de ejemplo» sentence lives **in the sample documents**, not in a TypeScript string |
| **II** · deterministic core | **The rehearsal is this principle made visible to a teacher.** Zero model calls, zero keys, zero network — instrumented (SC-3302), not promised. The sample adaptation is pre-computed at authoring time precisely so no build step calls a model |
| **III** · adapt the how, never falsify the what | The sample adaptation is held to the same rule as real output: it is reviewed against the recipes it cites, and FR-3310 requires its report to be genuine. A lorem-ipsum report would teach her that reports are decoration |
| **IV** · one extraction, N outputs | The sample ships one IR; print and every modality render it through the real renderers over the rehearsal vault. No rehearsal-only rendering path exists |
| **V** · barriers not diagnoses | The fictional profile is written on the axes, like `seed-learners.mjs`'s seven — a combination of barriers, resembling nobody (FR-3307) |
| **VI** · traceability | The sample's report cites `data-recipe: id@version` against the bundled corpus, and a test resolves every citation. A sample whose report drifts from the corpus is a stale sample, and `034`'s channel carries the refresh |
| **VII** · the draft announces itself | **Experienced, not narrated** (FR-3311): the sample arrives marked pending review, the mark comes off only through the real sign-off over the rehearsal vault, one signature per sheet. And the principle applied to the sample itself: a fabricated child is fabricated loudly (FR-3307), a rehearsal sheet says «material de ejemplo» on the paper (FR-3305) |
| **VIII** · human-routed memory | Not engaged, deliberately: the v1 rehearsal has no correction step, so no scope question and no memory writes anywhere. Recorded in tasks as out of scope rather than left implicit |
| **IX** · content is never instruction | The rehearsal narrows the surface: nothing she types is ever sent anywhere (offline by construction), and the sample source is trusted authored content. The name question still fires on her typed note — run by core's deterministic detector — because seeing that gate is the point (FR-3311) |

**Gate: passes.** Two reservations recorded rather than resolved:

**SC-3305 needs a teacher.** Whether the rehearsal transfers — whether she can do the
real flow next morning without help — is the feature's purpose and not answerable in this
repository. It is the only criterion that can come back «no» with everything else green.

**The instrumentation for SC-3302 must cover both network stacks.** Provider calls leave
through Node's `fetch` in the main process, not through Chromium's session, so a
`webRequest` counter alone would pass while a request escaped. The invariant needs both
the runtime counter and the structural half: a module-graph test that the ensayo module
cannot reach `@rampa/providers` at all (quickstart §1).

## Phase 0 · Research

[research.md](./research.md) — six questions. R1 and R2 are the two structural decisions
above. R6 records what the rehearsal does and does not share with the test machinery
(`RAMPA_TEST`/`RAMPA_HIDDEN`): the answer is *nothing*, and why that is the right answer.

## Phase 1 · Design

- [data-model.md](./data-model.md) — the rehearsal root's layout (a mirror, deliberately),
  the sample set, the rehearsal state, and what the real vault deliberately does not gain.
- [quickstart.md](./quickstart.md) — the two invariants first, then the journey, then the
  person.

## Sequencing

**The two invariants before the mode exists.** SC-3302 (zero network) and SC-3303 (real
vault byte-identical) are the promises that make the feature safe to build; a check
written after the rehearsal works is a check written to fit what already happens — the
same argument `021` made for the answer key, with the same failure shape: something
invented surfacing where something real was expected.

**The vault-parameter refactor before any ensayo caller exists.** `renderJob` and the
sign-off reach for `currentVault()` internally today; if the ensayo IPC is written first,
it will be written around that, and «around that» is where a real-vault reference sneaks
into rehearsal code.

**The sample set early, because it is on the critical path of everything.** Every screen,
test and walk needs the authored sample; and it is the one artefact that needs review by
a person for quality, not only for correctness — starting it late makes the review the
bottleneck.

**US1 before US2 in tasks, but US2's invariant tests run from day one.** The journey is
the feature; the separation is what makes it safe. Building the journey against
already-red invariant tests means every task that adds a step also proves the step leaks
nothing.
