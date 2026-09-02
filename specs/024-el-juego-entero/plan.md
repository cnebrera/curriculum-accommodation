# Implementation Plan: El juego entero, de una vez

**Spec**: [spec.md](./spec.md) · **Created**: 2026-09-02

## Technical Context

No new capability. `023` already built the transport, the licence gate and the word
filter; this changes **what** is fetched and adds the screen that makes it useful.

| | |
|---|---|
| Index | `GET /v1/pictograms/all/{lang}` — one request, 8,1 MB, 13.802 entries with `keywords`, `downloads`, `lastUpdated` |
| Images | `static.arasaac.org/pictograms/{id}/{id}_{size}.png` — a CDN, which is what makes 13.802 requests appropriate rather than rude |
| Size, concurrency | **Corpus data** (FR-2204, FR-2207), not constants |
| Written to | `<vault>/pictogramas/`, in `018`'s format, unchanged |

**No NEEDS CLARIFICATION.** The one open question is `023`'s licence reading, already
under review as backlog G28, and nothing here revisits it.

## Constitution Check

| Principle | Verdict |
|---|---|
| **I · Judgement in Markdown** | Image size, concurrency and the expected total go in `instructions/pictograms.md`. The size follows from the 12 mm minimum print size that is *already* corpus data, so putting it in code would split one decision across two places |
| **II · Deterministic, model-free core** | No model. Popularity order comes from the publisher's own `downloads` field and decides **arrival order only** — never which pictogram is used |
| **III · Adapt the how, never falsify the what** | The sharp one for US2. Her choice must not become a guess: an unchosen ambiguous word still renders with **no** pictogram (FR-2216), exactly as `018` FR-1609 says. The chooser adds a way to answer, not a default answer |
| **IV · One extraction, N outputs** | Her vocabulary is the point: chosen once, used for every learner. `018` storing it per learner was the violation |
| **V · Functional barriers** | Untouched. `018` FR-1605 still forbids an axis from enabling this |
| **VI · Traceability** | `data-picto` already records word→id. A pictogram from her vocabulary must be distinguishable from one the set decided, so the source gains a third value |
| **VII · The draft announces itself** | Untouched |
| **VIII · Human-routed memory** | Her vocabulary is a **decision she made**, not something Rampa learned. It is written when she clicks and never inferred from use — which is the line Principle VIII draws |
| **IX · Content is never instruction** | `023`'s allowlist on ids is unchanged and now matters 13.802 times over. The index is parsed structurally; nothing in it names a path |

### The three claims that need a spy, not an argument

**Nothing on launch** (FR-2210, SC-2204) — a transport that fails the test if called.

**Zero requests for what is present** (FR-2206, SC-2203) — the same spy, after a
completed download.

**An interrupted download is always readable** (SC-2205) — assert `readSet` finds no
problems after a failure at an arbitrary point, not just at the end.

## Phase 0: Research

Measured against the live service, 2026-09-02. Recorded in the spec's table because the
numbers *are* the reason the design changed:

- `GET /v1/pictograms/all/es` → 200, 8.147.519 bytes, 13.802 entries
- `{id}_300.png` → 3.960 bytes · `{id}_500.png` → 14.926 · `{id}_2500.png` → 335.510
- `{id}_100.png` → 404, and there is no SVG at the static host
- The «distribución completa» ZIP is a **Java installer**, and the favourites ZIP needs
  an account. Neither is consumable, which is why per-file from the CDN is the route

## Phase 1: Design

Three pieces, and the first two are edits rather than new files.

```
corpus     instructions/pictograms.md   image_size · concurrency · expected_total
core       pictograms/fetch.ts          planWholeSet · readIndex · updateStatus
           pictograms/match.ts          precedence: learner ▸ hers ▸ set ▸ nothing
           pictograms/vocabulary.ts     her chosen words, per language
shell      pictograms/download.ts       the whole-set loop, throttled, resumable
           pictograms/bring.ts          one entry point, no word list
ui         pictograms/PictogramSetSection.tsx   one button, and what she has
           pictograms/ChooseWord.tsx    the candidates, as pictures
```

**What must not change**: `018`'s `readSet`. It reads a folder of
`pictograms.<lang>.json` plus `<id>.png`, and this feature writes exactly that — so
matching, provenance, attribution, the photocopy rule and the missing-image gap are
reached by nothing here. SC-2207 asserts it.

**Her vocabulary is a vault file**, beside `pictogramas.md`: she can read it, a handover
carries it (FR-2219), and it is a professional judgement in a text file rather than a
row in a database — Principle I applied to her own decisions, not just to ours.

## What must not break

| | |
|---|---|
| `023` FR-2101 | Still nothing in any release artefact. `no-pictograms-shipped.test.ts` unchanged |
| `023` FR-2104/2107 | Acceptance still gates, nothing still fetches on its own |
| `023` FR-2108 | The index request carries a language and nothing else. Images carry an id. No word list means **less** leaves than before, not more |
| `018` FR-1609 | An unchosen ambiguous word still gets nothing |
| `006` | Everything except the fetch works offline; a hand-assembled folder still works |
| `013` FR-1105 | One primary per screen — broken by `023` within an hour, and there is still no test (G31) |
