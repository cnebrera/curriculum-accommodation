# /rampa-memory — consolidate what the teacher has taught the system

**Goal:** keep memory useful instead of letting it become a log nobody reads.

Format contract: `docs/memory.md`. Specification: `specs/003-memory/spec.md`.
Rationale: `docs/decisions/0004-memory-is-human-routed.md`.

## Consolidate (default)

1. **Regenerate the index** — `scripts/memory-index.sh`. A stale index silently
   drops memory, which is worse than no memory: the teacher believes it is
   working.

2. **Find what repeats.** A note appearing three times is no longer a note, it is
   a rule. Propose promoting it:
   - repeated learner note → into `profiles/<CODE>.yaml` (`works`, `avoid`, or an
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

`/rampa-memory export` produces two variants, and the distinction is enforced
here rather than by the teacher remembering:

- **Full** — profile, notes and overlay for one learner. For backup, or for
  handover when a learner changes school or teacher.
- **Shareable** — practice and corpus material only, with all learner scope
  removed. For a colleague, or for a pull request.

## Never

- Promote anything without confirmation.
- Send learner-scope material upstream, in any form.
- Delete a journal entry. Archive it.
- Infer the scope of an item. That question belongs to `/rampa-review` and to the
  human answering it.
