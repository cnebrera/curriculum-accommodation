# /rampa.adapt — apply recipes to the IR

**Goal:** produce `material/<job>/adapted.md` and `material/<job>/report.md`.

Read `docs/ir.md` and `AGENTS.md` § Hard rules before starting.

## Preconditions

- `extraction.verified: true` in the IR front matter. If not, stop and run
  `/rampa.ingest` verification first.
- A profile exists in `profiles/`.

## Procedure

1. **Load the profile.** Note which axes are `null` — those recipes stay off.

2. **Select recipes.** All of `recipes/core/` plus `recipes/lang/<lang>/`, keeping
   those whose `axes` condition the profile satisfies. Resolve conflicts per
   `AGENTS.md` § Selecting recipes. List the selected recipes to the teacher
   before you start; it is much cheaper to correct the selection than the output.

3. **Check `works` and `avoid` first.** A documented working support overrides a
   recipe default. If a recipe contradicts one, drop the recipe and note it.

4. **Adapt block by block.** For every block you change, write `data-from`,
   `data-recipe` and `data-axis`. If you cannot name a recipe and an axis, the
   change is not justified — do not make it.

5. **Respect block classes.**
   - `.assessment` — access and response route only. Never make it easier, never
     drop assessed items without saying so explicitly and prominently.
   - `.explanation` — simplify how it is said; never change what it says.
   - `.exercise` — may be split, sequenced, scaffolded, re-formatted.
   - New scaffolding blocks are marked `.scaffold` and carry no `data-from`.

6. **Stop at the significant-adaptation line.** If the profile or the request
   implies changing objectives or assessment criteria — typically `CUR >= 2` —
   stop. Say what would need to change and why it is not yours to decide. Propose;
   do not proceed.

7. **Write `report.md`,** grouped by decision, not by paragraph:

   ```markdown
   ## Split exercises 4–6 into three sheets of two
   Recipe: one-task-per-page · Axis: COG:3, ATE:2
   Original numbering preserved (4a, 4b …).

   ## Kept the term "autótrofo" and added a definition alongside
   Recipe: keep-curricular-terms · Axis: LIN:2
   ```

8. **Report what you did NOT do.** Blocks you dropped, images you could not
   describe, anything you flagged as significant, any conflict you resolved. This
   section is the one the teacher reads first.

## Never

- Invent facts, examples or data not present in the source.
- Replace a curricular term with an easier synonym.
- Renumber exercises without recording the mapping.
- Remove a block without recording it in the report.
