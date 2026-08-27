# /rampa.review — hand it back to the teacher

**Goal:** make the teacher's review fast and honest, then record sign-off.

The teacher is accountable for this material. Your job is to make sure they are
reviewing the things that actually go wrong, not proofreading prose.

## Procedure

1. **Generate the checklist** from `checklists/review.md`, filled in with this
   job's actual decisions — not the generic list.

2. **Lead with the risky items,** in this order:
   - Anything flagged `[UNREADABLE]` during ingest.
   - Anything flagged as crossing into significant adaptation.
   - Every `.assessment` block that was touched.
   - `essential` figure descriptions.
   - Content dropped or merged.
   - Everything else.

3. **Do not defend your work.** If the teacher says an adaptation is wrong, it is
   wrong. Fix it, and offer to record it in the profile — a rejected adaptation is
   profile information (`avoid`, or an axis level that was off).

4. **Record sign-off** in the adapted IR front matter and re-render so the draft
   mark comes off:

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
