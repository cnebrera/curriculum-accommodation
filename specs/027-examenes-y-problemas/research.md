# Phase 0 · Research

Six questions. R2 is the one the feature stands on; R5 found why the current
kind-detection is dead code rather than merely wrong.

---

## R1 · What does a parseable word problem look like on the wire?

**Decision**: a labelled block per problem, line-oriented, parsed by a new
`parseProblemProposals` with the same intolerance as `parseProposals`:

```
PROBLEMA
ENUNCIADO: María tiene 3,50 € y compra un cuaderno que cuesta 1,20 €. ¿Cuánto le queda?
OPERACIÓN: 3,50 - 1,20
RESULTADO: 2,30
```

`ENUNCIADO` runs until the next label, so a two-sentence story fits. A block missing a
label, or whose `OPERACIÓN` the arithmetic parser does not read, is **no proposal** —
never a guessed one, for the reason `proposals.ts` already records: a guessed expression
goes to the verifier, which then checks the guess rather than what the model said.

**Rationale**: the current `expresión = resultado` one-liner makes a statement
unparseable **by construction** (the review's PROD-02) — and the failure of the obvious
alternatives is instructive. Free text with the answer at the end cannot be verified at
all. JSON puts child-facing Spanish prose inside string escapes, invites a lenient
`parseJsonish`-style recovery, and breaks the project's established pattern that compose
proposals are lines a person can read in the raw log. Labelled lines are what
`parseProposals` already almost is, tolerant of fences and numbering for the same
money-saving reason, and intolerant of everything that matters.

**Where the format lives**: in code, beside `OUTPUT_FORMAT`, whose own comment records
the boundary — «only the wire format is added here, which is mechanics». What makes a
*good* problem (the statement is not the obstacle, the context is his world, the
question is really asked) is judgement and goes to `instructions/compose.md` (Principle I).

**Alternatives considered**: extending the one-line format («enunciado | expresión =
resultado») — rejected: statements contain the `=` sign, dates and question marks, and a
delimiter collision silently truncates a child's problem. Asking for IR blocks directly —
rejected: the IR is what `buildSheet` writes *after* verification; a model writing IR
would also be writing `data-` attributes we then have to strip (the lesson `sheet.ts`
already encodes: ids and attributes are rewritten by us).

---

## R2 · How are the quantities extracted — deterministically, or by a second model pass?

**Decision**: **deterministic extraction from the statement, with the model's declared
operation admitted only against it.** Three checks, all code, all offline:

1. `extractQuantities(enunciado)` pulls every number from the statement text the child
   will read — Spanish decimal comma, currency and unit suffixes tolerated — by regex,
   compared **as values** (3,50 ≡ 3.50, the `normalise` lesson from `verify/types.ts`).
2. The proposal's `OPERACIÓN` is admitted only if **every operand appears among the
   statement's own numbers**. An operand from nowhere means the story and the arithmetic
   are two different problems, and the child gets the story.
3. The answer is **computed** from the admitted expression by the existing arithmetic
   verifier (`solve`), constraints and level checked by `exercises` exactly as for bare
   operations. The model's `RESULTADO` is only compared, never used — `002`'s rule,
   unchanged. And the computed answer must **not** itself appear in the statement text:
   an answer in the statement is an answer on the learner's page (SC-2502's cousin).

**Why not purely deterministic (code infers the operation from the narrative)**: deciding
that «compra» means subtract and «le regalan» means add is Spanish semantics — judgement
encoded in code, which Principle I rejects, and brittle enough that every miss burns
budget. The spec's own checklist stops one step earlier: it fixes *whose numbers count*,
not who names the operation.

**Why not a second model pass (model B extracts what model A wrote)**: it verifies one
model with another — the same liar with a different voice — costs a provider call per
proposal against the spec's «no new provider calls» assumption, and its failure mode is
agreement.

**What this deliberately does not verify, said out loud**: that the *narrative* implies
the declared operation. «María tiene 3,50 € y compra…» with `OPERACIÓN: 3,50 + 1,20`
passes checks 1–3 if the model also claims the sum. What stops it is layered, not faked:
the skill's operation must match what she asked for (a sums-and-subtractions request
rejects nothing here, but «problemas de restas» rejects the sum outright via
`exercises`); and whether the story *makes sense* is the declared-draft path — the report
says exactly which checks ran, the draft mark stays, and SC-2505 puts a teacher in front
of it. Verifying pedagogy deterministically is not on offer, and pretending otherwise is
the failure this project exists to prevent.

**A question the model cannot express as an operation** («¿por qué crees que le
queda menos?», a missing datum) fails check 2 or has no `OPERACIÓN` at all → carried as
unverified and declared, per item (FR-2504), or rejected by the loop — both honest ends.

---

## R3 · What is an exam on the wire, and what does its key hold?

**Decision**: a labelled question block, and the key stays **one job-level document**
(`jobAnswers`, `material/<job>/answers.md`) whose entries gain a per-entry status.

```
PREGUNTA
TEXTO: Escribe en cifras: tres mil doscientos cuatro.
RESULTADO: 3204

PREGUNTA
TEXTO: Calcula: 305 − 148
OPERACIÓN: 305 - 148
RESULTADO: 157
```

A question with an `OPERACIÓN` is computable: the same three checks as R2 (operands in
the `TEXTO`, computed answer, level and constraints). A question without one is
**declared unverified** — on the report, and per entry on the key.

**The learner-facing document** carries the numbered questions and answer space and
**nothing else**: no `RESULTADO`, no model answer, no computed answer, in no support
layer — asserted over the rendered HTML, ODT and linear output (SC-2502), not over the
IR, and written as a red test before any exam renders (quickstart §1).

**The position taken on unverified key entries, and its tension named**: for a
non-computable question («explica por qué…»), the key entry carries the model's drafted
answer **labelled per entry as unchecked** — «propuesta del modelo, sin comprobar:
revísala antes de corregir con ella» — rather than nothing. The spec's Key entity says
«computed (or declared-unverified) answers», and an exam key that is silent on six of ten
questions is a key she completes by hand or, worse, stops reading. This *departs* from
the skill path's rule (`composeUnverified` drops the stated answer entirely;
`NO_ANSWERS_ES` argues a proposed result presented as a solution is worse than none) —
and the departure is defensible only because the label does the work `NO_ANSWERS_ES`
fears is undone: it is per entry, unmissable, and the key is her document (FR-2512 keeps
it out of every learner path, structurally). The skill path keeps its rule unchanged
(FR-2507: each kind's contract is its own). **If this position is rejected in review,
the fallback is one task**: list non-computable questions under «Sin soluciones» as the
key already does for unverifiable objectives.

**Alternatives considered**: a second file for the exam key — rejected: `jobAnswers`
already is the job's key, one composition one key (Principle IV), and a second file is
the two-copies defect with a sharper blast radius. Answers inline with `data-answer`
attributes the renderer strips — rejected in `002` already: a worksheet with answers in
its markup looks exactly like a worksheet, and here it would be an exam.

---

## R4 · Where does the P19 cut live, and what does it say?

**Decision**: in `composeExercises` (`core/src/compose/loop.ts`), once, for every path
that uses the loop: **a batch whose every verdict is `unknown` aborts the loop** instead
of asking again. The outcome records that it aborted and why; `explainOutcome` names the
constraint in her words (via the verifier's `describe`) and the run reports proposals
used and cost so far (FR-2510).

**Rationale**: 100% `unknown` in a batch is not bad luck — it is the signature of a
constraint the verifier cannot decide for that operation (AGE-03's «restas con llevadas»
burning thirty proposals to deliver zero). Asking again spends her money on the same
answer, which is the exact reasoning the loop already applies to an empty batch, one line
above. Putting the cut in the loop rather than in each pipeline means the problems path
and the exam path get it by construction — the spec's generalisation for free.

**Not conflated with the mapping fix**: resolving «llevadas»+resta → `borrows` in
`objectives.ts` is the other half of Carlos's P19 answer and sits in COLA 0.4. This
feature needs it for SC-2504 («sumas y restas con llevadas», both operations verified),
so the task exists here with the same ownership rule `021` R2 used: **whichever lands
first owns it, the other cites it.** As of this plan, 0.4 has not landed.

**Alternatives considered**: a threshold (abort at ≥80% unknown) — rejected: a mixed
batch means the constraint is decidable and the model is missing, which is what the
budget is for; only the *pure* unknown batch is structural. Cutting in the shell job —
rejected: the loop is where «code owns the loop» lives, and a cut outside it is a cut
one new caller forgets.

---

## R5 · How does the derived-kind check recognise the four kinds?

**Decision**: derive from the **structure of what was produced**, not from prose. After
this feature, the pipeline knows what it made — content blocks, bare-expression groups,
problem items, exam questions are different shapes in `buildSheet`'s input. So:

| Produced | Derived |
|---|---|
| exam questions (any) | `exam` |
| problem items (and no exam questions) | `problems` |
| only content blocks | `study` |
| only bare-expression groups | `worksheet` |

The mismatch note (`021` FR-1910/FR-1923's sentence) then fires **only on real
mismatch** — she asked «examen» and a budget collapse left only bare drill — which is
what makes SC-2503's zero false positives testable at all.

**Rationale**: the current detector greps `/\bproblema/i` over `instructionFor`'s four
fixed sentences, none of which contain the word — dead code, found by the review
(PROD-02), guaranteeing the apology every time «examen» or «problemas» is chosen. A
regex over Spanish prose is the wrong instrument even repaired: the prose is ours today
and the corpus's tomorrow. The structure is a fact the code already holds in its hands
at the moment of deriving.

**Alternatives considered**: keeping a prose heuristic with better regexes — rejected,
above. Deriving from `request.kind` — rejected outright: that makes the check compare
the request with itself, which is the always-green twin of today's always-apology.

---

## R6 · What happens to an objective that names two operations?

**Decision**: `readObjectives` splits it — one objective line naming several operations
yields **several skills**, one per operation, each with the constraints resolved **per
operation**: «sumas y restas con llevadas» becomes `arith.add` + `carries` and
`arith.subtract` + `borrows`, because «llevadas» *is* borrowing when the operation is
subtraction (Carlos's P19 answer; `CONSTRAINT_ES.borrows` already translates back as
«restar llevando»). The sheet then carries both groups under her one objective line, and
the count she gave is per objective as today.

**Rationale**: `OPERATIONS.find()` silently keeps the first match and discards the rest
of her sentence (AGE-08), producing a sheet that *looks* complete — ten verified sums —
while half the objective was thrown away and the report blames the model for it. The
spec's edge case says this finding dies here: compose across the named skills, or refuse
with the reason. Splitting is the composing answer; the refusal remains for text that
names an operation the catalogue lacks, which already falls to `content` today.

**Alternatives considered**: returning the objective to her as a question («¿los dos?»)
— rejected for the non-conversational path: she already answered by writing «y», and
`026` can ask follow-ups when it arrives. Rejecting multi-operation objectives — rejected:
it is the most natural line a PT writes, and refusing the normal case to protect the
code is the tool telling her to speak its language.
