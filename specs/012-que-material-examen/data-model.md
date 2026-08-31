# Data model: what the material is

## The vocabulary lives in the corpus

Four kinds ship, and they are **Markdown**, per
[contracts/material-kinds.md](contracts/material-kinds.md): each carries a label in
her words and one clause naming what it forbids.

A kind is defined by what it forbids, and a prohibition about how to adapt is
pedagogical judgement — so it is corpus, and the fifth kind is a file rather than
a code change (Principle I).

An earlier draft of this document made it a closed union in TypeScript. That was
wrong and the correction is recorded in [plan.md](plan.md).

## Where it lives

In the IR's front matter, on the **part**:

```yaml
---
source: "photos"
kind: "exam"
extraction: { verified: true }
---
```

Per part and not per job (clarification). A unit of three documents can be a
study text, a worksheet and an exam; one kind on the job would force the
strictest rule onto all three, or the loosest onto the exam. The second is
dangerous — it is an exam adapted as a worksheet, which is a different exam.

## What reads it

| reader | what it does with it |
|---|---|
| `selectRecipes` | nothing — see below |
| `buildAdaptPrompt` | states what the document is, and asserts the constraint when it is an exam |
| `buildReport` | says what the material was treated as (Principle VI) |
| `checkCompleteness` | does not relax for `study` (FR-1008) |

`selectRecipes` deliberately does **not** filter on the material kind. It filters
on `scope` against the block classes present, which is a different question:
the kind says what may change, the scope says where a recipe applies.

## Block classes present

```ts
function blockClassesIn(doc: IRDocument): Set<string>
```

Derived, never stored. A document's classes are a fact about the document, and
storing them would be a second copy that a hand-edit in Obsidian could make
false.

## What is NOT added

**No `kind` on the job directory, no `kind.json`, no kind on the adapted
document beyond what the IR already carries through.** The adapted document
inherits the front matter it was built from, which is how `job:revise` keeps the
kind across a revision without anybody remembering to copy it.

## Material that already exists

`job:create` has written `kind: 'worksheet'` unconditionally since it was
written, so every vault has worksheets in it — some of which were exams. They
stay worksheets: they were adapted as one, the report says so, and relabelling
finished work would make the record disagree with the document.
