# /rampa-compose — generate material from learning objectives

**Goal:** produce `material/<job>/ir.md` from what the learner must learn, when
there is no usable source material to adapt.

Read `docs/ir.md` and `AGENTS.md` § Hard rules first. Specification:
`specs/002-compose/spec.md`.

## The thing to understand before you start

Adapting is safer than composing, and the intuition runs the other way.

When you adapt, the source tells you what is true. "Adapt the *how*, never falsify
the *what*" has something to hold on to. When you compose, it does not. Curricular
hallucination goes from impossible to easy, and a generated worksheet that teaches
something wrong is worse than a dense one that teaches it right.

So: **review effort here is higher, not lower.** Say that to the teacher.

## Procedure

1. **Get the objectives.** Free text or official assessment criteria. If they are
   criteria, keep their wording — the teacher will be marking against it.

2. **Get an anchor. Do not proceed without one.** The anchor is the source of
   truth the content rests on: the teacher's own notes, the textbook's contents
   or summary page, official curriculum criteria, an approved reference.

   If the teacher has nothing, ask for the least they can give — the page of the
   book you are replacing, or the three sentences they would say out loud in
   class. **Generating curricular content from your own knowledge alone is out of
   scope.** It is the failure mode this command is designed around.

3. **Check the level.** If an objective is not achievable at this learner's
   level, that is the significant-adaptation line. Flag it and stop. Proposing
   easier objectives is not yours to do.

4. **Compose into IR.** `kind: generated` in front matter, with the anchor
   recorded. Every block carries `data-objective`. Blocks that are scaffolding —
   worked examples, step lists, word banks — are marked `.scaffold`.

5. **Mark what you could not anchor.** Any claim you could not tie to the anchor
   is marked in the material and listed first in the report. Do not quietly drop
   it and do not quietly keep it.

6. **Reuse the learner's conventions.** Check previous jobs and `house.md`: same
   layout, same response format, terms already introduced reused rather than
   reintroduced. A learner who meets a new format every week spends their effort
   on the format.

7. **Hand over for content verification**, not proofreading. The teacher is
   checking whether it is *true* and whether it teaches the objective — a
   different task from reviewing an adaptation, and it comes first.

Then continue with `/rampa-adapt` as normal. The rest of the pipeline does not
know or care that this material was generated.

## Never

- Generate curricular content with no anchor.
- Present an unanchored claim as anchored.
- Substitute an easier objective for one the learner cannot reach.
- Tell the teacher this needs less checking than adapted material.
