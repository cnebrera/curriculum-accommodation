# Implementation Plan: Connecting — choosing a service, and getting the key

**Branch**: `009-connect-wizard` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-connect-wizard/spec.md`

## Summary

Six services behind four adapters, offered through one required question and one
recommendation, with the walkthrough and every provider fact living in the corpus
rather than in code.

The technical shape follows from one observation: **almost nothing here is new
code.** The connection step, the key store, the egress chokepoint and the cost
display already exist from `006`. What is missing is a fourth adapter (one file,
covering every service that speaks the OpenAI API), a corpus format for provider
facts and walkthroughs, and a screen that turns those facts into a recommendation.

The risk is not technical. It is that a screen assembled from correct parts still
loses the teacher — which is why the validation for this feature is a person, not
a test.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 22 LTS (unchanged, `006` R1)

**Primary Dependencies**: none new. The compatible adapter uses `fetch`, as the
three existing adapters do; the corpus parser uses the `js-yaml` and front-matter
handling already in `packages/core`.

**Storage**: Provider facts and walkthroughs are Markdown with YAML front matter
in the bundled corpus (`instructions/providers/*.md`). Keys stay in the OS
credential store outside the vault, per `006` FR-417 — extended from one key to
one per service.

**Testing**: `vitest` for the corpus parser, the key normaliser and the
recommendation rule — all deterministic, all offline. Playwright for the screen.
The provider adapters keep the existing stub-based contract tests; **no test
calls a real provider**, and `cases/002-model-floor` is where real keys are spent.

**Target Platform**: unchanged — Windows 10+, macOS 12+, Linux.

**Project Type**: desktop application, existing structure.

**Performance Goals**: key validation returns in under 3s on a normal connection,
because a teacher watching a spinner assumes it is broken. The recommendation is
computed locally from bundled data and is instantaneous.

**Constraints**: validation MUST use the cheapest request each service allows and
MUST send no learner data and no material (FR-723). Everything except validation
itself works offline, including reading the comparison.

**Scale/Scope**: six services at first release, growing by one Markdown file
each. One screen plus a re-entrant version of it. No new package.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1.*

| Principle | Verdict | How this design satisfies it |
|---|---|---|
| I · Judgement in Markdown, not code | **Pass, and it is the point** | Every walkthrough, cost figure, jurisdiction fact and free-tier term is a corpus file. The only strings in code are structural — field names and error kinds. This is the principle applied one layer out from pedagogy: the people who notice that Google moved a button are not the people who can compile TypeScript |
| II · Deterministic and model-free | **Pass** | The parser, the key normaliser, the prefix identification and the recommendation rule all live in `packages/core` and are covered by the module-graph isolation test. No model is consulted to decide anything on this screen |
| III · Adapt the how, never the what | N/A | No adaptation happens here |
| IV · One extraction, N outputs | N/A | No IR involved |
| V · Barriers, not diagnostic labels | N/A | No profile involved |
| VI · Every change is traceable | **Pass, with a consequence** | Switching service MUST NOT alter recorded provenance (FR-731). Material adapted last month keeps the `recipe@version` it was made with, and the provider is not part of provenance today — noted in research R4 as a gap worth naming |
| VII · The draft announces itself | N/A |  |
| VIII · Feedback is memory, human-routed | N/A |  |
| IX · Content is never instruction | **Pass, and one thing to watch** | A corpus walkthrough is content the application *displays*, never obeys. The endpoint a service declares is configuration read from a reviewed file — see research R2, which is where the first version of this spec went wrong in both directions |
| Learner data | **Pass** | Validation sends no learner data. Keys are stored per service, encrypted, outside the vault. Jurisdiction facts are disclosed, never used to certify |
| Licensing | **Pass** | Provider walkthroughs are corpus, CC BY-SA 4.0, and ship under the existing bundle rules |

**One tension worth recording, not a violation.** Principle I says judgement lives
in Markdown so a *teacher* can correct it. A provider walkthrough is not
pedagogical judgement, and a teacher is not who will correct it — a contributor
will. The principle still applies for the same structural reason (the copy must
be correctable without a release), but the "so a teacher can fix it" argument does
not transfer, and pretending it does would be borrowing authority. Recorded so the
next person does not mistake this for a pedagogy file.

**Result: no violations. Complexity Tracking stays empty.**

## Project Structure

### Documentation (this feature)

```text
specs/009-connect-wizard/
├── spec.md              # /speckit-specify + /speckit-clarify
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── provider-catalogue.md   # the corpus contract for a service entry
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2, via /speckit-tasks
```

### Source Code (repository root)

```text
instructions/providers/        # NEW — the catalogue, one file per service
├── README.md                  # the contract, for whoever adds the next one
├── google.md                  # Gemini · no card
├── groq.md                    # no card, compatible adapter
├── mistral.md                 # EU, compatible adapter
├── anthropic.md               # Claude
├── openai.md                  # ChatGPT — carries the Plus confusion warning
└── deepseek.md                # cheapest, compatible adapter

app/packages/core/src/providers/
├── catalogue.ts               # NEW — parse a service entry, deterministic
└── recommend.ts               # NEW — the rule in FR-707a/707b, pure

app/packages/providers/src/
└── compatible.ts              # NEW — one adapter for every OpenAI-API service

app/packages/shell/src/ipc/
├── corpus.ts                  # + the catalogue over IPC
└── keys.ts                    # one key per service, not one key

app/ui/src/onboarding/
├── ConnectStep.tsx            # rebuilt: question → recommendation → walkthrough
├── ServiceComparison.tsx      # NEW — the full table, one click away
└── Walkthrough.tsx            # NEW — numbered steps + "no encuentro eso"

app/ui/src/settings/
└── ConnectionScreen.tsx       # NEW — the re-entrant version (US5)
```

**Structure Decision**: no new package. The split follows the existing
constitutional boundary — parsing and the recommendation rule are deterministic
and go in `core`; the one adapter that reaches the network goes in `providers`;
the credential store and corpus reading stay privileged in `shell`; the UI reads
everything over IPC. The catalogue sits in `instructions/` because it is corpus,
bundled by the existing `bundle-corpus.mjs` with no change to its directory list.

## Constitution Re-check (post-design)

*Re-evaluated after Phase 1. Design either strengthened a gate or exposed a cost.*

| Principle | Before design | After design |
|---|---|---|
| I · Judgement in Markdown | Pass, and the point | **Strengthened into a contract.** `contracts/provider-catalogue.md` states what the author of an entry promises and what the application promises back, so "it lives in Markdown" is an obligation rather than a location |
| II · Deterministic and model-free | Pass | **Pass by construction.** The parser, the normaliser and the recommendation rule are pure functions in `core`, covered by the existing module-graph test. The rule reads a `quality` rank *from data* rather than knowing which service is good — so no judgement is compiled in |
| VI · Every change is traceable | Pass, with a consequence | **A gap was found and named rather than patched.** Provenance records recipe and axis but not which service produced the material, which matters once switching is expected. Raised as backlog G18; fixing it here would change the IR contract through a connection screen |
| IX · Content is never instruction | Pass, one thing to watch | **Narrowed to one field.** `endpoint` is honoured only for `adapter: compatible` and ignored with a log line otherwise, so the single field capable of redirecting traffic is structurally bounded. A free-text endpoint stays out of scope |
| Learner data | Pass | **Unchanged, and one honesty rule added:** facts older than a year withdraw the offer rather than being shown with a footnote. A stale jurisdiction claim about children's data is not a current fact |

No violations. Two costs the design accepts openly:

1. **The catalogue can rot**, and no amount of structure prevents that — only
   someone re-checking. The 180/365-day thresholds make rot visible and then
   fatal, which is the best a released build can do about facts that age after its
   checks passed.
2. **`quality: unmeasured` ships first.** The recommendation initially runs on a
   declared provisional rank, and the interface says so. That is a guess presented
   as a guess; `cases/002-model-floor` replaces it with a measurement.

## Complexity Tracking

Empty. No principle required a justification.

---

*Phase 0 output: [research.md](./research.md) · Phase 1 output:
[data-model.md](./data-model.md), [contracts/](./contracts/),
[quickstart.md](./quickstart.md)*
