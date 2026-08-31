# Research — 016, one door

Three questions. Each one had a wrong answer that looked obvious.

## R1 · What does the first screen show when she has forty learners?

**Question.** Learner-first was chosen in clarification. With forty learners, a
"pick a learner" screen is a list of forty names before she has said what she is
doing — and `015` built the filtering for exactly that list. Does the door reuse
`LearnersScreen`, or does it need its own picker?

**Decision: its own picker, built from `015`'s primitives — `searchRoster`,
`filterRoster`, `facetsOf` — and not from its screen.**

**Why.** `LearnersScreen` is a place she goes to *manage* learners: it opens
profiles, edits axes, offers erasure and handover. Reaching a work flow through it
means every one of those controls sits beside the one she wants, and the destructive
one is among them. Its own picker also lets the door do the thing `015`'s screen
correctly does not: **a single click both selects and advances**.

What that costs: two places that render a learner row. Mitigated by the row itself
staying one component, and by the picker taking `RosterRow[]` from the same hook.

**Rejected: a select.** Forty names in a dropdown is the control `015` was written
to replace, and it cannot show a course.

## R2 · Does the compose branch need its own review screen?

**Question.** `002` produces three documents — the sheet, the answer key, the
composition report. The adaptation review screen (`ReviewScreen`) shows a report,
notices, revisions and sign-off. Reuse it, or write a second one?

**Decision: reuse `ReviewScreen` for the *adapted* output, and add a small
composition summary **before** the adaptation runs.**

**Why.** The composed sheet is not the thing she hands out — the *adapted* sheet
is, and that is what `ReviewScreen` already reviews. But the composition report
answers questions that arise before adaptation and would be buried after it: which
objectives produced nothing, what the level was, and what nothing could check
(FR-125). Those belong at the moment she decides whether to continue spending.

So: compose → a summary she can read and abandon → adapt → the existing review.

**What must not happen.** The summary must not become a second review screen with
its own sign-off. There is one thing in this application that can remove the draft
mark and it stays `job:signOff`.

## R3 · Where does the exam sentence go? (FR-1405)

**Question.** `012` FR-1006 puts «lo he tratado como examen, y eso quiere decir que
no he tocado…» in the report. FR-1405 says it must also be stated *before* running.
Where, so that she reads it?

**Decision: on the primary action's own row, as part of what the button is about
to do — not in a callout above the form.**

**Why.** A callout at the top of a form is read once, on the first visit, and then
becomes furniture. The sentence has to be adjacent to the commitment: she is about
to spend money and produce a document she will sign. The wording comes from the
corpus's `forbids` list for that kind, so a kind added later gets a sentence
without code changing.

**Rejected: a confirmation dialog.** It is the control that trains her to click
through, and `009`'s premise is that she is interrupted. A modal she dismisses on
autopilot is worse than a sentence she reads on the way past.

## What none of this answers

**SC-1406** — whether her first ten seconds produce «puedo hacer varias cosas
aquí». That is judged by a person, once, and no research here substitutes for it.
The honest position is that this feature is designed to make it true and cannot
verify it.
