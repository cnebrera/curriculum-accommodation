# Consolidating what the teacher has taught the system

Keep memory useful instead of letting it become a log nobody reads.

## Consolidate (default)

1. **Regenerate the index** before reading anything. A stale index silently
   drops memory, which is worse than no memory: the teacher believes it is
   working.

2. **Find what repeats.** A note appearing three times is no longer a note, it is
   a rule. Propose promoting it:
   - repeated learner note → into `profiles/<CODE>/profile.yaml` (`works`, `avoid`, or an
     axis level that was wrong from the start);
   - repeated practice note → into `memory/house.md`;
   - the same problem across learners → a recipe patch, proposed upstream.

3. **Show the evidence with each proposal.** "Three times, on these dates, here
   is what happened each time." The teacher is confirming a judgement, not
   rubber-stamping a suggestion.

4. **De-identify anything going to the corpus.** Rewrite as a general statement:
   no learner, no material, no school, pattern only. **Show the rewritten version
   to the teacher before it goes anywhere.** This is a gate, not a habit.

5. **Propose archiving** entries that were promoted or superseded. Move to
   `memory/archive/`, never delete — provenance matters when a rule is later
   questioned.

6. **Check `house.md` has stayed a style guide.** Past roughly two pages it has
   become a log. Say so and propose consolidating it.

**Confirm every promotion with the teacher. Apply nothing silently.**

## Export

Export produces two variants, and the distinction is enforced by the export
rather than by the teacher remembering:

- **Full** — profile, notes and overlay for one learner. For backup, or for
  handover when a learner changes school or teacher.
- **Shareable** — practice and corpus material only, with all learner scope
  removed. For a colleague, or for a pull request.

## Forget a learner

Forgetting a learner removes them completely. It runs when they leave, change
teacher, or the retention period has passed.

1. **List everything first** — profile, notes, overlay, every job under
   `material/`, every rendering under `output/`, any handover packet. Show it and
   wait for confirmation.
2. **Remove it**, then verify: search the working copy for the code and report
   that nothing remains.
3. **Record the removal** as a dated line with **no learner content in it**.
4. **Say what survives.** De-identified corpus contributions already merged are
   not withdrawn — they contain nothing about this learner by construction. Say
   this plainly rather than letting the teacher wonder.
5. **Say what you cannot reach.** Backups the teacher made themselves are outside
   the system. They have to delete those.

During consolidation, surface learners with no activity past the retention period
and ask. **Never delete anything without being told to.**

## Never

- Promote anything without confirmation.
- Send learner-scope material upstream, in any form.
- Delete a journal entry. Archive it. (`forget` is the one exception, and only
  for the learner named.)
- Delete anything under `forget` without listing it and getting confirmation
  first.
- Infer the scope of an item. That question belongs to the review step and to the
  human answering it.
