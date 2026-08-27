# 0001 — Recipes exist to constrain the model, not to teach it

**Status:** Accepted · 2026-08-27

## Context

A frontier model already knows most adaptation technique. It knows that dyslexia
calls for generous spacing and short sentences, that ADHD calls for decomposed
instructions, what easy-read is. If that is true, a corpus of recipes teaching
technique is redundant, and the project is really just a prompt.

This was raised as a direct challenge to the corpus, and it is a fair one.

## Decision

Keep the corpus, but **re-found it on a different rationale**, and rebalance its
contents accordingly.

The corpus does not exist because the model lacks knowledge. It exists because:

1. **The model's default bias runs toward the failure mode.** A helpful model
   asked to adapt a worksheet will simplify too far, swap the technical term for
   an easier synonym, drop the hard exercise, and soften the exam. Every one of
   those improves the worksheet and removes the curriculum, and every one is
   invisible in the finished PDF. Generic knowledge pushes *toward* this. Recipes
   push against it.
2. **Consistency.** Same learner, same week, three worksheets: without a written
   style the output varies in ways the teacher cannot rely on.
3. **Auditability.** "The model decided" cannot be corrected. `data-recipe:
   keep-curricular-terms` can — there is a file to change when a teacher says it
   is wrong.
4. **Locale.** UNE 153101, what counts as *significativa* in Spain, regional
   curriculum criteria. Models are vague and confident here at the same time.
5. **House style.** A school's own conventions are in no model.
6. **Portability and drift.** Behaviour differs across providers and across model
   versions. The corpus is the invariant.
7. **Without a corpus there is no community.** If the model knows everything,
   there is nothing to contribute.

Consequently the corpus is weighted toward **guards, conflict resolution, locale
and house style**, and lightly toward generic technique.

## Open question, to be settled by measurement

How much generic technique is actually load-bearing is unknown. It is not to be
settled by argument.

`cases/001-corpus-ablation/` runs the same material and profile twice — with the
full corpus, and with hard rules only — for blind comparison by a teacher. If the
difference is not detectable, the generic recipes are removed and the corpus
narrows to guards. That outcome would be good news, not a failure.

## Consequences

- A recipe that only restates what any model already does is low value, and
  reviewers may ask what it prevents.
- Anti-patterns are the mandatory part of a recipe, not the optional one.
- Conflict-resolution recipes (`recipes/core/conflicts/`) are the highest-value
  gap in the corpus, because they are where model behaviour is least reliable.
