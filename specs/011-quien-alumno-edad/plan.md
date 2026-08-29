# Implementation Plan: Who the learner is

**Branch**: `011-quien-alumno-edad` · **Spec**: [spec.md](./spec.md)

## Summary

Three fields on the profile — age, year, stage — reaching the adaptation prompt,
with the education system as corpus rather than code.

The whole design is one distinction: **age is universal and year is local.** Age
is what the adaptation reasons about (register, tone, what is patronising); year
is what the teacher says without thinking and what carries the curricular demand.
Storing them as one field, or deriving one from the other by arithmetic, breaks the
moment they diverge — and the divergent case is the one this feature exists for.

## Technical Context

No new dependencies. TypeScript, the existing corpus loader, the existing profile
schema.

**Where the work lands:**

| | What |
|---|---|
| `instructions/education/es.md` | The Spanish system: stages, years, typical ages. The whole fact table |
| `packages/core/src/education/` | Parser and lookup. Deterministic, offline, repair-not-reject |
| `packages/core/src/vault/schema.ts` | `age`, `age_recorded`, `year`, `stage` on the profile |
| `packages/core/src/prompt/adapt.ts` | The three fields reach the model, and the divergence is stated |
| `instructions/adapt.md` | The rule they exist for: register to the age, demand to the year |
| `packages/shell/src/ipc/` | `corpus:educationSystems`, and the chosen system in vault settings |
| `ui/src/learners/ProfileEditor.tsx` | One choice — the year — filling stage and age |
| `ui/src/onboarding/` | The system asked once, at first run |

**The corpus format**, third time this project has used it and it works the same
way each time: front matter for the machine-readable facts, prose for what a human
needs, repair-not-reject on load, and a test that reads the **shipped** file so a
value edited into it is a value the suite re-checks.

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | Both halves are corpus: the *facts* about a school system in `instructions/education/es.md`, and the *rule* about register in `instructions/adapt.md`. Neither is a thing a programmer should be deciding, and a Spanish teacher can correct both |
| **II** · deterministic core | The parser and the year→age lookup are pure functions in `packages/core`, offline, no key |
| **III** · adapt the how, never the what | **This feature is the sharpest test of it yet.** Pitching to the age is *how*; pitching to the year is *what*. A model told only the barrier level currently guesses both, and guessing low on the second is exactly the failure Principle III forbids |
| **V** · barriers not diagnoses | Age is not a diagnosis, and neither is a year group. What must not happen is the fields becoming a proxy — «14 años en 5.º» read as a label rather than as two facts. The corpus rule says how to read it |
| **VI** · traceability | `age_recorded` is the date she wrote it, so a stale age is visible rather than silently drifting |
| **IX** · content is never instruction | Unchanged. These fields come from her, not from material |

**Gate: passes.** One thing named rather than waved through: this feature puts
three more facts about a child into the prompt, and the honest question is whether
each earns its place. Age does — the register argument is concrete and the harm is
on every sheet. Year does — curricular demand. **Stage is the weakest**: it is
derivable from the year and adds a third string. It is included because a teacher
says "está en Primaria" as often as she says the year, and because FP and
educación especial have stages whose years mean little on their own. If it turns
out to be dead weight, it is one line to drop.

## Phase 0 · Research

One open question, resolved in [research.md](./research.md): what the Spanish
system's stages and years actually are, including FP, educación especial and adult
education — where the whole feature earns its keep and where I would be guessing.

## Phase 1 · Design

- [data-model.md](./data-model.md) — the profile fields, the education file, the
  settings entry.
- [contracts/education-model.md](./contracts/education-model.md) — what a system
  file must contain, for whoever adds the British one.
- [quickstart.md](./quickstart.md) — the validation runs.

## Sequencing

**MVP is US1 + US2 together.** Storing the fields without sending them is the same
gap with more code, and sending them without the corpus rule is three strings the
model has no instruction about.

US3 (a second system) is the extension point, and it is cheap now and expensive
later: once a year string is hardcoded anywhere, adding a country is a rewrite.
