# Specification backlog

Gaps found in the audit of 2026-08-27, before planning Phase 0. Recorded so they
are decisions rather than omissions.

Nothing here blocks Phase 0 validation.

**Status 2026-08-27 (later):** the vehicle is decided — a desktop application
over an open vault, specified in `006-desktop-app`. That closes or specifies G9,
G10, G11 and G13. G12 is now specified in `007-untrusted-content` and in Principle IX. The
remaining open items are G3 (several learners, one worksheet), G6 (agent
compatibility matrix), G14 (a document for the school's data protection officer)
and G15 (guardrails are norms, not controls — though `007` converts several of
them into actual controls).

G9-G15 were added by an adversarial pass from the
teacher's point of view (`docs/adoption-risks.md`). Three of them are more
serious than anything found before: nobody in the target audience can install
this, the privacy claim is not enforceable in the current design, and the
pipeline reads attacker-controllable content with no defence specified.

G1, G4, G5 and G7 are closed. G2 is drafted and waiting on
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
| ~~G9~~ | Delivery vehicle | **Decided** 2026-08-27 | ADR 0005 accepted → `006-desktop-app` |
| ~~G10~~ | Learner names reach the model | **Specified** 2026-08-27 | `006` FR-417…421 |
| ~~G11~~ | Flat `profiles/` caseload layout | **Specified** 2026-08-27 | `006` FR-412 |
| ~~G12~~ | Untrusted ingested material | **Specified** 2026-08-27 | `007-untrusted-content`, Principle IX |
| ~~G13~~ | Black-and-white photocopy legibility | **Specified** 2026-08-27 | `006` FR-427 |
| G14 | No plain-language document for the school's data protection officer | High | `docs/` |
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

**Lesson for the process.** All three defects were introduced by writing a new
artifact that restated something an older one already defined, instead of pointing
at it. Cheap to fix now, and they would have surfaced as contradictory tasks.
