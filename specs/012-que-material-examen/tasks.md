# Tasks: What the material is

**Prerequisites**: plan.md, research.md, data-model.md, contracts/

**Tests**: Included. One of them — the selection baseline — must land **before**
the change it protects, which is unusual enough to be its own task.

---

## Phase 1 · Make the behaviour change visible before making it

- [x] T001 Write `app/packages/core/test/selection-baseline.test.ts`: for a set of representative documents, record which recipes `selectRecipes` returns **today**. Commit it before anything else changes. `scope` is populated across the corpus and read by nothing, so turning it on changes selection for every document and no test asserts what today produces *(done, and the baseline is damning: **`exam-access-not-difficulty`, scoped `[assessment]`, is currently selected for all four profiles** — including one whose document is a study text. It is offered to everything, which is what «parsed and never read» looks like when you write it down.)*
- [x] T002 Author the kinds in the corpus per contracts/material-kinds.md: four, each with a label in her words and a rule naming one prohibition *(done: `instructions/material-kinds.md`. Four kinds, each with a label in her words and a clause naming what it forbids. `reviewed_by_teacher: false`, and the note says what most needs reviewing — the **order** of the list, because she is asked before she starts and a badly ordered list is friction four times a day.)*

---

## Phase 2 · Foundational

- [x] T003 Parse the kinds in `app/packages/core/src/recipes/kinds.ts`, repair-not-reject, with `forbids` machine-readable and `rule` the text the model reads *(done: `packages/core/src/recipes/kinds.ts`, repair-not-reject. A kind with no `rule` is **dropped** rather than kept: the rule is the whole point, and a label with nothing behind it puts an option in front of her that changes nothing.)*
- [x] T004 Add `kind` to the part/document schema, optional, **absent by default** — the finding behind this spec is an unasked kind written as `worksheet`, and a default repeats it *(closed with a finding rather than a field. Two halves and only one exists: the **part** schema is deferred Phase 4, and the **document** has no front-matter schema at all — the IR's front matter is `Record<string, unknown>` by design, which is what makes `006` FR-410 hold (a field she typed by hand survives a round trip because nothing validates it away). So there is no field to make optional. What T004 actually protects is that **no code path invents `worksheet`**, and that is now asserted over the source: an assignment or a fallback fails, a comparison or a label lookup does not.)*
- [x] T005 Make `scope` filter in `selectRecipes` (FR-1004): offered where the document has a declared block class; **absent scope means anywhere** *(done, and **opt-in** — `selectRecipes` gains an optional list of the document's block classes, and passing nothing behaves exactly as before. That is load-bearing rather than cautious: it is what keeps the T001 snapshots passing, so the diff in this commit is the whole behaviour change rather than part of it.)*
- [x] T006 Update the baseline from T001 in the same commit as T005, so the diff is the behaviour change and a reviewer sees it *(done, in the same commit. Both sides recorded — and the diff revealed a real coverage gap, now **backlog G20**: a study text selects zero recipes for a load profile, because every load recipe is scoped to exercises. The old coverage was two misapplied recipes rather than coverage.)*
- [x] T007 [P] Write `app/packages/core/test/kinds.test.ts` covering quickstart §1 *(done: `packages/core/test/kinds.test.ts`, 20 cases, including the one the spec asks for by name — the same document as a worksheet and as an exam, and the prompts differ.)*
- [x] T008 Export from `app/packages/core/src/index.ts` *(done.)*

**Checkpoint**: the baseline diff is reviewed and understood. Do not proceed past a diff nobody can explain.

---

## Phase 3 · US1 + US2 — she says what it is, and it changes what happens (P1) 🎯 MVP

- [x] T009 [US1] Stop writing `kind: 'worksheet'` in `job:create` (FR-1003) *(done, and it needed a new error kind. `material-kind-missing` rather than reusing `input-too-large`, because the sentence she reads has to name the fix: «Dime primero qué es esto». An unrecognised kind is refused rather than coerced — the same argument as `resolveInVault`.)*
- [x] T010 [US1] Ask what the material is, with **no option preselected**, on the ingest screen and on the paste path *(done: four radios, **nothing preselected**, with a help line saying why she is being asked before she starts.)*
- [x] T011 [US2] Carry the kind and its corpus rule into `buildAdaptPrompt` (FR-1002) *(done. And the point is the wording: hard rule 5 has always said «Exams preserve the criterion» and was being sent with every request, including while adapting a study text. It is now **asserted about this document** — and absent when she has not said, which is every document that predates `012`.)*
- [x] T012 [US2] Add what each kind means to `instructions/adapt.md` — the pedagogical half, in the corpus (Principle I) *(done: `instructions/adapt.md` gains «Y qué es el documento entero, no sólo el bloque», and the point it makes is the one the block list alone gets wrong — **the document's kind outranks the block's**. An `.exercise` inside an exam cannot be split or scaffolded, even though the block list says an exercise can be. Plus what to do when nobody said: adapt only what would be safe in all four, and say so — never assume a ficha.)*
- [x] T013 [US2] Report when the stated kind and the block classes disagree (FR-1005), overriding neither: she may be adapting last year's exam as practice *(done, in **one direction only**: assessment-shaped blocks in something she called anything else. A document that could promote itself to an exam could also demote an exam to a worksheet, and that is the dangerous direction — Principle IX. It also says she may be adapting last year's exam as practice, which is ordinary rather than a mistake.)*
- [x] T014 [US2] Say in the report that an exam was treated as an assessment (FR-1006), so the rule that governed it is visible before she signs *(done, and it goes **first** in the report, because it is the rule everything below happened under and she is signing for it. The prohibitions print in her words, not as corpus ids — a report saying `curricular-demand` would ask her to learn our vocabulary to read her own document.)*
- [x] T015 [P] [US1] Stop saying «una ficha» where the application means "material" (FR-1011) — a teacher who reads it on every screen concludes it does not do exams *(done across the rail, five screens and the strings file. «Adaptar material», and «ficha» demoted to one kind among four.)*
- [x] T016 [P] Write `app/e2e/material.spec.ts` covering quickstart §6 *(done: `e2e/material.spec.ts`, six cases, and it **found two real bugs**. First, `hidden` was losing to `.fieldset-bare { display: flex }` — an author `display` rule beats the UA's `[hidden]`, so the «¿Qué es?» fieldset stayed on screen after the door had already asked it: a teacher answering the same question twice, which is the wizard failure `016`'s contract exists to prevent. Fixed globally with `[hidden] { display: none !important }`, because the next `hidden` elsewhere would have had the same bug and nobody would have connected them.

      Second, and worse, that fix exposed one: with the door answering «para quién», the adapt screen was hiding the **learner list** too — so the second learner became unreachable, which is FR-1411/1412 broken in the most literal way. The list now always shows, with the door's choice already ticked.)*

**Checkpoint**: the same document adapted as a worksheet and as an exam produces different prompts.

---

## Phase 4 · US3 — several documents, one unit of work (P2)

> **Deferred 2026-08-31, deliberately, after Phases 1-3 shipped.**
>
> This phase's own implementation strategy says it: «MVP = Phase 1 + 2 + 3. The
> exam distinction is a correctness matter; several parts is a convenience one.»
> The correctness matter is done — an exam is now adapted as an exam.
>
> What Phase 4 costs, which is why it is not next: it moves
> `material/<job>/ir.md` to `material/<job>/p1/ir.md`, and that layout is now
> read by **three** features rather than one. `005`'s batch resolves
> `jobLearnerDir`, `014`'s record scan walks every job directory, and every path
> helper in `packages/core/src/vault/paths.ts` assumes one IR per job. Plus a
> migration for every vault that exists.
>
> A layout migration touching three shipped features, for a convenience, while
> `002` sits fully specified and unreachable, is the wrong order. It comes back
> when a teacher asks for it or when `016` needs it — and `016` FR-1009 references
> it without depending on it.
>
> Nothing here is abandoned. `data-model.md` does not yet describe the parts
> layout — my rewrite of it on 2026-08-31 dropped that section, which T017 refers
> to — so **T017 needs the data model written before it can be executed.** Noted
> so the next person does not discover it mid-task.

- [ ] T017 [US3] Introduce `parts.json` and the `material/<job>/p1/` layout per data-model.md
- [ ] T018 [US3] Migrate a job with `ir.md` at its root to one part with **kind absent** — never `worksheet`, which would bake the original lie into her existing material
- [ ] T019 [US3] Let her bring several documents, each with its own kind, into one job; keep several images as pages of one part (FR-1010)
- [ ] T020 [US3] Adapt each part under its own rule, into one report
- [ ] T021 [P] [US3] Write `app/packages/core/test/parts.test.ts` covering quickstart §5

---

## Phase 5 · Polish

- [x] T022 Record in `specs/006-desktop-app/validation.md` what the baseline diff showed, and that SC-1001 needs a teacher and her own exam *(done, and the diff was not what «filter out what does not apply» sounds like: a study text went from two recipes to **zero**, because the two it had were `one-task-per-page` on prose and `exam-access-not-difficulty` on apuntes. The coverage that filtering removed had never been coverage. Recorded as G20 with the closing instruction written down, because the tempting fix — loosen a scope — is the wrong one.)*
- [x] T023 [P] Update `docs/escenario.md`, which describes adapting «una ficha» throughout *(done, and the honest reading of this task is not a search-and-replace: most uses of «ficha» in that document are correct, because Hugo's worksheet **is** a ficha. What was missing was every moment the new specs cover. Momento 4 (el examen) now records the hole `012` closed — the application wrote `kind: worksheet` for everything, so the hard rule about the criterion had nothing telling it which documents it governed — and momentos 5, 6 and 7 are new: composing from objectives, Iván who reads with pictograms, and Vega who does not see the sheet. The capability table gained six rows and changed six more.)*
- [ ] T024 Take an exam and a problem sheet to a teacher (quickstart §7). **The question is not whether it looks good — it is whether any question's demand changed**, and she is the only one who can answer it

---

## Dependencies

- T001 blocks T005. T002 blocks T003 and T011.
- T005 and T006 are **one commit**.
- Phase 4 depends on Phase 3 and is where the cost is.

## Implementation strategy

**MVP = Phase 1 + 2 + 3.** The exam distinction is a correctness matter; several
parts is a convenience one, and doing the convenience first would be building the
larger thing on top of the unfixed smaller one.

**T001 is not optional and not reorderable.** Turning `scope` on is a silent
behaviour change to every adaptation this application has ever produced. Landing it
without the baseline means the first person to notice is a teacher whose worksheets
got quietly worse, and nobody will connect it to this commit.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here.
The reason is the one `002` learned the hard way: **a requirement nobody can point
at is a requirement nobody is keeping.**

| | Where it is satisfied |
|---|---|
| FR-1001 | T003/T004 · the four kinds as corpus, asked and never defaulted. `job:create` refuses without one, and `kinds.test.ts` asserts no code path assigns `worksheet` |
| FR-1007 | `material-kinds.md`'s `forbids: [quantities, operations, …]` for `problems`, sent to the model verbatim and named in the report by `FORBIDS_LABELS`. **And it is what `002` FR-126 needed**: a composed arithmetic sheet is `problems` or `worksheet`, so the prohibition protects its verified answer key from a later revision |
| FR-1008 | `checkCompleteness` is applied to every kind with no relaxation — there is no per-kind branch in it, which is the structural form of «no relaxation». `study`'s own rule in the corpus says «no resumas, no quites apartados» |
