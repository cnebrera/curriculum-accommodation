# Tasks: Who the learner is — age, year and stage

**Input**: Design documents from `specs/011-quien-alumno-edad/`

**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The parser is repair-not-reject and the prompt change is
invisible in the output, so both need pinning — but the deliverable a teacher
should look at first is `instructions/education/es.md`, not any of the code.

---

## Phase 1 · Setup

- [x] T001 Create `instructions/education/README.md` pointing at `contracts/education-model.md` as the authority, so whoever adds the British system finds the contract rather than copying Spanish and guessing *(done.)*

---

## Phase 2 · Foundational

- [x] T002 Define the types and parser in `app/packages/core/src/education/parse.ts` per data-model.md: system, stages, years, `typical_age` nullable, `modalities`, `can`, `studies`, `studies_by_modality` *(done: `packages/core/src/education/parse.ts`.)*
- [x] T003 Implement repair-not-reject in the same parser: a missing `id`/`label` skips the system; a broken year is dropped and the rest load; a `typical_age` outside 3–99 is treated as absent and logged — a corpus edit must not be able to tell a teacher a Primaria pupil is 40 *(done. An absurd age is treated as **absent rather than clamped** — clamping 400 to 99 would invent a different wrong answer.)*
- [x] T004 [P] Implement the lookup in `app/packages/core/src/education/lookup.ts`: year → stage, year → typical age, and **`divergence(age, year)`** returning the two-year threshold from research R4 *(done, with the two-year threshold. Returns null where there is nothing to compare — not "no divergence", which is a different answer.)*
- [x] T005 [P] Add `age`, `age_recorded`, `year`, `stage` to `profileSchema`, all optional, with `stage` stored as a **label** so the YAML is readable without the application *(done. `stage` is stored as a **label** so the YAML stays readable without the application.)*
- [x] T006 Write `app/packages/core/test/education.test.ts` covering quickstart §1 and §2, against the **shipped** file — including that `reviewed_by_teacher` is false, which will keep failing until a teacher has disagreed with something *(done: 25 tests against the shipped file, including that `reviewed_by_teacher` is false. **That one failing will be good news.**)*
- [x] T007 Export from `app/packages/core/src/index.ts` *(done.)*

**Checkpoint**: the parser round-trips the shipped Spanish file; `npm run test:all` and `test:isolation` pass.

---

## Phase 3 · US1 + US2 — she says the year, the adaptation knows the age (P1) 🎯 MVP

**Goal**: One choice fills three fields, and every adaptation knows who it is for.

**Independent test**: Create a learner picking only a year. Profile carries year, stage and age; the prompt carries all three; a divergent age is stated in words.

- [x] T008 [US1] Author `instructions/education/es.md` — the whole deliverable. Infantil (2.º ciclo), Primaria, ESO, Bachillerato **with its four modalities**, FP Grado Básico and Grado Medio, educación especial and personas adultas, the last two with `typical_age: null`. Write `can` before `studies` and better than `studies` *(done: 8 stages, 22 years. Three carry `typical_age: null`. Unreviewed — backlog G16 names the five places I am least confident.)*
- [x] T009 [US1] State in that file, in its own text, that it is the state minimum and that the seventeen communities develop their own curriculum on top — where a teacher reading the file will see it, not only in a spec *(done, in the file where a teacher reading it will see it.)*
- [x] T010 [US1] Expose it over IPC as `corpus:educationSystems`, and store her choice in the vault settings (FR-911) *(done: `corpus:educationSystems`.)*
- [x] T011 [US1] Ask it once, at first run, in the onboarding — one question, not inferred from the OS language *(done, and the honest implementation is «asked, never inferred — and not asked when there is nothing to ask». The chooser appears from the **second** system: with one shipped, a question with one answer is friction four times a day. What must never happen is inferring it from the OS language — a teacher in Barcelona whose laptop is in English is not teaching an English curriculum — and `e2e/learner.spec.ts` asserts that by absence.)*
- [x] T012 [US1] Rebuild the year/age fields in `app/ui/src/learners/ProfileEditor.tsx`: pick a year, get the stage and a default age, both editable, neither corrected afterwards. A year with `typical_age: null` fills nothing *(done: `YearPicker.tsx`. One choice fills stage and age, both editable, neither corrected afterwards. A divergence of two years or more is said out loud **as information, not as a warning** — it is not a mistake to fix.)*
- [x] T013 [US2] Carry age, year and stage into `buildAdaptPrompt`, in their own section, **before the material and after the barriers** *(done, after the barriers and before the material.)*
- [x] T014 [US2] State the divergence in words past the two-year threshold, and say nothing at one year (FR-905). A sentence that fires on most learners stops being read *(done. Two years, not one: a sentence that fires on most learners stops being read.)*
- [x] T015 [US2] Carry `can` and `studies` into the prompt, labelled as orientation, with the sentence that the teacher's word outranks it (FR-914) *(done, with the caveat where the model reads it rather than only in the corpus file.)*
- [x] T016 [US2] Add the rule to `instructions/adapt.md`: **register to the age, curricular demand to the year.** This is the pedagogical judgement the fields exist for, and it belongs in the corpus (Principle I) *(done. «El registro va por la EDAD, la exigencia curricular por el CURSO», with the concrete instruction rather than only the abstract one — plus two new entries under **Never**.)*
- [x] T017 [US2] Emit no section at all when the fields are absent — never "edad: desconocida", which invites a guess *(done. No fields, no section — never «edad: desconocida», which invites a guess where silence prompts a question.)*
- [x] T018 [P] [US2] Extend `007`'s output check: the renderer is not handed the new fields and `checkOutput` fails a render containing them (FR-910). Adding profile fields without extending the check is how that guarantee quietly narrows *(done, and it needed a fourth argument on `checkOutput` plus a helper every render path shares. The rule the task states is the one enforced: **adding a profile field without extending this check is how the next one reaches a sheet.** The school is the sharpest case (`015` FR-1306). Short values are skipped and that limit is stated — «ESO» or an age of «9» would fire on ordinary content, and a two-character value identifies nobody. And it broke an over-pinned assertion in `untrusted.test.ts` that matched the whole call expression, so a **correct** fourth argument failed it; now it asserts the shape.)*
- [x] T019 [P] [US1] Write `app/e2e/learner.spec.ts` covering quickstart §6 *(done: `e2e/learner.spec.ts`, six cases in the real window. One of them failed for its own reason first — it asserted over `codes[0]`, which is the learner seeded to get past onboarding and has no course. Green for the wrong reason is the failure this suite exists to avoid, so it now finds the learner that has a year.)*

**Checkpoint**: a divergent learner — fourteen in 5.º de Primaria — produces a prompt that says so.

---

## Phase 4 · US3 — a second system is a file (P2)

- [x] T020 [US3] Prove it by adding one: a second system file, enough to demonstrate SC-902, and delete it again if it cannot be written honestly. An extension point nobody has used once is a claim *(done, and **the honest answer was a fixture**. The task said «delete it again if it cannot be written honestly», and it cannot: nobody here can write another country's stages, typical ages and curricular expectations to the standard the corpus sets for itself, and a plausible `pt.md` would put a claim about somebody else's school system in front of a teacher. So the extension point is proved against a fixture — two systems load, ids stay namespaced, a duplicate id is dropped rather than letting file order decide — and a test asserts that **exactly one real file ships**. A second one appearing fails it, and whoever added it has to confirm a teacher of that system read it.)*
- [x] T021 [US3] Surface `last_checked` where she picks the system, and mark a stale file rather than withdrawing it — unlike a provider entry, because hiding the only system leaves her unable to create a learner *(done: `stalenessOf` and `stalenessNotice` in core, surfaced beside the choice. **Marked, never withdrawn** — unlike a stale provider entry, because hiding the only education system leaves her unable to record a course at all, and a slightly out-of-date list of Spanish school years is far better than none. The sentence says it is still being used and why a course might not fit.)*
- [x] T022 [P] [US3] Add a CI check that an education file's `last_checked` is not older than 400 days *(done: `scripts/check-education-freshness.sh`, in CI, same shape as the catalogue check — two corpora that make claims about the outside world, one habit. 400 days rather than 365, so a file checked at the start of one school year does not turn red mid-way through the next. It **fails the build**, unlike the interface: the audience here is a contributor, and stopping is the honest response. And it fails if it finds no files, because a check with nothing to check passes for ever.)*

---

## Phase 5 · Polish

- [x] T023 Record in `specs/006-desktop-app/validation.md` what is verified and what is not — in particular that **the Spanish orientation is unreviewed**, was written by a language model, and carries the same status as backlog G2 *(done, and the section exists to say one thing: **the Spanish file is unreviewed and a language model wrote it.** The typical ages, the stage boundaries and every sentence of `can:` and `studies:` are a plausible reconstruction by something that has read about the system and never taught in it. «Probably mostly right» about what belongs to 4.º de Primaria is exactly the claim that produces material pitched at the wrong child with no visible sign of it.)*
- [x] T024 [P] Update `docs/escenario.md`: Marta says the year once and never types an age *(done: a new momento 0b in `docs/escenario.md` — Marta says «5.º de Primaria» and never types an age, and when the child is fourteen in 5.º the course **stays where it was**, because nobody corrects her about an alumno she has in front of her. It ends where the others do: the file nobody has reviewed.)*
- [x] T025 [P] Add the education suite to the manual CI workflow *(done, two steps: the freshness check and the education suite. The suite gets its own step because it is where `es.md`'s own parse is asserted, after a regex edit once put one year's data inside another stage and the only symptom was the test count dropping.)*
- [ ] T026 Take `es.md` to a practising teacher and get her to disagree with something (quickstart §7). Until then `reviewed_by_teacher` stays false and the test that asserts it keeps passing for the wrong reason

---

## Dependencies

- **Phase 2** blocks everything. T002 blocks T003/T004; T008 blocks T010–T015.
- T008 is the long pole and it is writing, not coding.
- T026 needs a person and blocks nothing.

## Parallel opportunities

- T004, T005 together. T018, T019 together.
- T008 (writing the Spanish file) parallelises with all of Phase 2's code.

## Implementation strategy

**MVP = Phase 1 + 2 + 3.** Storing the fields without sending them is the same gap
with more code; sending them without the corpus rule is three strings the model has
no instruction about.

**Do not defer T016.** The rule — register to the age, demand to the year — is the
entire reason these fields exist, and it is the task most likely to be dropped as
"just a prompt line". Without it the model gets three facts and no idea what they
are for, which is how an age becomes a label instead of a register.
