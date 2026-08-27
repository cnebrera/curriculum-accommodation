# /rampa.adapt — apply recipes to the IR

**Goal:** produce `material/<job>/adapted.md` and `material/<job>/report.md`.

Read `docs/ir.md` and `AGENTS.md` § Hard rules before starting.

## Preconditions

- `extraction.verified: true` in the IR front matter. If not, stop and run
  `/rampa.ingest` verification first.
- A profile exists in `profiles/`.

## Procedure

1. **Load the profile and its memory.** The YAML, the notes, and the overlay
   (`profiles/<CODE>.adaptations.md`) if it exists. Plus `memory/house.md`.
   Note which axes are `null` — those recipes stay off.

   Reading a profile without its notes throws away every correction the teacher
   has made so far, and they will notice.

2. **Apply the overlay first, if there is one.** It is the teaching team's
   decision and it **takes precedence over the corpus**. What it does not cover,
   the corpus fills. If an overlay statement would breach a hard rule, flag the
   conflict and ask — never silently obey, never silently refuse.

3. **Select recipes.** All of `recipes/core/` plus `recipes/lang/<lang>/`, keeping
   those whose `axes` condition the profile satisfies. Resolve conflicts per
   `AGENTS.md` § Selecting recipes. List the selected recipes to the teacher
   before you start; it is much cheaper to correct the selection than the output.

4. **Load the relevant journal memory.** Regenerate the index with
   `scripts/memory-index.sh`, then load only the entries whose recipes intersect
   the ones you selected. Never load the journal wholesale.

5. **Check `works` and `avoid` first.** A documented working support overrides a
   recipe default. If a recipe contradicts one, drop the recipe and note it.

6. **Adapt block by block.** For every block you change, write `data-from`,
   `data-recipe` and `data-axis`. If you cannot name a recipe and an axis, the
   change is not justified — do not make it.

7. **Respect block classes.**
   - `.assessment` — access and response route only. Never make it easier, never
     drop assessed items without saying so explicitly and prominently.
   - `.explanation` — simplify how it is said; never change what it says.
   - `.exercise` — may be split, sequenced, scaffolded, re-formatted.
   - New scaffolding blocks are marked `.scaffold` and carry no `data-from`.

8. **Stop at the significant-adaptation line.** If the profile or the request
   implies changing objectives or assessment criteria — typically `CUR >= 2` —
   stop. Say what would need to change and why it is not yours to decide. Propose;
   do not proceed.

9. **Write `report.md`,** grouped by decision, not by paragraph:

   ```markdown
   ## Split exercises 4–6 into three sheets of two
   Recipe: one-task-per-page · Axis: COG:3, ATE:2
   Original numbering preserved (4a, 4b …).

   ## Did not use colour coding for task types
   Memory: memory/house.md · Conflict: ATE:3 vs REG:2
   Resolved by position and a single bold emphasis per page.

   ## Kept the term "autótrofo" and added a definition alongside
   Recipe: keep-curricular-terms · Axis: LIN:2
   ```

10. **Report what you did NOT do.** Blocks you dropped, images you could not
   describe, anything you flagged as significant, any conflict you resolved. This
   section is the one the teacher reads first.

## Never

- Invent facts, examples or data not present in the source.
- Replace a curricular term with an easier synonym.
- Renumber exercises without recording the mapping.
- Remove a block without recording it in the report.
- Resolve a conflict between axes silently. Follow
  `recipes/core/conflicts/README.md` and record how you resolved it.
- Apply memory without saying so. If a note or the house style changed what you
  did, the report names it — memory is as traceable as recipes, or it cannot be
  reviewed.
