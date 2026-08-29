# Phase 0 — Research

## R1 · Four kinds, and what each one forbids

**Decision: `worksheet`, `exam`, `study`, `problems`. Defined by what each
forbids, not by what it is.**

A kind is only worth asking about if the answer changes what the adaptation may
do. Defining them by their prohibitions is what keeps the list from growing into a
taxonomy nobody uses.

| Kind | What may change | **What must not** |
|---|---|---|
| `worksheet` | Nearly everything about presentation and scaffolding | The curricular demand, the original numbering |
| `exam` | Presentation only — layout, font, one question per page, reading the instruction aloud | **The demand of any question.** This is `001` FR-011 and it is the reason the kind exists |
| `study` | Structure, signposting, chunking, summaries **added alongside** | The content. Its failure mode is summarising until the curriculum is gone, and it reads beautifully |
| `problems` | Wording, layout, worked examples, scaffolding of the method | **The quantities and the operations they exercise.** Changing 47×8 to 10×2 is not an adaptation, it is a different exercise |

**`problems` is the one worth arguing for.** It looks like a worksheet and its
failure is the least visible in this whole system: a teacher reading an adapted
maths sheet sees plausible problems and has no reason to check whether the numbers
still exercise carrying. A model asked to make something easier will reach for the
numbers first, because that is what "easier" means in every other context.

**Alternatives rejected.** Two kinds (`assessment` / not): loses `problems`, which
is where the invisible failure lives. A free-text kind: unusable for rule
selection. Inferring from block classes: the classes are the *model's* reading of
the document, and the point is to have her statement as an independent signal.

## R2 · Where the list lives

**Decision: corpus.**

A fifth kind — a reading comprehension, a lab script, an oral task — is a
pedagogical question, and what it forbids is pedagogical judgement. That is
Principle I, and this project has now put the provider catalogue, the axis
descriptors and the education systems in the corpus for the same reason.

The application knows there are kinds. It does not know what they mean.

## R3 · What making `scope` filter actually changes

**Decision: record the baseline first, then filter.**

`scope` is populated across the corpus and read by nothing. Turning it on changes
which recipes are selected for every document — and **no test asserts what
selection produces today**, so the change would be invisible until a teacher
noticed her worksheets had got worse.

So: a test that records today's selection for a set of representative documents,
committed *before* the filter, and updated in the same commit as the filter with
the diff visible in review. That is the cheapest way to make a silent behaviour
change loud.

**One rule chosen deliberately: an absent scope means "anywhere".** The
alternative — absent means "nowhere" — would disable every recipe that has not
been annotated, which is a much larger change wearing the same commit message.

## R4 · Parts, and why they exist from the start

**Decision: a job has parts from day one, even while US3 is unbuilt.**

A part is (a source, a kind, an IR). Today every job has exactly one. Modelling it
as one-with-a-kind and adding parts later would mean touching every screen, the
vault layout, the report and the sign-off — because "which part is this?" reaches
all of them.

The cost now is a level of nesting nobody uses yet. The cost later is a migration
of her existing material, which this project has already decided is the expensive
kind of change (`009` research R5, where the credential store was migrated early
precisely because nobody had installed it yet).

**And it is already half-true:** `material/<job>/<learner>/` exists because one
extraction serves N learners. Parts are the same idea on the other axis — one job,
N sources — and the vault layout has room for it.
