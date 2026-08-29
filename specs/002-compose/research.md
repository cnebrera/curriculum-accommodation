# Phase 0 — Research

## R1 · What can actually be checked by code

**Decision: verify where the domain admits it, say so loudly where it does not,
and never pretend the second is the first.**

| Domain | Verifiable? | How |
|---|---|---|
| Arithmetic — the four operations, carrying, borrowing | **Yes, completely** | Compute it. `47 × 8 = 376` is not an opinion |
| Whether an exercise exercises the stated skill | **Yes, mostly** | A multiplication with no carrying is not multiplication with carrying. Structural, checkable |
| Fractions, decimals, percentages | **Yes** | Same |
| Simple equations, sequences | **Yes** | Solve and compare |
| Spelling and conjugation of the exercise text | **Partly** | A dictionary and a conjugator catch a lot; register and naturalness they do not |
| Reading comprehension — do the questions have answers in the text? | **Partly** | Answer-in-text can be located. Whether the question is *good* cannot |
| Factual content — a text about ecosystems | **No** | This is why content composition requires an anchor |
| Whether the exercise is pedagogically sound at all | **No, ever** | The teacher. This is not a gap to close, it is the job |

**The line this table draws is the feature's honesty boundary.** Everything above
"partly" gets a check that refuses bad output before she sees it. Everything below
gets a checklist that says, in her language, that she is verifying content and not
just presentation — and that this takes longer than reviewing an adaptation.

## R2 · Why the answer key is computed, not requested

**Decision: the application computes it. It never asks the model for it and never
accepts one.**

A model asked to produce twenty multiplications with carrying and their answers
will produce twenty plausible pairs, and one of them will be wrong. That sheet
goes to a child who is learning the operation, gets marked by a teacher trusting
the key, and teaches him that his correct answer was wrong.

That is a worse outcome than any adaptation failure in this project, because it
actively teaches the error.

So: the model proposes exercises, **code solves them**, and an exercise whose
stated answer disagrees is **rejected, not corrected**. A model that got the
arithmetic wrong got something else wrong too — the level, the digits, the
intent — and silently fixing the visible half hides the rest.

**Alternatives rejected.** Ask the model to check itself: one model call dressed as
two, the argument ADR 0007 already made. Ask a second model: two guesses, more
expensive, and no ground truth. Show her the key and let her check: that is the
work she came here to avoid.

## R3 · The anchor, per shape

**Content: an approved source she supplies.** Unchanged from the spec's US1, and it
was right. Facts come from a document, not from a model's memory.

**Skill practice: the education corpus (`011`) plus the verifier.** The level is
anchored by what `011` says a learner of that age and year can do; the content is
anchored by arithmetic being decidable.

**Neither: refuse.** A request with no anchor and no verifier is a request to
generate curricular content from a model's own knowledge, which the spec has
forbidden since it was written and should keep forbidding.

## R4 · What "multiplicar con llevadas" actually needs

Carlos's example, taken literally, because it is the acceptance test.

1. **The skill, parsed as a constraint.** Not the topic "multiplication" — the
   constraint "with carrying". An exercise that does not carry fails FR-124.
2. **The level, from `011`.** For a 10-year-old in 5.º de Primaria: how many
   digits, whether by one digit or two, whether decimals are in scope.
3. **The exercises, from the model**, which is what it is genuinely good at:
   varying the numbers, wording the instruction, choosing a context that suits the
   learner's interests from the profile.
4. **The key, from code.**
5. **The presentation, from the learner's profile** — one per page, more space,
   worked example first. The existing adaptation machinery, unchanged.

Steps 1, 2 and 4 are code. Step 3 is the model. Step 5 already exists. That
division is the plan.

## R5 · Where this is most likely to go wrong

Recorded now, because it will be forgotten by the time it is built:

**Generating something easier than she asked for, and reporting success.** The
model is asked for exercises a struggling ten-year-old can do. The pull toward
`3 × 2` is enormous, it satisfies every visible constraint except the one that
matters, and Principle III's usual defence — compare with the original — does not
exist here.

FR-124 is the guard, and it needs to be a real structural check rather than an
instruction: **does each exercise actually require the skill?** For carrying, that
is decidable. For most of the rest of this feature, it is not, which is why skill
practice ships first.
