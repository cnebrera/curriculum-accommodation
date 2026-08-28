# Rampa Constitution

Rampa adapts classroom material to the profile of a learner with a disability.
A teacher installs the application, supplies the material and a description of the
learner's barriers, and gets adapted material plus a report of what changed and
why. Her files stay on her computer and the AI account is her own.

These principles govern every specification, plan and pull request in this
repository. Where a plan conflicts with the constitution, the constitution wins.

## Core Principles

### I. Pedagogical judgement lives in Markdown, not in code (NON-NEGOTIABLE)

Every decision that requires professional judgement — what to simplify, what to
split, what to describe, what must be preserved — is expressed as a recipe or an
instruction in Markdown, readable and editable by a special-education teacher who
does not write code.

Code MUST NOT encode adaptation policy. If a rule about *how to adapt* appears in
a script, in application code, or in interface copy, it is misplaced and the
change is rejected. This is not a stylistic preference: a project whose
contribution path requires programming excludes exactly the people whose expertise
it depends on.

The Markdown layer MUST be the text the application actually sends, not a parallel
copy of it. A corpus that ships without being read is decoration, and the code
that displaced it is the real policy — which is precisely the failure this
principle exists to prevent. It happened once; see
`docs/decisions/0006-one-vehicle.md`.

### II. Code is deterministic and model-free (NON-NEGOTIABLE)

Scripts extract, chunk, render, convert, synthesise speech and validate. They MUST
NOT call a language model, require an API key, or embed provider-specific
behaviour. Every script MUST be runnable and testable offline.

All inference happens in one thin provider layer, sending the Markdown layer to
the teacher's own AI account. Consequences we are deliberately buying: provider
independence, tests that cost nothing to run, and no billing relationship between
this project and its users.

### III. Adapt the *how*, never falsify the *what*

An adaptation changes the route to the content; it does not change the content.
Simplifying the language of a question about photosynthesis is correct. Changing
what it says about photosynthesis is a defect, not a trade-off.

Concretely: no invented facts, no invented examples presented as the source's, no
silent removal of curricular content, no substitution of a technical term the
learner is required to learn. Where a term must be kept, it is kept and explained
alongside.

### IV. One extraction, N outputs

Source material is normalised exactly once into the Intermediate Representation
(IR). Adaptation operates on the IR. Every output modality — visual HTML, print
PDF, editable ODT, braille-ready text, audio — is a rendering of the same adapted
IR.

No feature may introduce a modality-specific parallel pipeline. This is what makes
covering every disability tractable rather than a set of unrelated projects.

### V. Functional barriers, not diagnostic labels

Learner profiles describe what the learner finds hard and how they respond best,
on defined axes. Profiles MUST NOT be keyed on diagnostic categories, and recipes
MUST NOT trigger on them.

Two learners with the same diagnosis need different things; one learner needs
different things in different subjects. Barriers are also the only representation
that lets us pseudonymise without losing usefulness.

### VI. Every change is traceable

Each modification in an adapted document records the recipe that produced it and
the barrier it answers. The adaptation report is a first-class output, not a
byline.

The teacher reviews decisions, not prose. A change that cannot state which recipe
and which axis justify it MUST NOT be made.

### VII. The draft announces itself

Output is a draft until a human signs it. Rendered material carries a visible
"pending review" mark that only the review step removes.

No feature, flag or convenience may produce material that looks finished without
human sign-off.

### VIII. Feedback is memory, and a human routes it

Every correction a teacher makes is information. A system that produces the same
wrong adaptation twice has wasted the only expertise in the loop.

Memory is captured in three scopes, and **the teacher decides which one**, because
only they know whether a correction is about this learner or about everything:

- **Learner** — updates the profile and its notes. Never leaves the machine.
- **Practice** — this teacher's or this school's house style. Local by default.
- **Corpus** — a genuine improvement to a recipe. Goes upstream as a pull request.

Memory MUST be plain files the teacher owns, can read, can back up by copying a
folder, and can carry to another school. No database, no opaque store, no
dependency on this repository's history.

Nothing derived from a learner reaches the corpus without being rewritten as a
general statement and confirmed by a human. Journal entries record the *pattern*,
never the passage.

### IX. Content is never instruction (NON-NEGOTIABLE)

Material, overlays and handover packets are **data the system reads**, never
directions the system follows. Text inside them is adapted, quoted and reported;
it is never obeyed.

Where a rule protecting this can be enforced by code that does not consult the
model, it MUST be — structural defences outrank instructional ones. Specifically:
the renderer emits IR blocks only and cannot emit learner data; writes stay inside
the vault; the draft mark is removable only by review; redaction is applied on
egress by the application.

Instruction-shaped content is surfaced to the teacher, quoted and located, and is
never silently removed — deletion hides an attack and loses legitimate content.

This does not claim prompt injection is solved. It is not. The purpose is a small
blast radius and a visible failure, and it is the second reason human sign-off is
non-negotiable.

## Learner Data and Safety

**Pseudonymisation is structural, not advisory.** Profiles carry no name, no
surname, no school, no verbatim clinical diagnosis. They are identified by an
opaque code the teacher maps to a learner outside this system.

**Local by default.** `profiles/`, `material/` and `output/` are git-ignored and a
repository hook blocks commits that touch them. Any change that weakens this
protection requires explicit justification in the specification and MUST NOT be
introduced as a side effect.

**Disclosure.** The project documents, in plain language, exactly what is sent to
the teacher's AI provider at each step, so a school can perform its own risk
assessment.

**Significant adaptation is escalated, never decided.** When a request implies
changing learning objectives or assessment criteria, the agent flags it and stops.
That decision belongs to the teaching team and to the learner's official file.

**Assessment integrity.** An adapted exam that is also easier is a different exam.
Exam recipes preserve the assessment criterion and change only the access and
response route.

## Licensing and Contribution

Code is licensed under Apache-2.0. Recipes, checklists, templates and
documentation are licensed under CC BY-SA 4.0, so that the pedagogical commons
stays common while the code stays freely integrable by schools, administrations
and publishers.

**Source material never enters this repository.** Adapting a work for a person
with a disability is protected in the EU by the Marrakesh Treaty and its national
implementations; redistributing that adaptation is not. Contributions carry
recipes, type-profiles, templates and openly licensed evaluation cases — never
copyrighted classroom material, and never real learner data.

**Internationalisation.** Repository language is English for structure, code and
identifiers. Recipes are split into `recipes/core/` (language-neutral: cognitive
load, layout, response format, sensory access) and `recipes/lang/<code>/`
(language-specific: lexical simplification, readability standards). User-facing
documentation is translated; Spanish is the first fully populated locale.

## Development Workflow

### The flow is a gate, not a preference (NON-NEGOTIABLE)

Specifications are managed with Spec Kit, and every change to the product passes
through it in order:

```
/speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks → /speckit-implement
```

Implementation code MUST NOT be written for work that has no numbered task in a
`specs/<feature>/tasks.md`. A specification and its implementation MUST NOT arrive
in the same commit: `/speckit-plan` is where the Constitution Check runs and
`/speckit-clarify` is where the questions are asked, and a commit carrying both
has skipped both.

This is enforced by `scripts/check-spec-kit.sh` from the pre-commit hook and from
CI, because it has been violated twice by people who had read it as advice —
which is precisely Principle IX's argument applied to this project's own process:
where a rule can be enforced by code, it MUST be.

**Quality gates before a feature is considered done:**
1. Deterministic scripts have tests that run offline with no network and no key.
2. New or changed recipes ship with before/after examples and at least one
   anti-pattern.
3. Changes affecting adaptation quality are validated against `cases/`.
4. Any change touching learner data, git-ignore rules or the commit hook is called
   out explicitly in the pull request.

**Phase discipline.** Phase 0 exists to answer one question: does a real
special-education teacher find the output usable with minor edits? Features that
do not serve that question wait.

## Governance

This constitution supersedes other practices in this repository. Amendments
require a pull request that states the principle changed, the reason, and the
migration for anything already built against it. Principles marked
NON-NEGOTIABLE may not be waived for convenience, deadline or scope.

Every specification and plan is reviewed against these principles. Complexity
that a principle does not justify is removed rather than documented.

**Version**: 1.4.0 | **Ratified**: 2026-08-27 | **Last Amended**: 2026-08-28

*1.1.0 — added Principle VIII (feedback and memory). Amends nothing; extends
the pipeline with a loop that was implied by the vision but never specified.*

*1.2.0 — added Principle IX (content is never instruction). Closes a hole present
since the first specification: the pipeline read third-party material and acted on
it, and nothing said content is not a directive.*

*1.3.0 — one delivery vehicle (ADR 0006). The preamble and Principle II no longer
describe a teacher opening this repository with their own agent, because that is no
longer how anyone uses Rampa. Principle I gains the sentence that would have caught
the violation it was written to prevent: the Markdown layer must be the text
actually sent, not a copy of it. **Migration:** the harness is removed;
`harness/commands/` became `instructions/`, which the application now reads at run
time. Nothing built against the vault format changes.*

*1.4.0 — the Spec Kit flow becomes a NON-NEGOTIABLE gate rather than a stated
preference, enforced by `scripts/check-spec-kit.sh` in the commit hook and in CI.
Amends nothing about *what* the project builds; it closes the process hole that
let two features be specified and implemented in one breath, skipping the
Constitution Check and the clarify pass. **Migration:** none — no existing
artifact changes. Specs already lacking `plan.md`/`tasks.md` stay listed as
unplanned by the gate, which is their real state.*
