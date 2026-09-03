# Quickstart — proving an exam is an exam and a problem is checked

Ordered so everything checkable offline is checked before anything spends money, and the
person comes last because her verdict cannot be automated.

## Prerequisites

```bash
cd app
npm ci
npm test          # typecheck + the whole offline suite
```

A vault with one learner whose profile records an interest, and one whose overlay
(`adaptations.md`) records an ACS year — the two ends of FR-2511 and FR-2509.

---

## §1 · The test to write first

```bash
npx vitest run packages/core/test/exam-never-carries-answers.test.ts
```

The learner-facing document of a composed exam contains **zero answers** — computed or
model-claimed, in text or in any support layer — checked against the **rendered
output** (HTML, ODT, linear), not the IR (SC-2502). And the same for problems: no
computed answer appears in any statement.

Written red, before any exam can render, because its failure mode is an answer on the
page a child sits an exam with — and a check written after the feature works is a check
written to fit what already happens (`021` T001's lesson, on a sharper document).

## §2 · Offline · extraction and the parsers

```bash
npx vitest run packages/core/test/problem-verification.test.ts packages/core/test/compose-proposals.test.ts
```

| Case | Expected |
|---|---|
| Statement 3,50 y 1,20 · `OPERACIÓN: 3,50 - 1,20` · `RESULTADO: 2,30` | accepted, answer **computed** |
| Same statement · `RESULTADO: 2,20` | **rejected**, not repaired (FR-2502) |
| Same statement · `OPERACIÓN: 3,50 - 1,10` · consistent `RESULTADO: 2,40` | **rejected**: 1,10 is not in the statement — the liar's own declaration is not evidence (FR-2501) |
| Statement whose text contains the computed answer | rejected: an answer in the statement is an answer on the page |
| A «why»-question, no `OPERACIÓN` | carried unverified and **declared**, never in the computed key (FR-2504) |
| `3,50` vs `3.50` | the same value — comma folded, compared as numbers |
| A half-labelled block | **no proposal**, never a guess |

## §3 · Offline · the loop cut and the split

```bash
npx vitest run packages/core/test/compose-loop.test.ts packages/core/test/objectives.test.ts
```

- A batch that is 100% `unknown` **aborts** the loop: no re-propose, the constraint named,
  proposals-used reported (FR-2510, P19).
- «Sumas y restas con llevadas» → **two skills**: `arith.add`+`carries` and
  `arith.subtract`+`borrows` — nothing silently narrowed to the first match (FR-2508).

## §4 · Offline · the kind governs, structurally

```bash
npx vitest run packages/core/test/ packages/shell/test/
```

- Each of the four kinds from one objective → four documents, four shapes, each
  satisfying its contract; the count counts the kind's unit (FR-2505).
- The derived kind read from the **structure** of what was produced recognises all four;
  the mismatch note fires **only** on real mismatch — ask for an exam, get an exam,
  no apology (FR-2506, SC-2503).
- «Una rúbrica» → refused honestly, the four kinds offered, nothing silently mapped.
- No learner-facing path — resolver, adaptation, export, linear — ever reads
  `jobAnswers` (FR-2512), asserted as an absence.
- The exam path contains **no profile-keyed stop**: composing to an ACS-modified level
  passes with the overlay, stops with the teaching-team sentence without it (FR-2509).

## §5 · With a window · the walk

```bash
npm run build && RAMPA_TEST=1 npx playwright test e2e/compose-kinds-real.spec.ts
```

1. Ask for «problemas de sumas y restas con dinero, 6»: six stories, a key whose every
   answer the code computed, the draft mark, and — if any item is declared — the
   declaration **beside** the mark.
2. Ask for «examen, 10 preguntas»: ten numbered questions, answer space, **nothing on
   the sheet that answers anything**, and the key as its own document with
   `SOLUCIONES · NO REPARTIR` and its per-entry labels.
3. Ask for the four kinds from one objective: four recognisably different documents.
4. The report, every time: the kind, what was verified, what was declared, what it cost.

## §6 · Looked at, not asserted

```bash
npm run shots
```

Open them. A problems page — do the statements read like problems or like padded
arithmetic? An exam's first page — does «borrador» read clearly enough when the page is
a test, and does the answer space look like space a child can actually use? The key with
a `declared-unverified` entry — is the per-entry label unmissable in a pile of paper?
No assertion answers these.

## §7 · The one that costs money

With a real key: compose problems for a learner whose profile records «dinosaurios».

1. The statements may be about dinosaurs; the quantities are what the verifier admitted
   from the statements — reread the key against the sheets by hand, once (FR-2511).
2. Ask for «restas con llevadas»: it composes borrows, or it stops early **naming the
   constraint and the spend** — never thirty proposals and zero exercises (FR-2510).
3. Correct one problem («el 3 es muy largo»): `021`'s `correctComposition` re-runs, the
   key is regenerated and re-verified, the old version is kept.

## §8 · The verdict that needs a teacher (SC-2505)

Give a teacher a composed exam, no preamble, and ask whether she would put it in front
of the group with her name on it.

Whether the questions are worth asking is not answerable in this repository, and it is
the most consequential thing this feature produces. «Why not» is worth more than the
answer.
