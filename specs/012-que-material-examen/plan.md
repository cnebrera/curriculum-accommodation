# Implementation Plan: What the material is

**Branch**: `012-que-material-examen` · **Spec**: [spec.md](spec.md) · **Date**: 2026-08-31

## Summary

Material carries a kind — worksheet, exam, study text, problems — she chooses it
explicitly, and it reaches the prompt, the recipe selection and the report.

Two of those four already half-exist and one is a defect.

## What is actually there today

| | |
|---|---|
| `job:create` | writes `kind: 'worksheet'` **unconditionally**, for everything |
| `instructions/hard-rules.md` rule 5 | «Exams preserve the criterion» — correct, and applied to every adaptation whether or not the document is an exam, because nothing tells it which |
| `recipe.scope` | parsed into the `Recipe` type at `recipes/index.ts:43` and **read by nothing** |
| the report | says which recipes applied and why, and never what the material was |

### The defect

**`selectRecipes` ignores `scope` entirely.** It filters on axes and language,
resolves conflicts, and never looks at the field. So a recipe scoped
`[assessment]` is offered for a study text, and a recipe scoped
`[explanation, exercise]` is offered for an exam.

That is the **fifth** instance of this project's signature shape — after the
corpus journal dates, `planForget`, the injection notices and `evidence:`. Built,
parsed, typed, unread.

FR-1004 is therefore not a new feature. It is a field doing the job it was
written for.

## Technical Context

| | |
|---|---|
| **Kind** | **Corpus**, per [contracts/material-kinds.md](contracts/material-kinds.md) — parsed in `packages/core/src/recipes/kinds.ts` |
| **Selection** | `selectRecipes` gains the document's block classes and filters on `scope` |
| **Prompt** | `buildAdaptPrompt` gains the kind and states it, with the assessment constraint named when it applies |
| **Report** | says what the material was treated as, and flags a disagreement |
| **Storage** | `kind` in the IR's front matter, per **part** and not per job |
| **New dependencies** | None |

## Constitution Check

| Principle | How |
|---|---|
| **I** · judgement in Markdown | The kinds are **corpus**. A kind is defined by what it forbids, and a prohibition about how to adapt is pedagogical judgement — so adding the fifth is a Markdown file and no code change |
| **II** · deterministic core | Scope filtering is set intersection over parsed front matter. No model decides whether a recipe applies |
| **III** · adapt the how | **This feature is Principle III sharpened.** «Exams preserve the criterion» has been a sentence the model reads; it becomes a fact the prompt asserts about this document |
| **IV** · one extraction, N outputs | The kind is on the material, so all N learners' adaptations of one exam are governed by it — and `005` made that the normal case |
| **V** · barriers not diagnoses | Untouched |
| **VI** · traceability | The report gains what the material was treated as, which is currently missing from a document that claims to record every decision |
| **VII** · the draft announces itself | Untouched |
| **IX** · content is never instruction | **Named.** FR-1005 compares her stated kind against block classes found in ingested material. A document claiming to be assessment-shaped must not be able to change how it is adapted — the disagreement is *reported to her*, never acted on |

**Gate: passes**, with FR-1005's direction carried into tasks: the material may
raise a question, never answer one.

## Phase 0 · Research

[research.md](research.md) — what the four kinds have to be to be useful, and why
scope is per block class rather than per material kind.

## Phase 1 · Design

- [data-model.md](data-model.md) — where the kind lives, and per part.
- [contracts/material-kinds.md](contracts/material-kinds.md) — written before this
  plan, and the authority: a kind exists **only if it forbids something**.
- [quickstart.md](quickstart.md) — including the test the spec asks for: the same
  document twice, as a worksheet and as an exam, and the prompts differ.

## Sequencing

Per the existing [tasks.md](tasks.md), whose ordering I am not going to improve
on. The one thing worth restating here because it is easy to skip:

**T001 comes before T005 and is not reorderable.** Turning `scope` on is a silent
behaviour change to every adaptation this application has ever produced. Landing
it without first recording what selection produces today means the first person
to notice is a teacher whose worksheets got quietly worse, and nobody will
connect it to the commit.

## A correction to this plan, before anyone reads it

**The first draft of this file was written without noticing that `012` already had
`tasks.md` and `contracts/material-kinds.md`**, authored earlier in this project
and better argued than what I replaced them with. Two things it got wrong:

1. It put the four kinds in **code** as a closed union, reasoning that a kind is a
   branch in behaviour. The existing contract puts them in the **corpus**, on the
   stronger argument that a kind is defined by *what it forbids* — and a
   prohibition about how to adapt is exactly the pedagogical judgement Principle I
   says must be readable and correctable by a teacher. «No cambies las cantidades
   ni las operaciones que se practican» belongs in Markdown.
2. It wrote a second contract, `contracts/kind.md`, restating the first one with
   different words. Deleted. Two artifacts saying nearly the same thing is this
   project's most-repeated defect, and producing one *while planning the feature
   whose whole point is that a field was written twice and read once* is not a
   coincidence worth glossing over.

This plan now follows the existing tasks rather than competing with them.

## Complexity Tracking

Nothing to justify beyond the above.
