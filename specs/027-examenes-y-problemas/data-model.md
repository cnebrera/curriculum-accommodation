# Data model

Four types in memory, **no new file on disk**. The key was already a job-level document
(`material/<job>/answers.md`, `jobAnswers`); it gains entries, not a sibling. The sheet
was already IR; it gains two block shapes, not a parallel pipeline (Principle IV).

## `ProposedProblem` — what the model offered, before anything believed it

```ts
/** One parsed problem proposal. A block the parser half-understood is NO proposal. */
export interface ProposedProblem {
  /** The statement, verbatim, as the child would read it. */
  statement: string;
  /** The declared operation, e.g. `3,50 - 1,20`. Absent for a non-computable ask. */
  expression?: string;
  /** What the model said the answer is. Never trusted; only compared. */
  statedAnswer?: string;
}
```

## `VerifiedProblem` — what survived, and on whose authority

```ts
export interface VerifiedProblem {
  statement: string;
  /** Extracted by code from `statement`. The child's numbers, not the model's claim. */
  quantities: string[];
  /** The admitted expression: every operand found among `quantities`. */
  expression: string;
  /** Computed by the arithmetic verifier. Never the model's. */
  answer: string;
}
```

The verification verdicts reuse `SkillVerdict` — `wrong-answer`, `does-not-exercise`,
`out-of-level`, `malformed`, `unknown` — so the loop, the budget, `explainOutcome` and
the report all work unchanged. One new rejection is expressed through `malformed`'s
channel with its own sentence: **an operand that is not in the statement**, because the
story and the arithmetic being two different problems is precisely the lie FR-2501
exists to catch.

## `ExamQuestion` — numbered, asking, withholding

```ts
export interface ExamQuestion {
  number: number;
  /** The prompt, as the learner reads it. Carries no answer, ever. */
  text: string;
  /** Present and code-verified for a computable question. */
  expression?: string;
  /** 'computed' | 'declared-unverified' — which key entry this produces. */
  verification: 'computed' | 'declared-unverified';
}
```

On the sheet, a question is a block (class `question`, `data-objective` as always,
`data-unverified` when declared) followed by answer space — a rendering concern per
class, in the three renderers, never a second pipeline.

## `KeyEntry` — the key learns to say what it does not know

`AnswerLine` (objective, number, expression, answer — all computed) stays what it is for
the skill path. The key's renderer takes entries that also admit the exam's other case:

```ts
export type KeyEntry =
  | { status: 'computed'; objective: string; number: number; expression: string; answer: string }
  | {
      status: 'declared-unverified'; objective: string; number: number;
      /** The question, so she knows which one she is completing. */
      text: string;
      /** The model's draft, labelled per entry as unchecked. Research R3's position. */
      draftAnswer?: string;
    };
```

Every rendering of a `declared-unverified` entry leads with its label — «propuesta del
modelo, sin comprobar: revísala antes de corregir con ella» — and the file keeps
`ANSWER_KEY_HEADING` at the top, unchanged. The skill path's rule is untouched:
unverified *exercises* still contribute nothing (`NO_ANSWERS_ES`), per FR-2507 — each
kind's contract is its own.

## The sheet's front matter

Unchanged in shape. `kind` already records what she asked for (`021` FR-1923),
`unverified_objectives` already exists; what is new is **per-item** declaration: blocks
carry `data-unverified` (existing attribute) and the sheet-level note beside the draft
mark says *which* items, per FR-2504 — a sheet «unverified somewhere» teaches her to
distrust everything.

## What deliberately gains no field

| | Why |
|---|---|
| A per-learner key | One composition, one key, N presentations (Principle IV). The key belongs to the job, and `021` R5 already fought this battle |
| Marks, weightings, pass marks on questions | `021` FR-1913/FR-1914 and `instructions/compose.md`'s «Never» section. What a child's answer is worth is not this application's decision, so there is no field to hold it |
| The model's stated answer on any learner-facing type | `ProposedProblem.statedAnswer` dies at verification, exactly as `composeUnverified` drops it today — carrying it forward is one careless `?? statedAnswer` away from the key |
| A `derivedKind` in front matter | It is a function of the document's own structure (research R5); storing it is a copy of what the file already says, this project's most-repeated defect |
| A quantity-extraction confidence score | Extraction is deterministic: a number is in the statement or it is not. A confidence field would be an invitation to threshold it |
