# Rampa Constitution

Rampa adapts classroom material to the profile of a learner with a disability.
A teacher clones this repository, opens it with their own AI agent, supplies the
material and a learner profile, and gets adapted material plus a report of what
changed and why.

These principles govern every specification, plan and pull request in this
repository. Where a plan conflicts with the constitution, the constitution wins.

## Core Principles

### I. Pedagogical judgement lives in Markdown, not in code (NON-NEGOTIABLE)

Every decision that requires professional judgement — what to simplify, what to
split, what to describe, what must be preserved — is expressed as a recipe or an
instruction in Markdown, readable and editable by a special-education teacher who
does not write code.

Code MUST NOT encode adaptation policy. If a rule about *how to adapt* appears in
a script, it is misplaced and the change is rejected. This is not a stylistic
preference: a project whose contribution path requires programming excludes
exactly the people whose expertise it depends on.

### II. Code is deterministic and model-free (NON-NEGOTIABLE)

Scripts extract, chunk, render, convert, synthesise speech and validate. They MUST
NOT call a language model, require an API key, or embed provider-specific
behaviour. Every script MUST be runnable and testable offline.

All inference happens through the teacher's own agent reading the Markdown layer.
Consequences we are deliberately buying: provider independence, tests that cost
nothing to run, and no billing relationship between this project and its users.

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

Specifications are managed with Spec Kit. Work starts at `/speckit.specify`, not
at the editor.

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

**Version**: 1.1.0 | **Ratified**: 2026-08-27 | **Last Amended**: 2026-08-27

*1.1.0 — added Principle VIII (feedback and memory). Amends nothing; extends
the pipeline with a loop that was implied by the vision but never specified.*
