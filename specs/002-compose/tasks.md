# Tasks: Compose — generate material from learning objectives

**Prerequisites**: plan.md, research.md, contracts/, and **`001` SC-001 answered**

**Tests**: Included, and the verifier is most of them. This is the only feature in
the project with no original to compare against, so what replaces
`checkCompleteness` has to be worth the substitution.

---

## Phase 0 · Not before this

- [x] T000 **Do not start until a teacher has answered `001` SC-001.** Not a
      formality: if she does not find an adapted worksheet usable, composing new
      ones is not the next problem. Recorded as a task so it is a decision rather
      than a drift

      **OVERRIDDEN 2026-08-31 by Carlos, explicitly and with the reason stated:**
      «lo sé, sé que nadie lo ha visto, pero montemos todo y luego ya vamos
      probando e iterando flujo a flujo.»

      I raised this gate, he reaffirmed the direction, and it is his call to make.
      Recorded as an override rather than a tick, because the risk it names does
      not go away by being accepted:

      - Every part of `002` assumes an answer nobody has. The verifier, the anchor
        requirement and the compose loop are all real work built on «adaptation
        produces something a teacher uses».
      - If the answer turns out to be no, the wasted work is this whole
        specification and not a screen.
      - The mitigation that comes with the decision is his own words: **flow by
        flow**. So the sequencing below still puts the verifier first and alone,
        because it is the part that would survive a pivot — an arithmetic checker
        is right or wrong independently of whether anybody wants composed
        material.

      What has **not** changed: SC-101…104 still need a teacher, and none of them
      is satisfied by this being built.

---

## Phase 1 · The verifier, first and alone

- [x] T001 Define the verifier contract in `app/packages/core/src/compose/verify/types.ts`: `exercises(skill, exercise)`, `solve(exercise)`, and an explicit `unknown` that is honest rather than a guess *(done: `packages/core/src/compose/verify/types.ts`. `unknown` is a first-class verdict — a verifier that guesses is worse than none, because not guessing is the entire point of this branch. Named `SkillVerdict`: `ingest/validate.ts` already owns `Verdict`, and the compiler caught the collision.)*
- [x] T002 Implement the arithmetic verifier: four operations, **carrying and borrowing as constraints rather than topics**, fractions, decimals, percentages *(done: `arithmetic.ts`. Exact arithmetic on scaled BigInts, never floats — `0.1 + 0.2` is `0.30000000000000004` in IEEE 754, and a verifier that rejected a model's correct `0.3` would reject every correct exercise and exhaust the retry budget into «no he podido generar nada».)*
- [x] T003 Implement `exercises()` for carrying: `47 × 8` carries, `4 × 2` does not, and an exercise that does not is rejected (FR-124) *(done, column by column as a child does it — not «is the result over ten», which would accept `10 + 5`. And carrying in a subtraction returns **unknown** rather than `false`: the concept does not apply, and answering `false` would report «no practica llevadas» about an exercise where the question is meaningless.)*
- [x] T004 Write `app/packages/core/test/verify-arithmetic.test.ts` — including the case the whole feature turns on: **a model-proposed exercise with a wrong answer is rejected, not corrected** *(done: 32 cases. The one the feature turns on — a wrong stated answer is thrown away and not corrected — plus the three rejections that keep «con llevadas» meaning something.)*
- [x] T005 [P] Assert the verifier is model-free and offline, in the isolation suite *(done, and it needed no change: `isolation.test.ts` already walks all of `packages/core/src`, so the verifier was covered the moment it existed. The local half is asserted too — the module imports exactly `./types.js` and nothing that could reach a model or a network.)*

**Checkpoint**: code can decide, for a set of exercises, which exercise carrying and which of the answers are right. No model involved anywhere.

---

## Phase 2 · Foundational

- [x] T006 Objectives and skills in `app/packages/core/src/compose/`: a skill parsed as a constraint, not a topic *(done: `packages/core/src/compose/objectives.ts`. A skill is a constraint, not a topic — and **a negated constraint is not the absence of one**: «sin llevadas» is a request for the easier case on purpose, and reading it as «no constraint» hands her exercises that carry, on the sheet for the child not ready for it. When in doubt it falls to `content`, because that path asks a human.)*
- [x] T007 The generated-IR contract: `kind: generated`, `data-objective` per block, the anchor in front matter *(done: `packages/core/src/compose/generated.ts`. `kind: generated`, the anchor in front matter, `data-objective` per block.)*
- [x] T008 Extend the provenance check: a generated block tracing to no objective fails the render, exactly as an unaccounted block does (`007` FR-512) *(done, and it closed a real hole. `checkProvenance` exempts any block carrying `data-objective` — correctly, since generated material keys to an objective rather than to a source block — but it exempted it for the attribute **existing**, so `data-objective="algo"` passed every check in the pipeline. That is an unaccounted block with the source removed, and worse than the adapted kind: adapted material has an original to compare against. The objectives are now checked against **her** list, and the check cannot mark its own homework — passing the document's own front matter would let a model add an objective and then satisfy it.)*
- [x] T009 Author `instructions/compose.md`: what a good exercise for an objective looks like. The judgement, in the corpus *(done. `instructions/compose.md` already covered the anchor, the level line and the IR contract; what it lacked was **what a good exercise looks like** — including that the model states its answer only so the code can compare it, and that a mismatch throws the exercise away rather than correcting it.)*
- [x] T010 [P] Wire `011`'s education corpus as the level source (FR-122) — never the model's own sense of what a ten-year-old handles *(done, and it needed a corpus addition: `can` and `studies` are prose for the model, and FR-122 needs bounds for **code**. `instructions/education/es.md` now carries an optional `skills:` block per year — and a year without one is still valid, with what happens then written down rather than guessed: nothing is constrained and the report says the level was not checked.)*

---

## Phase 3 · US5 — skill practice, with the arithmetic checked (P1) 🎯 MVP

**Goal**: «Que aprenda a multiplicar con llevadas» produces a worksheet at the right level whose answers are computed, not claimed.

**Independent test**: Ask for it for a 10-year-old. Every exercise carries, every answer is verified, and a seeded wrong answer is refused before she sees it.

- [x] T011 [US5] The compose loop in `app/packages/shell/src/jobs/compose.ts`: model proposes, **code verifies**, rejections are retried inside a corpus-owned bound, and exhaustion surfaces to her rather than shipping *(done: `packages/core/src/compose/loop.ts`, with `propose` passed in so the loop's own behaviour is testable with no provider — the same decision `005`'s `runBatch` made. **Exhaustion surfaces and never ships**: a budget that ran out and delivered what it had would deliver the rejected exercises, which is the one outcome this branch exists to prevent. A shared proposal budget rather than a per-exercise retry count, because the failures cluster — a model that has misunderstood «con llevadas» produces twenty bad exercises, not one bad and nineteen good.)*
- [x] T012 [US5] The level from `011`: digits, one or two, whether decimals are in scope for that year *(done: `packages/core/src/compose/level.ts`. The join is where the requirement lives — four things can go wrong between «multiplicar con llevadas» and «hasta 3 cifras, sin decimales», and every one of them has the same tempting recovery: a sensible default. There is none. A sheet of four-digit multiplications for a third-year **looks exactly like** a sheet of multiplications, so «no lo he comprobado» is a first-class outcome with five distinct reasons, each naming what she can do about it. And the year comes from the profile, never from the objective's wording — «para un niño de sexto» in the text changes nothing, because a level that can be talked into existence by an objective is one a model can talk into existence too.)*
- [x] T013 [US5] The presentation from the learner's profile, reusing the adaptation machinery unchanged — this is the part that already exists *(done, and it is reuse rather than a second pipeline: `runCompose` writes an ordinary `ir.md` and `runAdaptation` takes it unchanged. One composition, N presentations (Principle IV). The one change needed was the extraction gate: composed material has no extraction to verify, and the alternative was writing `extraction: { verified: true }` into a document that never had one — a true-looking field asserting something that did not happen. What composed material needs is a **content** review, which is T016 and T020, not this gate.)*
- [x] T014 [US5] The answer key, computed, on a sheet **for her** and never on the child's *(done: `answers.md`, a separate file. Not an attribute, not a hidden block, not a `data-answer` the renderer is trusted to strip — an answer that exists anywhere in the child's document is one bug away from being on his sheet, and the bug would be invisible: a worksheet with the answers in its markup looks exactly like a worksheet. Keyed to the **expression** as well as the number, because a recipe can renumber and a key that has slid by one is worse than no key at all. This also closed a real hole one level down — see the note under T008's shape in the commit.)*
- [x] T015 [US5] The report: which objective each block serves, and that the content was generated *(done: `packages/core/src/report/compose.ts`, a separate report rather than a section of `buildReport` — every line of that one lives under «Qué he cambiado y por qué», which is false for all of this. **What nobody checked comes before what code did**: a report opening with «las cuentas están comprobadas» has told her the reassuring half first, and that is the half she already assumed.)*
- [x] T016 [P] [US5] The draft mark says more here: generated material has had no human eyes on its **content**, not merely on its adaptation *(done: `packages/core/src/render/draft.ts`, read by both renderers so they cannot disagree. Composed material says «CONTENIDO GENERADO, SIN REVISAR · revisa el contenido, no sólo la adaptación», because a teacher who reads the ordinary banner performs the ordinary review — checking the adaptation — and that review passes.)*

**Checkpoint**: Carlos's own example runs end to end, and a seeded wrong answer never reaches the sheet. *(Code-complete: `packages/shell/src/jobs/compose.ts` composes, verifies, writes the three documents and hands the sheet to `runAdaptation`. **Not yet run against a real provider** — there is no screen to start it from until `016`, and the loop, the parser, the level, the sheet, the key, the report and the draft mark are each tested offline.)*

---

## Phase 4 · US1/US2 — content, with an anchor (P1)

- [x] T017 [US1] Require an approved anchor for content composition, and **refuse without one** — unchanged from the spec, and it was right *(done: `assertAnchor` in `packages/core/src/compose/anchor.ts`, and it fires **before the provider is resolved** — nothing is sent and nothing is charged. The message asks for the least she can give rather than for a source: a teacher with nothing to hand abandons a screen that demands a document, and will type three sentences.)*
- [x] T018 [US1] Run the injection and hidden-text detectors over the anchor: it is material, and material is data (Principle IX) *(done, and it needed a detector that did not exist. `detectHidden` needs spans from the extraction layer — font size, colour, position — which only exist for a file we read. An anchor she **pastes** has none, and the analogue there is text invisible by encoding rather than by styling: zero-width joiners, bidi overrides, soft hyphens, tag characters. `detectInvisible` reports them, quoting the **visible** neighbourhood — quoting an invisible character shows her empty quotes, which reads as a bug in Rampa rather than as something in her text. Reported, never stripped: one of them may be legitimate typesetting, and removing them silently would change her text and hide the event.)*
- [x] T019 [US2] Trace each generated block to the anchor passage it rests on *(done: passages get **our** ids (`a1`, `a2`), each block carries `data-anchor`, and `checkAnchored` refuses both the block that cites nothing and the block that cites a passage she never gave. Exercises are exempt — `47 × 8` asserts nothing that could be false — and so are scaffolding and the report notes. The sheet also rewrites what the model sent: our id, and only the two attributes that trace it, because left alone a model could add `data-recipe` and `data-axis` and the report would show an adaptation decision no recipe ever made.)*
      **Corrección 2026-09-04 (AGE-04/AGE-07, ítem 2.12 de la cola).** Los dos checks de
      T018/T019 estaban bien y su red era más fina de lo que parecía, por dos motivos que no
      son de este task pero se apoyaban en él:
      - **El system era el de aritmética.** `composeContent` recibía `systemPrompt()`, que
        termina en «devuelve únicamente una línea por ejercicio… sin texto alrededor», mientras
        su mensaje de usuario pedía bloques IR. Dos formatos contradictorios en la misma
        llamada: los dos intentos fallaban, ella pagaba dos llamadas de 4.000 tokens y el
        error la mandaba a arreglar su ancla («se apoyaba en cosas que no me diste»), que no
        era el fallo. Ahora el camino de contenido tiene su propio system —
        `contentSystemPrompt()` — que comparte la capa de juicio (hard-rules + `compose.md`,
        Principio I) y **no** el formato de salida, y el error final distingue el corte del
        anclaje.
      - **Un truncado pasaba los dos checks.** Ningún proveedor leía `stop_reason`, así que un
        texto cortado a los 4.000 tokens llegaba con la misma pinta que uno terminado: un corte
        *dentro* del desarrollo de un objetivo deja bloques con su `data-objective` y su
        `data-anchor` válidos, y `checkObjectives` no comprueba que cada objetivo pedido tenga
        bloques. Es exactamente el fallo propio del tipo `study` — «enseñar menos sin que se
        note» — generado por nosotros. Los tres adaptadores emiten ahora `truncated`, el camino
        de contenido lo trata como problema (reintenta una vez y si vuelve a cortarse no
        escribe nada) y le dice que pida menos de una vez. 15 casos nuevos; 5 costuras
        verificadas por mutación.
      En el camino de aritmética el corte se queda sin red **a propósito**: una línea perdida
      es una propuesta menos, el bucle vuelve a pedir y `budgetExhausted` ya se lo cuenta.
- [x] T020 [US2] The review checklist leads with **content** verification and says the effort is higher than for an adaptation *(done: `checklists/review.md` gains a **section 0**, before section 1, and asserted by `checklist-generated.test.ts` over the shipped file. The requirement was never «a section about generated material exists» — it existed, as section 6 of 9, behind four sections that assume there was an original. A teacher working down the list in order reached it having already ticked «fidelidad de la lectura» about a document that was never read from anything. Section 0 names the two sections that do not apply, so a tick is not a false comfort, and separates «que la cita exista lo comprueba el programa» from «que diga lo que el bloque afirma, no».)*

---

## Phase 5 · Where nothing can be checked

- [x] T021 Say it plainly (FR-125): for a skill with no verifier, this produces **a draft for a professional to verify**, not material to hand out. In those words, in her language, on the screen where she gets it *(done: `packages/core/src/compose/unverifiable.ts` owns the sentence, and every surface imports it rather than writing its own version — it is the sentence most likely to be softened. It **composes anyway**: refusing would be tidier and wrong, because a draft she edits in ten minutes is worth having. What must not happen is her believing it was checked, so the difference is visible on every surface — a separate group, `data-unverified` on the blocks, `unverified_objectives` in the front matter, **no answer of theirs in the key**, and the sentence leading the report rather than appearing in it. Deliberately not the compose loop: that loop is propose → verify → retry, and there is nothing to retry *for* when nobody is measuring.)*
- [x] T022 Record in `specs/006-desktop-app/validation.md` which skills have verifiers and which do not, and that the second list is the honest limit of this feature *(done, in `specs/006-desktop-app/validation.md`, with the second table longer than the first and said to be the honest limit rather than a gap to close — a verifier for comprehension would be a model, and a model that marks its own work is what this branch exists to avoid. And writing it down **found a defect**: `handles` was `startsWith('arith.')`, so `arith.percent` was claimed, reached an operation table with no entry for it, and came back `unknown` for every proposal — spending the whole budget, charging her, and ending with «no he podido comprobar los que proponía». `verifier-inventory.test.ts` now fails if the code and the record drift apart.)*

---

## Phase 6 · The requirements the spec grew after these tasks were written

> **The flow was broken here, by me.** FR-127…FR-131 were added to
> [spec.md](spec.md) on 2026-08-30 from the SDA-IA analysis, **after** this file
> existed, and `/speckit-tasks` was never re-run. They sat uncited and unbuilt for a
> day, and one of them was a live defect.
>
> Found on 2026-08-31 by `scripts/check-fr-coverage.sh`, which exists because of this
> and did not exist before it. `check-spec-kit.sh` could not have caught it: it
> catches a spec and its implementation arriving in one commit, and a spec that
> **grows** while its tasks stand still is two commits that both look fine.

- [x] T024 [P] FR-126 · generated material carries a **material kind** and is bound by
      its prohibitions from the first revision *(**this was the live defect.** The front
      matter carried `kind: 'generated'`, so `materialKind('generated')` resolved to
      `null` and a composed sheet reached `runAdaptation` with **no kind rule governing
      it** — the exact failure `012` exists to prevent, arriving through a door nobody
      was watching. Two facts were sharing one field and the one that lost was `012`'s.
      `kind` now holds one of the four, derived from what was composed and never
      defaulted; `generated: true` carries the other fact; and `isGenerated` still
      accepts the old spelling, because a vault written before today has documents in
      it.)*
- [x] T025 [P] FR-127/FR-128 · an official criterio de evaluación is admissible as the
      anchor, recorded with its code, and **cited in the report** *(done: `criterioIn`
      recognises `CE.3.4` and `CE.MAT.2.1` and nothing looser — a pattern that found
      codes in ordinary prose would cite an invented one on a document that goes to an
      administration. **Rampa ships no criteria database and validates nothing**: it
      carries what she pasted, and the report says so, because a code Rampa invented or
      «corrected» would be worse than none.)*
- [x] T026 [P] FR-129 · the target curricular level is an **input**, from her or from
      the overlay, never the application's judgement about the child *(done, and it was
      a real gap: the level came from `profile.year`, his **enrolled** course. For a
      learner with a two-year desfase that is the wrong level, and it was being used
      silently. Now: her choice, then a year her overlay states, then the enrolled
      course — and the report names which, because «composing at a stated level is a
      different act from quietly lowering someone else's worksheet, and the difference
      is who decided». The enrolled fallback says **«nadie lo ha elegido»** and asks.)*
- [x] T027 [P] FR-130 · material records how many **sessions** it is for *(done, and
      recorded rather than acted on. Nothing organises around a session — this is her
      unit written where it belongs, so `017`'s temporalización can say «tres sesiones»
      instead of only «del 3 de marzo al 12 de junio».)*
- [ ] T028 FR-131 · objectives choosable from a **PT/AL objective corpus** (`011`)
      rather than typed **— needs a person.** The corpus does not exist, and nobody
      here can write one: an objective corpus for PT and AL work is the same class of
      artefact as `instructions/education/es.md`, which carries
      `reviewed_by_teacher: false` for exactly this reason. Writing a plausible one
      would put a list of «what a teacher is allowed to want» in front of her, invented
      by a language model. FR-101's free text stays either way, which is what makes
      this an addition rather than a blocker

---

## Coverage · every requirement, and where it is

Not a formality. `check-fr-coverage.sh` fails if a requirement in the spec appears
nowhere here, and the reason is the one above: **a requirement nobody can point at is
a requirement nobody is keeping.**

| | Where it is satisfied |
|---|---|
| FR-101 | `readObjectives` — free text, one per line. Official criteria via FR-127 |
| FR-102 | `assertAnchor`, and it fires before the provider is resolved (T017) |
| FR-103 | **Letter changed, intent kept.** It said «MUST carry `kind: generated`», which FR-126 then needed for the material kind. `generated: true` carries the fact and `isGenerated` still accepts the old spelling. Recorded as a conflict resolved rather than a requirement met |
| FR-104 | `checkObjectives` / `assertObjectives` (T007/T008) |
| FR-105 | `buildComposeReport`'s `unchecked`, rendered **first** (T015) |
| FR-106 | By construction: `runCompose` writes an ordinary `ir.md` and `runAdaptation` takes it unchanged. The one change needed was the extraction gate (T013) |
| FR-107 | `checklists/review.md` section 0 and section 6 (T020) |
| FR-108 | **Corpus, not code.** `instructions/compose.md` tells the model to flag and stop where an objective is not achievable. Nothing enforces it, and that is deliberate: «achievable at this learner's level» is a professional judgement, and FR-129's target level plus the shortfall report are what put it in front of her |
| FR-121 | `readObjective` — the content/skill branch (T006) |
| FR-122 | `compose/level.ts` (T012) |
| FR-123 | `arithmetic.solve` + `verify` — rejected, never corrected (T002-T004) |
| FR-124 | `arithmetic.exercises` — `21 × 3` refused for «con llevadas» (T003) |
| FR-125 | `compose/unverifiable.ts` (T021) |
| FR-126 | T024 above |
| FR-127, FR-128 | T025 above |
| FR-129 | T026 above |
| FR-130 | T027 above |
| FR-131 | T028 above — **not done, needs a person** |

## Dependencies

- **T000 blocked everything and was overridden** on 2026-08-31 (see above). It
  is still the case that SC-101…104 need a person.
- Phase 1 blocks Phase 3. The verifier exists before anything generates.
- `011` blocks T010 and T012.
- `012` blocks T007 — generated material carries a kind.

## Implementation strategy

**Verifier first, alone, before anything can generate.** Building the generator
first means the verifier arrives to a working demo and gets scoped down to fit it,
which is how a check becomes a warning.

**Skill practice before content**, reversing the spec's own order: it is the more
common request, it is what Carlos described, and it is the one with a real
structural defence. The first composed material a teacher sees should be the kind
we can actually check.

**Do not let T021 become a tooltip.** "This is a draft for you to verify" is the
entire honest position on the unverifiable half, and it is the sentence most likely
to be softened into something reassuring.
