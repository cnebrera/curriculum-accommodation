# Specification backlog

Gaps found in the audit of 2026-08-27, before planning Phase 0. Recorded so they
are decisions rather than omissions.

Nothing here blocks Phase 0 validation.

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
| G3 | Several learners, one worksheet | High | New spec `005-group` |
| ~~G4~~ | Recipe versioning | **Closed** 2026-08-27 | `data-recipe: id@version` |
| ~~G5~~ | Corpus validation script | **Closed** 2026-08-27 | `scripts/validate-recipes.sh` |
| ~~G6~~ | Agent compatibility matrix | **Moot** 2026-08-28 — no harness, no agnosticism claim (ADR 0006) |
| ~~G7~~ | Stated accessibility target, never tested | **Enforced** 2026-08-28 — `010` T018/T019 put axe in CI, failing the build | `specs/010-look-and-feel` |
| G8 | Phase 1 modalities (audio, braille-ready, ODT) unspecified | Low, deliberate | New spec, after Phase 0 |
| ~~G9~~ | Delivery vehicle | **Decided** 2026-08-27 | ADR 0005 accepted → `006-desktop-app` |
| ~~G10~~ | Learner names reach the model | **Specified** 2026-08-27 | `006` FR-417…421 |
| ~~G11~~ | Flat `profiles/` caseload layout | **Specified** 2026-08-27 | `006` FR-412 |
| ~~G12~~ | Untrusted ingested material | **Specified** 2026-08-27 | `007-untrusted-content`, Principle IX |
| ~~G13~~ | Black-and-white photocopy legibility | **Specified** 2026-08-27 | `006` FR-427 |
| ~~G14~~ | No plain-language document for the school's data protection officer | **Drafted** 2026-08-28, awaiting DPO review | `docs/proteccion-de-datos.md` |
| G15 | Guardrails are norms, not controls — and we do not say so | Medium | `AGENTS.md`, README |

---

> **Update 2026-08-27.** G1 and G2 are now blocking `004-handover`, not merely
> outstanding. Handover moves learner data between people, which makes retention
> load-bearing; and it only works if an axis level means the same thing to sender
> and receiver. They should be done as part of that feature, not before it in a
> separate pass.

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

## G16 · Corpus families missing for three axes

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
