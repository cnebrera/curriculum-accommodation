---
id: one-task-per-item
version: 1
axes: [COG>=3, EJE>=3]
scope: [exercise]
conflicts: [exam-access-not-difficulty]
evidence: "Task analysis; reduction of simultaneous demands within a single item"
---

# One task per item

## What to do

A question that asks for two things is two questions wearing one number. «Explica
dos consecuencias de la deforestación» is two answers; «lee el texto y subraya los
verbos» is two tasks. For a learner who cannot hold several demands at once, the
second half is invisible — not refused, **unseen**.

Split the item into its parts, and **extend the numbering rather than renumber
it**: `4` becomes `4a` and `4b`. The class works out loud on «el ejercicio
cuatro», and a sheet whose numbers do not match everyone else's makes the learner
unable to follow — which is hard rule 7 and the reason this recipe exists as a
separate one rather than as a line inside another.

**One demand per part.** If `4a` still asks for two things, it was not split, it
was cut in half.

**The demand does not change.** Two one-part questions must ask, between them, for
exactly what the original asked for. Dropping the harder half is not a split.

**Say it in the instruction**, so a learner who knows the sheet has four exercises
and now counts five does not think he has misread something.

## Before

> **4.** Lee el texto y subraya los verbos.

## After — correct

> **4a.** Lee el texto.
>
> **4b.** Ahora subraya los verbos.

## After — wrong

> **4.** Lee el texto.
>
> **5.** Subraya los verbos.

The numbering moved. Every exercise after this one is now one out of step with
what the teacher says out loud and with what the rest of the class has on the desk.

## Anti-patterns

**Renumbering.** The whole point. `4a`/`4b` and never `4`/`5`.

**Splitting on an assessment.** Two one-part answers are not the same measurement
as one two-part answer, and on an exam that is a change of what is being assessed
rather than of how it is reached. `exam-access-not-difficulty` is a guard and wins
over this recipe wherever both are selected — the same resolution `one-task-per-page`
already carries, and for the same reason. `scope` here says `exercise` alone, so
this should never arise; the conflict is declared anyway, because a scope that gets
widened by someone who did not read this paragraph is exactly how a guard gets
bypassed by accident.

**Splitting what is one act.** «Suma 3 + 4» is one demand, not «suma» and «escribe
el resultado». Splitting an atomic task produces steps that mean nothing on their
own and a sheet twice as long, which is the barrier this recipe exists to remove.

**Splitting everything.** A learner who can hold two demands does not need this,
and a page of `1a 1b 2a 2b 3a 3b` is its own kind of load. It applies where the
axis says it applies.
