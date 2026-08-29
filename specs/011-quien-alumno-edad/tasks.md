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
- [ ] T011 [US1] Ask it once, at first run, in the onboarding — one question, not inferred from the OS language
- [x] T012 [US1] Rebuild the year/age fields in `app/ui/src/learners/ProfileEditor.tsx`: pick a year, get the stage and a default age, both editable, neither corrected afterwards. A year with `typical_age: null` fills nothing *(done: `YearPicker.tsx`. One choice fills stage and age, both editable, neither corrected afterwards. A divergence of two years or more is said out loud **as information, not as a warning** — it is not a mistake to fix.)*
- [x] T013 [US2] Carry age, year and stage into `buildAdaptPrompt`, in their own section, **before the material and after the barriers** *(done, after the barriers and before the material.)*
- [x] T014 [US2] State the divergence in words past the two-year threshold, and say nothing at one year (FR-905). A sentence that fires on most learners stops being read *(done. Two years, not one: a sentence that fires on most learners stops being read.)*
- [x] T015 [US2] Carry `can` and `studies` into the prompt, labelled as orientation, with the sentence that the teacher's word outranks it (FR-914) *(done, with the caveat where the model reads it rather than only in the corpus file.)*
- [x] T016 [US2] Add the rule to `instructions/adapt.md`: **register to the age, curricular demand to the year.** This is the pedagogical judgement the fields exist for, and it belongs in the corpus (Principle I) *(done. «El registro va por la EDAD, la exigencia curricular por el CURSO», with the concrete instruction rather than only the abstract one — plus two new entries under **Never**.)*
- [x] T017 [US2] Emit no section at all when the fields are absent — never "edad: desconocida", which invites a guess *(done. No fields, no section — never «edad: desconocida», which invites a guess where silence prompts a question.)*
- [ ] T018 [P] [US2] Extend `007`'s output check: the renderer is not handed the new fields and `checkOutput` fails a render containing them (FR-910). Adding profile fields without extending the check is how that guarantee quietly narrows
- [ ] T019 [P] [US1] Write `app/e2e/learner.spec.ts` covering quickstart §6

**Checkpoint**: a divergent learner — fourteen in 5.º de Primaria — produces a prompt that says so.

---

## Phase 4 · US3 — a second system is a file (P2)

- [ ] T020 [US3] Prove it by adding one: a second system file, enough to demonstrate SC-902, and delete it again if it cannot be written honestly. An extension point nobody has used once is a claim
- [ ] T021 [US3] Surface `last_checked` where she picks the system, and mark a stale file rather than withdrawing it — unlike a provider entry, because hiding the only system leaves her unable to create a learner
- [ ] T022 [P] [US3] Add a CI check that an education file's `last_checked` is not older than 400 days

---

## Phase 5 · Polish

- [ ] T023 Record in `specs/006-desktop-app/validation.md` what is verified and what is not — in particular that **the Spanish orientation is unreviewed**, was written by a language model, and carries the same status as backlog G2
- [ ] T024 [P] Update `docs/escenario.md`: Marta says the year once and never types an age
- [ ] T025 [P] Add the education suite to the manual CI workflow
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
