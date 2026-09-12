# Specification backlog

Gaps found in the audit of 2026-08-27, before planning Phase 0. Recorded so they
are decisions rather than omissions.

Nothing here blocks Phase 0 validation.

> **Status 2026-08-30.** Worked through end to end. **G3** (several learners, one
> worksheet) had been open since the first audit, rated High, and its data-model
> foundation landed on 2026-08-28 — the flow on top of it was never written and
> `016` FR-1406 had started assuming it existed. Now `005-group`. **G8** and the
> `MOT` half of **G19** are `019-modalidades`; the pictogram half is
> `018-pictogramas`, where the ARASAAC licence turned out to decide the whole
> architecture. **G18** went into `001`, which owns provenance.
>
> Two defects in this file itself, found only by working through it: **two
> different gaps were both filed as G16** (corpus families, and the unreviewed
> Spanish education file) — the corpus one is now G19. And `015` cited `005` as
> though it were the axes specification; `005` was reserved for the group flow all
> along.
>
> Still open and deliberately: **G15** (a documentation change, not a feature),
> **G16** and **G2** (both closed only when a practising teacher disagrees with
> something specific), **G14** (awaiting a DPO), **G17** (a non-goal on purpose),
> and the `PER-A`/`REG` corpus families, which are recipes rather than a spec.

**Status 2026-08-28:** the vehicle is decided *and* it is the only one — the
harness is removed (ADR 0006). The desktop application over an open vault is
specified in `006-desktop-app`. That closes or specifies G9, G10, G11 and G13, and
G6 (agent compatibility matrix) is **closed as moot**: there is no longer a claim
of agent-agnosticism to test, only a provider adapter surface. G12 is now specified in `007-untrusted-content` and in Principle IX. The
remaining open items are G3 (several learners, one worksheet — its data-model
foundation landed 2026-08-28 as T092b; the flow itself needs spec 005) and G15
(guardrails are norms, not controls — though `007` converts several of them into
actual controls). G14 is drafted (`docs/proteccion-de-datos.md`), awaiting a
practising DPO's review — the same closure rule as G2: not closed until someone
whose job this is has disagreed with something.

G9-G15 were added by an adversarial pass from the
teacher's point of view (`docs/adoption-risks.md`). Three of them are more
serious than anything found before: nobody in the target audience can install
this, the privacy claim is not enforceable in the current design, and the
pipeline reads attacker-controllable content with no defence specified.

G1, G4, G5 and G7 are closed. G2 is drafted and waiting on
review by a practising teacher — it is not closed until someone who teaches has
disagreed with it. G3 remains open; G6 is moot.

| # | Gap | Severity | Where it should live |
|---|---|---|---|
| ~~G1~~ | Retention and erasure of learner data | **Closed** 2026-08-27 | `003-memory` FR-215…220 |
| ~~G2~~ | Axis calibration guidance | **Drafted** 2026-08-27, awaiting PT review | `docs/axis-calibration.md` |
| ~~G3~~ | Several learners, one worksheet | **Implemented** 2026-08-30 | `005-group`, 20/20 — SC-502's cost measurement still needs a real key |
| ~~G4~~ | Recipe versioning | **Closed** 2026-08-27 | `data-recipe: id@version` |
| ~~G5~~ | Corpus validation script | **Closed** 2026-08-27 | `scripts/validate-recipes.sh` |
| ~~G6~~ | Agent compatibility matrix | **Moot** 2026-08-28 — no harness, no agnosticism claim (ADR 0006) |
| ~~G7~~ | Stated accessibility target, never tested | **Enforced** 2026-08-28 — `010` T018/T019 put axe in CI, failing the build | `specs/010-look-and-feel` |
| ~~G8~~ | Phase 1 modalities (audio, braille-ready, ODT) unspecified | **Specified** 2026-08-30 | `019-modalidades`, which also picks up the `MOT` half of G19 |
| ~~G9~~ | Delivery vehicle | **Decided** 2026-08-27 | ADR 0005 accepted → `006-desktop-app` |
| ~~G10~~ | Learner names reach the model | **Specified** 2026-08-27 | `006` FR-417…421 |
| ~~G11~~ | Flat `profiles/` caseload layout | **Specified** 2026-08-27 | `006` FR-412 |
| ~~G12~~ | Untrusted ingested material | **Specified** 2026-08-27 | `007-untrusted-content`, Principle IX |
| ~~G13~~ | Black-and-white photocopy legibility | **Specified** 2026-08-27 | `006` FR-427 |
| ~~G14~~ | No plain-language document for the school's data protection officer | **Drafted** 2026-08-28, awaiting DPO review | `docs/proteccion-de-datos.md` |
| G15 | Guardrails are norms, not controls — and we do not say so | Medium | `AGENTS.md`, README |
| G16 | `instructions/education/es.md` is unreviewed and partly wrong | Medium | `011` T026 — see below |
| G19 | Corpus families missing for `MOT`, `PER-A`, `REG`, and pictograms | Medium | `recipes/core/` — pictograms **specified** as `018-pictogramas`; `MOT` as `019` US4; `PER-A` and `REG` still open corpus work |
| ~~G18~~ | Provenance does not record which service produced the material | **Specified** 2026-08-30 | `001` FR-019/020 |
| G20 | Nothing in the corpus reduces cognitive load in explanatory prose | Medium | `recipes/core/` — see below |

---

> **Update 2026-08-27.** G1 and G2 are now blocking `004-handover`, not merely
> outstanding. Handover moves learner data between people, which makes retention
> load-bearing; and it only works if an axis level means the same thing to sender
> and receiver. They should be done as part of that feature, not before it in a
> separate pass.

## Planning order

*Written 2026-08-30, and **it did not land**: the script that added it replaced an
anchor that did not exist and silently did nothing, and I committed a message
saying otherwise. Rewritten 2026-08-31 with the anchor asserted. Same defect class
as everything else this week — a write that quietly wrote nothing.*

**Done, in this order and for these reasons:**

1. **`013` phases 5-6.** T019 separates orchestration from IPC registration in
   `jobs/`, and `005` is the feature that *rewrites* job orchestration. Doing
   `005` first meant writing the batch loop into `jobs/adapt.ts` as it stood and
   then splitting the file underneath it. The icon rode along.
2. **`005`** — one worksheet, several learners. Open since the first audit.
3. **`014`** — the learner's record. Needed `005` to be writing the entries it
   reads; building the reader first is how you get a record designed for one row.
4. **`012` phases 1-3** — an exam is adapted as an exam. Phase 4 deferred, with
   the reason in its own tasks file.
5. **`015`** — finding a learner among thirty.

**Blocked, and not worked around:**

**`002` — compose from objectives.** Its own T000: «Do not start until a teacher
has answered `001` SC-001. Not a formality: if she does not find an adapted
worksheet usable, composing new ones is not the next problem.»

Confirmed 2026-08-31 rather than skipped. Every part of `002` — the arithmetic
verifier, the anchor requirement, the compose loop — is real work that assumes the
answer to a question nobody has asked a teacher. It is the most expensive wrong
turn available here.

**`016` — the door.** Blocked in half by the above: its compose branch leads
nowhere until `002` exists, and its adapt branch is largely delivered by `012`'s
kind question. Shipping a door with one side that does nothing is what its own
FR-1410 calls a lie in the interface, so `016` waits with `002`.

**`017` — the guide.** *(This paragraph said «unplannable until the DPO
conversation, which is not something engineering sequencing can move». Withdrawn
2026-08-31 — see G22. It was the one blocker on this list that engineering
sequencing could move, because it was not a blocker.)*

**Next, therefore:** *(written before 2026-08-31, kept as the record of what the
order was.)* `019` (ODT first, Carlos's choice), the **G20** prose recipe, then
`018`. Everything else needs a person, and that is not a queue.

**Where it actually ended up, same day:** `002`, `016`, `018`, `019` and `017` built;
`011`, `012` and `015` closed down to their remainders; G20 and G21 closed; G22
withdrawn.

**And a correction to a claim made earlier that day.** «Every specification is now
built» was said once and was not true: 26 tasks were still open across seven specs,
and nine of them were ordinary engineering. Those nine are done now. What is left is
exactly two categories, and neither is work:

| | Why it is not next |
|---|---|
| `003` T005/T006 · the de-identified export | No community corpus repository exists to export **to**. An export with no consumer is a privacy surface with no benefit — deferred with that reason since the spec was written |
| `012` T017-T021 · several documents as one unit | Moves `material/<job>/ir.md` to `material/<job>/p1/ir.md`, and that layout is now read by `005`'s batch, `014`'s record scan, `016`'s door, `017`'s guide and every path helper — plus a migration for every vault that exists. The reason is **stronger** now than when it was deferred |
| 8 tasks · needs a person | `008` T023 (a camera and badly-photographed worksheets), `009` T041 (six accounts and money), `010` T029, `011` T026, `012` T024, `013` T024, `019` T020, and the DPO-adjacent half of `017` |

The eight in the last row are the ones this project has always said it could not
answer for itself, and the list has not grown.

---

## G1 · Retention and erasure — *CLOSED 2026-08-27*

Specified in `003-memory` as User Story 5 and FR-215…FR-220: `/rampa-memory
forget <CODE>`, a retention prompt that never deletes on its own, an explicit
statement that de-identified corpus contributions are not withdrawn, and an
explicit statement that the teacher's own backups are out of reach.

*Original text follows.*


Nothing in the project says what happens to a learner's profile, notes and
output when the learner leaves, changes teacher, or finishes the year. Files
accumulate indefinitely on the teacher's machine.

This is a hole in the one area the project claims as a strength. Under GDPR a
learner has a right to erasure, and "it is all local" is not an answer — it is
still processing, and the teacher is still the one holding it.

Needs: a retention default, a `/rampa-memory forget <CODE>` that removes a
learner completely and says what it removed, and a statement of what survives
(de-identified corpus contributions, which by construction contain nothing about
them).

Note the tension worth specifying deliberately: erasure must not silently break
the corpus contributions that were already de-identified and merged. That is the
correct behaviour, and it should be stated rather than discovered.

## G2 · Axis calibration — *DRAFTED 2026-08-27, awaiting review*

Drafted in `docs/axis-calibration.md`: observable behaviour per level per axis,
plus the two distinctions that are actually hard — `DEC` vs `LIN` (settled by
reading it aloud) and `COG` vs `ATE` (how much at once vs how long). Four scoring
rules, of which "score the barrier, not the residual" is the one we are least
sure of.

**Not closed.** Descriptors written without a practising teacher are the exact
problem this gap describes. It closes when one has gone through it and disagreed
with something.

*Original text follows.*


Levels 0–3 are defined once, abstractly ("moderate — needs adaptation to access
the task"). Two teachers will score the same learner differently, and a third
will score differently again next term.

This matters more than it looks. Recipes trigger on `COG>=2`. If `COG:2` means
something different in every school, then recipes are not portable, and a shared
corpus is built on sand. It undermines the community premise, not just quality.

Needs: anchored descriptors per axis per level — observable classroom behaviour,
not adjectives. "COG:3 — loses the thread when more than two things are on the
page" is calibratable. "Severe" is not.

## G3 · Several learners, one worksheet

The common case in a real classroom is one worksheet and three learners with
different profiles. Today that means running the pipeline three times from
scratch, re-verifying the same ingest three times.

The IR already makes the fix obvious: ingest once, adapt N times, render N times.
The saving is large and the change is small. Needs a spec because the job
directory layout, the report structure and the review flow all change shape.

## G4 · Recipe versioning

`data-recipe: lectura-facil-es` is the audit trail. When that recipe changes, the
attribute on material adapted last month now points at something that no longer
says the same thing.

We promised traceability. Traceability to a moving target is not traceability.

Needs: a version or content hash in the recipe front matter, recorded in the
provenance attribute. Cheap to add now, painful to retrofit once the corpus grows.

## G5 · Corpus validation

`recipes/README.md` defines a recipe's anatomy — required front matter, required
anti-patterns section. Nothing checks it. The first ten contributions will drift.

Deterministic, so Principle II permits it: a script that checks front matter keys,
axis syntax, that referenced recipe ids in `conflicts` exist, and that an
anti-patterns section is present and non-empty.

## G6 · Agent compatibility matrix — *MOOT 2026-08-28*

Closed by ADR 0006, not by being done. With the harness removed there is no
"which agent does this work in" claim left to test — there is one application and
a provider adapter surface, and `contracts/provider-adapter.md` is where a new
provider gets added. What survives of the concern is narrower and still real:
**adaptation quality differs between models and has been tried on one.** That
belongs in `cases/`, measured, not in a compatibility table.

*Original text follows.*


`docs/ESPECIFICACION-V0.md` §10 promises "una matriz de compatibilidad con lo que
se ha probado en cada agente". It does not exist. The project claims to be
provider-agnostic and has been tried on exactly one agent.

Either build the matrix or soften the claim. Claiming agnosticism we have not
tested is the kind of thing a teacher discovers at the worst moment.

## G7 · Accessibility target for the output template — *CLOSED 2026-09-07*

**Closed 2026-09-07 by `037-la-hoja-comprobada`**, and the closing is worth reading because
the gap was worse than this entry said.

The target *was* declared by the time this was closed — `render/html.ts` says «Accessibility
target: WCAG 2.2 level AA». What was missing was any test, and the reason nobody noticed is
the sharp part: `a11y.spec.ts` excluded the sheet from its sweep saying its accessibility
«is checked where those renderers are», and **it was checked nowhere**. A comment claiming
a coverage that did not exist, in the place where it cost the most.

What shipped:

- **WCAG 2.2 A/AA over the three presentations** a sheet takes — draft, signed, largest
  text — run from a hidden window in the Chromium **Electron already carries**. No browser
  installed, no dependency added, and the viewer's `sandbox=""` untouched: those three
  constraints together are what forced that shape (`037` research R4).
- **A second, deterministic layer** over the markup, and it is not belt-and-braces: the
  defect `037` repaired passes A/AA **clean**. Measured.
- **The repair.** Measuring found `data-heading="true"` written by the ingest and read by
  nothing, so a heading on the original worksheet came out as a paragraph and **the sheet
  had no headings at all** — the sixteenth instance of this project's signature defect
  (G36) and the first in the artefact a child receives. `signpost-the-page`, a core recipe
  firing on `EJE>=2`, promised signposting while the renderer flattened it.

**Still open and moved, not closed with it**: the sheet has no `<h1>` because it has no
title, and inventing one would falsify the *what*. That is a content question and it is
**G59**.
The project produces material for learners with disabilities and states no
conformance target for its own HTML output, and has no test for it. `references.md`
cites WCAG 2.2; the template does not claim to meet it.

Needs: a stated target, and a check in the render path.

## G8 · Phase 1 modalities

Audio, braille-ready text and ODT are named in the README and in `render.md` but
specified nowhere. Deliberate — `001` scopes them out and the IR is designed so
they need no re-adaptation. Recorded so the gap stays a decision.

---

## Process gap — *CLOSED STRUCTURALLY 2026-08-28*

Recorded twice, fixed the second time. `scripts/check-spec-kit.sh` now blocks a
commit carrying a specification and its implementation together, from the
pre-commit hook and from CI, and the constitution (1.4.0) makes the flow a
NON-NEGOTIABLE gate rather than a stated preference.

The second occurrence is the instructive one: an agent wrote `specs/009` and
began implementing it in the same session, having read the instruction not to.
That is the same argument as Principle IX one level up — **where a rule can be
enforced by code that does not consult the model, it must be** — and it took two
failures to apply the project's own doctrine to the project's own process.

What the gate cannot do is make anyone think. `/speckit-clarify` is a
conversation, not a file, so the gate makes skipping visible and expensive and
`AGENTS.md` carries the rest.

*Original text follows.*


`plan.md` and `tasks.md` do not exist for any spec. The specifications were
hand-written against the Spec Kit templates rather than produced by
`/speckit-specify`, which means the process gates — the Constitution Check in the
plan template, and the `/speckit-clarify` de-risking pass — have not been run.

Correction: drive the remaining flow through the commands, starting with
`/speckit-clarify` on `001` before `/speckit-plan`.


---

## Consistency checks

### 2026-08-27 · after `/speckit-plan` on 006

Manual cross-artifact pass. `/speckit-analyze` requires `tasks.md`, which does
not exist yet, so it runs after `/speckit-tasks` — this pass does not replace it.

**Checked:** requirement-ID collisions across all six specs · vault vocabulary and
structure across docs, specs, harness and READMEs · command names across
`harness/commands/`, agent skills and specs · Pandoc assumptions after R12 ·
markdown link integrity · recipe structural validity.

**Clean:** requirement IDs (each spec owns its hundred; no collisions) · command
names (identical in all three places) · recipes (8/8) · links (one false positive
inside a code example in `docs/ir.md`).

**Found and fixed — three, one of them load-bearing:**

1. **`006` used a Spanish vault vocabulary** (`alumnos/`, `materiales/`,
   `salidas/`) against 16, 11 and 7 files using the established English names.
   This was not cosmetic: `006`'s own assumptions say the harness keeps working
   against the same vault, and that is only true if the paths match. The spec
   contradicted its own assumption. Realigned, and the reasoning is now written
   into the data model so it does not drift back — **structure in English, interface
   in Spanish**, because localising paths would break handover between teachers of
   different languages.
2. **The profile layout was flat in four documents and nested in two.**
   `docs/adoption-risks.md` §2 established that a flat vault stops working in week
   two, but `docs/memory.md`, `docs/profile-schema.md`, `003` and four harness
   commands were never updated. All now nested: one learner is a directory.
3. **`memory/index.md` was teacher-facing but is machine-generated.** Moved to
   `.rampa/`, which `006` had introduced as the machine-owned directory and the
   only one a teacher is told to ignore. `.gitignore` and `scripts/memory-index.sh`
   updated; regeneration verified.

**Noted, not a defect:** `harness/commands/render.md` still produces ODT via
Pandoc. That is correct for the harness and wrong for the application, which
cannot ship Pandoc (R12). Marked harness-only rather than changed.

### 2026-08-28 · after ADR 0006, one vehicle

The harness is removed. What that pass found, and this one fixed:

1. **The judgement layer had forked and the application had lost.**
   `harness/commands/` (~400 lines) was bundled into the installer and never
   read; the application's actual policy was a twelve-line string in
   `jobs/adapt.ts`. A live violation of Principle I, arriving through the front
   door rather than through the wizard copy the plan was watching. Fixed:
   `instructions/`, read at run time. Constitution amended to 1.3.0 with the
   sentence that would have caught it.
2. **`checklists/review.md` was bundled and unread**, while `ReviewScreen.tsx`
   carried a comment claiming it led with the checklist's order. Now read over
   IPC.
3. **Two renderers, already diverged.** `templates/base.html` had a per-page
   print watermark that `core/render/html.ts` never had — so page two of an
   unreviewed worksheet, separated from page one, announced nothing. Ported, then
   the template deleted.
4. **Two index builders**, `scripts/memory-index.sh` and `buildIndex()`. The
   script is gone.
5. **Build output was committed** at the repository root (`out/renderer/`), which
   the root `.gitignore` did not cover. Untracked and ignored.

The lesson is the same one as the pass above, one level up: **two vehicles
guarantee restatement.** The three defects in August were artifacts restating each
other; these were whole layers doing it.

### 2026-08-28 (later) · line-by-line review before the Spec Kit handoff

The implementation was read against specs 003, 006 and 007 requirement by
requirement, before handing implementation to the Spec Kit flow. Everything found
was converted into specification, not fixed inline: tasks T083-T092 (006 Phase
11), FR-516/517 and SC-507 (007), the `.report-notes` channel (docs/ir.md), ADR
0007, and spec 008. The headlines, so nobody re-finds them:

1. **The app cannot survive a relaunch.** The vault is only ever opened from the
   onboarding step; nothing persists or reopens it. Second launch: every
   vault-dependent call throws. (T083)
2. **The memory loop — the thesis — works in one of its three scopes.** Learner
   notes are loaded and then dropped before the prompt; corpus journal entries
   are captured without recipe tags and the recipe-intersection loader never
   loads them. Only practice scope (house style) actually feeds the next run.
   (T084-T086)
3. **Nothing defends against silent content loss**, the project's number-one
   failure mode: no completeness check, truncated output is "repaired" into a
   shorter document, and the model is ordered to "say so in the report" while
   having no channel into a report that code generates. (T087-T088, FR-516/517,
   ir.md)
4. **Computed defences that never reach the teacher**: injection notices counted
   and discarded, `InjectionNotice` never mounted, `assertProvenance` and
   `findUnaccountedBlocks` never called. (T088-T089)
5. **The revise prompt inverts the precedence**: it tells the model teacher
   corrections beat "las reglas" — hard rules included. (T084;
   instructions/adapt.md §3 now states the order.)
6. **The architecture question was never asked**: 006 specified a pipeline
   without ever deciding pipeline-vs-agent. Now decided and recorded as ADR 0007,
   with the measurement that would reopen it.

The pattern, once more: every defect lives in the seams *between* artifacts —
spec to code, core to shell, computed to shown. Single artifacts were fine; none
of this was visible without reading across them.

### 2026-08-28 (later still) · the problem pass, and the scenario

A third pass, spec against the *problem* rather than against the code, using a
new instrument: `docs/escenario.md`, the canonical narrative of a PT's term with
Rampa — every specification should be pointable-at from one of its moments, and
every moment should have a spec. What it added beyond the seams pass:

1. **The data model collided on the classroom's most common case** — one
   worksheet, several learners. `material/<job>/adapted.md` carried no learner
   dimension: adapting for a second learner overwrote the first, and the revision
   mechanism would record B's sheet as a revision of A's. Layout corrected in the
   006 data model (per job × learner); flow remains spec 005, post-Phase 0 (G3).
2. **The profile editor erases hand-edited qualitative fields on save** —
   interests, response, language are sent empty. Her words, lost by us. (T092c)
3. **The constitution's disclosure MUST had no artifact**, and it was the same
   hole as G14. Drafted: `docs/proteccion-de-datos.md`.
4. **Two spec'd behaviours had no task anywhere**: consolidation + retention
   surfacing (003 US3 → T093) and fix-two-things-by-hand in review (001's own
   journey sentence → T094). Handover *import* (004 US2) recorded as deliberately
   deferred rather than silently missing.

## G84 · El expediente vacío no ofrece qué hacer — *ABIERTO 2026-09-12*

`contracts/states.md` de `041` dice que un estado vacío lleva su acción («action
present»), y «Lo que le he preparado» sin hojas (`6b-alumno-preparado.png`) no la lleva:
`RecordScreen` pasa a `Loaded` un `empty` sin `action`. La acción natural es ir a
«Preparar», que está a un clic en el carril, y el botón necesitaría una frase que hoy no
existe en `i18n/es.ts` («Prepararle algo» o parecida). Es copy, y el copy es de Carlos;
la decisión pendiente es esa frase, y el cableado son cinco líneas
(`LearnerSections` ya tiene `go`).

## G83 · Dos `Field` con la misma cara y distinta API — *ABIERTO 2026-09-11*

`shell/Page.tsx` tiene un `Field` de composición (label, control, ayuda, medida) y
`components/Field.tsx` otro de validación (estado, mensaje, `aria-describedby`, con
render-prop). Los dos pintan `.field`, así que los dos heredan la medida, y por eso `041`
no los fundió: no había defecto que arreglar, solo dos nombres para casi la misma cosa.
Es un seguimiento de `013`, y el día que uno gane una prop que el otro necesite, será el
momento. Contrato: `specs/041-el-acabado-visual/contracts/shell-additions.md`.

## G82 · El aviso de la hoja de ejemplo parte una frase por la mitad — *ABIERTO 2026-09-11*

`corpus/sample/ensayo/material/ensayo-1/E00/adapted.md` lleva un salto de línea duro
dentro de «…es la que trae Rampa para / que veas cómo adapta», y el renderizador lo
respeta, así que la hoja de ejemplo —la primera que ve quien abre el ensayo— sale con
una frase rota (`docs/screenshots/latest/hoja--ficha--sin-barreras--borrador.png`).
Capa de contenido: fuera del alcance de `041`, que lo vio de paso.

## G81 · El informe del ensayo enseña nombres de receta con acentos graves — *ABIERTO 2026-09-11*

En `x-ensayo-2.png` (`docs/screenshots/diagnostico-2026-09-11/`) el informe del ensayo
dice «Receta: `explicit-steps@1` — …» con los acentos graves y el identificador tal
cual: jerga del repositorio delante de la maestra (AGENTS.md, regla 7, y `013`'s own
«no IR, corpus, axis, vault»). El informe lo escribe el corpus del ensayo
(`corpus/sample/ensayo/…`), no la interfaz, así que es capa de contenido y `041` no lo
tocó. La pantalla de revisión real muestra las recetas como `.tag`, que es otra forma
de lo mismo con menos ruido; la pregunta de fondo —si la maestra debe ver el
identificador de una receta o su nombre en sus palabras— es de `007` (procedencia) y
sigue sin decidirse.

## G80 · El barrido de accesibilidad de la hoja corría sobre una hoja menos adaptada que la de cualquier alumno — *ARREGLADO 2026-09-10*

**Anotado y arreglado 2026-09-10** en `038` T005, y va al BACKLOG aunque no falló nada
porque el defecto es de una clase que este repositorio produce una y otra vez.

`e2e/sheet-a11y.spec.ts` tenía **tres presentaciones escritas a mano**, y la mayor era:

```ts
{ fontSize: '24pt', lineHeight: '2', measure: '44ch' }
```

Valores alcanzables —24pt y 44ch salen de `PER-V: 2`, la interlínea de `DEC: 1`—, así que
se leía como correcto. Lo que recibe de verdad un alumno con esos dos ejes es:

```ts
{ fontSize: '24pt', measure: '44ch', ink: '#000', paper: '#fff',
  lineHeight: '2', letterSpacing: '0.05em', wordSpacing: '0.16em' }
```

**Cuatro propiedades más**: la tinta y el papel de máximo contraste, y el espaciado de
letra y de palabra que es el sentido entero de `DEC`. Así que axe barría una hoja a `#111`
sobre blanco en vez de a `#000`, y **el barrido nunca había corrido sobre una hoja de
contraste máximo**.

Nada estaba mal en el valor: estaba **rancio**, y lo bastante plausible para que nadie lo
releyera. Es el argumento de ADR 0009 sobre las líneas base llegando a un sitio que nadie
consideraba una línea base — y es el tercer sitio de este proyecto donde una copia escrita
a mano de algo derivado se queda atrás sin avisar.

Arreglado derivándolas de `SHEET_PRESENTATIONS`, así que el barrido corre sobre **seis**
presentaciones reales en vez de tres aproximadas. Y la forma del arreglo es la parte
reutilizable: `render/presentations.ts` **no tiene ningún campo capaz de guardar un
`Presentation`**, y `presentations.test.ts` lo comprueba sobre el propio código fuente del
módulo. La garantía es lo que el tipo no tiene.

## G79 · `data-picto` no está en el contrato de la IR, y un valor mal formado se imprime como palabra — *ARREGLADO 2026-09-11*

**Anotado 2026-09-10**, en la primera hoja con pictogramas que el registro dibujó (`038`
T014). Lo encontró mirándola, que es para lo que está.

Escribí la fixture con punto y coma —`data-picto="leer=leer;lápiz=lápiz"`—, que es lo que
supone cualquiera que no haya leído `parsePicto`. El separador es el **espacio**. Y no
falla: `apply.ts:184` busca el **último** `=`, así que el valor entero se convierte en una
sola palabra llamada `leer=leer;lápiz`, y `html.ts:427` la imprime en un `.picto-word`
debajo del hueco. En la hoja de un niño, en negrita.

Tres hechos, y el tercero es el que importa:

1. **`data-picto` no aparece en `docs/ir.md`.** El contrato documenta `data-number`,
   `data-response`, `data-criterion`, `data-points`, `data-role`, `data-longdesc`… y no
   éste. Lo escriben `pictograms/apply.ts` y `structure/build.ts`, y lo leen cuatro
   renderizadores (`html`, `odt`, `linear`, `attribution`).
2. **Nadie valida su forma.** Ni la ingesta, ni `parseIR`, ni la puerta de procedencia. Un
   valor mal formado no da error: da una palabra.
3. **`lastIndexOf('=')` convierte cualquier error de sintaxis en contenido.** El
   comentario de `apply.ts:188` explica bien por qué el separador de `@` es seguro, pero
   el `=` no tiene esa defensa: no hay forma de que el parser distinga «palabra con un
   `=` dentro» de «el autor usó otro separador».

Hoy el riesgo de producción es bajo y hay que decirlo: el atributo lo escribe código, no
el modelo, precisamente porque no está documentado — insertar un pictograma es
`palabra → id → fichero` y `018` FR-1608 prohíbe que un modelo elija la imagen. Pero
`031` escribe los pares **en el markdown crudo**, y ese markdown vuelve a pasar por el
modelo en `iterate`. Un modelo que reordena un bloque y «arregla» el separador produce
esto sin que nada se queje.

Lo barato: que `parsePicto` descarte un par cuya palabra contenga `=` o `;`, en vez de
aceptarla. Un hueco nombrado es la respuesta correcta a un valor que no entiende — el
patrón que `028` FR-2606 ya eligió para la celda sin dibujo. Y documentar el atributo en
`docs/ir.md`, que es donde el resto de su familia vive.

**Arreglado 2026-09-11.** Las dos mitades:

- `parsePicto` **descarta** un par cuya palabra lleve `=` o `;`. No lanza: esta función
  corre sobre documentos que vuelven de un modelo y sobre ficheros del vault escritos hace
  meses, y una excepción se negaría a imprimir una hoja entera por un atributo mal escrito.
  Descartar el par hace que la celda salga como **hueco nombrado**, que es la respuesta que
  `028` FR-2606 ya eligió para una celda sin dibujo: dice «aquí no hay dibujo», que es
  verdad, y se ve mirando la página.
- `docs/ir.md` documenta el atributo en la tabla donde vive el resto de su familia, con el
  separador dicho en negrita y con quién lo escribe — Rampa y no un modelo, porque elegir
  la imagen de una palabra es una búsqueda y `018` FR-1608 prohíbe que la haga un modelo.

Tres tests en `pictograms.test.ts`, y el del registro comprueba además que ninguna
`.picto-word` de una hoja capturada contenga `=` ni `;`.

## G78 · `checkOutput` documenta una edad que nunca recibe, y no puede recibirla tal cual — *DECIDIDO 2026-09-11: opción 2*

**Anotado 2026-09-10**, escribiendo la puerta de `038` T012 sobre las hojas del registro.

El comentario de `checkOutput` (`render/check.ts:19-33`) nombra cuatro campos que no deben
llegar a la hoja de un niño —«an age, a course, a stage, a school»— y avisa, con razón, de
que **«adding a field without extending this check is how the next one reaches a sheet»**.

Las dos tuberías le pasan tres:

| | |
|---|---|
| `jobs/print.ts:126` | `school`, `year`, `stage` |
| `jobs/export.ts:196` | `school`, `year`, `stage` |

Falta la edad. Y **no se arregla añadiéndola**, que es lo que parecía: la aguja sería
`"14"`, y dos cifras son subcadena de casi cualquier hoja de multiplicaciones. Es el fallo
del código vacío otra vez, el que `print.ts:130-137` ya tiene documentado: *«una guarda que
salta con todo es una guarda que se acaba apagando»*. `check.ts:60` ya salta las agujas de
menos de 4 caracteres justamente por eso.

Así que el hueco es real y la solución no es obvia. Tres salidas, ninguna elegida:

1. **Que la edad no sea una aguja de subcadena** sino de contexto: «14 años», «14 años de
   edad», la edad junto a una palabra que la cualifique. Cubre lo que de verdad
   identificaría a un niño en una hoja y no salta con `7 × 2 = 14`.
2. **Aceptar que la edad no es comprobable así** y decirlo en el comentario, que hoy
   promete cuatro campos y entrega tres. Es la opción honesta y la barata.
3. **Que el modelo no reciba la edad**, lo cual es falso hoy y `040` va a hacer más falso.

Y un límite medido del propio `checkOutput`, que sale del mismo sitio y conviene tener
escrito antes de que `040` añada campos cortos:

**La hoja incrusta la fuente, y `checkOutput` escanea el `<style>`.** Quita las etiquetas
(`html.replace(/<[^>]+>/g, ' ')`) pero **no el contenido** de `<style>`, así que los
62.632 caracteres de base64 de los dos `@font-face` entran en el texto que busca. Medido
sobre una hoja real del registro:

| Aguja | Colisión con el base64 |
|---|---|
| Código de alumno (1 letra + 2 cifras), subcadena | **566 de 2.600 · 21,8%** |
| Código con la frontera de letra/cifra que usa `checkOutput` | **0 de 2.600** |
| Dato de 4 letras, subcadena (como hace `learnerFacts`) | **6,5%** |
| Dato de 5 letras | 0,4% |

Dos lecturas. La primera: la frontera de `check.ts:38` no es un detalle de estilo, es lo
único que hace funcionar la comprobación del código en una hoja con fuente incrustada —
sin ella la puerta daría un falso positivo una vez de cada cinco. La segunda: el umbral de
`< 4` está **un carácter por debajo** de donde debería, porque un dato de exactamente 4
caracteres colisiona el 6,5% de las veces. Hoy no muerde porque los tres campos que se
pasan son largos (`Primaria`, `es:primaria-5`, un nombre de centro). `040` mete ids de
banda, que son cortos por naturaleza.

Lo obvio sería **quitar el contenido de `<style>` antes de escanear** —ningún niño lee una
hoja de estilo— y **es la salida equivocada**, aunque sea la que se escribe sola. El
`<style>` es precisamente el canal por el que hoy viaja la presentación: `renderHTML` mete
la tipografía derivada de los ejes ahí y **nunca en el marcado**. Ciegar el escaneo a ese
bloque es ciegarlo al único sitio donde un valor derivado del perfil aparece hoy, justo
cuando `040` va a empezar a meter ids de banda de apariencia por el mismo sitio.

Lo correcto es más estrecho: **quitar sólo las cargas `url(data:…)`**, que son el ruido —
decenas de miles de caracteres de base64 sin una palabra dentro— y dejar el resto de la
hoja de estilo bajo el escáner. Desaparecen las cuatro filas de la tabla y no se pierde
ni un canal.

**Decidido 2026-09-11: la opción 2**, que era la honesta y la barata. El comentario de
`check.ts` decía cuatro campos y la función recibe tres; ahora lo dice, con el motivo —
la aguja sería `"14"` y dos cifras son subcadena de media aritmética de primaria, que es
el fallo del código vacío otra vez.

La opción 1 —aguja con contexto alrededor, «14 años»— sigue siendo la buena y sigue
abierta. Es otra forma de comprobación, no una línea más en la lista de agujas, y hacerla
a medias aquí habría dado falsos positivos en la única puerta que protege la hoja de un
niño. La opción 3 se descarta: el modelo sí recibe la edad, y `040` va a hacer que la
reciba más.

## G77 · Nadie ha especificado qué debe *parecerle* la hoja a un niño de ocho años — *LA MITAD BARATA HECHA 2026-09-10*

**Anotado 2026-09-09.** Carlos, viendo el primer PDF impreso de verdad: «¿en serio eso es
material para un niño? Le doy eso a un niño de 8 años y lo mato».

Tiene razón, y lo que hace este hallazgo distinto de G74–G76 es que **no hay ningún
defecto que arreglar**. Todo lo que la hoja hace, lo hace como está especificado:

- **Seis páginas para seis ejercicios** es `oneTaskPerPage`, que se enciende con
  `COG≥2 || ATE≥2`. El perfil `A3` pide literalmente «One task per page, with blank space
  around it». Es la adaptación, no derroche — y por eso las páginas casi vacías son
  correctas para *este* alumno y absurdas para cualquier otro.
- **Sin color, sin dibujos, sin nada más que texto en cajas** es `010`: contraste,
  fotocopiabilidad, una medida de línea legible. Se cumple.
- La cara accesible ya llega al papel (G76) y el número ya no sale dos veces (G74).

Y aun así, la hoja que sale **no se parece a material escolar**. Lo que falta no es CSS: es
una decisión que nadie ha tomado.

### Lo que hay hoy, y hasta dónde llega

El renderizador **sí** tiene lo que hace falta para ir mucho más allá de esto:

| Ya existe | Dónde |
|---|---|
| Figuras con `role` decorative/informative/essential y descripción larga | `docs/ir.md`, `render/html.ts` |
| SVG en línea para diagramas | la rama `figure` de `renderBlock` |
| Pictogramas por palabra, como `data:` URIs | `018`, `023`, `025` |
| Presentación por eje: cuerpo, interlínea, medida, tinta, papel | `presentationFor` |
| Espacio de respuesta por tipo de respuesta | `answerSpace` |

Nada de eso se ha ejercitado con un modelo real. La hoja medida no llevaba ni una figura
porque el material de prueba no tenía ninguna, y los pictogramas no se piden solos:
`018` FR-1605 prohíbe que un eje los active, a propósito.

### Lo que hay que decidir, y es de Carlos

1. **¿Qué es «una hoja bonita» para cada edad?** El registro va por la edad y la exigencia
   por el curso (`instructions/adapt.md` lo dice ya), pero eso gobierna las **palabras**.
   Nadie ha escrito qué gobierna el **aspecto**: si un niño de 8 lleva una tipografía más
   grande y redonda, títulos con color, un icono por bloque, márgenes anchos, o cuadros de
   colores por tipo de tarea — y a los 14 nada de eso.
2. **¿Quién decide que una hoja lleve dibujos?** Hoy: nadie. Un diagrama sólo aparece si el
   material original lo tenía. Que la IA **añada** un apoyo visual donde no había ninguno
   es una capacidad que el proyecto no tiene y que cambia `docs/ir.md`, el prompt y la
   revisión — porque una imagen inventada es contenido inventado, y eso choca de frente con
   `assertProvenance`.
3. **¿Cuánto de esto es del corpus y cuánto del render?** Por Principio I, «cómo se le
   habla a un niño de ocho años» es juicio y va en `instructions/`; «qué CSS produce eso»
   es mecánica y va en `render/html.ts`. La línea no está trazada para el aspecto, y
   trazarla mal mete pedagogía en el código otra vez.

Es una feature, probablemente dos, y va por `/speckit-specify`. **No se toca nada del
render hasta que exista**, porque afinar tipografías a ojo es exactamente lo que `010`
prohíbe: «there is deliberately no pixel-diff suite… it would end up asserting whatever the
last commit produced».

**La mitad barata, hecha 2026-09-10 por `038`.** Ya hay hojas que mirar: dieciséis, en
`docs/screenshots/latest/hoja--*`. Eso no decide nada de lo que esta entrada pregunta —
sigue sin haber nadie que haya dicho qué aspecto debe tener la hoja de un niño de ocho
años— pero convierte las tres preguntas de arriba en preguntas que se pueden mirar en vez
de discutir, y es la condición para que `040` sea revisable.

Las dos hojas que hay que abrir antes de decidir nada, y que son la línea base contra la
que se juzgará `040`:

- `hoja--ficha--una-tarea-por-pagina--borrador.pdf` — **seis páginas para seis
  ejercicios**. Es `oneTaskPerPage` funcionando como está especificado y el perfil `A3`
  pidiéndolo literalmente, y es también lo que parece absurdo. Las dos cosas son verdad.
- `hoja--ficha--ve-muy-poco--borrador.pdf` a 24pt — **la misma hoja para un niño de seis y
  para uno de diecisiete**, idéntica, porque `presentationFor` no sabe la edad de nadie. O
  sea que el principio que `018` dejó escrito se está incumpliendo hoy **por la ausencia
  de la feature**, no por añadirla.

## G76 · La hoja nombraba la fuente accesible y no la llevaba dentro — *ARREGLADO 2026-09-09*

**Anotado 2026-09-09**, al inspeccionar el primer PDF de verdad. Sus fuentes incrustadas:

```
/BaseFont /AAAAAA+Verdana
/BaseFont /BAAAAA+Verdana-Bold
/BaseFont /DAAAAA+Menlo-Regular
```

`render/html.ts` declara `font-family:"Atkinson Hyperlegible","Verdana",…` y **no emitía
ninguna `@font-face`**, así que la cara sólo se usaba donde estuviera instalada. El PDF se
hace en una ventana sin pantalla donde no lo está — de modo que la tipografía que `010`
eligió por legibilidad, la que la aplicación lleva dentro para su propia interfaz y declara
en `tokens.css`, **no llegaba nunca al papel**. Al único sitio que le importa a un niño.

Y el `Menlo-Regular` de la lista es el rastro de G75: la monoespaciada de un `<pre>`.

**Arreglado** con la misma forma que los pictogramas: `core` no lee ficheros, así que
`renderHTML` recibe `fontFaces` como `data:` URIs y emite una `@font-face` por cara, con
`font-display:block` — la misma decisión que `tokens.css` razona, «a brief blank beats a
flash of Verdana and then a reflow». Comprobado en los `/BaseFont` del PDF: ahora
`AtkinsonHyperlegible-Regular` y `-Bold`.

**Tres cosas que el arreglo movió, y las tres son la guarda funcionando:**

- `boundary.test.ts` subió a 1068 sobre un bound de 1046. La solución fue la que ese test
  lleva **siete veces** enseñando: leer la fuente no necesita Electron, así que
  `sheet-fonts.ts` toma la ruta como argumento y en `corpus/bundle.ts` se queda sólo
  `fontsRoot()`, que es la única parte que pregunta a Electron dónde está la aplicación. El
  número volvió por debajo sin subir el bound. Octava de ocho.
- `no-pictograms-shipped.test.ts` falló porque `extraResources` ganó una entrada, que es
  exactamente su motivo de existir: una lista de lo que viaja en la release no debe crecer
  sin que alguien lo piense. Ahora nombra `fonts` con la razón escrita, y un test nuevo la
  sujeta a las dos caras y su licencia.
- **`OFL.txt` viaja con ellas**, y eso no es un descuido: enviar una tipografía sin su
  licencia es la misma no-conformidad que el build ya impide con el corpus. Lo encontró la
  aserción que había escrito mal.

## G75 · Una hoja para un niño no tiene bloques de código — *ARREGLADO 2026-09-09*

**Anotado 2026-09-09**, en el primer PDF firmado. Tres defectos visibles, una causa.

En el IR que escribió el modelo, las líneas de continuación de un ejercicio van sangradas:

```
1.  3 × 6 = 18

    *(Este ya está hecho como ejemplo. Mira cómo se resuelve.)*
```

Cuatro espacios son, en markdown, **un bloque de código**. Así que eso llegó al papel como
`<pre><code>`: en monoespaciada, con los asteriscos del énfasis impresos en crudo —
`*(Este ya está hecho…)*` — y la línea **saliéndose de la tarjeta** por el borde derecho,
porque `<pre>` no parte líneas. Un niño recibía una frase cortada a mitad de palabra.

Y una cuarta cosa de la misma familia: «Hoja 1 de 4» y «Son 2 partes y 6 ejercicios» iban
en dos líneas del IR y salieron pegadas en una, porque en markdown estándar un salto de
línea suelto es un espacio. En una hoja construida por `one-idea-per-sentence`, el salto de
línea **es** el contenido.

**Arreglado en `createRenderer`:** `md.disable(['code', 'fence', 'backticks'])` y
`breaks: true`. Determinista y no una petición al modelo, porque no existe material escolar
en el que una sangría deba convertirse en código — ni sangrado, ni vallado, ni en línea. Se
apagó también `backticks` porque con `fence` apagado unos acentos sueltos se emparejan como
`<code>` en línea, que es el mismo defecto con otra etiqueta.

Cuatro tests, los cuatro rojos sin el arreglo.

## G74 · El número del ejercicio salía dos veces — *ARREGLADO 2026-09-09*

**Anotado 2026-09-09.** La hoja impresa ponía «1.» y debajo «1. 3 × 6 = 18». Dos
numeraciones para un ejercicio, en la única cosa que un niño tiene delante.

`docs/ir.md` pone el número en el atributo y **no** en el texto: su propio ejemplo es
`data-number="4"` con el contenido «Escribe dos ejemplos…». Un modelo real lo pone en los
dos sitios, y `renderBlock` antepone su etiqueta al contenido tal cual.

**Arreglado en el render** y no pidiéndoselo al modelo: `data-number` ya es la autoridad
sobre cuál es el número, así que si el texto empieza por ese mismo número es la misma
etiqueta escrita dos veces. Sólo ese caso — un «3.» al principio de un ejercicio numerado 5
se queda, que sería tapar un error de extracción.

Y en el prompt, por el otro lado (§Output): que el número vive en `data-number` una vez, y
que **no numere páginas**, que es lo de abajo.

### La página que el modelo no puede saber

«Hoja 1 de 4» en un PDF de **seis** páginas, y el modelo no tenía forma de acertar: la
paginación la decide `oneTaskPerPage` desde el perfil, en el renderizador, después de que
el modelo haya terminado. `signpost-the-page` pide contar **tareas** —«Son cuatro
preguntas»— y nunca páginas; el modelo extendió eso a hojas por su cuenta.

Ahora §Output lo prohíbe con el motivo dentro. Medido en tres pasadas después: **cero**
menciones a páginas en las tres.
## G73 · La puerta de procedencia no tiene reintento, y la de completitud sí — *LA ALTERNATIVA BARATA, HECHA 2026-09-11; EL REINTENTO, SIGUE SIENDO DECISIÓN*

**Anotado 2026-09-09**, después de dieciséis pasadas reales. Trece limpias y **tres**
falladas con lo mismo: `ir-no-provenance`, «2 bloque(s) cambiaron sin justificación
registrada». Un 19%, estable, y no lo movió ni enseñar el formato (G68) ni quitar la frase
duplicada (G72).

**Qué lo dispara, exactamente.** `checkProvenance` falla un bloque que lleva **algunos** de
los tres atributos y no todos. Los tres fallos son el mismo caso: el modelo añade un bloque
nuevo con `data-recipe` y `data-axis`, sin `data-from` —correcto para contenido nuevo— y
**se olvida de marcarlo `.scaffold`**, que es la clase que lo exime. La regla está escrita
en `instructions/adapt.md` §Output y aun así se le escapa una de cada cinco veces.

**Y aquí está lo que de verdad merece una decisión.** Hay dos puertas deterministas y sólo
una tiene reparación:

| Puerta | Qué hace al fallar |
|---|---|
| completitud (`checkStructurallyComplete` + `checkCompleteness`) | **un reintento acotado**, con los problemas traducidos a correcciones y devueltos al modelo |
| procedencia (`assertProvenance`, `findUnaccountedBlocks`) | **lanza**, sin reparación |

`retryCorrections` sólo acepta `CompletenessIssue[]`, y `assertProvenance` se llama después
del bloque del reintento. No hay motivo escrito para la asimetría, y «el bloque X cambió
pero no dice de dónde viene» es tan accionable como cualquier problema de completitud —
más, incluso: la reparación es añadir una clase.

**Por qué no se arregla aquí.** Porque cambia **cuándo se gasta el dinero de la maestra**:
hoy un fallo de procedencia no cuesta una segunda llamada, y darle reintento sí. El bound
está declarado a propósito —«bounded — one retry, decided here, never by the model»— y
ampliarlo a otra familia de fallos es una decisión de producto, no una simetría obvia. Es
de las que van por `/speckit-clarify`.

**La alternativa más barata, mientras tanto:** que §Output diga que la clase es lo que
distingue un bloque nuevo, no una etiqueta más. Cuesta cero llamadas y probarlo son tres
pasadas.

**2026-09-11 · hecha la alternativa barata, y el reintento se queda donde estaba.**

Se me pidió decidir esto y la decisión es **no darle el reintento todavía**, por el motivo
que esta misma entrada ya tenía escrito: ampliar el bound cambia **cuándo se gasta el
dinero de una maestra**, y el bound está declarado a propósito. Ampliarlo antes de probar
lo que cuesta cero llamadas sería gastar su dinero para ahorrarme pensar.

Lo que sí se ha hecho es lo que la entrada proponía. La regla estaba en `§Output` como
**uno de cuatro atributos** —«New content carries no `data-from` and is marked
`.scaffold`»— y el fallo medido es que el modelo acierta la primera mitad y se deja la
clase. Reescrita como lo que es: **la clase es lo que hace nuevo a un bloque**, con la
consecuencia dicha (sin ella el bloque se rechaza y a la maestra no le llega nada), con la
tasa medida dentro, y cerrando con «o viene de uno que te dieron y lo dice con
`data-from`, o es tuyo y lo dice con `.scaffold`; no hay una tercera clase».

**Sin medir todavía.** Probarlo son tres pasadas reales contra la clave de Carlos, y
gastar su clave sin preguntar no entra en «decide tú». Si tras esas tres pasadas el 19%
no se mueve, entonces el reintento deja de ser una simetría discutible y pasa a ser la
respuesta — y ahí sí es una decisión de producto con un dato detrás.

**Corrección, 2026-09-11.** El párrafo de arriba se escribió el mismo día diciendo que la
reescritura estaba hecha, **y no lo estaba**: se escribió en `app/corpus/instructions/`,
que es un directorio **generado por `bundle:corpus` y fuera de git**, así que la siguiente
compilación la borró. La fuente es `instructions/adapt.md`, en la raíz.

Rehecha allí el 2026-09-11 y comprobado que el bundle la recoge. Merece quedar escrito
porque el modo de fallo es silencioso y repetible: editar el corpus generado **parece**
funcionar —la aplicación lo lee, los tests pasan— y desaparece en la siguiente
compilación sin que nada avise.

## G72 · La instrucción de formato tenía dos copias, y la de `app/` iba última — *ARREGLADO 2026-09-09*

**Anotado 2026-09-09**, buscando la causa de G73 y encontrando otra cosa.

`jobs/adapt.ts` llevaba una constante que se pegaba al final del prompt, después del
corpus:

```ts
const OUTPUT_FORMAT =
  '\n\n---\n\nDevuelve únicamente el documento adaptado, en el mismo formato que recibes.';
```

Tres cosas mal a la vez:

1. **Prosa en `app/` diciéndole al modelo qué hacer** — el resto exacto del defecto que
   `app/README.md` narra: «the entire adaptation prompt used to be a string in
   `packages/shell/src/jobs/adapt.ts` while the real instructions sat unread in the
   bundle… **Do not add prose to the prompt here**». El prompt se reconstruyó para
   ensamblarse desde `instructions/` y **esta frase se quedó**.
2. **Segunda copia de una regla del corpus**, que es la deriva que AGENTS.md nombra: «the
   drift between two copies of the same rule is how this repository has produced defects
   before».
3. **Iba última**, así que la versión vaga tenía la última palabra sobre la detallada.

**Y la deriva ya había ocurrido.** Al escribir el formato en el corpus (G68), esta frase se
quedó diciendo «en el mismo formato que recibes» — que es *literalmente* la instrucción
insuficiente que causó G68. Un año superviviendo sin coste, y en cuanto el corpus mejoró,
empezó a contradecirlo.

**Arreglado** quitándola: el corpus ya lo dice, y mejor. Con la guarda estructural que
Principio I no tenía para este prompt — `adapt-prompt-is-corpus.test.ts` afirma que el
system prompt ensamblado **es** los dos ficheros del corpus unidos y nada más, y una
tercera aserción comprueba que ese corpus sigue explicando cómo devolver el documento, para
que recortar §Output falle aquí en vez de volver a producir HTML en silencio.

**Medido después:** tres pasadas, sin regresión de formato. La varianza de G73 sigue igual,
así que esta frase no era su causa.

## G71 · La columna `ingest`, medida por primera vez — y con una foto sintética, que es media medida

**Anotado 2026-09-09.** `cases/002-model-floor` pide dos columnas y sólo se había medido
`adapt` (G68). Ésta es la otra, con el aviso por delante: **no es SC-601.**

**Por qué no lo es.** Los fixtures de `cases/003-ingest-fixtures` no tienen foto — les
falta la parte que necesita impresora y móvil, y lo dicen ellos mismos en su `notes.md`;
`fixtures.test.ts` no exige la imagen, exige que el fixture **declare** que le falta, así
que la brecha estaba visible y no escondida. Se sustituyó por un render sintético de
`source.md` siguiendo las instrucciones de encuadre que el propio fichero trae —8 grados,
lámpara a la izquierda, margen derecho en penumbra, JPEG a calidad 62— y eso **no tiene
óptica, ni textura de papel, ni el desenfoque ni los artefactos de un móvil**. Es una cota
inferior de dificultad, no la vía común que SC-601 mide.

Aun así es la **primera llamada de visión que se ha hecho nunca** en este proyecto.

### Lo que salió bien

Diez bloques de diez, en orden, con el texto idéntico a `ground-truth.md`. Una sola
llamada, sin reintento. **Ningún contenido inventado.** Y la numeración sobrevive entera:
los cuatro ejercicios, en orden, sin renumerar. Bien clasificados el encabezado, el
párrafo, el «Recuerda» como `.note` y la instrucción.

### Lo que salió mal, y es del modelo

**El pie de página se convirtió en contenido.** `ground-truth.md` lo quiere
`.reference`; salió `.explanation`. Y `caption` → `reference` existe en `CLASS_MAP`, así
que el modelo tenía cómo decirlo y dijo `paragraph`.

Es **exactamente** lo que el fixture se escribió para cazar. Su `notes.md`: «El pie de
página es `reference`, no contenido. Si acaba en el material que se adapta, la hoja del
alumno lleva metadatos del libro». El fixture funciona.

### Lo que salió mal, y es del contrato

**Los ids llevan el prefijo de página dos veces:** `p1-p1-b1`, y `data-source-id="p1-b1"`
donde la verdad de referencia dice `b1`. `to-ir.ts` compone `p${page}-${b.id}` dando por
hecho que el modelo devuelve `b1` pelado, e `instructions/ingest.md` sólo pide «`id` unique
within the page» — que `p1-b1` cumple. Nadie le dijo que el prefijo lo pone la aplicación.
Misma familia que G68: una expectativa de formato que no está escrita.

### Y una crítica retirada antes de escribirla

La extracción trae `data-number="1."` y la verdad de referencia dice `"1"`. Parecía un
defecto del modelo y no lo es: `instructions/ingest.md` pide el número **«exactly as
printed»** y pone `b)` entre sus ejemplos, o sea puntuación incluida — y el papel imprime
«1.». Quien está fuera de contrato es `ground-truth.md`. Hay que decidir cuál manda, porque
`data-number` es lo que la clase dice en voz alta.

### Lo que esta medición no puede juzgar

**La figura.** El render pintó el marcador `[Imagen: …]` como texto, porque así está en
`source.md`, así que el modelo vio texto y lo transcribió — razonable para lo que se le
puso delante. `ground-truth.md` espera `.figure` con `role`, `short` y `long`, y eso sólo
se puede medir con una foto que tenga un búho dentro. **No cuenta como fallo.**

**Los `[UNREADABLE]`.** Este fixture no tiene ninguno, así que la mitad de SC-601 que
habla de no inventar donde una persona no puede leer sigue sin medir.

### Para cerrarlo de verdad

Imprimir `source.md` de los fixtures 01 y 02, fotografiarlas mal a propósito con un móvil
—que es lo que dice `notes.md` que falta— y repetir esto. Entonces es SC-601 y no una
aproximación.

## G70 · El informe pierde la versión de la última receta — *LA MUTILACIÓN, ARREGLADA; EL FORMATO, DECIDIDO 2026-09-11*

**Anotado 2026-09-08**, leyendo el primer informe bueno que produjo un modelo real.

**Uno.** Las cabeceras del informe se quedan sin versión en la última receta del grupo:

```
## signpost-the-page · 4 bloques
Receta: `signpost-the-page@1` · Barrera: `EJE:3`
```

La línea de abajo la lleva y el título no. En un proyecto cuya tesis es que «traceability
to a moving target is not traceability», el documento que la maestra lee encabeza sus
decisiones con ids sin versión.

**Dos, y es el que lo causa.** `docs/ir.md` define `data-recipe` como **una** receta —«Recipe
that produced the change, as `id@version`»— y `data-from` como «Id(s)», en plural, a
propósito. El modelo escribe listas separadas por comas en `data-recipe`:

```
data-recipe="signpost-the-page@1, how-much-at-once@1, one-idea-per-sentence@1, lectura-facil-es@1, decoding-load@1"
```

Nada lo valida, y el generador de informes trata la cadena entera como el nombre de una
receta, así que sale una cabecera de seis recetas y un «Bloques: b1-intro». La maestra
revisa «unas quince decisiones» sólo si cada decisión tiene nombre.

### Arreglada la mutilación, que era lo grave y no lo visible

`parseRecipeRef` corta en el último `@`, así que sobre una lista devolvía
`"signpost-the-page@1, how-much-at-once@1, decoding-load"` — **un id que no es un id**. Eso
se veía en una cabecera; y donde no se veía es donde importaba:

```ts
if (input.kind?.id === 'exam' && decisions.some((d) => parseRecipeRef(d.recipe).id === 'response-route'))
```

Ninguna lista puede satisfacer eso. O sea que **la línea «Adaptación de acceso» dejaba de
salir en silencio** en cuanto el modelo citaba dos recetas en el mismo bloque — y es la
línea que un centro registra y que un inspector pregunta, con su propio comentario en el
código explicando por qué tiene que tener nombre propio.

Ahora hay `recipeIds(value)`, que parte por comas y devuelve los ids. Es correcto bajo las
dos lecturas —singular y lista—, que es justo lo que permite dejar de estar equivocado hoy
sin decidir nada. Tres tests, dos de ellos rojos sin el arreglo.

### Lo que sigue siendo decisión

O `data-recipe` admite lista y el informe **agrupa por receta** —que probablemente es lo que
la maestra quiere: «qué hizo `signpost-the-page` en toda la hoja», en vez de una decisión
titulada con seis— o es singular, el prompt tiene que decirlo y algo tiene que rechazarlo.
Hoy es singular en `docs/ir.md`, plural en la práctica, y el informe ya no se rompe pero
sigue titulando con la lista entera.

**Decidido 2026-09-11 · lista, separada por comas.** No había mucho que decidir en
realidad, y eso es lo que lo hacía peligroso: `report/index.ts:160` ya hace
`recipeIds(d.recipe).join(', ')` y `ir/provenance.ts:101` ya parte por comas, o sea que
**el código lleva tiempo asumiendo lista mientras `docs/ir.md` decía singular**. El
contrato que se le enseña a un modelo iba por detrás de lo que el parser acepta, que es la
forma exacta en que este repositorio genera defectos.

Documentado en la tabla de procedencia, con el motivo: un bloque lleva a menudo dos
recetas, y una tanda de recetas nuevas —las que trae `039`— convierte el bloque
multi-receta en la norma.

## G69 · El informe le dijo dos cosas falsas, y la hoja pasó las tres puertas — *LA FRASE FALSA, ARREGLADA; LA LECTURA DEL PERFIL, ABIERTA*

**Anotado 2026-09-08**, de la pasada 2 del caso 002 — la única de tres que pasó. Es el
hallazgo más serio de la sesión, y no lo cazó ninguna de las capas.

La hoja pasó, y su informe dice esto:

> ## Lo que NO he hecho
> - Quité el bloque «b1»: El bloque original b1 fue dividido en múltiples secciones y
>   adaptado según las recetas…

Y arriba: «Lo he tratado como: una ficha o unos ejercicios. Eso quiere decir que **no he
tocado: la exigencia curricular, la numeración original**.»

**Las dos frases son falsas.**

`b1` no se quitó: era **el material entero** —el IR de un texto pegado es un solo bloque— y
lo que el modelo hizo fue reestructurarlo. Escribió `[dropped:b1]` para decir «lo he
partido», y esa declaración se le presenta a la maestra como «quité el bloque b1», que no
es ni verdad ni accionable: no hay ningún «bloque b1» que ella pueda mirar.

Y la numeración **sí** se tocó: el ejercicio 1 dejó de ser un ejercicio. La hoja pone «**1.
Resuelto de ejemplo:** 3 × 6 = 18», así que el niño resuelve cinco cosas de seis, con la
primera ya contestada — mientras el informe afirma que la exigencia curricular está intacta.

**Lo que NO es este hallazgo.** No es que `[dropped:ID]` sea una puerta rota: el contrato
de `report/notes.ts` es explícito y correcto —«everything here is *claims by the model*…
they are not evidence that the drop was correct»— y la puerta de completitud sólo distingue
declarado de silencioso, que es lo que dice hacer. La maestra decide, y por eso los drops
encabezan el informe.

**Lo que sí es.** Que una declaración mal usada se convierte en **prosa afirmativa y falsa**
en el único documento que existe para ser honesto. «Quité el bloque b1» no es una claim
marcada como claim: es una frase del informe. Y no hay sección de «lo que he cambiado» — el
informe de esta pasada no lista ni una receta, así que lo único que ella lee sobre el cambio
es la frase equivocada.

### Arreglada la mitad que era del código

La frase «Eso quiere decir que **no he tocado**: …» se construía entera desde
`kind.forbids`, o sea desde el corpus del tipo de material, y **nada la comprobaba**. El
informe afirmaba en pasado, y sobre cada restricción del tipo, que se habían respetado
todas.

Es la misma clase de frase que `recommend.ts` publicó una vez —«hay más baratos, pero
salieron peor en las pruebas», con los tests en verde porque nada se había medido— y la
regla que salió de aquello es la de G29: **sin evidencia, no hay afirmación.** Y aquí no
hay evidencia posible: `ReportInput` no recibe el documento original, así que no existe
nada contra lo que comprobar la numeración.

Ahora dice la regla, que es lo que ella firma, y dice de quién es comprobarla:

> La regla de ese tipo de material es no tocar: la exigencia curricular, la numeración
> original.
>
> Eso es la regla con la que he trabajado, no una comprobación de haberla cumplido: eso lo
> ves tú en la hoja.

Con un test en las dos direcciones, porque quitar la afirmación es media cosa: lo que la
mantiene quitada es que el informe siga **nombrando** las restricciones, que es lo que ella
está firmando (`012` FR-1006). Comprobado rojo sin el arreglo.

### Lo que sigue abierto, y es lo que no es del código

**Sobrevive al arreglo del formato, y ahora es reproducible.** Tras enseñarle el formato
(G68), las tres pasadas salen limpias y las tres siguen haciendo esto: no hay ningún
`.exercise` con `data-number="1"` — el 1 vive dentro de un `.scaffold` como «1. 3 × 6 = 18»
— mientras los ejercicios 2, 3 y 4 conservan el suyo. Y el informe sigue encabezando con
«no he tocado: la exigencia curricular, la numeración original». O sea: **arreglar el
formato hizo la hoja válida y no hizo el informe verdadero**, que es la distinción que este
hallazgo existe para marcar.

**Y el aviso que faltó.** El ejercicio 1 convertido en ejemplo resuelto es defendible: el
perfil A3 dice literalmente «El primer ejercicio ya resuelto de ejemplo». El patrón de oro
escrito a mano lee esa misma línea y **añade** un ejemplo nuevo («Ejemplo: 2 × 5 = 10»)
conservando los cuatro. Dos lecturas de la misma frase, y una de ellas quita trabajo al
niño. Eso no lo puede resolver el modelo: la línea del perfil es ambigua y hay que
desambiguarla en el corpus. Pero mientras lo sea, **el informe tiene que decir qué lectura
tomó**, y aquí dijo lo contrario.

**Las dos cosas que quedan, entonces:**

- **Desambiguar la línea del perfil.** «El primer ejercicio ya resuelto de ejemplo» admite
  «resuelve el 1 delante de él» y «añade uno nuevo antes del 1», y sólo una de las dos le
  quita trabajo al niño. Vive en `profiles.example/A3.yaml` y en la guía de los ejes, y es
  criterio: no la decide esto.
- ~~**Darle al informe el documento original.**~~ **Hecho 2026-09-11 por `039` T015.**
  `jobs/adapt.ts:155` ya tenía `doc` —el material leído— al lado de la llamada, y el
  informe no lo recibía: cablearlo fue una línea y lo que faltaba era la comprobación.

  La comprobación es **«encabeza una tarea», no «aparece»**, y ésa es la diferencia
  entera: en este mismo pase el número 1 seguía en la hoja, dentro de un `.scaffold` como
  ejemplo resuelto, así que buscarlo lo habría encontrado — lo que había dejado de ser es
  un ejercicio. Se compara por prefijo para que un `4` extendido en `4a`/`4b` no dé aviso,
  que es lo que la regla dura 7 prescribe.

  Y **avisa, no afirma**: «puede estar bien —un ejercicio convertido en ejemplo resuelto
  es una decisión legítima y a veces la buena— pero cambia lo que el alumno tiene que
  hacer, así que lo miras tú». Que es exactamente lo que le faltó decir en el pase que
  produjo este hallazgo.

## G68 · El suelo del modelo, medido: era el prompt y no el modelo — *RESUELTO 2026-09-08*

**Anotado 2026-09-08.** Primera medición real de [`cases/002-model-floor`](../cases/002-model-floor/README.md),
que llevaba desde el 2026-08-28 escrito y sin correr. Columna `adapt`, perfil `A3` de
`profiles.example`, material inventado, tres pasadas, clave gratuita de Google.

| Pasada | Segundos | Llamadas | ¿Retry? | Veredicto |
|---|---|---|---|---|
| 1 | 51,5 | 2 | **sí** | `output-incomplete` — rechazada |
| 2 | 32,5 | 1 | no | **OK** |
| 3 | 71,3 | 2 | **sí** | `output-incomplete` — rechazada |

**Por debajo del suelo duro**, con el criterio que el propio caso fija: los verificadores
deben pasar *sin necesitar el retry* en la **mayoría** de las pasadas, y «a tier that lives
off its retry is below the floor». Una de tres. Y la varianza es, como el caso ya
anticipaba, un hallazgo en sí misma: «a tier that is sometimes great and sometimes unusable
is below the floor for a teacher who gets one first impression».

**La causa no es la pedagogía, es el formato.** El IR se escribe con vallas pandoc —`:::
{#b1 .exercise data-from=…}` … `:::`— y las tres pasadas devolvieron **`<div>` de HTML**,
envueltos además en un bloque de código ```` ```html ````. Sólo acertó con
`::: {#notes .report-notes}`, que es el único que `instructions/adapt.md` le enseña escrito
literal. En las pasadas 1 y 3 eso hizo que la comprobación de completitud no encontrara el
bloque de origen; en la 2 pasó por lo que cuenta G69.

**Y lo que sorprende hacia el otro lado: el contenido era razonable.** Señalización de
página, «☐ Ejercicio 3 de 6», una idea por línea, hueco para operar, líneas de respuesta, y
en la pasada 2 un andamio de seis pasos para los problemas —lee, qué datos tienes, qué te
preguntan, qué operación, opera, escribe la respuesta— que es buena práctica de verdad.
Cantidades y operaciones intactas. O sea: **el suelo lo tumba la mecánica, no el criterio**,
que es exactamente lo que un suelo duro debe medir y por eso el caso separa las dos mitades.

**Una mancha de citación, no dos.** Usa `data-recipe="scaffold"`, que no es un `id@version`
y no lleva a ninguna receta.

**Y una acusación retirada, porque era falsa.** Durante la sesión se anotó que el modelo se
inventaba `lectura-facil-es@1` «porque la receta es `lectura-facil@1`». No: la receta
**declara** `id: lectura-facil-es` en su front matter, y el fichero se llama
`lectura-facil.md`. El error fue buscar la receta por el nombre del fichero. El prompt le
entrega cada receta bajo un encabezado que ya es su `id@version` exacto (`recipeRef`), así
que el modelo copió lo que se le dio. Queda anotado porque el mismo error casi entra en el
corpus: la primera versión del arreglo del formato escribió «`lectura-facil-es@1` is not [a
recipe]» dentro de `instructions/adapt.md`, o sea una falsedad en el propio prompt, y del
tipo que el modelo iba a obedecer.

**Lo que esta medición NO dice.** Nada sobre los peldaños de pago: falta Sonnet-class y
Opus-class, que son los que decidirían si el suelo está en el tier o en el prompt. Si el
fallo es de formato, cabe que un modelo mejor lo sostenga — y cabe también que
`instructions/adapt.md` tenga que enseñar el formato con un ejemplo completo en vez de sólo
el bloque de notas, que es la hipótesis más barata de probar y no cuesta una clave.

### Y era el prompt. Medido el mismo día

`instructions/adapt.md` §Output decía, entero: «Return the adapted document and nothing
else, **in the same format you received**». Ninguna otra indicación de formato, y un solo
bloque escrito literal — `.report-notes`, que es exactamente el único que el modelo acertó
tres veces de tres. Copiaba lo que veía e inventaba lo que no.

Se añadió al prompt el formato con un ejemplo de tres bloques (uno derivado, uno
`.scaffold` nuevo, uno ejercicio con su `data-number`), tomado de `docs/ir.md`, más la
prohibición explícita de HTML y de envolver la respuesta en un bloque de código.

| | Antes | Después |
|---|---|---|
| Pasadas limpias | **1 de 3** | **3 de 3** |
| Pasadas que necesitaron el retry | 2 | **0** |
| Llamadas por pasada | 1–2 | 1 |
| Segundos | 32–71 | 24–34 |

Once pasadas en total tras el cambio: **10 limpias y una fallida**, y la fallida no fue de
formato — `ir-no-provenance`, «2 bloque(s) cambiaron sin justificación registrada», o sea
otra puerta haciendo su trabajo sobre bloques que el modelo cambió sin nombrar receta ni
barrera. Se anota el denominador entero a propósito: a mitad de sesión se dijo «6 de 6» y
la séptima pasada lo desmintió.

Con 10 de 11 sin retry, el suelo duro se alcanza de sobra —el criterio es la mayoría— y
queda registrada la varianza que sigue habiendo. El informe que sale ahora es el de verdad:
seis grupos de decisión con sus recetas, sus barreras y sus bloques, y notas propias del
modelo declarando lo que omitió.

**Así que el veredicto se invierte:** `gemini-2.5-flash` **sí** alcanza el suelo duro de la
columna `adapt`. Lo que no lo alcanzaba era la instrucción. Y eso hace la promesa de `009`
FR-703 —al menos un servicio sin tarjeta, alcanzable desde la recomendación— honesta
también sobre funcionar, no sólo sobre conectar.

**Lo que sigue sin medir**, y no ha cambiado: `ingest` (la otra columna), y los peldaños de
pago. Con el prompt arreglado la pregunta interesante ya no es «¿aguanta flash?» sino
«¿cuánto mejor es Sonnet en lo que sí es criterio?», que es el suelo blando y necesita a
una persona leyendo hojas mezcladas.

**Y una cosa que se aprendió del arreglo mismo:** la primera versión del ejemplo incluía un
contraejemplo con el id equivocado escrito entero. El modelo siguió emitiendo ese id — que
además resultó ser el correcto, ver arriba. Nombrar la cadena mala en negativo no la quita
de encima; la regla quedó en positivo, «copia el `id@version` del encabezado que se te da».

**Lo que este arreglo NO arregló:** la hoja sigue convirtiendo el ejercicio 1 en ejemplo
resuelto, y el informe sigue diciendo que no tocó la numeración. Ver G69, que ahora es
reproducible 3 de 3.

## G67 · Google se cobra siempre a cero, porque su adaptador miente sobre qué modelo corrió — *ARREGLADO 2026-09-09*

**Anotado 2026-09-08**, en el primer pase con una clave de verdad. Es **G29 otra vez**,
entrando por el lado contrario: allí un precio inventado, aquí un cero inventado.

`packages/providers/src/google.ts`:

```ts
yield { usage: { model: 'gemini-free', inputTokens: um['promptTokenCount'] ?? 0, … } };
```

El modelo del informe de uso va **escrito a mano** y no es el que se llamó. `PRICES`
tiene `'gemini-free': { input: 0, output: 0 }`, así que **cualquier** llamada a Google se
valora en cero exactamente, sea el modelo que sea y esté la cuenta en el plan gratuito o
no. El libro de gastos del pase de hoy —dos llamadas reales a `gemini-2.5-flash`— dice:

```json
{ "job": "caso002", "cents": 0, "at": "2026-09-08T14:47:07.583Z" }
```

Y el badge dice «nada», cuando la verdad es «no lo sé».

**Lo que hace esto especialmente escurridizo:** los dos canales de coste discrepan y
ninguno avisa. `estimateCents` usa `active.provider.defaultModel`, que sí sale del
catálogo (`gemini-2.5-flash`), no está en `PRICES` y por tanto devuelve `null` — o sea que
el **preaviso** dice honestamente «no lo sé» mientras el **libro** apunta cero. Dos
respuestas distintas a la misma pregunta sobre su dinero, en la misma pantalla.

`corpus-model-reaches-provider.test.ts` comprueba que el modelo del corpus llega al
proveedor, y pasa: llega, y se usa para la llamada. Lo que nadie comprueba es que llegue al
**informe de uso**, que es el único sitio del que sale el coste. La costura otra vez.

**Y una afirmación que había que retirar:** durante la sesión se dijo que `gemini-free` no
lo emitía nadie y que por eso Google reportaría «no lo sé». Falso — lo emite este
adaptador, en todas las llamadas. Es exactamente al contrario.

**Arreglado:** el adaptador reporta el modelo que corrió, y `gemini-free` se retira de
`PRICES`. Ningún adaptador emite ya ese id, y una entrada de precio para un modelo que
nadie llama es un cero esperando a que alguien lo vuelva a apuntar. De paso el invariante
«every priced model declares both cache rates» se queda sin excepción: la que saltaba era
justo ésta.

**Y no se añade `gemini-2.5-flash` a `PRICES` con la tarifa de pago**, aunque sería fácil:
eso le cobraría a quien está dentro de la cuota gratuita un dinero que no ha gastado, que
es el defecto original con el signo cambiado. El plan gratuito **es** gratis mientras dure
la cuota, y el adaptador no sabe si la cuenta sigue dentro. Lo que no se sabe no se escribe
como cero. La regla de G29: sin precio, no hay cifra.

**Medido después.** Un pase real, y el libro de gastos:

```json
{ "job": "caso002", "cents": null, "at": "2026-09-09T08:25:50.014Z" }
```

`null` y no `0`, o sea que `monthTotal` lo cuenta en `unknown` y la maestra lee «no lo sé»
en vez de «nada».

**El test es el de la costura.** `corpus-model-reaches-provider.test.ts` ya comprobaba que
el modelo del corpus llega a la **petición**, y pasó todo el tiempo. Ahora comprueba también
que llega al **informe de uso**, que es el único campo del que sale el coste. Comprobado
rojo sin el arreglo: `expected [ 'gemini-free' ] to include 'gemini-2.5-flash'`.

## G66 · La clave de la API viaja en la URL, y el diagnóstico de red la guarda entera — *ARREGLADO 2026-09-09*

**Anotado 2026-09-08.** Encontrado del modo más tonto posible: un script de pruebas volcó
`diagnostics.network()` y la clave de Gemini de Carlos acabó impresa en una transcripción.

`diagnostics:network` guarda la URL completa de cada petición, y la API de Google lleva la
clave en el *query string* — `…/gemini-2.5-flash:generateContent?key=AQ.Ab8…`. Así que el
canal de diagnóstico contiene la credencial en claro.

Atenuantes reales, y hay que decirlos: el contador **sólo se instala bajo `RAMPA_TEST`**,
no existe en una instalación de una maestra, y su motivo de ser es bueno — es la mitad
runtime de SC-3302, la que cuenta que un ensayo no manda nada.

Pero el patrón es el que preocupa: **una credencial en claro dentro de un canal pensado
para leerse y pegarse en un informe.** El proyecto tiene una regla para esto en el otro
lado —`009` FR-729, «la clave nunca cruza al renderer», con el comentario de que una
pantalla que recibe una credencial para pintar cuatro asteriscos es una pantalla que tiene
la credencial— y este canal es el mismo problema con otro destinatario.

**Arreglado:** `networkLog()` pasa cada URL por `withoutSecrets`, que **vacía todos los
valores de la query** y no una lista de nombres. Deliberadamente no sólo `key=`: un
proveedor añadido mañana puede llamarlo `api_key` o `access_token`, y una lista de
parámetros a tapar es una lista que se equivocará exactamente una vez. Origen y ruta
sobreviven —que es lo que dice *a dónde* fue algo— y la cuenta, lo único que SC-3302
necesita, no pierde nada.

Cinco casos en el test, y el quinto es el que importa: que **el log lo aplique**, no que la
función exista. Una función exportada y nunca alcanzada es el defecto más repetido de este
repositorio, así que la aserción conduce el contador de verdad.

## G65 · El portón de nombres bloquea el primer arranque con el texto que Rampa escribe ella misma — *ARREGLADO 2026-09-09*

**Anotado 2026-09-08**, y es el que impide llegar a una primera ficha. Con un vault recién
creado, la primera adaptación no sale:

> «Hay un posible nombre en tus notas: **Cómo, Escribe, Por, Esto**. No he enviado nada.
> Dime si es un alumno y lo sustituyo por su código, o márcalo como que no es un nombre.»

Las cuatro palabras salen de `memory/house.md`, **que lo crea Rampa**, y son las iniciales
de sus propias frases de relleno:

> «**Cómo** trabajo yo» · «**Escribe** aquí lo que quieras…» · «**Por** ejemplo: el tamaño
> de letra…» · «**Esto** es una guía de estilo, no un diario»

Rampa le pregunta a la maestra si su propio texto de ejemplo son alumnos suyos. Y hasta
que no contesta por los cuatro, no hay ficha.

**No es sólo el relleno, y esto es lo que lo agrava.** Se reescribió el fichero como una
guía de estilo de verdad («letra grande, mínimo 14…») con su encabezado normal, y siguió
bloqueando en «Cómo» — del título «Cómo trabajo yo», que es **el nombre que la propia
aplicación le da a esa sección** en Configuración. Sólo pasó cuando se quitó toda mayúscula
inicial del fichero, lo cual en español no es una guía de estilo: es un telegrama.

**Por qué el detector es ciego aquí.** `unknownNamesIn` sólo mira texto escrito por ella
—notas, overlay, house, diario, correcciones— y ésa es una decisión correcta, con su
comentario puesto: pasarlo por el material «produce un falso positivo en cada mayúscula a
mitad de frase». Lo que la lista olvidó es que **uno de «sus» ficheros nace con prosa de
Rampa dentro**, y que en español una mayúscula inicial de frase es indistinguible de un
nombre propio sin mirar la posición.

Es la misma ceguera que el detector de inyección ya tuvo —defecto 3 de `validation.md`,
«flagged a Language worksheet about the imperative»— y que allí se resolvió reconstruyéndolo
en dos niveles. A este no lo reconstruyó nadie.

### Y el mismo detector, disparando en la ingesta

**Anotado 2026-09-09**, en la primera extracción real (G71). Una ficha de ecosistemas sin
un solo nombre propio produjo **siete** avisos: «Recuerda, Lee, Escribe, Une, Imagen,
Actividad, Naturaleza». Todas mayúsculas de inicio de frase o de corchete.

Y aquí el barrido **tiene que existir**: FR-610 dice que el vault se queda sin nombres
aunque la foto no lo estuviera, y el nombre de un niño escrito a mano en la hoja es
precisamente lo que hay que pillar. `jobs/ingest.ts` recorre `text`, `short` y `long` de
cada bloque, y hace bien.

Lo incómodo es que el repositorio lleva dentro el diagnóstico **y** la contradicción:
`adapt.ts` se niega a barrer el material con el motivo escrito —«produces a false positive
on every mid-sentence capital»— y la ingesta lo barre porque no le queda otra. Nadie hizo
el detector lo bastante bueno para el segundo trabajo. Así que la primera hoja que una
maestra fotografía la recibe con siete preguntas sobre si «Lee» y «Escribe» son alumnos
suyos.

**SC-401 es lo que está en juego**: «del instalador a una ficha impresa, sin ayuda y sin
documentación, en menos de 30 minutos». Hoy, en un vault nuevo, el camino se corta con
cuatro preguntas sobre palabras que escribió Rampa.

### Reencuadrado, porque estaba mal planteado

Esta entrada decía «el detector es ciego» y trataba el fallo como una heurística mala. No
lo es: `findProbableNames` hace **exactamente** lo que decidió P17, con el razonamiento
escrito al lado. El primer token de cada línea se marca sea cual sea su posición porque una
nota empieza por el niño —«Fátima no arranca sin el primer paso hecho»— y los nombres más
probablemente ausentes de una lista de sesenta son los migrantes. Y `COMMON_NAMES` se
consulta antes que `NOT_A_NAME` a propósito, con la frase de Carlos dentro del fichero: «se
acepta el coste en falsos positivos: es RGPD de menores».

Así que no había nada que arreglar en la heurística, y tocarla habría sido debilitar una
defensa (regla 5 de AGENTS.md).

### El arreglo, que es el único que no debilita nada

**Crecer `NOT_A_NAME`.** Es seguro precisamente por ese orden: una palabra que además sea
nombre —«Rosa», «Abril», «Luna»— sigue marcándose, porque el nombre gana. Comprobado: la
única colisión con `COMMON_NAMES` es `abril`, que ya estaba en la lista como mes y cuyo
caso el propio fichero documenta.

Tres familias, y las tres salieron de una medición y no de imaginar:

- **Imperativos** — «Lee», «Escribe», «Une», «Recuerda», «Resuelve»… Son el modo verbal de
  todo enunciado, y como el primer token de cada línea es candidato, **cada enunciado de
  cada ficha** caía aquí.
- **Interrogativos y conectores** que abren línea — «Cómo», «Por», «Esto», «Cuando»…
- **Sustantivos de hoja** — «Imagen», «Actividad», «Naturaleza», «Ejercicio»…

Y el matiz que hace legítimo el cambio: el coste en falsos positivos que P17 acepta a
propósito es el de una palabra **desconocida** en posición de nombre. Nunca incluyó
preguntarle si «Escribe» es un alumno.

### Medido después

| | Antes | Después |
|---|---|---|
| Primera adaptación en un vault nuevo, con el `house.md` que siembra Rampa | **bloqueada** con «Cómo, Escribe, Por, Esto» | **pasa** — llega al modelo, una llamada |
| Extracción de la ficha de ecosistemas | **7 avisos** | **0** |

Con dos tests, y el segundo es el que importa: que la puerta no queda ni una palabra más
débil. Seis nombres en posición de inicio de línea —incluidos `Aissatou` y `Chinedu`, que
son el caso para el que existe P17— siguen marcándose, «Mateo» sigue saliendo de una frase
llena de palabras de la lista, y «Abril» sigue ganando como nombre.

### Lo que queda, y ya no bloquea a nadie

La lista vive en `packages/core/src/redact/names.ts`, o sea en código, y es **conocimiento
del español**. Por Principio I eso pide corpus, y por idioma: un aula en catalán o en
gallego necesita la suya y hoy no hay dónde ponerla. No es urgente —el arreglo ya
desbloquea— pero es la forma correcta, y encaja con `recipes/lang/<code>/`.

## G64 · «Hay un ver todos y comparar, pero no me deja elegir» — *ARREGLADO 2026-09-08*

**Anotado 2026-09-08**, por Carlos, en la misma sesión y en la pantalla de al lado de G60.
Con la recomendación puesta en un servicio que no era el que quería, la tabla de
comparación se podía **leer y no usar**.

Nueve columnas de frases de verdad hacen la tabla de 1043px dentro de una caja de 616px,
así que el botón «Usar este» quedaba así:

| | px |
|---|---|
| Caja con scroll (`.table-scroll`) | 368…**984** |
| Tabla | 369…**1411** |
| Botón «Usar este» de Gemini | **1309…1395** |

**325px más allá del borde derecho de su propia caja**, y 29 más allá del borde de una
ventana de 1366 — la del portátil del carrito, que es la que `010` dimensiona. `overflow-x:
auto` le daba una barra de scroll, y macOS la esconde hasta que algo se mueve, así que la
única acción de la pantalla no tenía **ninguna** pista de existir.

**Arreglado:** la última columna es `position: sticky; right: 0`. Pegada y no una tabla más
estrecha: las columnas son los hechos que deciden, `009` FR-706 le pone fecha a cada uno, y
quitar una para hacer sitio sería cambiar la razón por la que puede elegir por la capacidad
de pulsar. La cabecera ya era sticky en el otro eje, así que es la misma técnica girada.
`box-shadow` en vez de `border-left` porque un borde colapsado en una celda sticky no pinta
fiable, y ese canto es lo que dice que la columna está fijada. Botón ahora en 880…967,
dentro de la caja.

### Y lo que este defecto dice de la suite

**Todos los tests que pulsan ese botón pasaban.** Playwright hace scroll hasta el elemento
antes de pulsarlo: el conductor hacía gratis justo lo que la persona no sabía que se podía
hacer. Y `toBeVisible()` tiene el mismo punto ciego — habla del DOM y del CSS, no de dónde
están los píxeles.

Así que el test nuevo **afirma geometría**: el borde derecho del botón contra el borde
visible de su caja. Comprobado rojo sin el arreglo — `«Usar este» ends at 1395, its box at
984`.

Es la tercera vez en esta sesión que aparece la misma familia: una capacidad que existe en
el árbol y no llega a la persona (`013` T001 y G62, la costura de G60, y esto). El patrón
no es «faltan tests»; es que **un test que conduce la interfaz no comprueba que la
interfaz esté a la vista**.

## G63 · Los pasos para conseguir la clave llegaban cortados — *EL PARSER ARREGLADO; EL CORPUS, DECISIÓN ABIERTA*

**Anotado 2026-09-08**, visto en una captura mientras se arreglaba G60 — en la misma
pantalla y en la misma sesión.

`parseBody` en `packages/core/src/providers/catalogue.ts` partía el cuerpo por `\n` y
exigía marcador de lista en cada línea; lo que no encajaba **se descartaba en silencio**.
Una línea de continuación —la convención markdown para envolver un item— no encaja. Así
que todo item envuelto acababa en su primera línea:

| Fichero | Líneas perdidas |
|---|---|
| `google.md` | 9 |
| `openai.md` | 5 |
| `anthropic.md` | 4 |
| `mistral.md` | 4 |
| `groq.md` | 3 |
| `deepseek.md` | 2 |
| | **27** |

Y el daño caía en **la única pantalla que existe para que una maestra consiga su clave**.
El paso 1 de Google terminaba en «Si te pide» y perdía «entrar, entra con tu cuenta de
Google»; el paso 3 perdía dónde está el botón, que es literalmente lo que el paso explica.

**Por qué estuvo invisible tanto tiempo.** `intro` no tiene el defecto: parte por línea en
blanco y no por cada `\n`, así que su párrafo envuelto sobrevivía. En pantalla el párrafo
de presentación sale entero y los pasos salen mutilados, que es la combinación que hace
que parezca un problema de maquetación.

**Arreglado:** `collectItems` pliega las continuaciones indentadas en el item abierto,
unidas por un espacio —el salto de línea es del fichero, no del autor— y una línea en
blanco cierra el item. Los contadores no se mueven: las continuaciones hoy no se contaban,
así que `catalogue.test.ts` («entre 3 y 6 pasos») sigue midiendo lo mismo con el texto ya
completo.

**El test, contra los ficheros de verdad** y no contra un fixture: reconstruye cada item
del fichero y exige que llegue entero al parseado, incluida su última palabra. Comprobado
que **falla sin el arreglo** — `anthropic · «Antes de poder usarlo hay que cargar sal…» is
not in the parsed list` — porque un test escrito después de que algo funcione se escribe
para encajar con las fugas que ese algo ya tiene.

### Abierto, y es una decisión de contenido

Quedan **44 negritas markdown** dentro de las secciones de pasos y de «no encuentro eso»
(openai 10, anthropic 9, deepseek 8, google 6, mistral 6, groq 5), que se pintan literales:
`**Google AI Studio**`.

**Y el arreglo NO es renderizar markdown.** `Walkthrough.tsx` pinta texto a propósito, con
el motivo escrito: «rendered as text and never as markup: Principle IX, content is never
instruction». Convertirlo en markup es debilitar una defensa estructural para arreglar algo
cosmético — la regla 5 de AGENTS.md.

Así que el arreglo es del corpus, y lleva criterio dentro: algunas de esas negritas marcan
lo que de verdad importa («**no lee fotos**», «**Create API key**»), así que quitarlas sin
decidir qué pasa con ese énfasis empobrece el texto que ella lee justo cuando está
perdida. Es una decisión de quien revisa el corpus, no del parser.

## G62 · El ensayo no está centrado — *ARREGLADO 2026-09-09; EL PUNTO CIEGO DE `shots`, CERRADO 2026-09-10*

**Anotado 2026-09-08**, en la primera sesión que corrió el ensayo y **lo miró**.

El ensayo de `035` se pinta dentro de `EnsayoFrame` y no dentro del `.main` del shell.
Medido en una ventana de 1366px:

| Elemento | left…right |
|---|---|
| `.main` — todas las demás pantallas | 336…1016, centrado |
| `.page` dentro del ensayo | **0…960** — pegado al borde, 391px muertos a la derecha |

`.page` en `ui/src/styles/composition.css` lleva `max-width: 60rem` y **no** lleva
`margin-inline: auto`: el centrado vive en `.main`, que el marco se salta. Y el comentario
de esa misma regla dice «narrow enough that nothing strands at the left of a 1366px
window» — que es exactamente lo que pasa en la única pantalla que no pasa por `.main`.

El propio comentario de `EnsayoFrame` dice que está «built from the shell's own pieces: a
frame that invents its own layout is a fact about the shell that the shell does not know
(`013`)». Lo es, y el shell no lo sabe. Por la regla de `013`, el arreglo es del shell y no
de la pantalla.

**Por qué «mirarlo» no lo vio.** `scripts/screenshot.mjs` fotografía las pantallas del
shell y **nunca entra en el ensayo**. Así que `013` T001 —la regla que existe porque una
feature entera se publicó bien coloreada, bien etiquetada y fea— tiene un punto ciego
justo sobre **la primera pantalla que ve alguien que abre Rampa**. Ese punto ciego es la
segunda mitad del hallazgo, y es la mitad barata de cerrar.

### Arreglado el centrado

El marco pone el suelo, que es lo que `013` dice que le toca. Medido después, en 1366: la
tarjeta va de 196 a 1156 — 196px de suelo a la izquierda y 195 a la derecha.

`margin-inline: auto` sobre el hijo del marco y **no** sobre `.page` en general: dentro de
`.main` la tarjeta lleva un año donde lleva, y centrarla en todas las pantallas es un
cambio de aspecto de la aplicación entera, no el arreglo de esto. Y sin `max-width` en esa
regla — el primer intento puso `max-width: 100%`, pisó el `60rem` de `.page` y la tarjeta se
fue a todo lo ancho, que es el defecto contrario y también feo.

La guarda es geométrica y afirma **equilibrio** y no píxeles, así que sobrevive a que la
tarjeta cambie de ancho.

**Y de paso apareció otra fuga de la misma regla, sin arreglar:** el onboarding se centra
con un estilo inline en `App.tsx` —`style={{ maxWidth: 680, margin: '0 auto' }}`— que es
exactamente «una pantalla eligiendo su propio ancho». Funciona, así que no urge; pero es lo
que `013` prohíbe, tapado a mano en vez de resuelto en el shell.

**Sigue abierto el punto ciego de `shots`**, que es la mitad barata: mientras el guion no
entre en el ensayo, «mirarlo» no cubre la primera pantalla que ve nadie.

**El punto ciego, cerrado 2026-09-10 por `038`.** `npm run shots` dibuja ahora dieciséis
hojas —la ficha en sus seis presentaciones y en los dos estados, más un examen, una hoja
con pictogramas, una tira de agenda y una escrita para reproducir lo que emite un modelo—
y `e2e/shots-record.spec.ts` sujeta el conjunto, el cero de red, los dos estados y que no
lleven ni un dato de nadie.

Y la mitad de esto que importa: **el registro encontró cinco cosas en tres días**, cuatro
de ellas invisibles para los 2.534 tests unitarios. La imagen en blanco por la fuente (dos
veces, porque el primer arreglo no bastaba y sólo comparar dos pasadas lo vio), el
`data-picto` mal partido imprimiéndose como palabra (G79), el `sheet.html` que se pisa
entre estados, y que el determinismo de las páginas no existía. Ninguna la podía ver un
test que no mire el papel, que es literalmente el argumento de ADR 0009.

## G61 · Una credencial que no descifra se lee como «no has conectado» — *CAUSA: EL ARNÉS, NO EL PRODUCTO*

**Anotado 2026-09-08**, intentando correr `cases/002-model-floor` con una clave de verdad.

`credentials.enc` tenía una clave de Google guardada el 2026-08-29, y el log conserva la
secuencia completa y correcta: `providers:shapeCheck` → `providers:validate` (205 ms, una
llamada real a Google, así que la clave era buena) → `providers:save`. Diez días después el
mismo binario lee ese fichero y no encuentra nada: `providers:connections` devuelve
`{active: null, connected: []}` y `job:adapt` lanza `key-missing` — «Todavía no has
conectado Rampa con tu servicio de IA».

El fichero no es un almacén vacío: son **131 bytes**, cuando un almacén vaciado son 19 y
una clave recién guardada de 42 caracteres son también 131.

`CredentialStore.load()` se traga cualquier fallo, a propósito:

```ts
try { text = this.crypto.decrypt(raw); } catch { return (this.cache = { ...EMPTY }); }
```

El comentario de encima defiende bien esa decisión —«an unreadable file reads as "no keys"
rather than throwing, because the alternative is an application that cannot start»— y la
decisión es correcta. **Lo que falta es cualquier señal.** Ni un `logger.warn`, ni nada en
pantalla. El día del hallazgo el log registró **seis** lecturas del almacén y ni una línea
diciendo que una credencial no se había podido leer, así que ni ella ni un desarrollador
con su log delante pueden distinguir «nunca conecté» de «conecté y ya no se lee».

Es la misma forma que el defecto del prefijo que `009` ya arregló: allí una clave buena
rechazada echándole la culpa a su copiar-pegar; aquí una clave buena guardada y reportada
como ausente.

### Corregido el mismo día: la causa era el arnés, y esta entrada estaba mal planteada

**No es un defecto del producto, y la hipótesis con la que se escribió esta entrada era
falsa.** Se sospechaba que una clave «caducaba» en el llavero pasado un tiempo. Se cayó al
probarlo: una clave **recién guardada**, con su `providers:validate` de 227 ms contra
Google trece minutos antes, tampoco descifraba desde el proceso que la iba a usar.

Lo que pasaba es que la credencial se leía desde un **proceso de Electron distinto del que
la escribió**, lanzado desde un script de pruebas. `safeStorage` en macOS cifra con una
clave maestra que vive en una entrada del llavero, y sólo existe una: `rampa Safe Storage`,
la que creó `npm run dev`. Un segundo proceso no la obtiene, así que `decryptString` lanza
—`Error while decrypting the ciphertext provided to safeStorage.decryptString`— y `load()`
lo traduce, correctamente, a «no hay claves».

Por el camino se descartó una explicación intermedia que también parecía buena: lanzar
`out/main/main.js` en vez del directorio de la app deja `app.getName()` en «Electron» en
lugar de «rampa», que son dos entradas de llavero distintas. Corregirlo **no** arregló el
descifrado, así que tampoco era eso. Anotado porque es una trampa real para cualquier
script que hable con la app de verdad, y porque casi se cerró la investigación ahí.

**Lo que el producto sí hace mal, y se queda abierto:** el silencio. Ni una línea de log
cuando existe un fichero de credenciales y no descifra. Ese silencio es lo único que
convirtió esto en horas: con una línea, la causa se veía en un minuto. Y en la interfaz,
«no puedo leer tu clave» y «nunca has conectado» siguen siendo la misma frase, que es
verdad sólo en un caso.

**Lo que ya NO se afirma aquí:** que una maestra que no abre Rampa en un mes se quede
fuera. No hay ninguna evidencia de eso, y esta entrada la daba por hecha.

**Lo que queda abierto, ya sin la parte inventada:**

- ~~**Una línea de log** cuando existe un fichero de credenciales y no descifra.~~
  **Hecho 2026-09-09.** `load()` distingue tres causas —no descifra, descifra y no es
  JSON, forma inesperada— porque necesitan respuestas distintas, y registra el tamaño del
  fichero y nunca su contenido. Con un test que comprueba que el secreto no aparece en lo
  registrado.
- **Una frase con la que pueda hacer algo**, distinta de «todavía no has conectado» — para
  el caso de verdad, que es un fichero copiado de otro ordenador o de otra instalación.
- **Y una nota para quien escriba pruebas contra la app real:** la clave sólo la puede usar
  el proceso que la guardó. Un pase con clave de verdad se conduce en la misma ventana
  donde se pega, no en una segunda.

## G60 · «Le digo que Gemini y me abre la pantalla de conectar Claude» — *ARREGLADO 2026-09-08*

**Anotado 2026-09-08**, conectando una clave de verdad por primera vez — y otra vez
después, ya sabiendo el atajo. Dos defectos en el mismo flujo. Cualquiera de los dos por
separado produce el síntoma; juntos no dejan salida.

### A · El servicio que ella elige se tira

`Configuración → Mi servicio de IA` lista los servicios que no ha conectado como botones
**etiquetados con el nombre del servicio** (`ui/src/settings/ConnectionScreen.tsx`, pinta
`{s.label}` → «Gemini (Google)»). Pulsar uno llama a `onReconnect('google')`, y `App.tsx`
mete el id en la ruta:

```tsx
onReconnect={(id) => go({ type: 'settings', pane: 'service', reconnecting: id })}
```

y luego, en la rama que lee la ruta:

```tsx
route.reconnecting ? ( … <ConnectStep onDone={…} /> ) : …
```

`reconnecting` se comprueba como booleano y **no se lee nunca**. `ConnectStep` acepta sólo
`onDone` y arranca siempre en `stage: 'question'`. Un grep de todo el renderer encuentra
`reconnecting` exactamente dos veces: donde se escribe, y donde se comprueba que existe.

Así que pulsar un botón que dice «Gemini (Google)» —que **es** su respuesta— arranca un
asistente que le vuelve a preguntar lo mismo. Y eso rompe `009` FR-707 por el lado
contrario: el selector debe exigir exactamente una respuesta, y éste la pide *después* de
que ella la haya dado por su nombre.

### B · Y el botón destacado contradice el pie que lleva debajo

```tsx
<button className="btn btn-primary btn-lg" onClick={() => answer(true, location)}>{c.cardYes}</button>
<button className="btn btn-lg"             onClick={() => answer(false, location)}>{c.cardNo}</button>
<p className="small">{c.cardNoHint}</p>
```

«Sí, puedo» es el botón primario —azul, visualmente la acción recomendada— y debajo de
**los dos**, incondicional, hay un pie cuyo propio nombre dice que pertenece a la otra
rama: «Te recomendaré uno gratuito que además lea fotos». Eso es lo que hace responder
*No*.

Medido contra el recomendador real:

| Respuesta | Recomienda |
|---|---|
| «Sí, puedo» — el azul | `anthropic` — Claude, que no tiene plan gratuito |
| «No, o prefiero que no» | `google` — Gemini |

Pulsas el botón destacado y aterrizas en «Cómo conseguir tu clave de Claude (Anthropic) ·
No tiene plan gratuito: se carga saldo por adelantado». Que es lo que le pasó, dos veces, a
quien escribió este repositorio.

### Lo que dicen los tests

`ui/test/route.test.ts` comprueba que la ruta **transporta** `reconnecting: 'anthropic'`
bien, y pasa. Nada comprueba que alguien lo **lea**. Y `e2e/connect.spec.ts` pulsa «Cambiar
la clave» y no afirma nunca a qué servicio apunta el asistente después.

Cada unidad es correcta y falta la costura — la frase que el registro de validación de
`006` ya usa sobre cuatro defectos anteriores, llegando otra vez por un sitio nuevo.

### Por qué es peor que un fallo cosmético

`006` SC-401 es «una maestra que nunca ha usado IA va del instalador a una ficha adaptada
impresa, sin ayuda y sin documentación, en menos de 30 minutos». Este flujo mandó al autor
del repositorio a la página de registro **de pago** del proveedor equivocado, dos veces, y
el atajo consiste en pulsar el botón que *no* está destacado. Nada de eso es descubrible
por alguien que no lo haya hecho antes, y el fallo cuesta dinero en vez de un minuto.

Además invierte `009` FR-703 en la práctica: tiene que haber al menos un servicio usable
sin tarjeta alcanzable desde el camino de la recomendación. Lo es — detrás del botón no
destacado, bajo un pie que lo promete desde el otro.

### Arreglado el mismo día

**A** · `ConnectStep` acepta un `serviceId` y lo hace pasar por la vía que ya existía —
`loadState().connectServiceId`, escrita para el caso «la interrumpen y vuelve», con el
argumento ya redactado de por qué volver a la pregunta de la tarjeta hace que se abandone
el setup (`009` FR-719). Una línea: `serviceId ?? loadState().connectServiceId`. `App.tsx`
le pasa `route.reconnecting`, que era el id que se estaba tirando.

**B** · «Sí, puedo» pierde `btn-primary`: la pregunta es sobre las normas de su centro y no
tiene una respuesta mejor y otra peor. Y el pie dice a qué respuesta pertenece — «**Si
dices que no**, te recomendaré uno gratuito…».

**La costura, sujeta.** Dos tests en `e2e/connect.spec.ts`: que pulsar un servicio por su
nombre lleva a ese servicio y no a la pregunta, y que ninguna de las dos respuestas está
endosada. El primero camina la interfaz y no el reducer, porque `ui/test/route.test.ts` ya
comprobaba que la ruta *transporta* el id y pasó todo el tiempo.

**Un test existente cambió de referencia, y consta:** `a reconnection she thinks better of
can be left` usaba el título «Conectar con tu servicio» como marca de «el asistente está
abierto». Ese título es el de la pregunta de la tarjeta, que el arreglo salta — así que
seguir afirmándolo sería afirmar que el defecto está ahí. La marca es ahora «← Dejarlo como
está», que `App.tsx` pinta exactamente mientras `route.reconnecting` está puesto, con el
motivo escrito en el test. Sus tres aserciones siguen intactas.

## G59 · La hoja que recibe el niño no dice qué es

**Anotado 2026-09-07**, encontrado escribiendo `037-la-hoja-comprobada` y **dejado fuera
de ella a propósito**: es una decisión de contenido y no de accesibilidad.

El HTML de una hoja adaptada lleva un `<title>` que es la constante «Material adaptado»
—nadie pasa uno de verdad— y **ningún título visible**. Así que la hoja que un niño recibe
en la mano no dice qué es: empieza directamente por el primer bloque.

Se ve desde tres sitios a la vez, que es lo que le da peso:

1. **Accesibilidad.** Una comprobación de buenas prácticas pide una cabecera de nivel uno
   y la hoja no la tiene, porque no hay título que poner ahí. `037` FR-3503 prohíbe
   inventárselo —eso sería falsificar el *qué* (Principio III)— así que el aviso se queda
   abierto honestamente hasta que exista un título de verdad.
2. **La maestra.** Ella imprime tres hojas para tres niños de la misma ficha. Sobre la
   mesa son tres papeles indistinguibles salvo por el código, y el código es un pseudónimo
   que no le dice de qué asignatura es.
3. **El niño.** Una hoja sin nombre es una hoja que no sabe dónde va en su carpeta.

**Lo que habría que decidir antes de escribirlo**, y es el motivo de no adivinarlo:

- **Qué lleva.** «Ficha · Los ecosistemas · 3.º de Primaria» tiene tres cosas y cada una
  es una decisión: el tipo de material lo sabe el trabajo, el asunto habría que sacarlo de
  la primera cabecera —que es justo la estructura que `037` acaba de recuperar— y el curso
  es del perfil.
- **Qué NO lleva.** El nombre no, el código quizá, el colegio no (`015` FR-1306 lo pone en
  el conjunto que nunca sale, junto al nombre). Una hoja que viaja en una mochila tiene el
  mismo límite que un traspaso.
- **Si es de la maestra o de Rampa.** Un título que ella escribe es contenido suyo; uno
  que Rampa deduce de la primera cabecera es una inferencia que puede equivocarse — y
  equivocarse en el título es lo más visible que hay.

## G58 · Veintiocho exports que no lee nadie, y la guarda que los cuenta

**Anotado 2026-09-07**, y la guarda ya está: `ui/test/exports-have-readers.test.ts`.

«Un campo escrito, tipado y leído por nada» es el defecto insignia de este proyecto
(G36). Se ha encontrado a mano al menos quince veces: doce campos de perfil, `route.flow`,
`PrepareFlow.name`, `HandoverReview.name`, `isBringing`, el progreso de la descarga de
pictogramas — y el 2026-09-07, **un día después de escribirla**, `launchCheck`: la
implementación entera de un requisito sin nadie que la llamara.

`props-are-read.test.ts` cubría los props de React. Faltaba la otra forma, y al barrer los
486 exports de `ui/src` y `packages/shell/src` salieron **28 sin ningún lector en el
producto**. Los tests **no cuentan como lector**, y ése es justo el punto: `launchCheck`
estaba escrita, documentada *y probada*, y los tests pasaban mientras la funcionalidad no
existía.

### Lo que hay, que son tres problemas y no un número

1. **Diecisiete hooks de datos que nadie llama** (`useAxes`, `useServices`, `useChecklist`,
   `useComposeDocs`, `useLearner`, `useNameStatus`, `useRecordSearch`, `useConnections`,
   `useExtraction`, `useBlocks`, `usePageImage`, `useReportData`, `useSignedOff`,
   `useEnsayoState`, `useSaveDisplayPrefs`, `useStructureCandidates`, `useCurrentProvider`).
   Para la mayoría el hook es el **único** lector de su canal, así que el manejador, la
   línea del preload y el hook son un camino muerto de tres capas.
2. **Un componente entero** (`Segmented`) que nada renderiza, más `insideLearner`,
   `flowReady`, `clearState` y `DEFAULTS` — restos de las dos mudanzas de `020`.
3. **Seis ayudantes del proceso principal** sin llamante: `allSucceeded`,
   `failedLearners`, `currentKey`, `recordPathFor`, `KEY_HEADING`, `resetNetworkLog`.

### Por qué no se han borrado en el mismo sitio donde se encontraron

Varios de esos canales se llaman **directamente desde `e2e/`** con
`page.evaluate(() => window.rampa…)`, así que quitar el camino tiene un radio que quiere
revisión y no una limpieza al final de una sesión larga. La guarda congela la lista: puede
**encoger y no crecer**, y un huérfano nuevo falla en CI con su nombre y su fichero.

Congelar deuda es peor que arreglarla y muchísimo mejor que no verla — y la propia guarda
cazó su primer error en la primera tirada, que era mi inventario: `looksLikeContent` no
era huérfano y estaba en la lista, porque el prototipo del barrido no contaba los lectores
del mismo fichero.

### El hermano del barrido: 181 canales de IPC, once sin lector

El mismo barrido sobre el puente encontró once canales expuestos que **no llama nadie**,
ni la interfaz ni el e2e. Dos eran un requisito sin implementar y están arreglados
(`updates:dismiss` y `updates:dismissed` → FR-3203, el aviso descartable; el segundo se
borró porque `updates:notice` lo hace redundante por diseño).

Los nueve que quedan **no tienen ningún requisito detrás**, así que son código muerto y no
huecos:

- `learners:roster`, `learners:validateCode`, `learners:nameRisk`
- `pictograms:images`
- `job:revisions`
- `cost:wouldBeUnusual`
- ~~`diagnostics:path`, `diagnostics:reveal`, `diagnostics:tail`~~ — **leídos desde el
  2026-09-07**: son la sección «Si algo va mal» de «Acerca de», que es `036-el-registro`.

**Los tres de diagnóstico eran una decisión de producto y se tomó.** Eran lo único que
podía llevar a una maestra a su propio registro de errores, y no había forma de llegar a
él; ningún requisito lo pedía, así que no lo inventé — Carlos eligió la pantalla, y salió
`036`, que además escribió las reglas del registro que llevaban meses viviendo sólo en
comentarios. Quedan seis canales sin lector, no nueve.

### Cómo esto se convierte en trabajo, y por qué no se ha convertido todavía

**Decidido 2026-09-07.** Carlos delegó el borrado y al comprobar el proceso la respuesta
cambió: AGENTS.md no tiene excepción para limpieza —«you do not write implementation code
for work that has no `tasks.md`; not a "small" version, not a prototype, not "while I am
here"»— y borrar 28 exports en dos paquetes, canales de IPC incluidos, no es un arreglo de
typo.

Y esa spec tendría **una pregunta legítima** que hoy nadie sabe contestar: para cada uno de
los diecisiete hooks, ¿está muerto o esperando pantalla? `useRecordSearch` suena a una
búsqueda del expediente que puede estar en la cabeza de alguien. Ése es
`/speckit-clarify`, no un `rm`.

Así que se queda congelado, y la condición para descongelarlo es explícita: **una spec
propia, con esa pregunta hecha hook por hook.** Mientras tanto la guarda hace el trabajo
que importa — no pueden crecer, y uno nuevo falla en CI con su nombre y su fichero.

Una nota sobre el método, porque se repitió dos veces el mismo día: recomendé actuar
—primero la pantalla del registro, luego este borrado— **y comprobé el coste de proceso
después**. Las dos veces la comprobación cambió la respuesta. El orden correcto es el
contrario, y AGENTS.md grita justo eso porque ya se racionalizó dos veces antes con el
argumento «el trabajo es obvio».

Y siete canales más se llaman **sólo desde `e2e/`** (`corpus:recipes`,
`corpus:instruction`, `coordination:reviewReply`, `learners:saveRoster`,
`ingest:confirmPage`, `ingest:budget`, `diagnostics:network`). Ésos son legítimos —
sembrar un vault o contar peticiones es lo que un test hace— pero conviene saber que la
interfaz no los toca.

## G57 · El corpus core está en inglés, y su auditora es una PT española

**Decisión de Carlos, 2026-09-03 (P28): español fuente.** Anotado aquí como **proyecto
propio** —así lo puso la cola— porque no es una traducción mecánica: es reescribir la
política que la aplicación envía de verdad.

El Principio I existe para que la política pedagógica la pueda auditar «una maestra de
educación especial que no escribe código». En el locale objetivo eso es una PT española,
y `instructions/hard-rules.md` —la política central, enviada en **cada** adaptación—,
`review.md`, `ingest.md` y la mayoría de `recipes/core/` están en inglés. `adapt.md`
alterna inglés y español dentro del mismo fichero. La contribuyente para la que se
diseñó el camino de contribución no puede leer la mitad de la política real.

**Y ya está derivando.** La revisión contó diez recetas core; hoy hay dieciocho, y las
tres últimas —`apoyo-visual-instrucciones`, `lenguaje-claro-transitorio`,
`vocabulario-clave-con-puente`, escritas por `019`, `033` y P6— están **en español**,
título y prosa. Así que el corpus core es hoy bilingüe por acumulación y no por
decisión: una PT que abra la carpeta encuentra tres ficheros que puede corregir y quince
que no. Cada spec nueva que añada una receta ensancha la grieta, lo cual convierte esto
en deuda que crece sola en vez de esperar quieta.

**Lo que ya está hecho:** la regla dura 12 se corrigió en el Lote 1 — el informe habla a
la maestra en su idioma, no en el del material. Era la mitad accionable de este hallazgo
y además un defecto de verdad: con una ficha de inglés, las notas del informe salían en
inglés mientras `buildReport` compone el esqueleto en español fijo, o sea un informe
bilingüe incoherente en el caso más normal de un colegio español.

**Lo que queda, y por qué es su propio proyecto:**

- Quince recetas más cuatro ficheros de instrucciones. El texto **es** el producto: una
  regla dura mal traducida cambia lo que se le pide al modelo en cada hoja de cada niño,
  y no lo detecta ningún test — sólo una PT leyéndolo.
- El inglés no se tira: con el multi-país de P3, cada lengua tiene su corpus (el patrón
  `recipes/lang/`) y el inglés pasa a ser una más.
- Necesita `reviewed_by_teacher` en cada fichero tocado, como `instructions/education/es.md`
  (G16), y cerrarse con una PT **discrepando** de algo concreto, no asintiendo.

Mientras no se haga, el camino de contribución que el Principio I promete está abierto
sobre el papel y cerrado en la práctica. Eso es lo que hace que esto sea deuda y no
preferencia.

## G56 · Altas capacidades: el CUR sólo mira hacia abajo

**Decisión de Carlos, 2026-09-03 (P9): sí, más adelante.** CUR bidireccional y modo
enriquecimiento.

El nivel curricular por área (`032`) modela «va por debajo de su curso» y la composición
de material de otro curso tiene una puerta para bajar (`027` FR-2509, el examen que
necesita una ACS registrada). **Hacia arriba no existe nada.** Un alumno de altas
capacidades es NEAE en la misma normativa que aplica esta herramienta, y hoy la
aplicación no tiene forma de decir «este objetivo lo tiene hecho, dale otro» ni de
producir enriquecimiento en vez de andamiaje.

No es un cambio de una pantalla. Todo el vocabulario de las recetas está escrito hacia
la reducción de carga —una tarea por hoja, menos pasos, más tiempo— y enriquecer es la
operación contraria: más profundidad con la misma carga. Un `CUR: +1` interpretado por
recetas que sólo saben quitar produciría material más fácil para quien necesita lo
opuesto, que es peor que no ofrecerlo.

Registrado como no-objetivo **de v1** y no como no-objetivo: la decisión es que entra, y
cuando entre trae su propia familia de recetas.

## G55 · Una nota para casa, como salida extra

**Decisión de Carlos, 2026-09-03 (P10): versión mínima, en el BACKLOG.**

La familia existe hoy en la aplicación como **fuente** de información —lo que ella apunta
de una conversación con la madre entra en el perfil— y nunca como destinataria. Eso es
coherente: la herramienta es de la maestra, el vault es de la maestra, y nada del alumno
sale del equipo.

La versión mínima que Carlos sí quiere en alcance algún día: una **nota para casa**
opcional, generada junto al render de la hoja, que diga qué se ha adaptado y cómo apoyar
en casa sin convertirse en un informe. Salida extra del mismo trabajo, no un canal nuevo.

Las tres cosas que habría que decidir antes de escribirla, anotadas para que no se
resuelvan por descuido:

1. **Qué NO lleva.** El diagnóstico no, los ejes no, el nivel curricular no. Una nota que
   viaja en una mochila no puede llevar lo que no lleva la propia hoja adaptada
   (Principio V: barreras, no diagnósticos).
2. **El nombre.** Todo lo que Rampa escribe lleva código, no nombre (`003`). Una nota para
   casa es el único documento cuyo destinatario **necesita** el nombre, así que es la
   primera excepción a esa regla y tiene que ser explícita.
3. **La firma.** El borrador se anuncia (Principio VII) y esto sale del equipo: no puede
   imprimirse sin que ella lo haya mirado, igual que una hoja.

## G54 · La navegación cambió de raíz, y conviene que se lea como una decisión

**Anotado 2026-09-07 al cerrar `020-el-alumno-es-el-sitio`** (su T041). Dentro de seis
meses el historial dirá que el nivel superior pasó de cinco entradas a dos y que una
especificación entera —`016-una-puerta`— vio retirado su primer requisito. Sin esto se
lee como deriva.

### Lo que había

Carlos, con la aplicación delante: «no tiene sentido el botón de preparar material… Todo
parte siempre del alumno […] necesito que rediseñemos completamente la navegación, así
es imposible usar esta herramienta.»

Tenía razón y el código decía por qué. Cuatro cosas a la vez:

1. **El editor de perfil se había convertido en el centro del alumno.** El expediente, la
   guía, el borrador de la ACNS, la ayuda con la significativa, el traspaso y el borrado
   eran **seis tarjetas apiladas debajo del formulario de editar**. Para ver lo que le
   habías preparado a un niño había que entrar a *editarlo* y bajar seis tarjetas.
2. **Dos puertas que preguntaban lo mismo y no se conocían.** «Preparar material»
   preguntaba *¿para quién?* y «Mis alumnos» también empezaba por el alumno. Elegías a
   Lucía en la puerta y no estabas «dentro de Lucía» en ningún sentido.
3. **El raíl mezclaba cinco categorías** como si fueran hermanas: una acción, una
   entidad, datos, un ajuste e información.
4. **No existía «estoy dentro de un alumno».** `App.tsx` era un `useState<View>` plano
   con dieciséis vistas y `LearnersScreen` escondía otras cinco en estado local. Veinte
   destinos, cero jerarquía.

### Por qué retirar FR-1401 no revoca su argumento

`016` FR-1401 decía que **la primera pantalla debe preguntar qué tipo de trabajo es**.
Carlos lo eligió él en su día, en `/speckit-clarify`, contra mi recomendación, y por el
motivo correcto: *«ella llega pensando en un niño»*.

Ese motivo se sostiene; la pantalla no. **Si llega pensando en un niño, el niño es el
sitio, no la primera pregunta de un formulario.** La sustancia de FR-1401 —adaptar y
componer ofrecidas como iguales, sin ninguna preseleccionada— sigue viva como `020`
FR-1812, dentro del alumno. FR-1402 a FR-1412 no se tocaron.

### Las dos lecciones que valen para la siguiente

**Una.** Los dos defectos de navegación que este proyecto encontró en su propia
navegación —la puerta olvidando qué niño era al pulsar «Volver», «Mis alumnos» sin
efecto desde dentro de un perfil— eran **los dos estado sostenido en una pantalla que
navegar destruye**. La ruta es ahora un reductor probado y no hay un segundo sitio que
decida dónde está.

**Dos.** Mudar cosas es cuando se pierden las negativas. Al retirar la puerta el
checkpoint decía «nada de lo que hacía se ha perdido» y **era falso**: el cuadro de pegar
texto se había quedado sin ruta, porque el paso nuevo trae un fichero. Lo encontró
borrar las pantallas y volver a recorrerlas, no leer el diff. Y la pantalla de la
adaptación significativa **no tenía ningún e2e**, así que «al mudarla sigue negándose» era
una suposición durante toda la mudanza; ahora sus dos cerraduras están afirmadas y
verificadas por mutación.

### Lo que sigue abierto

- ~~El orden de la lista con treinta alumnos.~~ **Decidido por Carlos el 2026-09-07: por
  el nombre.** Alfabético sigue sin comparar a nadie —es el nombre, que es lo único con
  lo que ella lo reconoce, y no una propiedad suya—, así que FR-1821 se cumple igual y el
  test de invariancia sigue verde. Los sin nombre van al final. Y tiró dos casos que
  afirmaban `boxes.nth(0)`: pasaban por la coincidencia de que la primera fila de la
  portada y la primera de las casillas eran el mismo niño, cuando lo que FR-1411 promete
  es que **el niño por el que entró** está en el lote.
- **Un recorrido con clave de verdad** (`020` T040): tres hojas, una cifra de coste, una
  firma cada vez, y una corrección después nombrando las hojas caducadas por alumno.
  Necesita dinero y una persona.

## G53 · La firma del corpus, retirada el mismo día que se escribió

**Cerrado 2026-09-06**, y anotado porque el razonamiento sirve para lo siguiente.

Escribí el canal de actualización del corpus con una firma Ed25519 sobre bytes canónicos
verificada contra una clave compilada en la aplicación, y lo presenté como bloqueado
esperando que alguien decidiera dónde vive la privada. Carlos lo retiró: «te conectas al
repo y fuera, tienes la firma de GitHub».

**Tenía razón, y el argumento es el que importa.** La privada habría vivido en un secreto
de CI — así que **cualquiera con acceso de escritura al repositorio** podría haber
cambiado `/recipes` y hacer que CI lo firmara. La firma defendía sólo contra un atacante
capaz de alterar lo que sirve GitHub **sin** tener acceso al repositorio ni a CI: un CA
comprometido, un intermediario. Para una herramienta pequeña de PTs en centros españoles
eso es un modelo de amenaza inventado, y el coste era real: una clave que nadie sabía
gestionar, un proceso de release que se puede romper, y un modo de fallo en el que se
pierde la clave y el canal muere.

Y chocaba con el resto de la arquitectura. Este proyecto ya trata el corpus como **texto
que la gente edita**: `recipes-local/` gana por id, `instructions/` es juicio que se
invita a corregir, y `029` deja importar un corpus normativo que nadie firma, defendido
por un escaneo. Firmar la copia del proyecto mientras ella edita la suya libremente era
coherente y pesado.

**Lo que quedó en su lugar.** Los hashes, como integridad y no como autoría: cazan una
descarga truncada, que es un fallo real y barato de cazar. La comprobación de rutas, para
que una lista de ficheros hostil no escriba fuera de su sitio. El escaneo de inyección
antes de que nada gobierne — que pasa de defensa en profundidad a **la** defensa, así que
gana importancia en vez de perderla. Y que nada gobierna hasta que ella lo lee y dice que
sí.

**La lección de proceso, que es mía.** Construí ~100 líneas de criptografía y 14 casos de
test para una amenaza que nadie había pedido defender, y luego describí el resultado como
«bloqueado por una decisión tuya» — que suena mejor que «he construido algo de más». La
pregunta que no me hice fue *contra quién* protege esto, y la respuesta —contra
prácticamente nadie que no tenga ya acceso de escritura— estaba disponible antes de
escribir la primera línea.

## G51 · Un corpus normativo no se puede actualizar: se reimporta

**Abierto 2026-09-06** por `029` T029. Va con `034-como-llegan-las-versiones`.

> **Nota 2026-09-06, con `034` construida.** El canal de `034` publica el corpus
> **incluido** —recetas, instrucciones, checklists— y `instructions/normative/` viaja
> dentro de él, así que un corpus normativo **que envía el proyecto** ya se actualiza por
> ahí. Lo que sigue abierto es el que **ella trae**: ése vive en su vault, el proyecto no
> lo firma y no tiene por qué conocerlo. Reimportar sigue siendo el camino, y sigue siendo
> fricción real para el escenario que hace que esa capa exista.

Los corpus incluidos viajan en la release, como el resto del corpus. Los que ella
trae **no**: si quien se lo pasó corrige un error el mes que viene, el camino es
volver a elegir el fichero y volver a activarlo. Funciona, y es una fricción real
para el escenario que hace que esta capa exista — que un territorio se mantenga solo.

Lo que no puede cambiar cuando eso se resuelva: **FR-2710**. Un documento firmado es
lo que era cuando se firmó, y su línea de procedencia ya está dentro. Una actualización
de corpus no reescribe nada de lo que ya hay en su carpeta, y quien diseñe la entrega
de actualizaciones tiene que decirlo por escrito, no darlo por hecho.

## G50 · «Elegir un fichero» se escribió dos veces, y ahora una

**Cerrado 2026-09-06** por `029` T020, y anotado porque el patrón se repetirá.

`ipc/ingest.ts` tenía su propio `dialog.showOpenDialog` para fichas; `029` necesitaba
el mismo para una normativa. Extraerlo y dejar el otro habría sido dos
implementaciones de la única regla que importa ahí —que **el renderer nunca compone
una ruta**—, y una regla con dos implementaciones es una regla con un sitio donde
olvidarla. Ahora es `ipc/pick.ts` con dos llamantes.

Queda uno más: `ipc/pictograms.ts` elige un **directorio**, no un fichero. No se ha
tocado porque `pickFile`/`pickFiles` no cubren ese caso y forzarlo habría sido un
parámetro que sólo usa un llamante. Cuando aparezca el tercer selector de directorio,
esa es la señal.

## G49 · La aplicación no sabe qué normativa sigue una maestra fuera de Andalucía

**Cerrado 2026-09-06** por `029`. Anotado aquí porque es el fallo que este proyecto
era menos capaz de ver desde dentro, y el patrón vale para lo siguiente.

Durante un año Rampa dijo «Séneca» a todo el mundo. Séneca es la plataforma de
Andalucía; la pareja ACNS/ACS y las Instrucciones de 8 de marzo de 2017 son el marco
de Andalucía. `017` lo dejó escrito en sus Assumptions —«Andalusia first, y las
secciones viven en el corpus para que una segunda comunidad sea un fichero
Markdown»— y la segunda mitad no se cumplió: las secciones estaban en
`instructions/guide.md`, el fichero base que recibe todo el mundo.

**Por qué no se vio.** Quien lo escribió trabaja bajo ese marco, así que «España» y
«Andalucía» se leían como sinónimos en el código y en ningún sitio decía lo
contrario. No hacía falta ninguna decisión equivocada: bastó con que nadie de fuera
lo leyera.

**La forma de la solución, que es lo reutilizable.** Un contrato con **cero campos que
lleguen a una comprobación**. Un corpus dice cómo se llaman los documentos y qué frases
se imprimen; no tiene ranura para tocar las reglas de examen, la marca de borrador, la
redacción, el filtro clínico ni la negativa de los objetivos. Así el escaneo de
importación sólo tiene que **contar** un intento, no derrotarlo. Si algún día un campo
nuevo le diera ese alcance a un corpus, el campo está mal, no la regla.

**Lo que queda vivo:** G51 (actualizaciones), y que ningún corpus incluido puede pasar a
`reviewed_by_teacher: true` hasta que alguien que trabaje bajo esa normativa discrepe de
algo concreto — `es-an` incluido.

## G48 · «Borrar todo lo suyo» no llegaba a lo que Rampa le había escrito sin adaptar

**Closed 2026-09-05** by `028` T020. **Necesita validación de protección de datos.**

`planForget` recorría `material/` haciendo una pregunta: «¿existe
`material/<trabajo>/<código>/`?». Es la pregunta correcta para una hoja **adaptada**,
porque una adaptación vive en un directorio con el nombre del niño.

Es la pregunta equivocada para todo lo que Rampa escribió *para* un alumno sin adaptarlo,
que no tiene directorio y lleva el código en el front matter de `ir.md`:

- un documento de estructura — una agenda, una secuencia, una historia (`028`);
- y **una composición que ella no ha adaptado todavía**, que es suya desde que se escribe
  — `016` T006 las metió en el expediente por esa misma razón.

O sea que la segunda mitad de este fallo es anterior a `028` y lleva ahí desde `016`. La
consecuencia es la que `003` FR-215 existe para evitar: ella pulsa «borrar todo lo suyo»,
la pantalla dice que no queda nada, y en su carpeta se queda un fichero con el código de
ese niño dentro.

Arreglado leyendo `startedFor(ir.md)` además del directorio, con las dos direcciones
comprobadas: lo suyo se va, y la agenda de otro niño **no** se toca — borrar a un alumno
no puede llevarse la tira que otro lee cada mañana.

**Pendiente de una persona**: si el resultado satisface el derecho de supresión de datos
de un menor es un juicio de protección de datos, no un resultado de test. Igual que el
hallazgo 0.2 de esta misma noche, queda para quien lleve protección de datos o legal.

---

## G47 · Un `<datalist>` mata la ventana, y `fill()` no lo ve

**Closed 2026-09-05** by `032`, and the lesson is about the test rather than the control.

The área input was an `<input list>` bound to a `<datalist>` of her subjects. Pressing one
real key opened the suggestion popup and **took the renderer down with it**: her window
gone mid-sentence, with whatever she had not saved.

The offline suite passed. The e2e suite passed. Both would have kept passing for ever,
because Playwright's `fill()` sets an input's value without dispatching key events — so a
test can type into a datalist input all day and never open the popup that crashes. What
found it was `press('L')`, by hand, in the built application, while looking at something
else.

**The rule this leaves**: `fill()` tests the *state* a control ends in, never the *act* of
using it. Where a control's behaviour is in the interaction — popups, autocomplete, IME,
anything that opens on input — a test has to press keys. `e2e/cur-areas.spec.ts` does, and
says why in its own header; `cur-only-and-untied.test.ts` keeps `<datalist>` out of the
tree, because the fix that only lives in a comment is not a fix.

The replacement is better anyway: buttons for the subjects she already has, a plain input
for the ones she does not. One press instead of typing a name correctly.

---

## G46 · Los ejemplos de perfil no los leía ningún test, y llevaban un campo que se tira

**Closed 2026-09-05** by `032` T020.

`docs/profile-schema.md` says `profiles.example/` is «safe to read and copy», and nothing
parsed those files. Both of them carried a top-level `notes:` — which `profileSchema` does
not know and `saveProfile` explicitly drops (`const { _unparsed, notes: _n, ...rest }`).

So a teacher following the documentation put her notes in `profile.yaml`, and the next
save deleted them. Silently, in the field the schema's own docs call «more weight in
practice than the numbers». Notes live in `profiles/<code>/notes.md`, which is what the
same document says three sections later — the example contradicted the page it was on.

Found by writing the test that reads the directory, which is the whole point: a
directory shipped as documentation and read by no test drifts from the code it documents,
and the drift is invisible precisely because nobody looks at examples twice.

---

## G45 · Pictogramas que se elegían, se escribían en memoria y no llegaban al papel

**Closed 2026-09-05** by `031-el-segundo-eje-de-frescura` (found by its research R1,
while looking for something else).

`applyPictograms` stamped `data-picto` on the **parsed** adapted document; `adapt.ts`
then wrote `result.out` — the raw pre-mutation model output — to `adapted.md`. The
mutated document only ever fed the report, and the report records words without ids. So
the pairs existed for the length of one function call and never reached the disk.

The other end is what makes it a defect rather than a missing feature: `print.ts` read
`data-picto` **back from the file**, under the comment «what is on the sheet was decided
when it was adapted». A read of a value nothing persists — G36's shape with the write and
the read separated by a file, which is why the type checker could not see it either.

No test caught it because no test round-tripped adapt → disk → print: the e2e stopped at
the corpus, and the shell test asserted the in-memory `used` list. **That is the lesson,
and it is not «write more tests»**: a test that asserts on the same in-memory value the
code just computed cannot tell whether the value was ever written down. When a datum
crosses a file, the test has to cross it too.

Fixed by `stampPicto(raw, perBlock)` patching the raw markdown at the write, which is
also what made `031` possible at all — the second freshness axis needs the datum on disk.

---

## G44 · A multi-word keyword is indexed and unreachable

**Open, added 2026-09-04** (review AGE-05, the half without a decision).

`readSet` indexes a catalogue's keywords whatever they are, so «lavarse las manos»,
«por favor» and «darse la vuelta» are all in the map — and `matchWord` is handed
**one word at a time**, by a tokeniser that splits on `\p{L}[\p{L}\p{M}'-]*`. Every
multi-word key is therefore in the index and unreachable, permanently.

`018` FR-1609's "exactly one or none" is not the obstacle; the tokeniser is. Two
things would have to change together:

1. **An n-gram pass over the block's content**, checking two- and three-word spans
   against the index before the single-word pass, so the longest key wins. Cheap, and
   the "one or none" rule applies unchanged.
2. **The `data-picto` encoding**, which is the actual blocker. It is
   `word=id word=id`, space-separated — a key with a space in it cannot be written
   into it without changing the format, and that format is read by `parsePicto`, the
   HTML renderer, the linear renderer, the ODT renderer and `031`'s coming freshness
   axis. It is also what a teacher reads when she checks which drawing went with
   which word, so it has to stay legible.

**Why it is a backlog entry and not part of the lemmatiser** (decision P20 asked for
«lematización determinista mínima» and got it): this half has no decision on it, and
the encoding change touches five readers plus a spec that is not written yet. Doing
it inside a corpus fix would be the kind of quiet format change this project's own
history warns about.

**What it costs meanwhile:** AAC vocabularies are full of multi-word actions —
precisely the ones a `scope: instructions` sheet wants. So the scope that exists so a
learner can understand *what is being asked* is the one still losing keys.

**Closure criterion:** a set whose catalogue contains «lavarse las manos» puts that
pictogram on a sheet that says it, `data-picto` still reads as word→id to a person,
and every existing reader of the attribute is updated in the same commit.

---

## G43 · A photograph she brings is still sent at the size her phone made it

**Open, added 2026-09-04** (review COD-05, half fixed).

`008` FR-616 asks for images to be reduced to the corpus bound before they are
sent, and until today **nothing applied the bound at all** — `planDownscale` was
parsed, typed, imported and never called. That is fixed for the two paths where
this application holds actual pixels: a scanned PDF page (pdf.js hands over
decoded pixels) and a HEIC photograph (libheif does). Both now go through
`toSendablePng`, which is `planDownscale` plus a box filter plus a PNG encoder.

**What is still not done:** an already-encoded JPG, PNG or WEBP that she picks
from her phone or her scanner folder is sent exactly as it arrived. Resizing it
means decoding it, and this application ships no image decoder for those formats —
by an explicit choice recorded in `read.ts`: «everything here is pure JS or WASM on
purpose, because a native module's failure mode in Electron is an application that
does not launch, on one platform, after a version bump, and the person holding it
is a teacher who cannot read the stack trace».

Three ways out, none free:

1. **The renderer's canvas.** Chromium decodes and re-encodes anything, and this
   was the original plan (P39 said «pdfjs en el renderer»). It costs a main↔window
   round trip for every page, and it does not work when there is no window — which
   is every headless run, including the e2e suite.
2. **pdf.js as a decoder.** It ships a pure-JS JPEG decoder, reachable by wrapping
   the photograph in a one-page PDF in memory. Dependency-free and deterministic,
   and too clever by half for a repository that prizes being readable.
3. **A native or WASM codec.** The thing `read.ts` decided against.

**What it costs meanwhile:** a 12-megapixel photograph is priced by tile count, so
a full-resolution page can cost several times a legible one for the same
extraction. It is money, not correctness — the extraction itself is unaffected,
which is why this is a backlog entry and not a defect.

**Closure criterion:** a photograph she brings at 12 megapixels leaves this
machine at the corpus bound, on a headless run, with no native dependency added.

---

## G42 · The name list is code, and it should be a list a school can extend

**Open, added 2026-09-04** (review AGE-01, decision P17).

`COMMON_NAMES` in `packages/core/src/redact/names.ts` is the last line between a
child's real name and a provider, for names that are **not** in the encrypted
store — another pupil she mentions, a sibling, a child with no name saved, or a
Linux machine with no keyring where nothing is persisted at all.

It held about sixty traditional Spanish names, and the review found what that cost:
Sofía (top three in Spain for a decade), Fátima, Mohamed, Aya and Ainhoa were all
absent, so the bias fell precisely on the migrant pupils over-represented in a PT's
caseload. It is now several hundred names covering Spanish, Moroccan and Arabic,
Romanian and Eastern European, Latin American, Chinese and Sub-Saharan given names,
and the sentence-initial hole is closed (the first candidate token of each line is
a candidate whatever the list says, which is what makes the list non-load-bearing).

**Two things still wrong with it.** It is assembled from what frequency lists in
Spain look like rather than from a verified INE extract; and it lives in code, so a
school whose intake this list does not describe — or a country that is not Spain —
cannot fix it without a release. `029` makes territory policy a corpus a teacher can
extend and `033` handles the vehicular language; the name list belongs in the same
place, with the same «additions only, nothing can be removed» rule the clinical term
list uses.

**Closure criterion:** the frequent-names list is corpus, extensible per
installation, additions-only, and the shipped Spanish one has been checked against
a real frequency source.

---

## G41 · Nobody owns code signing, and the release path is already wired

**Open, added 2026-09-03** (decision P52, review CRIT-06).

Deferring signature was decided well and written in the wrong place: a comment in
`electron-builder.yml` («Revisit before any public release beyond Linux») and `006`
research R14/R15. Meanwhile `npm run dist` plus the `publish: github` block already
form the complete path to push an unsigned NSIS that SmartScreen will block and a
DMG that Gatekeeper will reject — and nothing in the repo would remind whoever
publishes.

**Closure criterion, explicit:** before the first public release for macOS or
Windows, the installers are signed (and notarised where the platform requires it);
**until then, no macOS or Windows installer is published.** Linux (AppImage) is not
gated. The decision now lives here rather than in a yml comment.

---

## G40 · Co-official languages are out of v1, and the application must say so honestly

**Open, added 2026-09-03** (decision P51, review CRIT-04).

The UI reserves the slot (`LocaleCode` already includes `ca`, `gl`, `eu`) but no spec
and no recipe says what the pipeline does with classroom material whose language is
Catalan, Galician or Basque — the majority situation in several communities. The
linguistic recipes are reasoned over Spanish; applied to Catalan material they would
be the wrong policy applied fluently.

**Decision: out of scope for v1, declared rather than discovered.** When Rampa
detects material in a co-official language it tells the teacher honestly that it
cannot adapt it yet, instead of adapting in the wrong language or with the wrong
recipes. The honest message is **pending implementation** — it is code, and it goes
through the flow. The path in is already decided by P3/P28 (a corpus per language,
`recipes/lang/<code>/`): these languages enter when Spanish is solid.

---

## G39 · Three MUSTs of `011` wait for a person who can validate real curricular content

**Open, added 2026-09-03** (decision P31, review CONS-14).

`011` FR-918 (official curricular elements with their codes), FR-920 (the PT/AL
objective taxonomy) and FR-921 (built from the source instruction, not copied from
another application) are deferred, annotated in the spec on 2026-09-03. The reason
is the right one and it is recorded in `011`'s own tasks.md: Rampa ships no
curriculum database, and writing a plausible one would put an invented list in
front of her — the exact thing this project refuses to do with axes, exercises and
criterios. What was missing was the register: the spec said MUST, the tasks said
«not done», and nothing forced anyone to revisit.

**Closes when** a person qualified to validate curricular content (a practising PT,
or someone working from the official sources) builds or reviews the Spanish
elements and the PT/AL taxonomy. `check-fr-coverage.sh` is being hardened in
parallel (P31, queue item 0.3) so that a mention no longer counts as coverage.

---

## G38 · `022` was cited as shipped without a plan, tasks or code

**Cerrado 2026-09-04**, added 2026-09-03 (decisions P21/P42, review CONS-01/COD-10).

`022` has been through plan → tasks → implement: `specs/022-material-que-se-ve/tasks.md`
is the register of what was built and what still needs a person. The two citations the
entry was about have been settled rather than left dangling — `023` T023's deferred half
is re-asserted against diagrams that now exist, and `pictograms/fetch.ts`'s reference to
`022` FR-2008 names an implemented rule again. What remains open in `022` needs a
photocopier and a teacher, and says so.

`022-material-que-se-ve` (diagrams as markup) had, when the review ran, a spec —
and nothing else. Yet `023`'s input said «after `022` shipped» and `023` T023
ticked an assertion about «`022`'s diagrams». Both corrected 2026-09-03; `022`
carries a process note in the style of `019`'s.

This entry is the honest register: **`022` is genuinely pending until it has been
through plan → tasks → implement.** Carlos's decision keeps it prioritised — it goes with
the exam/problems and structure-material work, because teaching multiplication
needs the diagram (queue item 3.2). The gate is being hardened so a spec cited by
code or declared shipped/built by another spec must have `plan.md` and `tasks.md`
(P42, queue item 0.3).

---

## G37 · What three clean reviewers found in six thousand lines

**2026-09-02.** Carlos, before looking at `023`–`025` himself: «lo revisas bien antes de
que lo mire yo? con un agente limpio por favor.» Right instinct — I had been inside this
for hours and was the worst available reviewer of it.

Three independent reviews, told what the code was for and **not** what I thought of it.
What they found, and what it says:

### The thing that mattered most

**Rampa told her, in Spanish, on screen and inside her own vault file, that changing a
pictogram marked her old sheets as out of date. Nothing did that.** Staleness compares
`ir.md`'s fingerprint, and a vocabulary change does not touch `ir.md`. `024` FR-2218 was
claimed in a doc comment, in a sentence she reads, and in a file that outlives the
application — and implemented in none of the three. The `previous` variable computed for
it existed only to fill a log field, which is what a requirement satisfied by nobody
looks like from the inside.

Fixed by saying what actually happens. Reopened as G35.

### Two security findings, and the second is the shape of the first

`checkUpdate` reached ARASAAC **with no licence gate** — and kept reaching it after she
withdrew, so `withdrawLicence`'s «stops further fetching» was false. I had written
comments in two files warning about precisely this: «a gate in a caller is a gate the
second caller walks past». I was the second caller, three hours later.

And it interpolated `inventory.language` into the URL with no allowlist, from a vault
file the renderer can write — a one-shot arbitrary-text egress channel to a third-party
government server's access logs. «De tu ordenador no sale ninguna palabra» is what the
licence screen *tells her*, so the screen was lying too.

Fixed structurally rather than per-instance: `httpTransport` is no longer exported and
`transportFor(gate)` is the only way to obtain one. A fourth call site cannot make a
request without a gate result. **That is the lesson**: a rule enforced by a caller is a
convention; a rule enforced by a type is a rule.

### And the reviews of the tests were worse than the reviews of the code

The test reviewer mutated the source and ran the suite. Results:

| mutation | 1.458 tests |
|---|---|
| `names: await nameWordSet()` → `new Set()` (FR-1610, the accent fix) | **all passed** |
| `chosen: await chosenWords(lang)` → `new Map()` (`024`'s headline) | **all passed** |
| delete the progress subscription (the defect Carlos reported) | **all passed** |
| `writeAtomic` → plain `writeFile` | **all passed** |
| metadata written last instead of first (SC-2205) | **all passed** |
| every banned phrase added to the learner page's installed state | **all passed** |
| selection state deleted from the chooser entirely | **all passed** |
| `roomFor` always `'unknown'` (FR-2208 becomes a no-op) | **all passed** |
| a PNG added to `instructions/`, which ships | **all passed** |

The pattern: **the tests were on both sides of every seam and on none of them.**
`nameWords` had unit tests. `matchWord` had unit tests given a hand-built set. Nothing
asserted the two were ever joined — and the accent defect had lived in that join.

Also found: a test asserting `x <= x`; one that deleted the URL it was searching for
before searching; one enumerating its own return type; one comparing a file's line count
to a different file that still exists.

All of the above are now fixed and **each fix was verified by re-running the reviewer's
mutation**. One could not be: atomicity is not observable from userland with a 300-byte
file, so it is asserted in the source with that limitation written down.

### One guard was deleted rather than fixed

`props-are-read.test.ts`'s payload-field check could not be made to work. Two versions
both passed with the subscription deleted — the defect it existed for — because a text
search cannot tell a read of *this* payload from a read of any other `done`. Replaced by
a component test that asserts the bar renders. A test that looks like a guarantee and is
not is worse than no test; see G36 for the general problem.

### The count

Sixteen values written and read by nobody are now recorded in this repository. Two of
them were in the commit whose comments counted to fourteen. It is not carelessness in
one place — it is what happens when a comment is allowed to stand in for a test, and the
review's sharpest single line was about a defended line of code: **«a comment defending
a line is not a test.»**

---

## G36 · «Is this declared field ever read?» needs the type checker

> **Sixteenth instance, 2026-09-07, and the first in the artefact a child receives.**
> `data-heading="true"` was written by `ingest/to-ir.ts` and read by nothing, so a heading
> on the original worksheet came out as a paragraph and the adapted sheet had **no headings
> at all**. Repaired by `037`.
>
> Two things about how it was found are worth keeping. It was **not** found by the type
> checker this entry asks for — an attribute in a `Record<string, string>` is typed
> correctly whether or not anybody reads it. And it was **not** found by a conformance
> checker either: the sheet passed WCAG 2.2 A/AA clean with the defect in it. It was found
> by rendering a real fixture and **looking at the output**, while measuring something
> else.
>
> Partial progress on the entry's own ask: `ui/test/exports-have-readers.test.ts` (2026-09-07,
> G58) now fails on an exported symbol no other module reaches. That covers functions and
> constants. A **field of a payload** — which is what this one was — is still uncovered.
**Open.** `props-are-read.test.ts` catches an unread **prop** because a prop is
destructured — a mechanical, local signature. It cannot catch an unread **field of a
payload**: two attempts at a text heuristic both passed while the actual subscription was
deleted, because `at.done` and `screen.label` are indistinguishable from a read of the
thing you meant.

Sixteen instances of this defect are on record here, so the guard is worth having
properly. It wants a TypeScript program: resolve the symbol, count references, exclude
declaration sites. `ts-morph` or the compiler API, run as a test.

Recorded rather than attempted, because a broken guard on this is worse than none — it
is what the deleted one was.

---

## G35 · Changing a pictogram does not mark the old sheets

**Closed 2026-09-05** by `031-el-segundo-eje-de-frescura`. It was briefly a lie rather
than a gap (see G37), which is the part worth keeping.

What shipped is the second axis described below, plus the thing the gap did not ask for:
she is told **how many sheets** a change will affect *before* she makes it, and it is the
same number the record then shows — one deriver, asked twice, which is why the two cannot
drift (`031` FR-2905). `024` FR-2218 is closed with the same date. The sheets are not
rewritten: `031`'s e2e compares the bytes of a signed sheet across the change.

Two things were found on the way and are worth the sentence. The count first walked every
entry inside a job directory as if it were a learner code, `ir.md` included, and read
`material/job-a/ir.md/adapted.md` — caught by the e2e, fixed by walking with the record's
own `learnersOf`, because two enumerations of «which learners does this job have» is the
same defect as two definitions of «stale». And the record row carried a `? 'usas' :
'usas'` — a ternary whose two arms were the same string, G36 in one line.

The original gap follows, unchanged.

`024` FR-2218: changing her answer for an ambiguous word MUST mark the sheets made from
the previous one as stale rather than rewriting them (`005` FR-520's rule). Not
implemented. Staleness compares `readingFingerprint(parseIR(ir.md))`, and a vocabulary
change does not touch `ir.md`.

**It is computable**, which is why this is a gap and not a design problem: `data-picto`
already records word→id per block on every adapted sheet, so a sheet whose recorded id
for a word differs from her current answer is stale by inspection. What it needs is a
second freshness axis beside the reading fingerprint — which is a spec, because
`005`'s data model has exactly one today and adding a second silently would be the
fourteenth thing in this repository that two places disagree about.

Until then the screen and `vocabulario.md` say what actually happens: the old sheets keep
the old drawing, and she is not told they are out of date.

*(That «until then» ended on 2026-09-05. Both texts now say what happens instead, and a
test forbids the old sentences from reappearing anywhere in `ui/` or `core/` — the vault
file's copy mattered most, because that file outlives the application.)*

---

## G34 · Three e2e suites at once, and an hour each

**Closed 2026-09-02** by not doing it again.

While implementing `025` I started a full Playwright run, edited the navigation, started
another, and then a third — each in the background, each launching Electron instances,
all on one laptop. They took **1.1, 1.6 and 1.6 hours** instead of 1.6 minutes, with
individual tests timing out at 15–17 minutes against a 60-second limit.

The result was 11, 15 and 12 «failures» that were almost entirely contention, and I
could not tell them apart from real ones without discarding all three and running one
suite alone. Which is worse than having run nothing: three hours of laptop, no
information, and it is exactly the disruption Carlos had complained about that morning
(«no puedo currar mientras tú testeas»). `RAMPA_HIDDEN=1` stopped the windows appearing;
it does not stop three suites fighting for the CPU.

**One real defect did come out of it**, and it is recorded because the sweep was right
to catch it: the rail's `rail-who` was an `<h2>`, and the rail precedes `<main>` in the
DOM — so Configuración's document started at H2 and its own `h1` arrived second. It had
been latent since `020`, invisible because the a11y sweep only walked top-level screens
and the rail only showed that heading inside a learner. `025` gave Configuración the
same shape and the sweep reached it. Now a `<p>`: the `<nav>` already carries the
accessible name, so a heading inside a navigation landmark was decoration with a tag.

**Rule.** One suite at a time, and wait for it. A second run started «to save time»
costs more than the first one took, and it poisons the evidence.

---

## G33 · Sizes extrapolated from one sample, twice in two days

**Closed 2026-09-02** by measuring instead.

`023` was designed word-by-word because I asserted the whole catalogue would be
«hundreds of megabytes of vocabulary no learner of hers will meet». That was a guess,
and it cost a whole specification: the numbers turned out to be an order of magnitude
cheaper, and Carlos had to ask twice for a button that should have been there.

Then `024` did it again in the other direction. `expected_megabytes: 60`, derived from
**one** pictogram — «casa» at 300px, 3.960 bytes — multiplied by 13.802. A complete real
download came to **157 MB**: an average near 11 KB, because a drawing with interior
detail is not a house. Left in, the free-space check would have cleared a disk with
72 MB spare and then filled it two thirds of the way through.

Both are the same move: one observation, generalised, stated as a fact, and then used as
the basis for a design decision. It is what `cost_measured: false` in the service
catalogue is honest about and what these numbers were not.

Now: `expected_megabytes` carries a comment saying where the figure came from and when,
the UI reads it from the corpus instead of holding its own hardcoded «55 MB», and
`pictogram-whole-set.test.ts` fails if anybody tidies the number back down below what
was actually observed.

**What did NOT go wrong**, and is worth recording because it is the counter-example: the
same download measured 2 min 45 s against a promised fifteen minutes, and 13.800 of
13.802 images with two unavailable upstream and reported. Those held because the plan
said «measure it» and the task list had a line for doing so.

---

## G32 · An IPC channel name is a string, and nothing checked them

**Closed 2026-09-02**, by a crash.

`024` registered `pictograms:choose` for «she picks a pictogram». That channel was
already the **folder picker**, and Electron's response is not a warning:

    Error: Attempted to register a second handler for 'pictograms:choose'

thrown during startup, before the window. The whole application was dead — every
pictogram e2e test failed, and so did the screenshot script, which is how it surfaced.

It is the **fourth name collision of the day**, after `inScope`, `Candidate` and
`vocabulary`. The first three were caught the moment they were written: two by the
barrel file at the point of export, one by the type checker. This one could not be,
because a channel name is a string — and the cost was correspondingly higher: not a
confusing import six weeks later, but the application refusing to start.

`packages/shell/test/ipc-channels.test.ts` now asserts three things: no channel is
registered twice, the preload never invokes a channel nobody handles, and every
registration uses a literal string so the first two cannot be blinded.

**Lesson.** Four collisions in one day is not four accidents. This repository has
`Verdict` three times, `Freshness` twice, `materialKind` shadowed, and now this. The
pattern is that a name is chosen for what it means *locally* — «choose», «candidate»,
«in scope» — in a codebase where the same local meaning recurs in every feature. The
cheap defence is what worked three times out of four: a single place that sees all the
names at once and fails when two collide. Where the language cannot provide one, a test
has to.

---

## G31 · «One primary control per screen» has never been tested

**Closed 2026-09-04** (decision P35, review CONS-25). `e2e/primary-control.spec.ts`
counts visible `.btn-primary` inside `.main` on every rail destination, every section
inside a learner, every step of preparing something that is reachable without a
provider, and both of the questions the adapt screen asks — at 1366px and at 900px
with `xlarge` text, which is the width and scale where `023` broke it.

It found **one** violation on its first run, and the violation was twenty minutes
old: the pre-spend profile notice (P15) put a strong «Seguir igual» beside the
screen's own strong «Está bien leído, sigue». Fixed by the rule that reads correctly
anyway — while she is being asked something, the question is the screen — in one
expression shared by both gates so a third one cannot forget.

Two more things it changed, and one it cannot reach:

- The **batch list** gave every learner a solid «Revisar y firmar», so three
  learners meant three. Strong only when there is one row now; with several they
  are equal choices with the state on their badges.
- The **record** rows follow the same rule, decided the same way when «Revisar y
  firmar» was added there (P11).
- **Not walked by a test:** the batch list itself, because reaching it needs a real
  provider run. The rule holds there by construction rather than by assertion, and
  that is stated rather than left to be discovered.

The original text follows, because the reason it went untested for a month is the
part worth keeping.

---

**Was open**, small, and found by looking rather than by running anything.

`013` FR-1105: «Exactly one control per screen MAY carry primary weight. Emphasis that
is everywhere is emphasis nowhere.» It is enforced by nobody. Two greps confirm it: no
test counts `.btn-primary` per screen, and the two places FR-1105 appears in the e2e
suite are about something else — an action saying what is missing rather than going
grey.

`023` broke it within an hour of adding two buttons, and it was caught by a screenshot
at 900px with `xlarge` text: «Traer los pictogramas» and «Guardar» both solid. Fixed
there by making the section's strong button plain in `compact` mode.

The test is easy to write — walk every screen the rail reaches and count
`.btn-primary` — and the reason it has not been written is worth stating: it would
probably fail on several existing screens, so writing it is a small piece of work
followed by an unknown amount. That is a reason to do it deliberately, not a reason to
keep relying on somebody noticing.

Same shape as the `aria-pressed`-without-`.door-on` defect on 2026-09-01: a rule that
lives only in a specification is a rule that holds until somebody is in a hurry.

---

## G30 · Bajar los pictogramas es fácil; elegir entre varios, todavía no

**Closed 2026-09-02 by `024`.** The chooser exists: `ui/src/pictograms/ChooseWord.tsx`,
reachable from the report line that says the word was skipped, showing the candidates as
**pictures** rather than ids, and recording her answer **once for every learner** rather
than per child — which was the data-model defect `018` shipped and `024` FR-2214
corrects.

What is *not* done is recorded in `024` T021: the full loop — adapt, choose, re-adapt,
pictogram present — is not asserted in the real window, because it needs a provider key.
The pieces are covered offline.

The original entry follows, because the reasoning is what produced `024`.

---

**Was open, and was the next thing.**

`023` made fetching pictograms one button. The first real fetch against ARASAAC —
«casa», «perro», «multiplicar» — returned **26 pictograms for three words**.

Every candidate is kept deliberately (`023` FR-2113), because `018` FR-1609 says an
ambiguous word gets **no** pictogram and gets reported: the wrong pictogram is worse
than none, since the child reads the picture, she reads the text, and she may never
notice. That reasoning is still right.

But the consequence is that a teacher can press the button, see «he traído 3 palabras»,
and get a sheet with no pictograms on it — with nothing connecting the two facts.

**What `023` did about it**: the fetch now says so, by name, before it lists anything
else — «Ojo: 2 palabras tienen varios dibujos posibles («casa», «perro»). Hasta que
elijas cuál, no pongo ninguno.»

**What is still missing**: the screen where she chooses. `018` FR-1612 gives her the
override and the data model holds it (`decision.overrides`), but there is nowhere to
see the four candidates for «casa» side by side and pick one. Until there is, the
override is a field only a developer can set — the twelfth unread field, arriving from
the other direction.

**Not a defect `023` introduced.** A folder assembled by hand from ARASAAC's own site
behaves identically, and `018` shipped that way in August. What `023` changed is that
the gap is now easy to reach, which is exactly when a latent gap starts costing
somebody an afternoon. That is an argument for building the picker, not for having
left the download out.

---

## G29 · Rampa invented a price, and quoted it in euros — *FIXED, TWO ITEMS OPEN*

Carlos, reading the badge in the foot of the rail: «¿qué coño es eso de este mes gratis?
que esto es open source y libre!» — and then, on being told what the figure was: «¿eso está
midiendo cuánto has gastado del token al que te conectas?»

Answering that second question honestly took four findings.

**1 · «gratis» was the wrong word.** `formatCost(0)` returned «gratis», so the badge read
«Este mes: gratis» — the vocabulary of a plan somebody is selling, in an application whose
argument is that there is nothing to sell. Now «nada». The service catalogue keeps its own
«gratis», and there it is correct: it describes a provider's free tier.

**2 · The figure was fabricated.** This is the serious one. `costCents` fell back to
`{ input: 3, output: 15 }` — roughly Claude Sonnet's price list — for any model not in
`PRICES`. `PRICES` knows **four** models; the catalogue offers **six services**, and the
`compatible` adapter reports the model the corpus names. So `llama-3.3-70b-versatile`,
`mistral-large-latest`, `deepseek-chat` and `gpt-4.1` all landed on the fallback.

Including **Groq, which is free**. A teacher on the free tier was shown a euro figure for
money she had not spent, on a screen she has no way to check — while the stated reason for
showing cost at all is that an unknown bill stops her using the tool.

Fixed by refusing: `costCents` returns `null` for a model it cannot price, `addCost` makes
one unpriced chunk make the whole job unpriced, `monthTotal` reports `{ cents, unknown }`,
and `isUnusuallyExpensive` computes «usual» from the priced jobs only — counted as zero,
a free-tier month would have taught the gate that everything is expensive.

**3 · The estimate quoted the wrong provider.** `estimateCents` defaulted to
`claude-sonnet-5` whatever she had connected — two call sites, one of them the gate that
decides whether to warn her before an expensive batch. The model argument now has no
default and comes from the active service.

**4 · The badge did not say what the figure was of.** «Lo que llevas gastado este mes en tu
propia cuenta de IA» existed only in a `title` attribute — a tooltip, invisible on a
touchpad and to a screen reader in browse mode. Carlos read a bare figure in the foot of a
rail as a commercial plan, which is what it looked like. The label is now on screen.

### Open

- **`PRICES` is compiled in**, and its comment claimed for months that it was «shipped as
  data and updated with the corpus». It is not. It belongs in the corpus by Principle I —
  a moving rate should be an update, not a release — and the same is true of `USD_TO_EUR`.
  Until then, unpriced services report nothing, which is at least honest.

  **Actualizado 2026-09-06 (`034` T026): el vehículo ya existe.** «Una actualización y no
  una release» era, hasta hoy, una frase sin nada detrás — el corpus viajaba dentro del
  instalador, así que mover una tarifa significaba publicar una versión de la aplicación.
  `034` construye el canal: un fichero del corpus firmado por el proyecto, enseñado
  entero, aceptado por ella, aplicado moviendo un puntero. Mover `PRICES` y `USD_TO_EUR`
  al corpus es ahora un trabajo pequeño y con sentido, y **sigue abierto**: el vehículo
  existiendo no mueve nada por sí solo.

  Lo que **no** cambia al moverlos: una tarifa en el corpus la ve ella antes de que se
  aplique, como cualquier otra corrección. Una tarifa que se aplicara sola sería un número
  sobre su dinero cambiando sin que nadie lo decidiera, que es el defecto original de G29
  con otro disfraz.
- **`cost_measured: false` on every catalogue entry.** Nobody has ever measured what a
  worksheet actually costs on any service. The figures the catalogue shows during
  onboarding are estimates that say so, but the honest fix is a measurement.

**Lesson.** The fallback was written to keep a function total — every `Usage` gets a number
— and a total function was the wrong goal for a value that is a claim about her money. This
project refuses to invent an unobserved axis, an unverifiable exercise and a criterio it
cannot source; the cost of a call is the same kind of fact, and it took a user asking
«¿gastado de qué?» to notice that one number had been exempted.

## G28 · Rampa told a teacher more than the licence says — *TEXT CORRECTED, THREE ITEMS OPEN*

### Added 2026-09-02: the download itself needs the same review

`023` reads ARASAAC's terms as permitting Rampa to fetch pictograms at her request:
a public keyless API published for applications, conditions requiring attribution and
non-commercial use rather than prohibiting software from fetching, and a copy that
travels from their server to her disk rather than through a release of ours.

**That reading is mine and I am not a lawyer.** It is also the reading that reversed a
requirement I had written the other way round six days earlier, which is a reason for
more scrutiny rather than less. What should be confirmed by somebody qualified, before
a release rather than before a branch:

1. That a fetch on her instruction, after an on-screen acceptance, is not distribution
   by us.
2. That a free, open-source Apache-2.0 application whose *output* she may not sell is
   compatible with the NonCommercial term — including the case where somebody packages
   Rampa commercially and the pictograms she already fetched are on her disk.
3. That the three sentences now on the acceptance screen are accurate, since they are
   the basis on which she agrees.

The code holds the line either way: `023` FR-2101 keeps bundling and redistributing
forbidden, and `no-pictograms-shipped.test.ts` now asserts it instead of promising it.


Carlos, reading the pictogram screen: «esto qué mierda es? no puedo decirle al usuario
que se tiene que bajar algo… la herramienta va a ser gratis, podemos usar eso o no?»

Fair, and going to read CC BY-NC-SA 4.0's text instead of remembering it found that **two
of the three things Rampa told her claimed more than the licence does**. I wrote them, two
days ago, in `018`.

| What Rampa said | What the licence says |
|---|---|
| «No se pueden usar con fines comerciales» — as a flat prohibition | §1.11: *«not primarily intended for or directed towards commercial advantage or monetary compensation»*. A public classroom is precisely what that is not. **Her use was never the problem** |
| «Una hoja con un pictograma es obra derivada, así que hereda la misma licencia. Eso afecta a lo que puedes hacer con tu propio material» | §3(b) applies ShareAlike to the **adapted material**, not to the whole work containing it. Told flatly to a PT it reads as «everything you make with this becomes restricted» — a reason not to use a legitimate resource |
| «Toda hoja lleva la atribución, la pongo yo y no se puede quitar» | Correct, and unchanged |

**What survives, and it is the only real constraint**: Rampa must not **bundle** them —
not because the tool is free, but because the repository is **Apache-2.0**, which permits
commercial use. Somebody could take the repo, sell it, and be distributing NC material in
a commercial product. The conflict is about the *code's* licence, not about her.

### Two items open

**1 · `018`'s «not even behind a confirmation» is more conservative than the licence
requires.** Fetching from the official source, at her request, is a client using a public
service — not redistribution. Nothing is hosted and nothing enters the repository.
Carlos chose the assisted download.

**BLOCKER, and it is real**: I could not read ARASAAC's **own** terms of use. Their terms
page returned no content and `api.arasaac.org/docs` is a 404. I know they publish an API
and that free applications use it; **I have not confirmed it in their source**, so the
download must not ship on my assumption. Somebody reads that page first.

> **Reconciled 2026-09-03 (decision P26, review CONS-07).** The paragraph above and the
> facts around it had come to contradict each other: `024` records `023` as shipped, so
> the download *was* built ahead of this blocker, and **no human has read ARASAAC's terms
> yet** — `023`'s «Read on 2026-09-02» is the author's own reading of the licence text,
> verified only against the API, not a human read of ARASAAC's terms page. Carlos's
> decision reconciles rather than erases: the blocker is superseded by an explicit
> closure criterion — **a human reads ARASAAC's own terms of use (and compliance/legal
> if applicable) before the first public release; until then the feature exists in the
> repository but is not distributed.** «Must not ship» becomes «must not release», which
> is what it should have said: the thing a teacher can be harmed by is a distributed
> build, not a branch.

**2 · A legal read of the on-screen text.** Requested by Carlos and correct: I am not a
lawyer, and a sentence about licences on a teacher's screen is read as fact. The text now
stays inside what the licence text says, which is the most I can honestly do alone.

## G27 · An error that asked a question with nowhere to answer it — *CLOSED 2026-09-01*

Reported by Carlos, adapting a worksheet: «no entiendo este mensaje que me ha salido».

What he saw, and all three parts of it were wrong:

> **Casi** · 0 de 1 ficha adaptada, sin firmar. Hay que mirar cada una por separado.
> **No ha salido** · Puede que haya un nombre en tus notas. No he enviado nada: dime si es
> de un alumno y lo sustituyo por su código.
> [ Intentarlo otra vez solo con … ]

**1 · The dead end.** The error asks her to say whether the word is a learner's name «o
márcalo como que no es un nombre» — and there was nowhere to say either. `names:ignore`
was implemented, exposed over IPC, and had `useIgnoreWord` in the data layer, **called by
no screen**. Twelfth thing in this project written and read by nobody, and the first one
whose absence left a user stuck.

**2 · The message lost the word.** The thrown error says «hay un posible nombre en tus
notas: **Marta**». Three separate places replaced it with a template: `es.ts`, and a
fourth hand-rolled copy of `es.errors[kind] ?? message` inside `AdaptScreen`. She was
told a name existed and not which.

That is the **same inversion** fixed this morning, in the other direction: there a
template for «we have no idea» beat a message that knew something; here a template beat a
message carrying the one value she needed. Writing the rule down finally: **a kind whose
message interpolates a value gets no translation.** Asserting it found two more —
`ingest-format` (which file type) and `output-incomplete` (truncated versus three missing
blocks, different situations with different next steps).

**3 · «0 de 1 adaptada… hay que mirar cada una por separado.»** The batch's sentence,
told to somebody whose run produced nothing. Mirar *qué*. One sentence per situation now.

### What it says about the other three

`useErrorText` existed precisely so this logic lived once. Three screens used it and one
did not, and the one that did not was the screen where errors are most likely — which is
the ordinary way a shared helper stops helping: not by being wrong, but by being optional.

## G26 · A selected state marked only in the accessibility tree — *CLOSED 2026-09-01*

Reported by Carlos, using it: «no me deja seleccionar el que quiero que prepare». It did
let him. It just never said so.

The new kind picker set `aria-pressed` and nothing else, and the stylesheet paints a
chosen `.door` from the class `.door-on`. So the state flipped, the primary control
unlocked, and **the screen looked identical before and after the click**. A person cannot
use a control whose only feedback is in the accessibility tree.

### The one that was worse, found by looking for others

`ScopeQuestion` — the box where she tells Rampa what to change — did
`className={scope === 'learner' ? 'primary' : ''}`, and **`.primary` has not existed
since the v2 rewrite renamed it to `.btn .btn-primary`**. That is the exact rename
`ui/test/styles.test.tsx` was written to catch, and it had been sitting there ever since:
she picked one of three scopes and all three looked the same.

### Why the detector was blind, and what it does now

`styles.test.tsx` collected classes from **static `className="…"` only**. A conditional
class is precisely where a *selected state* lives, so the one category of class that a
stylesheet rename breaks invisibly was the one category it never read. The control still
works, so nothing fails, and only somebody looking at the screen notices.

It now also collects string literals in **result position** inside `className={…}` —
after a `?` or a `:`. Refined twice while writing it, and both refinements are recorded in
the file because they are the difference between a detector and a nuisance:

1. Taking *every* literal in the braces reported `variant === 'wide'` and
   `tone === 'neutral'` — values being compared, not classes being applied.
2. The static pass read the raw file, so it had always been counting classes **quoted in
   prose**. It surfaced when a comment explaining this very fix cited the broken
   `className="…"` it replaced. Thirteenth time a test here tripped over its own
   documentation.

Verified by reintroducing the defect: the detector names it.

### What this says about the e2e that passed

`e2e/compose-kind.spec.ts` asserted `aria-pressed` and that the primary control unlocked.
Both were true. **Neither was what he needed.** The spec now checks both channels — the
assistive one and the visible one — because `010` FR-812 says a state carried by one
channel is a state somebody cannot perceive, and here that somebody was everybody.

## G25 · The eleventh field nobody read, and what finally caught it — *CLOSED 2026-09-01*

Found while implementing `021` US2, by an end-to-end test rather than by a review.

`material-kinds.md` gained `composing.before` — «te voy a proponer las preguntas de una
prueba con nota… tú validas cada pregunta» — the parser read it, the type carried it, and
`corpus:materialKinds` did not send it to the renderer. The screen showed the label alone.

**Eleventh instance** in this project of a field written, parsed, typed and read by
nobody. And the worst one to lose: that sentence is what tells a PT what it means to ask
a language model to write an exam.

### Why the existing detectors did not catch it

| Detector | Why it was blind here |
|---|---|
| `props-are-read.test.ts` | Checks that a **prop** a component declares is read. This field never became a prop — it was dropped one layer earlier, at the IPC boundary |
| `check-fr-coverage.sh` | Checks requirements against tasks. FR-1911 *was* cited by a task, and the task was being done |
| Typecheck | The mapping is an object literal. Omitting a field from one is legal |

The gap is specific: **a corpus field crossing from the main process to the renderer.**
Closed by a guard in `corpus-guarantees.test.ts` that asserts every field written *for
her* is in the mapping, and that the fields written for the model (`rule`) and for the
main process (`forbids`, `composing.on_document`) are **not** — so their absence reads as
a decision rather than an omission.

### The count, and what it says

Ten of the eleven were found by writing something down: archiving requirements, writing a
test first, or explaining a design in prose and noticing the sentence had no referent.
None was found by reading the code looking for it.

## G24 · The four defects behind one «Algo ha ido mal» — *CLOSED 2026-09-01*

Found by **Carlos running the application** and pressing «Preparar el material». Not
by a test, not by a review, and not by me: by the first person to use the thing.

What he read:

> **Atención**
> Algo ha ido mal. No he perdido nada de lo tuyo.

What the log knew:

```
ERROR ipc.failed {"channel":"job:compose","kind":"unknown",
                  "message":"El servicio devolvió un error (404)."}
```

**The message existed and the kind existed. Neither reached the screen.** Four
defects stacked, each hiding the next, and they are worth keeping separate because
they fail in four different ways.

### A · The corpus field nobody read — *the tenth time*

| Source | Model |
|---|---|
| `instructions/providers/google.md` | `gemini-2.5-flash`, dated `last_checked: 2026-08-28` |
| `packages/providers/src/google.ts` | `defaultModel: 'gemini-2.0-flash'` — **what ran** |

`providerFor()` passed `entry.model` to the `compatible`/`openai` adapters and dropped
it for `google` and `anthropic`, which returned their own constants. Nothing in the
shell sets `req.model`, so the constant always won. Google **shut `gemini-2.0-flash`
down** — confirmed against `ai.google.dev/gemini-api/docs/models` on the day — so the
free-tier path the README recommends for a teacher's first run could not adapt
anything at all.

This is **Principle I inverted**: the judgement lived in Markdown, the Markdown was
maintained, and the code overrode it. The fix is one helper, `withModel`. The durable
part is `corpus-model-reaches-provider.test.ts`, which asserts it for **every entry
that declares a model** and checks the request on the wire rather than the field — the
field was never wrong, it was correct about a model that no longer existed.

### B · The most expensive of the four · a whole layer of Spanish that could not be reached

`ProviderError extends Error`, not `RampaError`. So `isRampaError` said no,
`toWire` shipped it without the `[rampa:kind]` prefix, `fromWire` found no kind, and
the interface fell through to the catch-all — **for every provider failure there is**.

Which means these five sentences in `es.ts` were written, reviewed, and unreachable:

| kind | What she could never read |
|---|---|
| `offline` | «No hay conexión. Todo lo demás sigue funcionando: puedes leer tus notas y volver a imprimir.» |
| `rate-limited` | «El servicio está ocupado. No es culpa tuya: espera un poco.» |
| `key-invalid` | «La clave ya no vale. Habrá que ponerla otra vez.» |
| `key-no-credit` | «La clave es correcta pero la cuenta no tiene saldo.» |
| `provider-failed` | «El servicio ha fallado. Vuelve a intentarlo en un momento.» |

The comment in `core/src/errors.ts` describes this exact failure — «the mapping
silently never matched and every failure fell through to *algo ha ido mal*» — and
says it was fixed. It was fixed for one of the two error hierarchies, because
somebody had built two.

**The lesson, and it is the same one as A**: a second class that means the same thing
is a second path to maintain, and it is the one nobody tests. Closed by inheritance,
plus `error-kind-survives.test.ts` over the full round trip including the prefix
Electron adds.

### C · `unknown` counted as a translation

`t.errors[kind] ?? message ?? t.errors['unknown']`. `unknown` **is** a key, so the
lookup succeeded and the `?? message` was unreachable — in precisely the case it was
written for. The comment above the line describes the intended behaviour and the line
does the opposite.

### D · The `Callout` announced its kind backwards

`{!title && <span className="sr-only">…}`. With no title the `<strong>` already said
«Atención», so it was said twice; **with** a title — nearly every callout in the
application — the kind was announced nowhere and the border colour was its only
carrier. That is the violation FR-812 exists to forbid, in the shared component every
screen uses.

Found from a duplicated «Atención» in text Carlos pasted: `.sr-only` is hidden from
the eye but travels with the clipboard, so the copy showed what the screen could not.

### What this says about the test suite

1.245 tests, 76 end-to-end, and none of them could see any of these. The reason is
uncomfortable and worth writing down: **every test in this project stubs the
provider.** That is correct — a suite that calls a paid API is a suite nobody runs —
but it means the seam between the catalogue and the adapters, and the seam between a
provider error and a Spanish sentence, were both exercised only by fixtures that
agreed with the code.

`009` T041 has said «connect all six for real, once» since it was written, and is
still open. **It would have caught A on the first run.** It is not a formality, it is
the only test that was ever going to find this, and it needs six accounts and a
little money.

## G23 · A corrected extraction does not mark the sheets made from it — *CLOSED 2026-09-01*

Found 2026-08-31, by archiving `005`'s requirements against its tasks. Built the next
day as `005` Phase 7, T021-T030.

**What shipped, and why it is neither of the two options below.** Both options this
entry recorded key on *when* the extraction was confirmed — a date, or the file's
modification time — and `setPageVerified` rewrites `ir.md` on **every** confirmation.
So both of them mark every sheet stale for a click that changed nothing she can see,
and a tool that says «esto está desactualizado» about everything has said nothing.

What the sheet records instead is a fingerprint of the reading itself: each block's id
and text, in order (`packages/core/src/ir/reading.ts`). Front matter, the `verified`
flag and her own hand edit of the sheet all move around it without moving it.
Freshness is derived on read — there is no `stale: true` anywhere, which is this
entry's own warning honoured rather than argued with.

Three states, not two: `unknown` for every sheet made before this existed. Calling
those fresh is a claim we cannot check, and calling them stale marks a teacher's whole
folder as suspect the day she updates.

The original analysis follows, kept because the reasoning that rejected it is worth
more than the conclusion.

**FR-520**: «Correcting the extraction after adaptations exist MUST be allowed, MUST
mark the affected sheets stale **by learner name**, and MUST NOT re-run anything on
its own.»

Two of the three hold. `setPageVerified` lets her un-confirm and correct a page after
adaptations exist, and nothing re-runs by itself. **Nothing marks the affected sheets
stale**, and nothing names the learners.

Why it matters, concretely: she photographs a worksheet, adapts it for three learners,
then notices Rampa read «47 × 8» as «4/ × 8» and fixes it. The three sheets on her desk
were made from the wrong reading, and Rampa says nothing. She has no way to know which
of the material in her folder predates the correction — and the sheet is the thing that
reaches a child.

**Why it is a backlog entry and not a task yet.** The mechanism is not obvious. A
«stale» flag on an adapted document is a fourth thing in the front matter that has to
stay true through a re-run, a revision, a sign-off and a hand edit — and `014` already
found that a stored fact about the vault is a second copy of a truth the filesystem
already holds. The honest options are: derive staleness by comparing the IR's
modification time against each `adapted.md`'s (cheap, and wrong the moment she edits
the IR for an unrelated reason), or record the extraction's verification date on the
adapted document at the moment it is written (a real fact about the process, like
`adapted_on`, and the one that survives a hand edit).

The second is probably right, and «probably» is why this is written down rather than
built at the end of a long day.

## G22 · The DPO gate on `017` — *WITHDRAWN 2026-08-31*

Not a gap. A gate I invented and Carlos removed, and he was right to.

`017`'s spec said, in bold: «this feature must not be planned until the DPO and legal
have been asked», and I spent two documents preparing that conversation — including
one, `docs/dpo-la-guia.md`, working out *which* DPO. Then Carlos pointed out what
should have been obvious from the first line of the README:

> «esto es una puta herramienta ahora mismo open source que se ejecuta como una
> aplicación en local… el responsable será el que use la herramienta»

**Rampa is not a controller and not a processor.** It receives nothing, stores
nothing, and there is no service behind it. Whoever runs it is the controller, and
their DPO's opinion is a fact about their deployment — not a precondition for the
software having a feature. Nobody blocks a feature in LibreOffice because a school
might save an informe psicopedagógico as a `.odt`.

**What was hiding behind the gate, and where each piece went:**

| | Whose question | Where it lives now |
|---|---|---|
| What the tool does with a diagnosis — read it, keep the measures, store none of it | **Ours.** A design decision, already made | ADR 0002, and `017` FR-1507 |
| What she is told before she uploads — the page goes to her provider entire | **Ours.** An honesty requirement | `017` FR-1509 |
| Whether a given school may do this | Theirs, and not a blocker | `docs/proteccion-de-datos.md`, which is written for them |

`docs/dpo-la-guia.md` is deleted: three of its four questions were ours to answer,
which was the whole of Carlos's point. The half of it worth keeping — the table of
claims a reader can *check* rather than believe — moved into
`proteccion-de-datos.md`, where a school that adopts this can use it.

**Why keep the entry rather than delete it.** Because the failure mode is worth
naming: caution wearing a compliance costume. It cost two documents and a spec that
sat unplannable while the actual requirement — *say what leaves the machine before it
leaves* — was one line and already written.

## G21 · The bundled font's licence text — *CLOSED 2026-08-31*

Found by writing `018` T001's licence check, which was written to assert that no
ARASAAC asset is here and found something else instead.

**Atkinson Hyperlegible** (`app/ui/src/assets/fonts/`) was bundled and credited
**nowhere**: not in `NOTICE`, not in `LICENSE-CONTENT.md`, not in the built
application. It is SIL Open Font License 1.1, Copyright 2020 Braille Institute of
America, and the OFL requires the copyright notice and the licence to accompany the
files.

**Closed the same day.** The authoritative OFL 1.1 text was fetched from SIL's own
`openfontlicense.org/documents/OFL.txt` — not reproduced from memory, which is why
this was a backlog entry rather than an immediate fix: a licence file with a word
wrong is worse than a pointer to the right one. It sits at
`app/ui/src/assets/fonts/OFL.txt`, in the same directory as the fonts, because a
licence that can be separated from what it licenses is a licence that will be.
`NOTICE` and `LICENSE-CONTENT.md` both name it, and
`packages/core/test/pictogram-licence.test.ts` asserts the credit exists.

**Why it is worth keeping this entry rather than deleting it**: it is the same class
of failure the whole of `018` is built around — using somebody else's licensed
content without carrying the condition that came with it — and we were doing it in
the repository that contains the document explaining how careful we are about
licences.

## G20 · No recipe reduces load in explanatory prose — *CLOSED 2026-08-31*

Found by `012` T005 turning `recipe.scope` on and the selection baseline making the
consequence visible.

With scope honoured, a **study text** — `explanation` and `example` blocks, no
exercises — selected **zero** recipes for a learner with `COG>=2` or `EJE>=2`. Every
load recipe in the corpus was scoped to `exercise` or `assessment`.

The coverage was never real. Before the filter that learner received
`one-task-per-page`, which is about exercises and was being applied to prose, and
`exam-access-not-difficulty`, which is about exams and was nonsense there. Two
misapplied recipes are not coverage; they are two wrong answers that happened to be
present.

**Closed as the entry demanded: not by loosening a scope.** Two recipes were
written — `recipes/core/chunk-the-prose.md` (`COG>=2`) and
`recipes/core/signpost-the-page.md` (`EJE>=2`) — and the baseline test was inverted
rather than deleted, so it now fails if a prose recipe acquires `exercise` in its
scope or if the study text goes empty again.

### Writing them found something about the corpus format

**`axes:` is AND.** `chunk-the-prose` was written `[COG>=2, EJE>=2, ATE>=2]`,
intending «any of these», which means «all three at once» — and it fired for
**neither** baseline profile. A recipe written to close a coverage gap, covering
nothing: the ninth instance in this project of something written, parsed and read by
nobody, and the first one where I was the author of the file.

Three consequences, all recorded:

1. `recipes/README.md` now says it, with this failure named. There is no OR, and a
   rule that applies to «`COG` or `EJE`» is **two recipes** — which turned out to be
   the honest decomposition anyway: what a page needs to be *chunked* and what it
   needs to be *startable* are different judgements, even for the same learner.
2. `selection-baseline.test.ts` asserts each prose recipe fires for the axis it was
   written for **and does not fire for an unrelated one** — because «applies to
   everybody» is the other way to make that test pass and it would mean nothing.
3. `signpost-the-page` is scoped to `instruction`, so it now fires on an exam. Half
   of it must not: «empieza por la 1» changes how a paper is taken, and a progress
   box beside a question is scaffolding `012`'s checklist forbids. The recipe says
   so, and `kinds.test.ts` asserts the prose says so.

### Still needs a person

Both recipes are `reviewed_by_teacher: false` in spirit — the corpus's own standard
is «false until a practising PT **disagrees** with something concrete», and nobody
has read either. The `chunk-the-prose` example is a circulation text I wrote; a PT
may well say the summary box is exactly what she has been told not to give.

## G19 · Corpus families missing for three axes## G19 · Corpus families missing for three axes

*(Renumbered 2026-08-30: this was filed as G16 and so was «the Spanish education
file is unreviewed», two different gaps under one number in the same document —
found while working through the backlog, which is the only way anyone would.)*

New gap, found by the problem pass. The corpus has nothing for `MOT`
(response-route: dictate, type, point — the axis is *how they answer* and no
recipe answers it), nothing for `PER-A` (auditory access / sign-language-L1
beyond what `lectura-facil` incidentally covers), and `REG` exists only inside a
conflict recipe. A profile with `MOT>=2` today selects zero recipes for the
response route and the model improvises from the hard rules alone.

Also missing, found by the functional-inventory pass of 2026-08-28: the **visual
support and pictograms** family that the vision document planned (§6) and nothing
since has mentioned. It carries a technical dimension the other families do not —
inserting image assets into output — and a licensing one: ARASAAC, the set
Spanish schools actually use, is **CC BY-NC-SA**, so bundling it with the
application needs a real look before anyone writes code (local fetch by the
teacher may be the honest route).

Severity: Medium — the hard rules and the overlay carry some of it, and ADR
0001's ablation will measure how much recipe coverage actually matters. Home:
`recipes/core/`. This is also the community's most natural first contribution,
and should be framed that way when contributions open.

## G18 · Provenance does not record which service produced the material

Found by `009`'s plan, and deferred there deliberately rather than patched through
a connection screen.

Adapted material records `data-recipe: id@version` and the axis that justified
each change (Principle VI). It does not record **which AI service produced it.**
With one provider that was invisible; with six offered and switching expected, a
teacher comparing last month's sheets with this month's cannot tell whether a
difference came from a recipe change, a corrected note, or a different model.

Severity: Medium. It changes the provenance contract in `docs/ir.md`, so it
belongs to a feature that owns that change — not to the screen that happened to
notice.

## G17 · One sheet for a mixed group — recorded as a non-goal, deliberately

Found by the functional-inventory pass. A PT's aula de apoyo often holds three or
four learners with *different* profiles working the same session, and a real
practice is designing **one** activity accessible to all of them (UDL-style),
not four parallel sheets. Rampa's whole model — profile-driven, per-learner —
points the other way, and G3/spec-005 (one worksheet → N *separate* sheets) does
not cover it either.

Decision: **out of scope, on purpose, until Phase 0 says otherwise.** Designing
to the intersection of several profiles is exactly the judgement-heavy work where
a tool's mistakes are least visible, and no learner's file justifies the result.
If validation teachers ask for it, it comes back as its own spec with its own
guardrails — recorded here so that reappearance is a decision and not a drift.

**Lesson for the process.** All three defects were introduced by writing a new
artifact that restated something an older one already defined, instead of pointing
at it. Cheap to fix now, and they would have surfaced as contradictory tasks.

## G16 · The Spanish education file is unreviewed

`instructions/education/es.md` was written by a language model from general
knowledge on 2026-08-29 and **parts of it are wrong**. It ships with
`reviewed_by_teacher: false` and a test asserts that flag stays false.

Not a blocker: it is orientation, the teacher's word outranks it everywhere it is
used, and the alternative is the model's own unwritten assumptions about what a
ten-year-old knows. Good enough to work with while we find out whether any of this
is useful at all.

Where I am least confident, so a reviewer knows where to look first:

- **FP Grado Básico** — typical ages 15/16 are a guess; real entry is often later.
- **4.º de ESO** — left vague because LOMLOE changed the académicas/aplicadas
  split. Possibly too vague to be useful.
- **Bachillerato General** — the newest modality and the one I know least.
- **ESPA** — two levels is right; the mapping to ESO years I would not defend.
- **Every `studies` line** — state minimum only, and seventeen communities develop
  their own curriculum on top.

Closed when a practising teacher has **disagreed** with something specific — not
when one has read it and nodded. Same standard as G2.
