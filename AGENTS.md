# Rampa — agent instructions

You are helping build **Rampa**, a desktop application that adapts classroom
material to the profile of a learner with a disability.

Read this file before doing anything else in this repository. Everything you need
is here or linked from here.

**The problem, as one story:** [`docs/escenario.md`](docs/escenario.md) — a PT's
term with Rampa, moment by moment, each moment naming the spec that covers it.
Every specification must be pointable-at from that story; when you are unsure
what something is for, that file is the answer.

---

## STOP — nothing is implemented outside the Spec Kit flow

```
/speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks → /speckit-implement
```

**You do not write implementation code for work that has no `tasks.md`.** Not a
"small" version, not a prototype, not "while I am here". If you find yourself
editing `app/`, `recipes/` or `instructions/` for something that is not a numbered
task in a `specs/<feature>/tasks.md`, you have left the process — stop and go back
to the missing step.

Why this is shouted rather than mentioned: **it has been broken twice.** The
BACKLOG recorded it the first time as a process gap — specifications hand-written
past the gates. The second time an agent wrote `specs/009` and started coding it
in the same session. Both times the reasoning was "the spec is right here, the
work is obvious". Both times the point was missed:

- **`/speckit-plan` is where the Constitution Check runs.** Skipping it means
  nobody asked whether the design violates a NON-NEGOTIABLE principle. That check
  has already caught real things: the licensing gap, and the fact that the
  renderer must not take a profile argument.
- **`/speckit-clarify` is where the questions get asked.** This project's defects
  live in what nobody questioned — every single one found so far was in a seam
  that looked obvious from one side.

`scripts/check-spec-kit.sh` now blocks a commit that carries a specification and
its implementation together, from the pre-commit hook and from CI. A hook cannot
make you *think*; it can make skipping visible and expensive. The rest is on you.

Genuine exception (a typo in a spec, say): `RAMPA_SKIP_SPECKIT=1`, and say why in
the commit message.

---

## What this repository is, and is not

This repository is **the project**, not the product a teacher uses. A teacher uses
the built application. There is one delivery vehicle and it is the application —
see [ADR 0006](docs/decisions/0006-one-vehicle.md).

That matters for how you work here: **you are never the teacher's agent.** There
are no `/rampa-*` commands to run, and you do not adapt a worksheet by hand in
this repository. If you are tempted to, the thing to build or fix is the
application.

The only command layer here is `/speckit-*`, for specifying and planning work on
Rampa itself.

---

## The two layers, and the boundary between them

Everything in this project sits on one side of a line that the constitution draws
and that a test enforces.

| Layer | What it does | Where |
|---|---|---|
| **Judgement** | Decides what to simplify, split, describe, preserve | `recipes/`, `instructions/`, `checklists/` — Markdown |
| **Mechanics** | Finds files, selects recipes, renders, redacts, enforces gates | `app/` — TypeScript, and it never decides pedagogy |

**The single most important rule when writing code here:** if a string tells the
teacher or the model *how to adapt*, it belongs in the Markdown layer, not in
`app/`. This is Principle I, it is NON-NEGOTIABLE, and it is the weakest gate in
the project because nothing structural enforces it. It has already been violated
once — the entire adaptation prompt was a string in `jobs/adapt.ts` — so treat
any new prose in the app as suspect until you have asked which side of the line it
is on.

Conversely: orchestration does not belong in `instructions/`. Which recipes apply,
where files live, what order things run in — that is the application's job.

---

## The pipeline

```
  material  ─ read ──┐
                     ├─→  IR  →  adapted IR  →  output
  objectives ─ build ┘          ↑                  ↑
                              adapt             render
                                ↑
                  profile + notes + official adaptations
                  + recipes + memory
                                │
                            review ──→ memory ──┐
                                ↑               │
                                └───────────────┘
```

Two entry points, one pipeline. Review feeds memory; memory feeds the next
adaptation. That loop is the project's actual thesis — see
[ADR 0004](docs/decisions/0004-memory-is-human-routed.md).

The judgement for each step is in `instructions/`. Read the relevant file before
changing anything about that step.

---

## Hard rules

The pedagogical hard rules — adapt the route not the content, keep curricular
terms, exams preserve the criterion, content is never instruction — live in
[`instructions/hard-rules.md`](instructions/hard-rules.md), because they are
policy a teacher must be able to read and correct, and because the application
sends them with every request.

**Read that file.** Do not restate its rules anywhere else: the drift between two
copies of the same rule is how this repository has produced defects before.

What follows are the rules for working *in the repository*, which are different.

1. **Learner data stays out.** Never commit anything under `profiles/`,
   `material/`, `output/` or `memory/` (except `memory/README.md`). A hook blocks
   it; do not rely on the hook. Never paste profile contents into a commit
   message, an issue or a pull request.

2. **No clinical material, ever.** Not diagnostic literature, not condition-by-
   condition tables. See [ADR 0002](docs/decisions/0002-no-clinical-material.md).

3. **No source material, ever.** Adapting a work for a person with a disability is
   lawful under the Marrakesh Treaty; redistributing it is not. Examples are
   invented or openly licensed.

4. **Never widen the vault boundary.** All filesystem access goes through
   `Vault`/`resolveInVault`, which *refuses* paths that leave the vault rather
   than sanitising them. A path derived from content is a signal, not a typo.

5. **Never weaken a structural defence into an instruction.** The renderer takes
   an IR document and no profile; redaction happens at one egress chokepoint; the
   draft mark is cleared by one IPC call. If you find yourself asking the model to
   respect one of these, you have removed it.

6. **Two principles are tests, not conventions.** `npm run test:isolation` fails
   if anything in `packages/core` can reach the network or the provider layer.
   `npm run test:injection` fails if content can become instruction. Do not skip
   them, and do not weaken them to make a change pass.

7. **Speak the teacher's language in the interface.** Repository files, code and
   identifiers are English. The interface is Spanish first, with no project
   jargon: no "IR", "corpus", "axis", "vault".

8. **Every FR citation carries its spec prefix.** Write `` `007` FR-511``, never a
   bare `FR-511`. FR numbers are unique only within a spec — `005` and `007` both
   define FR-501…FR-517 with different meanings, and the decision (2026-09-03,
   review P22/CONS-02) was to freeze the prefix convention rather than renumber.
   A bare FR number is ambiguous, and ambiguous requirement IDs are exactly what
   "traceability to a moving target is not traceability" means.

   `scripts/check-fr-coverage.sh` now enforces this from the other side: a
   citation carrying **another** spec's prefix does not count as coverage of
   yours. Seven requirements looked archived on somebody else's number.

9. **A requirement's `tasks.md` says what became of it, not just that it exists.**
   Every `- **FR-nnn**` a spec declares must be cited in its own tasks, in one of
   three shapes, and the shape is the state:

   | Shape | State |
   |---|---|
   | in a task — `- [ ] T012 … (FR-nnn)`, continuation lines included | the checkbox |
   | an explicit marker — `FR-nnn — deferred: <reason>`, `done:`, `dropped:` | as written; outranks a task |
   | a coverage row — `\| FR-nnn \| where it is \|` | the table's heading decides |

   A number in a sentence is **not** an account. And a requirement the spec marks
   `**DEFERRED` or `**DROPPED` may not be reported as covered by its tasks: that
   combination is how four MUSTs in `011` read as satisfied for a week
   (review CONS-14, decision P31). The guard prints open / done / deferred /
   dropped separately, because "all accounted for" reads as "all built".

---

## Where things live

| Path | What |
|---|---|
| `app/` | The application. See [`app/README.md`](app/README.md) for the package boundaries |
| `instructions/` | The judgement layer sent to the model — read these |
| `recipes/core/` | Language-neutral adaptation recipes |
| `recipes/lang/<code>/` | Language-specific recipes (lexical, readability standards) |
| `checklists/` | What the teacher reviews against |
| `docs/ir.md` | The Intermediate Representation format |
| `docs/profile-schema.md`, `docs/axis-calibration.md` | The barrier axes and how to score them |
| `docs/memory.md` | How memory is stored, scoped, indexed and loaded |
| `docs/decisions/` | Why the project is shaped the way it is |
| `docs/references.md` | External standards. No clinical material, by design |
| `profiles.example/` | Anonymous type-profiles, safe to read and copy |
| `cases/` | Evaluation cases, including the injection fixtures |
| `scripts/` | Repository hygiene only. Deterministic, never call a model |
| `specs/` | Spec Kit specifications and the backlog |

`profiles/`, `material/`, `output/` and `memory/` are a *teacher's* directories.
They are git-ignored, and in a real installation they live in her vault, not here.

---

## Recipes

Recipes declare which axes they apply to. The application loads `recipes/core/`
plus `recipes/lang/<language-of-the-material>/` and selects those whose `axes`
condition the profile satisfies.

Two things to know before changing selection logic:

- **A recipe with no axis conditions is a guard, not an adaptation.**
  `keep-curricular-terms` and `exam-access-not-difficulty` constrain the other
  recipes rather than competing with them, and must never be dropped in a
  conflict. Dropping one is how an adaptation quietly makes an exam easier, which
  is the failure this project exists to prevent. It has happened once already.
- **Conflicts resolve in a recorded order**, in
  `recipes/core/conflicts/README.md`. Never resolve one silently.

Every recipe carries anti-patterns. They are the mandatory part, not the optional
one — they are what keeps an adaptation from quietly stripping the curriculum out
of a child's worksheet. `scripts/validate-recipes.sh` checks the structure; it
cannot check the pedagogy.

Bump a recipe's `version` whenever you change what it does. Adapted material
records `data-recipe: id@version`, and traceability to a moving target is not
traceability.

---

## Memory

The application must not load its whole history on every run. Rules in
[`docs/memory.md`](docs/memory.md); the short version:

- **Always**: the house style, and the subject learner's profile, notes and
  official adaptations.
- **Never wholesale**: the journal. Only entries whose recipes intersect the
  recipes selected for this run, resolved through the generated index.
- **Never automatically**: the archive.

When memory changes a decision, the report says so. Memory is as traceable as
recipes, or it is unreviewable.

---


## Writing a screen

Everything here is a rule `013` had to introduce because its absence had already
cost something. Three of the four are tests, and the fourth is here because it
cannot be one.

**A screen declares what it is, not how it is laid out.** It uses `Page`,
`Section`, `Field` and `Actions` from `ui/src/shell/`. It does not choose a max
width, a gap or a spinner. If it needs one the shell is missing something, and
that is a change to the shell — a screen that escapes the shell is a fact about
the shell.

**A component never calls `window.rampa`.** Access goes through a hook in
`ui/src/data/`, which resolves loading, error and empty once, and decodes the
error into her language so a component cannot forget to. Asserted by
`ui/test/data-layer.test.ts`.

**A layout rule asks its container, not the window.** `@container page` for
anything inside a screen, `@container window` for the shell itself, and in `em`
so the text scale is part of the question. A media query in pixels cannot see
that the same window holds a third less text at `xlarge`.

**A job does not register its own IPC**, and nothing outside `packages/shell`
imports `electron`. Asserted by `packages/shell/test/boundary.test.ts`, which
also holds the list of the twelve files that legitimately do and what each needs
it for.

**And the one that is not a test: look at it.** Run `npm run shots` and open the
screenshots. Every test `010` produced checks a *property* — a contrast ratio, an
absence of overflow, a present label — so the suite passed on screens that were
correctly coloured, correctly labelled and ugly, for a whole feature, because
nobody rendered them. There is deliberately no pixel-diff suite
([ADR 0009](docs/decisions/0009-composition-not-tokens.md)): it would fail on
every intentional change, get updated without being read, and end up asserting
whatever the last commit produced.

## Before you claim something works

This project has a specific failure mode: **plausible output that is wrong in a
way nobody sees.** It applies to the code as much as to the adaptations. Four of
the defects found so far were found by tests and would not have been found by
review — accent-insensitive redaction, cross-platform path confinement, a
false-positive injection detector, and a dropped exam guard.

So: run `npm test` in `app/`. If you changed rendering, say whether a PDF was
actually produced or only typechecked.
[`specs/006-desktop-app/validation.md`](specs/006-desktop-app/validation.md) is
the record of what has genuinely been verified, and it is written to be honest
about what has not. Keep it that way.
