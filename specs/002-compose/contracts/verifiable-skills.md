# Contract — a verifiable skill

For whoever adds the second verifier. **A skill belongs here only if code can
decide two things**: whether an exercise exercises it, and whether a proposed
answer is right. If you cannot write both, the skill goes down the other path and
the checklist tells the teacher she is verifying content herself.

## What a verifier must guarantee

1. **`exercises(skill, exercise) → boolean`.** Does this actually require the
   skill? `4 × 2` does not exercise carrying however it is worded, and an exercise
   that does not is rejected — «multiplicar con llevadas» is a constraint, not a
   topic.
2. **`solve(exercise) → answer`.** Computed, deterministic, offline. Never asked of
   a model and never accepted from one.
3. **Reject, never repair.** An exercise whose model-stated answer disagrees with
   the computed one is thrown away. A model that got the arithmetic wrong got
   something else wrong too, and fixing the visible half hides the rest.
4. **Say what you cannot decide.** A verifier that returns `unknown` for some
   inputs is useful and honest. One that guesses is worse than none, because the
   whole point is that this branch does not guess.
5. **No model, no network.** It lives in `packages/core` and the isolation test
   enforces it.

## What the application guarantees you

1. **Your verdict is final.** Nothing overrides a rejection, and no retry budget
   exhausts into "ship it anyway".
2. **The level comes from `011`**, not from you. You decide correctness; the
   education corpus decides what is age-appropriate.
3. **A skill with no verifier still works** — it takes the unverified path, and the
   teacher is told in her language that she is checking content.

## The one rule that is not negotiable

**The answer key is never requested from the model.**

Not as a starting point, not as a hint, not "and check it". A sheet with a wrong
answer key goes to a child who is learning the operation and gets marked by a
teacher who trusts it — and it teaches him his correct answer was wrong.

That is the worst outcome anywhere in this application, and it is the one a
plausible-looking pair of numbers produces most easily.

## The first verifier

**Arithmetic**, because it covers most of what a PT asks for in primary numeracy
and because it is completely decidable: the four operations, carrying and
borrowing, fractions, decimals, percentages.

Start there. Do not start with something interesting.
