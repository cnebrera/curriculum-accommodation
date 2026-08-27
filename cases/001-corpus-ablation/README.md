# Case 001 — Does the recipe corpus earn its place?

**Question:** how much of the corpus is load-bearing, given that a frontier model
already knows most adaptation technique?

This is the open question in
[ADR 0001](../../docs/decisions/0001-recipes-are-guardrails.md). It is to be
settled by measurement, not argument — and it is cheap to run, so it should be
the first thing Phase 0 measures.

## Method

Same material, same profile, three passes:

| Arm | What the agent gets |
|---|---|
| **A — full** | `AGENTS.md` hard rules + the whole corpus |
| **B — guards only** | Hard rules + `keep-curricular-terms`, `exam-access-not-difficulty`, `recipes/core/conflicts/` |
| **C — rules only** | Hard rules, no recipes at all |

Outputs are stripped of anything identifying the arm and shuffled. A teacher who
did not run them compares blind.

Run each arm at least three times: model output varies, and a single sample will
show a difference that is noise.

## What the teacher is asked

1. Which of these would you hand to this learner?
2. Rank them, or say they are indistinguishable.
3. In each, is there anything you would refuse to give a child?

Question 3 is the one that matters most. The failure this project is built around
is the *plausible* bad adaptation — the one that looks better and quietly removes
the curriculum. If arm C produces those and arm A does not, the corpus is
justified even if the material otherwise looks the same.

## Reading the result

| Outcome | What we do |
|---|---|
| C is indistinguishable from A, no refusals in any arm | Cut the corpus hard. Keep guards and conflicts. **Good news** |
| C produces refusals that A and B do not | Guards are justified. Generic technique still unproven — compare A against B |
| A beats B on quality, no refusals in B | Generic technique earns its place. Keep it, and say why in ADR 0001 |
| Results vary run to run within an arm | Consistency is the corpus's real contribution. Measure variance, not just quality |

Whatever the answer, record it as a new ADR superseding the open question in
0001. A measurement nobody wrote down is a measurement that gets re-argued.

## Materials

Empty. Needs openly licensed or invented material and a type-profile from
`profiles.example/`. Do **not** use a textbook page — see `CONTRIBUTING.md`.

`profile.yaml` should point at `profiles.example/A3.yaml`: high cognitive load and
executive-function barriers exercise the most recipes, so differences between arms
show up most clearly there.
