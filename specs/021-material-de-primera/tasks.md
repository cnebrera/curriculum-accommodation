# Tasks: Lo compuesto también es material

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-01

Thirty-four tasks, and the first one is a test about answers reaching a child. The answer
key becomes printable in this feature; the check that it never lands on a learner's page is
written **before** it can.

The shape of the rest is a consequence of Phase 0: **one resolver replaces a constant that
appears in eight places**, and once it exists most of this feature is already built —
`renderHTML`, `renderODT`, the linear renderer, the sign-off and the answer-key renderer
all take an IR and none of them care where it came from.

---

## Phase 1 · Setup · the two tests that come first

- [x] T001 Write `app/packages/core/test/answer-key-never-on-the-sheet.test.ts` **first**,
      red, per [quickstart.md](quickstart.md) §1. **Both sides of SC-1908**: no rendering
      of a learner's material contains an answer — composed and adapted, in HTML, ODT and
      the linear text — and every rendering of the key states that it is the solutions and
      is not to be handed out. Written now because a check added after the feature works is
      a check written to fit what already happens, and this one's failure mode is a page of
      answers in the photocopy pile *(done, red first — 7 cases, both sides.)*
- [x] T002 [P] Write `app/packages/core/test/document.test.ts` **first**, red, from
      quickstart §2: the six resolver cases, including the two kinds of *nothing* —
      «not adapted for this learner» and «no document at all» are different sentences to a
      teacher, and today both produce «Este trabajo todavía no está adaptado» *(done, red first — 9 cases including the structural one.)*

---

## Phase 2 · Foundational · the resolver, before any caller moves

**Blocking**: nothing in Phase 3 or later may start until this phase is green. Eight call
sites construct the same path today; changing them against a resolver that does not exist
yet is eight chances to disagree about what «the document» is.

- [x] T003 `app/packages/core/src/vault/document.ts` · `resolveDocument(vault, job,
      learner?)` returning `ResolvedDocument` per [data-model.md](data-model.md). It
      returns **the case, not just a path**: printing needs the learner, and an adaptation
      gets it from the directory name while a composition gets it from its front matter *(done. It also refuses to hand back a composition written for another learner: printing Lucía's sheet when she asked about Marco would be worse than returning nothing, because it would print.)*
- [x] T004 `startedFor(frontMatter)` in `app/packages/core`, reading `for_learner` first
      and `composed_for` as the older spelling. **`020` T006 specifies the same function**
      — this feature arrives first, so it is implemented here and `020` cites it (research
      R2). Two functions answering «who was this job started for?» is the defect both
      specifications were written to avoid *(done, and **it immediately found a defect nobody predicted**: `record/scan.ts` read `composed_for` directly, so a job stamped with the current spelling **vanished from her record**. Research R2 predicted the two-names failure; it arrived from the other direction, in a reader nobody had thought to update.)*
- [x] T005 [P] A composed job with **no** learner recorded still resolves, renders with the
      default presentation, and says nobody was recorded. Every job composed before
      `020`/`021` is in that state, and refusing them would be this feature's own limbo
      with a newer date on it *(done, and it exposed a real one: with no learner, the code passed to the learner-facts check was an empty string — a substring of everything — so it reported «el código "" aparece en el material» and refused to render a perfectly good sheet. A guard that fires on everything is a guard that gets switched off.)*
- [x] T006 Assert the structural rule: **no path to `adapted.md` is constructed anywhere
      except the resolver and the writers.** A source-level check, because eight call sites
      is exactly how a constant creeps back *(done. Two readers are allowed **with their reason written**: `jobs/adapt.ts` reads the adaptation it is about to replace, and `jobs/stale.ts` asks a question that is about adaptations by definition (`005` FR-520).)*

**Checkpoint**: T001 and T002 green, and the offline suite still passing with no caller
changed.

---

## Phase 3 · User Story 1 · Seeing and printing what she just made (P1) 🎯 MVP

**Goal**: composed material can be read, printed, exported and signed — with no adaptation
run and no provider called.

**Independent Test**: compose material, then view, print, export and sign it, and open the
answer key, without running an adaptation.

- [x] T007 [US1] `packages/shell/src/jobs/print.ts` reads the resolved document. **The
      draft mark stays derived from the document** (`007` FR-509) — it was a parameter
      once, defaulting to false, so `job.render(job, learner, true)` produced an unmarked
      worksheet with no sign-off having happened. Routing through a resolver must not
      reintroduce that *(done, and the draft mark is still derived from the document — it was a parameter once, defaulting to false.)*
- [x] T008 [P] [US1] `packages/shell/src/jobs/linear.ts` — audio-ready and braille-ready
      over a composed document (FR-1902) *(done — audio-ready and braille-ready over a composition.)*
- [x] T009 [P] [US1] ODT over a composed document (FR-1902) *(done.)*
- [x] T010 [US1] `packages/shell/src/ipc/signoff.ts` signs the resolved document. A
      signature is about **a document** (Principle VII), so a signed composition adapted
      for three learners produces three **unsigned** sheets — nobody has read those *(done, and the e2e asserts the signature does **not** travel: signing a composition and then adapting it produces an unsigned sheet, because nobody has read that one.)*
- [x] T011 [P] [US1] `job:reportData` and `job:openForEditing` over the resolved document *(done.)*
- [x] T012 [US1] Where there is no document, say **which kind of nothing** it is (FR-1902,
      data-model): «no la has adaptado para este alumno» and «este trabajo no tiene
      documento» are different sentences, and the second was being told to her for
      composed material, wrongly *(done. `whyNoDocument` lives beside the resolver so the two sentences cannot drift back into one — which is what had happened: eight places said «todavía no está adaptado», including about material that needed no adaptation.)*
- [x] T013 [US1] The answer key renders to **its own file**, never sharing one with the
      sheet (FR-1921), with a heading that cannot be misread as a learner's page —
      «SOLUCIONES · NO REPARTIR» (FR-1922). T001 is already asserting both *(done. `ANSWER_KEY_HEADING` is one shared constant read by every renderer of the key, and `renderAnswerKeyHTML` is deliberately **not** `renderHTML`: the key is a page for an adult, needs no accommodations, and is not a draft of anything.)*
- [x] T014 [US1] `ui/src/viewer/` · the document, read-only, as **the printer's own HTML**
      in a frame with no script permission, no navigation, no form submission and no remote
      reference (FR-1905, FR-1924). `renderHTML` emits no `<script>` — checked, zero — so
      the sandbox is the guarantee for what the **document** may contain, which is
      Principle IX *(done. `seal()` is its own module so the e2e exercises **the real policy** rather than a copy — a duplicated CSP in a test is a test that passes while the viewer drifts. Sandbox with no permissions, `srcDoc` not `src`, and a CSP that denies every remote fetch so a planted `<img src="http://…">` cannot turn opening a sheet into a signal that a teacher opened it.)*
- [x] T015 [P] [US1] The three buttons from where she is standing when they are written:
      the sheet, the answer key, the composition report (FR-1903). Today they exist only in
      the record screen *(done, in the compose summary — where she is standing when the three documents are written.)*
- [x] T016 [US1] `app/e2e/composed.spec.ts` from quickstart §4 — including the viewer over
      a document containing a `<script>`, an `onclick`, an external image and a link:
      nothing runs, nothing loads, nothing navigates *(done, `e2e/composed.spec.ts`, 7 cases. The last one plants a script, an inline handler, a remote image and a link in a composed document and confirms none of it runs.)*
- [x] T017 [P] [US1] Assert `axe` finds nothing on the viewer, at the narrowest width and
      at the largest text scale *(done, and extended to the learner's four sections — `020` moved most of the application off the rail's top level, so the old scan was missing most of it. It found a real contrast failure I had introduced: the learner's code in `--ink-faint` on the rail's ground, at 13px. `--ink-faint` is rated on paper and on `--surface-2`, and the rail is darker than both.)*

**Checkpoint**: the complaint is answered — a composed sheet can be read and printed.

---

## Phase 4 · User Story 2 · Saying what kind of material she wants (P2)

**Goal**: she chooses the kind when asking for material from objectives, exams included,
and an exam arrives with its limits on it.

**Independent Test**: ask for each of the four kinds, get material of that kind, and find
the exam's four limits on the document itself.

- [x] T018 [US2] The compose flow asks what kind of material it is, **nothing pre-selected**
      (FR-1907), read from `instructions/material-kinds.md` (FR-1908). A second hard-coded
      list of four is how the corpus stops being the authority (Principle I) *(done, read from the corpus and nothing pre-selected. The four controls are the same shape as the door's, because it is the same kind of question.)*
- [x] T019 [US2] `ComposeRequest` carries the kind, and `runCompose` uses it instead of
      deriving it. The derivation becomes the **fallback** for material composed before
      this feature *(done. The local was renamed `chosenKind` after it shadowed the imported `materialKind` lookup and made the call site read as a string being invoked — fifth name collision here, and the first inside a single file.)*
- [x] T020 [US2] The kind she asked for is what is recorded (FR-1923), and where what came
      out does not match, **the report says so** (FR-1910). Relabelling to fit the request
      falsifies the *what*; relabelling to fit the content takes a decision that is hers *(done, and the sentence uses the **corpus labels** for both kinds. A `KIND_ES` map in the shell would have been a second copy of `material-kinds.md`, which is the defect this project has found more than any other.)*
- [x] T021 [US2] The chosen kind is the word every screen uses from then on (FR-1909,
      `016` FR-1402/1404) *(done.)*
- [x] T022 [US2] **The exam's limits, on the document and not only on the screen** — a
      printed page outlives the screen it was made on: the draft mark plus «tú validas cada
      pregunta» (FR-1911), and that a different assessment for one learner is the teaching
      team's decision (FR-1912) *(done, and the sentences live in the corpus as `composing.on_document` — a new field, because adapting an exam and writing one are different acts. Printed as a `note` block, not `report-notes`: they have to be on the paper, since whoever picks it up next did not see the warning she saw.)*
- [x] T023 [US2] Assert the two absences, across every rendering of every kind: **no mark
      scheme, weighting or pass mark** (FR-1913) and **no marking of a learner's answers**
      (FR-1914). Absences are the only shape a limit like this can be tested in *(done, `no-grade-ever.test.ts`, 22 cases — **and the first version was wrong in a way worth keeping**: it grepped the corpus prose for «2 puntos» and found three files, all of which were the prohibition itself, plus `guide.md` quoting «tipografía de 14 puntos», a font size. Scanning the text of a rule for what the rule forbids will always find the rule. It now checks the deterministic output and the presence of the prohibition in the prompt.)*
- [x] T024 [US2] A composed exam's answer key is verified by the same deterministic checks
      as any composed material, and whatever could not be verified is named **before** she
      can print it (FR-1915) *(inherited, and verified: the key is computed by the same verifiers whatever the kind, and `002` FR-125 already names what nothing could check **before** the summary she reads.)*
- [x] T025 [P] [US2] `app/e2e/compose-kind.spec.ts` from quickstart §5, including asking
      for an exam and getting bare arithmetic

**Checkpoint**: «solo me ha dicho de preparar fichas» is no longer true.

---

## Phase 4b · How much material, in the units of the kind (added 2026-09-01)

Carlos, using US2 the hour it shipped: «si voy a preparar material de estudio, no tiene
sentido que me pregunte número de ejercicios… tendría sentido que me preguntara cuánto
tiempo de estudio o algo así». Correct, and the fix he proposed is better than the one I
offered: **sessions *and* minutes per session**, not one of them.

Both are facts she holds with certainty — her timetable. What Rampa estimates is how much
material fits, and FR-1928 makes it say so.

- [ ] T035 `instructions/material-kinds.md` · each kind declares what to ask about
      quantity and in what words (FR-1925). Corpus, so changing a kind's question is a
      Markdown edit — the same reason `composing` went there
- [ ] T036 [P] The kind with nothing to count declares exactly that, and the screen asks
      no quantity at all for it (FR-1925, FR-1927)
- [ ] T037 `ComposeRequest` carries `sessions` **and** `minutesPerSession`, and the screen
      asks both for every kind (FR-1926). **`sessions` has existed since `002` FR-130 and
      no screen ever asked for it** — always `undefined`, letter held, spirit not
- [ ] T038 [P] Where material is sized from a time, the report says it is an **estimate**
      (FR-1928). «Nobody knows how long this child takes over a page» is the honest
      sentence, and it belongs where she reads what happened
- [ ] T039 [P] What she said reaches the material and is available to `017`'s
      temporalización (FR-1929) — one answer, used twice
- [ ] T040 Assert per kind that the screen asks the right question and **no other**
      (SC-1909), over the rendered interface: this is a claim about what she is asked,
      which a unit test cannot see

---

## Phase 5 · User Story 3 · Correcting composed material without adapting (P3)

**Goal**: the correction box she already knows, reaching composed material.

**Independent Test**: compose, correct, get a second version with the first kept and the
answer key re-verified.
 *(done, `e2e/compose-kind.spec.ts`, 4 cases. It found that `composing.before` never crossed to the renderer — **eleventh** field written, parsed, typed and read by nobody in this project, and this one was the sentence telling a PT what asking a model for an exam means. Closed by a guard in `corpus-guarantees.test.ts`.)*
- [x] T026 [US3] A **separate operation** from `job:revise` that re-runs the composition
      with her correction (research R3). `job:revise` runs `runAdaptation`; pointing it at
      a composed job would ask a model to *adapt* the sheet — the wrong kind of document,
      and `answers.md` left describing exercises that no longer exist *(done, `correctComposition` with its own channel. `jobs/compose.ts` reaches for `runAdaptation` nowhere, asserted — that absence **is** research R3's finding.)*
- [x] T027 [US3] The answer key is regenerated **and re-verified** in the same step
      whenever a quantity or an operation changed, before she is shown anything (FR-1919).
      A stale key is worse than none: she marks against it *(done, and structurally rather than by remembering: it re-runs `runCompose`, which is the one path that writes the key. There is no second place where a correction could update the sheet and forget the answers.)*
- [x] T028 [US3] The scope question is asked exactly as it is after an adaptation, and
      nothing infers it (FR-1917, Principle VIII) *(done — the same box and the same scope question she gets after an adaptation, because she is answering the same question about her own practice either way.)*
- [x] T029 [P] [US3] Previous versions are kept (FR-1918), and a signature does not survive
      a correction (FR-1920)

---

## Phase 6 · Polish · and the parts that need a person
 *(done. Previous versions kept as `ir.rN.md`. And the signature dies **structurally**: it lives in the document's own front matter and a correction writes a new document from `buildSheet`, which has none — so there is nothing to clear and nothing to forget. Asserted, so a future «carry the review block across» has to argue with a test.)*
- [ ] T030 **Look at it** (`013` FR-1113/FR-1118): the viewer narrow and at `xlarge`; a
      composed exam's first page, to judge whether «borrador» reads clearly enough when the
      page is a test; and the answer key's heading — whether it is unmissable at a glance
      in a pile of paper, which no assertion can answer
- [ ] T031 [P] Run quickstart §7 with a real key: compose, correct, and confirm the key was
      regenerated and re-verified and the signature is gone
- [x] T032 [P] Assert nothing in this feature starts an adaptation or calls a model
      (FR-1906) — viewing, printing, exporting and signing are deterministic, and only a
      correction spends money *(done — asserted as an absence in `correct-composition.test.ts` and `document.test.ts`: viewing, printing, exporting and signing reach no provider, and only a correction spends money.)*
- [ ] T033 **SC-1906 needs a teacher**: give her a composed exam with no preamble and ask
      whether she would use it. The most consequential thing this feature produces, and the
      only criterion that can come back «no» with everything else green. «Why not» is worth
      more than the answer
- [x] T034 Archive it: this coverage table kept current, `020` T006 updated to cite T004
      rather than create it, and a `specs/BACKLOG.md` entry for anything found on the way *(done. `020` T006 now cites T004 rather than creating it — and shrank to «write the field», because the reader already exists. Backlog **G25** records the eleventh unread field and, more usefully, **why the three existing detectors were all blind to it**: it was dropped at the IPC boundary, one layer before it could become a prop.)*

---

## Not in scope, recorded so it stays a decision

- **The conversation** — `022`. Iterating by talking needs its own thinking about cost per
  turn, versioning, and what happens to a verified answer key when the exercises change
  underneath it.
- **Editing inside Rampa.** The viewer is read-only: the vault is hers and a second editor
  would be a second place for a document to diverge.
- **Marking, scoring or grading.** FR-1913/FR-1914, and not a scope question — deciding
  what a child's answer is worth is not a thing this application does.

## Dependencies

- T001 and T002 before everything.
- **Phase 2 blocks Phases 3–6 entirely.** T003 before T007–T012.
- T004 before T003's composed branch — the resolver reads the front matter through it.
- T013 after T001, and T001 must be red first.
- T018 before T019, T019 before T020/T021.
- **T022, T023 and T024 land with US2, not after it.** `002`'s own history: FR-126 shipped
  a composed sheet with no kind rule governing it because the kind was set before anyone
  asked what it was for. An exam composable before its limits exist is that mistake with a
  worse outcome.
- T026 before T027.
- **SC-1906 needs a teacher and is not a task in the buildable sense** — T033 is the
  arrangement, not the verdict.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here. Written
**with** the tasks, per the lesson `002` taught on 2026-08-31.

| | Where it is satisfied |
|---|---|
| FR-1901 | T003 (the resolver) · T007–T011 (the callers) · T026 (correcting) |
| FR-1902 | T008, T009 · T012 names the specific reason when there is none. «It is not adapted» is not one |
| FR-1903 | T015 |
| FR-1904 | T007 (derived, through the resolver) · T010 (signing a composition) |
| FR-1905 | T014 |
| FR-1906 | T032 · asserted as an absence |
| FR-1907 | T018 |
| FR-1908 | T018 · read from the corpus, not a second list |
| FR-1909 | T021 |
| FR-1910 | T020 |
| FR-1911 | T022 · on the document, not only on the screen |
| FR-1912 | T022 |
| FR-1913 | T023 · an absence, across every rendering of every kind |
| FR-1914 | T023 · idem |
| FR-1915 | T024 |
| FR-1916 | T026 |
| FR-1917 | T028 |
| FR-1918 | T029 |
| FR-1919 | T027 |
| FR-1920 | T029 |
| FR-1925 | T035, T036 |
| FR-1926 | T037 |
| FR-1927 | T036 |
| FR-1928 | T038 |
| FR-1929 | T039 |
| FR-1921 | T013 · its own file, asserted by T001 |
| FR-1922 | T013 · the heading, asserted by T001 |
| FR-1923 | T020 |
| FR-1924 | T014 · the sandbox, and T016 exercises it with a document that tries |
