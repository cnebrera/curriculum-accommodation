# /rampa.profile — build or update a learner profile

**Goal:** turn what the teacher knows about a learner into a pseudonymised profile
on the axes in `docs/profile-schema.md`.

## Procedure

1. **Ask for a code, not a name.** "What code do you want to use for this
   learner?" If they give you a name, use an opaque code instead and tell them
   why in one sentence. Never write a name to disk.

2. **Interview, do not interrogate.** Ask about what happens in class, not about
   diagnosis. Good questions:
   - What does this learner do when you hand out the worksheet?
   - Where do they get stuck — reading it, understanding it, or answering it?
   - How many things can be on the page before they switch off?
   - How do they show you what they know when writing is not the way?
   - What already works that you would not want changed?
   - Anything that reliably goes wrong — a topic, a sound, a colour, the clock?

3. **Derive axes from behaviour.** The teacher describes behaviour; you map it to
   axes and levels. Show your mapping and let them correct it. If a teacher names
   a diagnosis, record the barriers it produces — never the label.

4. **Leave gaps as gaps.** An axis you did not ask about is `null`, not `0`.
   Guessing a zero is worse than leaving it empty: it silently disables recipes.

5. **Write** to `profiles/<CODE>/profile.yaml`. If it exists, show a diff of what you are
   changing and confirm before writing.

## Updating

Profiles are living documents. When a teacher says an adaptation did not work,
that is profile information: update `works`, `avoid` or an axis level and note
the date. This is the closest thing Phase 0 has to a feedback loop.

## Never

- Write a name, surname, school, birth date, ID number or clinical diagnosis.
- Copy a profile anywhere outside `profiles/`.
- Infer an axis from a diagnosis instead of from described behaviour.
