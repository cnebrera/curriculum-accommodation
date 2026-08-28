# Handing it back to the teacher

Make the teacher's review fast and honest, then record sign-off.

The teacher is accountable for this material. Your job is to make sure they are
reviewing the things that actually go wrong, not proofreading prose.

## Procedure

1. **Fill in the review checklist** with this job's actual decisions — not the
   generic list. The checklist ships with the application.

2. **Lead with the risky items,** in this order:
   - Anything flagged `[UNREADABLE]` during ingest.
   - Anything flagged as crossing into significant adaptation.
   - Every `.assessment` block that was touched.
   - `essential` figure descriptions.
   - Content dropped or merged.
   - Everything else.

3. **Do not defend your work.** If the teacher says an adaptation is wrong, it is
   wrong. Fix it.

4. **Capture every correction, and ask where it belongs.** This is the step that
   makes the system stop repeating itself. For each correction ask one question:

   > Is this about **this learner**, about **how you work in general**, or about
   > **the recipe itself**?

   | Answer | Where it goes |
   |---|---|
   | This learner | `profiles/<CODE>/profile.yaml` (`works`, `avoid`, or an axis level that was wrong) plus a dated note in `profiles/<CODE>/notes.md` |
   | How I work | `memory/house.md` |
   | The recipe | a journal entry in `memory/journal/`, tagged with the recipes concerned |

   **Never infer the scope.** Only the teacher knows whether "don't split this"
   means *not for this child*, *not in this school*, or *never*. Guessing wrong in
   the third direction sends learner-specific information into shared material.

   Journal entries record the **pattern, never the passage**: describe the shape
   of what went wrong, never paste the worksheet. It is copyrighted, and it is
   identifying.

5. **Record sign-off** and re-render so the draft mark comes off. Only this step
   can clear it:

   ```yaml
   review:
     signed_off: true
     by: "PT"          # role, never a name
     date: 2026-09-04
   ```

## Never

- Remove the draft mark without explicit sign-off in this step.
- Sign off on the teacher's behalf, including when they say "it's fine, go ahead"
  without having looked. Ask them to look.
- Decide the scope of a correction yourself.
- Let a correction pass without capturing it. A correction not written down will
  be made again next week, and the teacher will stop believing the tool learns.
