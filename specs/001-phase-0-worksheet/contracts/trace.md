# Trace — the fifteen, and who actually delivers them

`001`'s deliverable. Each requirement, the mechanism that meets it, the test that
pins it, and whether the defence is **structural** (code cannot go around it) or
**instructional** (a sentence asking a model to behave).

*Traced 2026-08-28.*

| # | Requirement | Delivered by | Pinned by | Kind |
|---|---|---|---|---|
| 001 | Profile from a conversation, no diagnosis | `006` profile editor; `instructions/axes.md` for the wording | `axes.test.ts` — descriptors are behaviours, never bare adjectives | Structural (the schema has no diagnosis field) |
| 002 | Unobserved axis is `null`, never 0 | `vault/schema.ts` `axisLevel` | `core.test.ts`, `profile-roundtrip.test.ts` | **Structural** |
| 003 | Source normalised into the IR | `008` `pagesToIR` | `extraction.test.ts`, incl. round-trip through `parseIR` | Structural |
| 004 | Original numbering preserved verbatim | `008` `data-number`, a string | `extraction.test.ts` — an integer is rejected | **Structural** |
| 005 | Unreadable flagged in place, never inferred | `008` validator + converter | `extraction.test.ts` — the marker survives to the IR *and* raises a notice | Structural, plus an instruction that is rewarded |
| 006 | Refuses to adapt while unverified | `008` T021, per page, derived | `e2e/ingest.spec.ts` — one page of two does not open the gate | **Structural** as of `008` |
| 007 | Recipes by axes only | `006` `selectRecipes` | `core.test.ts`, `pipeline.test.ts` | Structural (no other input is passed) |
| 008 | `data-from`, `data-recipe`, `data-axis` on every changed block | `007` FR-512 — **two** functions | `untrusted.test.ts` | **Structural** |
| 009 | Report grouped by decision, leading with what was not done | `010` `ReportView`, `buildReport` | `core.test.ts` | Structural |
| 010 | Escalate when the *what* would change | `instructions/hard-rules.md` | — | **Instructional.** See below |
| 011 | `.assessment`: presentation only | corpus recipe `exam-access-not-difficulty` | `validate-recipes.sh` checks the recipe exists and parses | **Instructional.** See below |
| 012 | The draft mark until review | `007` FR-509 | `untrusted.test.ts` | **Structural** as of `007`'s audit — **was broken** |
| 013 | Deterministic scripts offline, no key | `007` FR-511 module-graph | `isolation.test.ts`, 48 tests | **Structural** |
| 014 | Degrade to fewer modalities, never silently | `006` render path | `render/check.ts` + `core.test.ts` | Structural |
| 015 | Commit hook blocks learner material | `003` FR-214 | `memory-audit.test.ts` | **Structural** |

## The two that rest on an instruction

**FR-010 and FR-011 are the heart of this project and neither is enforced by
code.**

"Adapt the *how*, never the *what*" is Principle III, and there is no mechanical
test for whether an adaptation changed what a learner is being asked to
demonstrate. A simplified sentence and a lowered demand look identical to a
parser. `hard-rules.md` and the exam-access recipe say it, in Spanish, to a model.

What surrounds them structurally: provenance says which recipe changed each block
(FR-008), completeness says nothing vanished undeclared (`007` FR-516), and the
report puts every decision in front of her before she signs (FR-009). So an
over-adaptation is **visible** even though it is not **prevented** — and the
teacher's signature is the actual enforcement.

That is the honest architecture and it should be said rather than implied: the
project's central promise is kept by a person, supported by machinery that makes
breaking it visible. Everything else in this table is stronger than these two, and
these two are the ones that matter most.

## What remains unmeasured

**SC-001 — does a real special-education teacher find the output usable with minor
edits?**

This is the criterion this spec exists for, and it is unmeasured. Nobody has run
the journey with a teacher. Every requirement above is met; the question they were
built to make askable has not been asked.

Also unmeasured: SC-002 (how long it takes her), SC-005 (whether the report is
what she reads instead of re-reading the worksheet), and the `010` criteria about
whether the interface reads as finished.

## What the trace itself found

Three of these fifteen were found broken by audits written for **other** specs:

- **FR-012** — the draft mark was removable without signing off (`007`'s audit).
- **The memory half of the loop** — every corpus-scope correction silently
  discarded (`003`'s audit).
- **FR-006's sibling** — the one-click verify passed the gate for any document
  (`008`'s work).

None of them was found by anyone reading this spec, because until now nothing
connected these requirements to the code that serves them. A requirement traced to
nothing is checked by nobody, and "covered elsewhere" is not a trace.
