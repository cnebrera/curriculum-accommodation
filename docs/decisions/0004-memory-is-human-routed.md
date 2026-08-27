# 0004 — Memory is plain files, routed by the teacher

**Status:** Accepted · 2026-08-27

## Context

Without memory, the system produces the same wrong adaptation every week and the
teacher corrects it every week. The only expertise in the loop is discarded on
each run.

But feedback is ambiguous in a way that matters. "Don't split this exercise" can
mean *not for this child*, *not in this school*, or *never, the recipe is wrong*.
Guessing wrong is not a quality problem — routing a learner-specific note into
the shared corpus is a privacy incident.

## Decision

Three memory scopes, and **the teacher routes every item**. The agent asks one
question at the point of correction: is this about this learner, about how you
work, or about the recipe itself?

| Scope | Where | Leaves the machine? |
|---|---|---|
| **Learner** | `profiles/<CODE>.yaml` + `profiles/<CODE>.notes.md` | Never |
| **Practice** | `memory/house.md` | Only if the school chooses, in their own fork |
| **Corpus** | a recipe change, proposed upstream | Yes, as a pull request, after de-identification |

Storage rules:

- **Plain Markdown and YAML.** Readable, greppable, diffable. No database.
- **Two directories.** Backup is copying `profiles/` and `memory/`.
- **Portable.** A learner changing school takes their profile and notes with them.
- **Survives updates.** Both directories are git-ignored, so `git pull` never
  touches them.

Indexing rules, so memory does not become an unreadable log:

- Learner notes load whenever that learner's profile loads. Bounded and
  consolidated.
- House style always loads. It is a style guide, not a log — it stays short.
- The journal is **never loaded wholesale**. `memory/index.md` maps recipe id →
  entries, and a run loads only the entries for the recipes it selected.
- `/rampa-memory` consolidates: promotes repeated notes, proposes recipe changes,
  archives superseded entries. Every promotion is confirmed by a human.

De-identification is a gate, not a habit: journal entries record the **pattern,
never the passage**, and nothing reaches the corpus without being rewritten as a
general statement and confirmed.

## Consequences

- `/rampa-review` gains a routing question. It is the cheapest possible
  classifier, and it is the only one qualified.
- `memory/` is git-ignored except `README.md`; the commit hook enforces it.
- Append-only logs rot, so consolidation is a specified command, not a hope.
- Specified in `specs/003-memory/spec.md`; format contract in `docs/memory.md`.
