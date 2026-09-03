# Feature Specification: Lengua vehicular en adquisición — el alumno que aún no habla el idioma del aula

**Feature Branch**: `033-lengua-vehicular`

**Created**: 2026-09-03

**Status**: Draft

**Input**: The adversarial review's PT reviewer (PROD-07): a learner arriving mid-course
without the vehicular language — the classic late-incorporation case, officially NEAE in
much of Spain — fits no axis. LIN models language *disorder* in native speakers; putting
LIN:3 on a child who simply does not know Spanish yet would falsify the profile to force
adaptations that are not his. Carlos's decision (P6):

> **Sí, entra: eje o marca propia + recetas** — barrera transitoria de lengua vehicular,
> distinta de LIN, con recetas propias (apoyo visual, vocabulario clave con traducción,
> español simplificado transitorio). Coherente con el producto multi-país (P3).

## The gap

A child from Morocco or Ukraine lands in February. He has no disability; his barrier is
that instruction arrives in a language he is acquiring. What he needs is specific and
different from every existing axis: massive visual support, key vocabulary with a bridge
to a language he knows, simplified *transitional* wording that keeps the curriculum
intact — and a profile that expects him to progress out of the barrier, because he will.

Getting this wrong has two failure modes the axes must avoid: treating him as
language-disordered (lectura fácil forever — wrong tools, wrong message), or leaving the
profile empty so nothing activates (the review's anemic-adaptation trap, P15).

The multi-country framing matters (P3): «vehicular language in acquisition» is not a
Spanish phenomenon. The mark is about the relationship between the child's languages and
the classroom's, wherever the classroom is.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Amina llega en febrero (Priority: P1)

The teacher creates Amina's profile and marks: vehicular language in acquisition; knows
árabe (and, if known, her schooling language). She adapts Thursday's ficha de
naturales: the content is the course's content — nothing curricular is removed — but
instructions carry pictograms, key content words appear with their Arabic bridge where
the teacher enabled it, sentences are short and direct, and the report says which
transitional supports were applied and why.

**Why this priority**: It is the week-one need of a case every support classroom knows,
and today the honest options are «empty profile» or «falsified profile».

**Independent Test**: Adapt the same source for a profile with only the vehicular mark;
confirm transitional supports applied, curriculum intact (the WHAT untouched — Principle
III), and the report naming the recipes and the mark.

**Acceptance Scenarios**:

1. **Given** the vehicular mark and no other axis, **When** material is adapted,
   **Then** the vehicular recipes activate — the mark alone is enough to produce a real
   adaptation (closing this case's instance of the empty-selection stop, P1).
2. **Given** any vehicular adaptation, **When** compared to the source, **Then** every
   curricular element is present: simplified wording may rephrase, it MUST NOT remove or
   dilute what is taught or asked (Principle III, stated per recipe).
3. **Given** the learner's known language(s) recorded, **When** key vocabulary is
   supported, **Then** the bridge language is one the profile names — never guessed from
   name, origin or anything else (`011`'s no-guessing, sharpened: language is never
   inferred).
4. **Given** the report, **When** she reads it, **Then** it says which supports were
   applied because of the vehicular mark, distinguishable from disability-driven
   adaptations.

---

### User Story 2 - The barrier is transitory and the profile says so (Priority: P2)

By May, Amina follows oral Spanish and reads simple texts. The teacher lowers the mark's
intensity; supports thin out accordingly — fewer glosses, longer sentences — and the
profile keeps its plain-observation honesty: what changed is what the teacher observed,
dated as observed (P44's honest markers).

**Why this priority**: Transitoriness is what distinguishes this axis from every other.
A mark that only turns on teaches the tool to keep a bilingual child in scaffolding he
has outgrown.

**Independent Test**: Same source, three intensity levels; supports decrease monotonically
and the WHAT never changes.

**Acceptance Scenarios**:

1. **Given** intensity levels (following the 0–3 grammar of the other axes), **When**
   lowered, **Then** the applied supports decrease, visibly in the report.
2. **Given** intensity 0, **When** material is adapted, **Then** no vehicular support
   applies — the mark expires by observation, not by deletion, and history stays in the
   profile like any observation.

---

### Edge Cases

- **Vehicular mark + a real functional axis** (an L2 learner with TDAH exists): recipes
  compose like any multi-axis profile; conflicts, if any, get conflict recipes (the P27
  machinery, now actually exercised).
- **Not lectura fácil.** The vehicular recipes must not select `lectura-facil-es` by
  side effect; if both apply (L2 *and* DEC), that is the multi-axis case, explicit.
- **No translation of the whole sheet.** Full translation replaces the vehicular
  language instead of scaffolding its acquisition, and Rampa cannot verify a
  translation's fidelity — key-vocabulary bridges only, and the boundary is written in
  the recipes.
- **The bridge language nobody speaks.** If the profile names a language the pictogram
  set and corpus cannot bridge, supports degrade to visual-only and the report says so —
  never an invented gloss (the model inventing Arabic it was not asked to verify is a
  fabrication risk; glosses come only where the corpus/recipes define sources).
- **Exams**: access supports apply (visual instructions, simple wording); what is
  evaluated does not change (P12's request-keyed gate governs; a language barrier is not
  an ACS).
- **Cooficiales (P51)**: a Catalan-vehicular classroom with a newcomer is the same
  feature with another vehicular language — out of v1 with the same honest message, and
  this spec's shape must not assume Spanish is the only vehicular language (multi-país,
  P3).

## Requirements *(mandatory)*

### Functional Requirements

#### The mark

- **FR-3101**: The profile MUST support a vehicular-language mark, distinct from LIN,
  with an intensity following the axes' 0–3 grammar, and optional known-language(s) of
  the learner.
- **FR-3102**: The mark and its languages MUST come from the teacher's observation;
  nothing may be inferred from name, origin or any other datum.
- **FR-3103**: LIN's documentation (`instructions/axes.md`) MUST be amended (dated) to
  state the boundary: LIN is disorder, the vehicular mark is acquisition — so the
  falsified-profile workaround dies in writing.

#### The recipes

- **FR-3104**: The corpus MUST gain vehicular recipes activated by the mark alone:
  visual/pictogram support for instructions, key content vocabulary with bridge gloss
  where a known language allows it, simplified transitional wording. Corpus files, not
  code (Principle I).
- **FR-3105**: No vehicular recipe may remove, dilute or substitute curricular content:
  the WHAT is untouched (Principle III), and each recipe's text states it.
- **FR-3106**: Bridge glosses MUST come only from sources the recipes define; where no
  bridge is available, supports degrade to visual-only and the report says so. No
  invented glosses.
- **FR-3107**: Supports MUST scale down with intensity, to zero at 0.

#### Honesty around it

- **FR-3108**: Reports MUST attribute vehicular supports to the mark, distinguishable
  from disability-driven adaptations — the child's record should never read as if a
  disability was observed.
- **FR-3109**: Full-document translation is out of scope and MUST be refused with the
  reason if asked (unverifiable fidelity; scaffolding beats substitution — the recipes'
  own argument, citable).
- **FR-3110**: The mark travels in handover and coordination packets as profile data
  (`004`, `030`), like any observation, with its dates real (P44).

### Key Entities

- **Vehicular mark**: intensity 0–3, known language(s), observation dates. Lives in the
  profile beside — not inside — the axes.
- **Vehicular recipes**: corpus files with the same shape as all recipes (`applies`,
  `evidence`, conflicts), keyed on the mark.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-3101**: A profile with only the vehicular mark produces an adaptation with
  visible transitional supports — not a copy (the anemic-profile failure closed for this
  case). Invariant over the fixture corpus.
- **SC-3102**: Across vehicular adaptations, zero curricular elements are absent
  relative to source — the Principle III check, run as the completeness gate already
  runs.
- **SC-3103**: Zero glosses exist in any output whose bridge language is not in the
  profile, and zero language data is ever inferred — invariant plus code-review tripwire.
- **SC-3104**: A PT with a late-incorporation learner says the week-one sheet is usable
  with the child. **Needs a teacher** — and ideally one with interculturalidad
  experience; the supports' pedagogical fit is not answerable here.

## Assumptions

- **Whether it renders as «eje» or «marca» in the profile UI is the plan's call**; the
  spec fixes the semantics (distinct from LIN, 0–3, transitory) and deliberately not the
  widget.
- **Bridge gloss sources start minimal** — the pictogram set's own multilingual keywords
  (ARASAAC carries several languages) are the first source; anything further (word
  lists per language pair) is corpus growth, not code.
- **Recipes are written in Spanish** per P28 (corpus core en español), and reviewed by a
  person with AL/interculturalidad background before `reviewed_by_teacher` flips — the
  same «needs a person» honesty as `011`'s curriculum codes.
- **Multi-país**: nothing here assumes Spanish; «vehicular language» is whatever the
  classroom's language is, which P3's corpus-per-territory work will eventually name.
