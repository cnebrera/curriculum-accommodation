# Implementation Plan: The application — a vault she owns, over a corpus she doesn't

**Branch**: `006-desktop-app` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-desktop-app/spec.md`

## Summary

A desktop application that puts a teacher-owned folder of plain markdown in front
of the adaptation pipeline, ships the recipe corpus read-only, and uses the
teacher's own AI key.

The technical approach follows the constitution's split rather than a
conventional app architecture: a **model-free deterministic core** that does all
file, IR, render and redaction work offline; a **thin provider layer** that is the
only code permitted to touch the network; and a **shell** that owns the window,
the vault path and the credential store. The separation is not stylistic — it is
Principle II, and it is enforced by a test that fails if the core can reach the
network.

The highest-risk component is not the pipeline. It is the first ten minutes.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 22 LTS

**Primary Dependencies**: Electron (shell + bundled Chromium for print fidelity),
`gray-matter` (front matter, wrapped in a damage-tolerant parser), `chokidar`
(external edit detection), `zod` (vault schema validation with repair), provider
SDKs in the isolated provider layer only

**Storage**: Plain files. Markdown with light YAML front matter in a
teacher-chosen vault folder. No database. Name map encrypted at rest via
Electron `safeStorage`, stored inside the vault.

**Testing**: `vitest` for the core (offline, no key, no network); Playwright for
Electron end-to-end, with the onboarding flow covered first; injection fixtures
from `specs/007-untrusted-content` run in CI

**Target Platform**: Windows 10+, macOS 12+. Linux best-effort, unsigned.

**Project Type**: Desktop application over a local file vault

**Performance Goals**: Cold start under 3s. A two-page worksheet from photo to
printable PDF in under 90s of machine time. Vault with 30 learners and a year of
notes opens without perceptible delay.

**Constraints**: Everything except adaptation works offline. No external tooling
to install — no pandoc, no browser, no Python. Writes confined to the vault. The
deterministic core makes no outbound calls of any kind.

**Scale/Scope**: One teacher, tens of learners, hundreds of jobs a year. Not
multi-user, not networked, not synchronised by us.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Verdict | How this design satisfies it |
|---|---|---|
| I · Judgement in markdown, not code | **Pass, with a standing risk** | The corpus stays markdown and ships read-only. The risk is drift: wizard copy and validation messages are where adaptation policy will try to leak into code. Review rule: any string that tells the teacher *how to adapt* belongs in the corpus |
| II · Code is deterministic and model-free | **Pass, enforced** | `core` has no network dependency and no provider import. A test asserts this by module graph, so a violation fails CI rather than review |
| III · Adapt the how, never the what | Pass | Inherited from the corpus; the app adds the output check from `007` |
| IV · One extraction, N outputs | Pass | Renderers consume the same IR. No modality-specific pipeline |
| V · Barriers, not diagnostic labels | Pass | The profile UI is the ten axes and the qualitative fields. No diagnosis field exists to fill in |
| VI · Every change is traceable | Pass | The report view is built from provenance attributes; a block without them fails the job (`007` FR-512) |
| VII · The draft announces itself | **Pass, structural** | Only the review step clears the mark, enforced in the shell rather than requested of the model |
| VIII · Feedback is memory, human-routed | Pass | The review screen asks for scope and offers no default. Auto-routing is not implemented, deliberately |
| IX · Content is never instruction | **Pass, structural** | The renderer receives an IR document and nothing else — the profile is not in scope, so there is no path to emit it. Writes are vault-confined. Redaction runs at the egress chokepoint |
| Learner data | **Improved** | Redaction becomes enforceable for the first time. Names encrypted at rest and excluded from every export |
| Licensing | **Action required** | The app is Apache-2.0 but bundles CC BY-SA 4.0 content. The build MUST ship both licences and the corpus attribution, or distribution is non-compliant |

**Recorded tension, not a violation.** The application is code a non-developer
cannot change, which sits uneasily beside Principle I. It resolves because
Principle I governs *judgement*, and judgement stays in the corpus: teachers
change their vault, contributors change recipes in the repository, and nobody
needs to change the app to change an adaptation. If that stops being true, the
principle is being violated and the design is wrong.

## Project Structure

### Documentation (this feature)

```text
specs/006-desktop-app/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── vault-format.md
│   ├── provider-adapter.md
│   └── ipc-surface.md
└── tasks.md             # Phase 2, via /speckit-tasks
```

### Source Code (repository root)

```text
app/
├── packages/
│   ├── core/                 # Deterministic. No network, no provider imports.
│   │   ├── src/
│   │   │   ├── vault/        # read, write, watch, repair
│   │   │   ├── ir/           # parse, validate, provenance checks
│   │   │   ├── recipes/      # load bundled corpus + vault overrides, select
│   │   │   ├── render/       # IR → HTML; print CSS; photocopy check
│   │   │   ├── redact/       # name substitution, probable-name detection
│   │   │   └── report/       # provenance → teacher-readable report
│   │   └── test/             # runs offline, no key
│   ├── providers/            # ONLY code permitted to reach the network
│   │   └── src/              # adapter interface + one module per provider
│   └── shell/                # Electron main + preload
│       └── src/              # window, vault path, safeStorage, printToPDF
├── ui/                       # Renderer. Spanish first, i18n-scaffolded.
│   └── src/
│       ├── onboarding/       # highest-risk component, isolated for testing
│       ├── learners/
│       ├── adapt/
│       ├── review/
│       └── notes/
├── corpus/                   # build-time copy of recipes/, read-only at runtime
└── e2e/                      # Playwright, onboarding covered first
```

**Structure Decision**: Three packages plus a UI, split along the constitutional
boundary rather than by convention. `core` is the deterministic layer of
Principle II and is publishable and testable on its own; `providers` is the only
network-capable code, so the invariant is a module-graph assertion instead of a
policy; `shell` holds the privileged operations (filesystem, credential store,
print). The UI never touches the filesystem directly — every access goes through
the shell's IPC surface, which is what makes "writes confined to the vault"
enforceable in one place.

`corpus/` is copied at build time from the repository's `recipes/`, so there is
one source of truth and the app cannot drift from what contributors edit.


## Constitution Re-check (post-design)

*Re-evaluated after Phase 1. Design either strengthened a gate or exposed a cost.*

| Principle | Before design | After design |
|---|---|---|
| II · Deterministic and model-free | Pass by intent | **Pass by construction.** `npm run test:isolation` asserts the module graph; a violation fails CI with the principle quoted. The core's suite runs with no key and no network |
| VII · The draft announces itself | Pass | **Strengthened.** `job.signOff` is the only IPC call that clears the mark. Not a rule the model is asked to follow — an operation it cannot reach |
| IX · Content is never instruction | Pass by intent | **Strengthened to structural.** The renderer takes an IR document; the profile is not a parameter of any render call. There is no check to bypass because there is no argument to pass. `vault.write` rejects out-of-vault paths rather than sanitising them |
| Licensing | Action required | **Resolved into the build.** Both licences and corpus attribution ship in the installer, and the build fails without them |
| I · Judgement in markdown | Pass, standing risk | **Unchanged, and still the one to watch.** Nothing in the design prevents adaptation policy leaking into wizard copy or validation messages. The mitigation stays a review rule, which is weaker than the others here — worth revisiting if it ever slips |

No violations. Complexity Tracking stays empty.

Two costs the design accepts openly, recorded so nobody rediscovers them as
surprises:

1. **~150 MB download**, from bundling Chromium for print fidelity (R1). One-time,
   delta-updated. Print output being identical on her machine and ours is
   permanent.
2. **Moving to a new computer loses display names**, from binding the name map to
   OS encryption (R4). Benign — profiles, notes and history survive intact — and
   an explicit export covers the deliberate move. Privacy holds by default.

## Blocked on a decision that is not ours

FR-426 requires signed builds, and R9's human test is worth little if she meets
*"Windows protected your PC"* before the first screen. **Code-signing
certificates are an annual cost and a legal identity**, and both belong to the
project owner. Until that is settled, the human validation runs on a manually
trusted local build, and the result carries an asterisk: it will not have measured
the very first impression, which is the one this feature is about.
