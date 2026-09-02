# Implementation Plan: Los pictogramas los trae Rampa

**Spec**: [spec.md](./spec.md) · **Created**: 2026-09-02

## Technical Context

Electron + TypeScript, as everywhere. One new capability: an **outbound HTTP request
that is not to her AI provider** — the first in the application.

| | |
|---|---|
| Transport | `fetch` in the main process only. Never the renderer: a `fetch` from a window is a fetch from a context that also renders untrusted material (`007`) |
| Endpoint | `api.arasaac.org/v1`, public and keyless (verified 2026-09-02). **From the corpus**, not compiled in |
| Written to | The pictogram set folder, in `018`'s format |
| Bound | Words per fetch, from the corpus's own limits, reported when reached |

**No NEEDS CLARIFICATION.** The one open question — whether the licence reading holds —
is a review item, not a design unknown, and the spec's Assumptions carry it.

## Constitution Check

| Principle | Verdict |
|---|---|
| **I · Judgement in Markdown** | The publisher's endpoints, attribution and licence summary go in `instructions/pictograms.md`. A URL in `packages/core` would be the fourth time this project compiled in something that belonged to the corpus |
| **II · Deterministic, model-free core** | No model anywhere in this feature. The fetch is a lookup by exact word; `018` FR-1608's determinism is untouched, and `normalise` still does no stemming and no synonyms |
| **III · Adapt the how, never falsify the what** | Not engaged: no content is produced. A word with several candidates stays an omission (FR-2113 → `018` FR-1609) rather than becoming a guess |
| **IV · One extraction, N outputs** | The set is per vault, not per learner or per job. Fetching for Iker leaves the words there for Noa |
| **V · Functional barriers** | Untouched. `018` FR-1605 already forbids an axis value from enabling this |
| **VI · Traceability** | FR-2116 adds the publisher to what provenance records, so a set built from two sources is still attributable |
| **VII · The draft announces itself** | Untouched |
| **VIII · Human-routed memory** | Nothing is learned from a fetch. It is not experience, it is a file |
| **IX · Content is never instruction** | **The sharp one.** A publisher's response is untrusted input: ids and keywords are parsed and validated, never interpreted, and an image is written to disk by id and rendered by `018`'s existing path. A keyword is text in a JSON file, exactly like a block of her material |

### The two gates this feature has to pass on its own terms

**Nothing fetches without her.** FR-2107 is asserted by a transport spy that fails the
test if called — the same shape as `packages/core`'s isolation suite, which is the only
kind of "we don't do X" claim this project has found to be worth anything.

**Nothing about a child leaves.** FR-2108/2109. A word list is built by removing the
names Rampa knows, and the assertion is on **what the transport was asked for**, driven
from material containing a name, a code and a school.

## Phase 0: Research

Recorded in the spec's own opening rather than a separate `research.md`, because the
research *is* the reason the feature exists: ARASAAC's terms, their public API, and why
fetching is not redistributing. Verified endpoints:

- `GET /v1/pictograms/es/search/<word>` → JSON, 200, no key
- `GET /v1/pictograms/<id>` → PNG 500×500, no key
- `https://static.arasaac.org/pictograms/<id>/<id>_500.png` → the same bytes

## Phase 1: Design

**One decision carries the whole feature: the downloader writes the format the reader
already reads.** `018`'s reader takes a directory of `pictograms.<lang>.json` — a list
of `{ id, keywords }` — plus `<id>.png`. It names no source, by FR-1604, and it stays
that way.

The consequence is that this feature cannot break matching, provenance, attribution, the
photocopy rule or the missing-image gap, because it does not reach them. It fills a
folder. A folder she filled by hand is indistinguishable, which is FR-2103 and also the
fallback if ARASAAC ever closes the API.

```
core (pure)         publisher.ts   corpus → endpoints, attribution, licence
                    wordlist.ts    material → words, names removed
                    fetch.ts       planFetch · readCandidates · mergeSet
shell (effects)     download.ts    the transport, timeouts, atomic writes
                    ipc/pictograms acceptance · withdrawal · fetch + progress
ui                  LicenceStep    what she is agreeing to
                    PictogramSet…  the button, beside the folder picker
```

Contracts and data model: the set format is `018`'s and already documented at
`specs/018-pictogramas/contracts/pictogram-set.md`. This feature adds no new format, so
there is no new contract to write — which is the point.

## What must not break

| | |
|---|---|
| `018` FR-1601's surviving half | No pictogram in any release artefact. Now a test |
| `018` FR-1604 | `packages/core` still names no publisher outside the corpus parser |
| `006` | Everything except the fetch keeps working with no network |
| `009`, `011` | A name still never leaves — now including outbound |
| `013` FR-1113/1118 | A new button and a new step: look at them narrow and at `xlarge` |
