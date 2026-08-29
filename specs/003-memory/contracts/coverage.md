# Contract — what actually enforces Principle VIII

The deliverable of `003`'s verification pass. Per requirement: what enforces it,
what pins it, and whether it is met, partly met, or absent.

*Audited 2026-08-28. 27 assertions in `app/packages/core/test/memory-audit.test.ts`
plus 5 in `app/e2e/erasure.spec.ts`.*

## First: the command names

This spec was written against `/rampa-*` commands, before
[ADR 0006](../../docs/decisions/0006-one-vehicle.md) moved the project to one
vehicle. Every requirement below is read as **what it means in the application**,
because otherwise the next reader concludes half the spec was abandoned:

| The spec says | It means |
|---|---|
| `/rampa-review` | The review screen, and `ScopeQuestion.tsx` |
| `/rampa-memory` | The notes screen and its actions |
| `/rampa-memory forget <CODE>` | `ForgetLearner.tsx`, reached from a learner's profile |
| `.rampa/index.md` | Whatever the application generates from journal front matter |

## The audit found two things, and one of them was severe

### Every corpus-scope correction was silently discarded. Forever.

`journalEntrySchema` had `date: z.string()`. `js-yaml` parses an unquoted
`2026-08-28` into a **`Date` object**. `ipc/memory.ts` wrote `date: ${stamp}`
unquoted. So every corpus-scope journal entry the application has ever written
failed validation, was dropped by `loadJournal`'s `if (!value.date) continue`, and
**was never loaded again**.

The consequence is the precise failure this spec exists to prevent. She notices a
rule did not work, records it, watches the file appear in her own folder — and the
next adaptation has never heard of it. Not once. With nothing on screen to tell her
why, and a plausible conclusion available to her: that the correction was ignored
because the tool does not really learn.

The same defect had been found and fixed in `008`'s catalogue parser a few hours
earlier, in a different module, by a test written for an unrelated reason. The
schema now accepts both spellings and normalises; the writers now quote; a test
round-trips exactly what the handler emits.

### Erasure had no way in

`planForget`, `executeForget`, `verifyForgotten` and `tombstone` were all written,
tested and exposed over IPC — including two carefully-worded lists, `survives` and
`outOfReach`, saying exactly what erasure does not reach. **No component called any
of them.**

So the one action a school is legally obliged to be able to perform was
unreachable from the interface, and the sentences that make it honest had never
been read by anybody. `ForgetLearner.tsx` now exists, reached from a learner's
profile, showing all three lists and confirming on the code rather than on a word.

## The twenty

| # | Enforced by | Pinned by | State |
|---|---|---|---|
| **201** | `ScopeQuestion.tsx` asks; nothing infers | audit | Met |
| **202** | `memory:capture` writes the profile **and** a dated note | audit | Met (was note-only until `006` T085) |
| **203** | Practice scope appends to `memory/house.md` and touches no profile | audit | Met |
| **204** | Corpus scope writes the recipe tags, which `loadForRun` filters on | audit | Met |
| **205** | The correction box **starts empty**; she writes the pattern, and the app never offers her the passage | audit | Met — and this is the privacy guarantee, not a feature |
| **206** | `buildIndex` from front matter, deterministic, order-independent, no model | audit, incl. same-bytes-twice | Met |
| **207** | `loadForRun` intersects by recipe | audit | **Was broken by the date defect** — no entry loaded at all. Now met |
| **208** | House style and the subject's profile always load | audit | Met |
| **209** | Read before selection; precedence exercised in the **prompt**, above the recipes, saying so in the section itself | audit, 5 cases | Met — with a caveat below |
| **210** | The model declares `[memory:recipe]`; code checks it against what was loaded | audit, 7 cases | Met **as of 2026-08-29** |
| **211** | `memory:consolidate` proposes and writes nothing | audit, over the handler body | Met |
| **212** | — | — | **Absent, and not reachable.** See below |
| **213** | — | — | **Absent.** No memory export exists |
| **214** | `/memory/*` ignored, README negated, plus the commit hook | audit | Met — the hook is the enforcement; `.gitignore` alone is a request |
| **215** | `planForget` then `executeForget`, both behind `ForgetLearner.tsx` | audit + e2e | Met **as of this audit** |
| **216** | `executeForget` + `verifyForgotten` | e2e, over every file in the vault | Met, with one stated exception — see below |
| **217** | `tombstone()` | audit + e2e | Met |
| **218** | `plan.survives`, travelling with the plan | audit + e2e | Met **as of this audit** (was unreachable) |
| **219** | `retentionCandidates` returns candidates; the module cannot write | audit | Met |
| **220** | `plan.outOfReach`, travelling with the plan | audit + e2e | Met **as of this audit** (was unreachable) |

## Two requirements that conflict, resolved

**FR-216** says no file may contain the learner's code. **FR-217** says the removal
must be recorded. A record that cannot name what was removed records nothing, so
exactly one file keeps the code: `.rampa/erasures.md`.

That is defensible on the substance and not only on the paperwork: the code is a
pseudonym, and the map from code to name is deleted with everything else. Nothing
left on the machine can turn `PER-abc` back into a child. **If the name map ever
survived an erasure, this exception would stop being defensible** and the tombstone
would have to be codeless — which is why the e2e asserts the map is gone in the
same test.

## What is absent, and why it is not being built now

- **FR-212 · the de-identification rewrite.** Required before corpus-scope items
  "leave the machine". Nothing currently leaves: there is no export. Building the
  rewrite now would mean building a model call, a review screen and a privacy
  surface for a path with no destination.
- **FR-213 · the memory export, full and shareable.** The same gap from the other
  side, and the reason FR-212 is unreachable. There is no community corpus
  repository to export *to*. An export with no consumer is a privacy surface with
  no benefit, and building the two together when there is somewhere for it to go
  is the right order.
## FR-210, closed — and the closing was subtraction

*(2026-08-29.)* The channel already existed end to end: `ReportInput`,
`buildReport`'s rendering, `ReportView`'s section. What it carried was
`effect: 'Apliqué lo aprendido antes'` for **every entry loaded**, with a file path
as the source.

So an entry that merely matched a recipe id and changed nothing read exactly like a
correction that did. A list where everything is claimed is a list she stops
reading — and then the one line that mattered goes with it. The gap was not a
missing feature; it was a section full of noise.

Now: `instructions/adapt.md` gains a third machine-parsed form, `[memory:<recipe>]`,
and `buildReport` **checks every declaration against the entries the run actually
loaded.** A claim about learning the model was never given is dropped, not shown
with a caveat.

That check is the section's entire value. A line saying *"your correction changed
this"* is worth reading only if it cannot be produced by a model that never saw the
correction.

Worth noting where the rule already was: `instructions/adapt.md` listed *"apply what
you learned from the teacher without saying so"* under **Never**. The rule existed
and there was no form to say it in, which is why nothing was ever declared.

## FR-209, verified — and half of it is not what it sounds like

**Read before selection: yes.** `loadLearner` runs before `selectRecipes`.

**Influences selection: no, deliberately.** `selectRecipes` takes a profile and a
language, not the overlay. Turning an official document's prose into recipe
selection would mean interpreting a legal instrument with pattern matching — wrong
quietly, in a direction nobody chose.

Precedence is exercised at the **adaptation** step instead: the overlay reaches the
model above the recipes, in a section that states it outranks them and does not
outrank the hard rules. That is a position and a sentence, which is the strongest
thing a deterministic test can check — **and a model could still ignore both.**

A reader of FR-209 could reasonably expect the overlay to add or suppress a recipe.
It does not, and the test pins the current behaviour so that expectation is not
formed by accident.

Recorded here rather than ticked, because a specification whose absent
requirements are invisible is worse than one with gaps.
