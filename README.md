<div align="right"><a href="README.es.md">Español</a></div>

# Rampa

**Adapt classroom material to the profile of a learner with a disability.**

A ramp does not lead somewhere else. It leads to the same door, by a route the
person can actually take. That is what this project does with worksheets,
exercises and exams.

Rampa is a desktop application. The teacher's files stay on her computer, in a
folder of plain markdown she owns; the adaptation recipes ship inside the
application, in Markdown anyone can read; the AI account is her own.

The teacher always reviews and signs. This removes the mechanical work, not the
professional judgement.

> **Status: early, and honest about it.** The application is built and its test
> suite passes offline, but **it has not yet been run by a teacher, and no
> installer is signed.** Phase 0 exists to answer one question: does a
> special-education teacher find the output usable with minor edits? Until that
> is answered, nothing else matters. See
> [`specs/006-desktop-app/validation.md`](specs/006-desktop-app/validation.md)
> for exactly what has and has not been verified.

## How it works

```
your material   →  read  →  adapted  →  printed
                     ↑         ↑           ↑
                you verify  profile     review
                            + recipes   and sign
                                            │
                                      what you corrected
                                            └──→ next time
```

Material is normalised **once** into an intermediate form. Every output —
accessible HTML, print PDF, and later braille-ready text and audio — is a
rendering of the same adapted document. That is what makes covering very
different disabilities tractable instead of five separate projects.

The last arrow is the point. A correction you make in review is remembered, so
the same wrong adaptation is not produced next week.

## Running it

There are no signed installers yet, so today this means building it:

```bash
git clone https://github.com/cnebrera/curriculum-accommodation.git rampa
cd rampa/app
npm ci
npm test        # the whole suite, offline, no API key needed
npm run dev
```

`npm run dist` produces installers into `release/`. On Windows and macOS they
will be unsigned and the operating system will warn about them — which is why
public releases wait for certificates. On Linux the AppImage needs no installer,
no signature and no administrator rights.

You supply your own AI key. The application walks you through it and tells you
what a worksheet costs — roughly three cents. One of the supported providers has
a free tier that needs no payment card.

## Profiles describe barriers, not diagnoses

A profile says what the learner finds hard and how they respond best, on ten
axes — decoding, cognitive load, executive function, visual access, and so on.
It carries no name and no clinical label.

Two learners with the same diagnosis need different things. Barriers are also the
only representation that pseudonymises without losing its usefulness.
See [`docs/profile-schema.md`](docs/profile-schema.md) and
[`docs/axis-calibration.md`](docs/axis-calibration.md).

## The recipes are the project

Every adaptation decision lives in a Markdown recipe that a teacher can read and
correct — not in code. If you know how to adapt material but not how to program,
you are exactly who this needs.

Recipes carry before/after examples and, most importantly, **anti-patterns**: the
things a well-meaning adapter gets wrong. *Don't replace the technical term the
child is being assessed on.* That is the line that separates a good adaptation
from one that quietly strips the curriculum out of a worksheet.

The same is true of the instructions the application sends to the model: they are
in [`instructions/`](instructions/), not in TypeScript, for the same reason.

See [`recipes/`](recipes/) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Safeguards

- **Nothing is final without a human.** Output carries a visible draft mark until
  a teacher signs it off, and exactly one action can remove it.
- **The learner's name never reaches the model.** You type "Lucía" because that
  is how you think; it is held encrypted on your machine and replaced by a code
  on every outbound request. If you type a name the system does not know, it asks
  before sending.
- **The route changes, the content does not.** No invented facts, no easier
  synonyms for curricular terms, no silent removal.
- **Significant adaptation is escalated, never decided.** Changing objectives or
  assessment criteria belongs to the teaching team and the learner's file.
- **An adapted exam that is also easier is a different exam.** Exam recipes change
  access and response, never what is being assessed.
- **Nothing about the learner can reach the learner's own worksheet.** Enforced
  structurally: the renderer has no access to the profile.
- **Material is data, never instruction.** A worksheet containing text addressed
  to the software is adapted as content, flagged to you, and never obeyed.
  See [`specs/007-untrusted-content`](specs/007-untrusted-content/spec.md).
- **Your files are yours.** Plain markdown in a folder you choose, readable in any
  editor or in Obsidian, backed up by copying it, and complete if you uninstall.
- **Source material never enters this repository.** Adapting a work for a person
  with a disability is protected by the Marrakesh Treaty and its national
  implementations. Redistributing it is not.

## The whole story in one file

What this is for, told as one teacher's term, moment by moment, with the spec
that covers each moment: [`docs/escenario.md`](docs/escenario.md). It is the
document every specification is reviewed against, and the script for the Phase 0
observation.

## What already exists

A landscape review of comparable tools, and where the gaps are, is in
[`docs/market-landscape.md`](docs/market-landscape.md).

## Licence

- Code — **Apache-2.0** ([`LICENSE`](LICENSE))
- Recipes, instructions, checklists, docs — **CC BY-SA 4.0** ([`LICENSE-CONTENT.md`](LICENSE-CONTENT.md))

Permissive code so a school, an education authority or a publisher can integrate
it without a legal review. ShareAlike content so the pedagogical commons the
community builds stays common.

## Contributing

Specifications are managed with [Spec Kit](https://github.com/github/spec-kit);
the project's governing principles are in
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).

The most valuable contribution right now is not code. It is a teacher telling us
where the output is wrong.
