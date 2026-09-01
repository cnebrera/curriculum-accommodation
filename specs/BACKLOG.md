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

## G7 · Accessibility target for the output template

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
