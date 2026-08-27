# Specification backlog

Gaps found in the audit of 2026-08-27, before planning Phase 0. Recorded so they
are decisions rather than omissions.

Nothing here blocks Phase 0 validation.

**Status 2026-08-27:** G1, G4, G5 and G7 are closed. G2 is drafted and waiting on
review by a practising teacher — it is not closed until someone who teaches has
disagreed with it. G3 and G6 remain open.

| # | Gap | Severity | Where it should live |
|---|---|---|---|
| ~~G1~~ | Retention and erasure of learner data | **Closed** 2026-08-27 | `003-memory` FR-215…220 |
| ~~G2~~ | Axis calibration guidance | **Drafted** 2026-08-27, awaiting PT review | `docs/axis-calibration.md` |
| G3 | Several learners, one worksheet | High | New spec `005-group` |
| ~~G4~~ | Recipe versioning | **Closed** 2026-08-27 | `data-recipe: id@version` |
| ~~G5~~ | Corpus validation script | **Closed** 2026-08-27 | `scripts/validate-recipes.sh` |
| G6 | Agent compatibility matrix | Medium | `docs/compatibility.md` |
| ~~G7~~ | Stated accessibility target for the output template | **Target stated** 2026-08-27, untested | `templates/base.html` |
| G8 | Phase 1 modalities (audio, braille-ready, ODT) unspecified | Low, deliberate | New spec, after Phase 0 |

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

## G6 · Agent compatibility matrix

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

## Process gap

`plan.md` and `tasks.md` do not exist for any spec. The specifications were
hand-written against the Spec Kit templates rather than produced by
`/speckit-specify`, which means the process gates — the Constitution Check in the
plan template, and the `/speckit-clarify` de-risking pass — have not been run.

Correction: drive the remaining flow through the commands, starting with
`/speckit-clarify` on `001` before `/speckit-plan`.
