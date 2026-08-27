<div align="right"><a href="README.es.md">Español</a></div>

# Rampa

**Adapt classroom material to the profile of a learner with a disability, using
the AI agent you already have.**

A ramp does not lead somewhere else. It leads to the same door, by a route the
person can actually take. That is what this project does with worksheets,
exercises and exams.

Rampa is a *harness*: you clone it, open it with your own AI agent, and it is
already set up — instructions, adaptation recipes, output templates, safeguards.
No server, no account, no API key, no learner data leaving your computer.

The teacher always reviews and signs. This removes the mechanical work, not the
professional judgement.

> **Who this is for today:** developers, and teachers working next to someone
> technical. Using it currently means cloning a repository and having an agentic
> AI tool — not a chat subscription. Reaching teachers directly is
> [ADR 0005](docs/decisions/0005-delivery-vehicle.md), still open.
>
> **Status: early. Nothing has been validated with a real teacher yet.** Phase 0
> exists to answer exactly one question: does a special-education teacher find the
> output usable with minor edits? See [`docs/ESPECIFICACION-V0.md`](docs/ESPECIFICACION-V0.md).

## How it works

```
material/          →  IR  →  adapted IR  →  output/
your files            ↑          ↑              ↑
                   ingest      adapt         render
                      ↑          ↑
                 you verify  profile + recipes
```

Source material is normalised **once** into an Intermediate Representation. Every
output — accessible HTML, print PDF, editable ODT, braille-ready text, audio — is
a rendering of the same adapted document. That is what makes covering very
different disabilities tractable instead of five separate projects.

## Quick start

```bash
git clone https://github.com/cnebrera/curriculum-accommodation.git rampa
cd rampa
scripts/setup-hooks.sh     # blocks accidental commits of learner data
scripts/doctor.sh          # tells you what optional tools you have
```

Then open the folder with your AI agent and run, in order:

| Command | What it does |
|---|---|
| `/rampa-profile` | Builds a pseudonymised profile of the learner's barriers |
| `/rampa-ingest` | Reads your material — scan, photo, DOCX, pasted text — and you verify it |
| `/rampa-compose` | The other way in: builds material from what the learner must learn, when there is nothing to adapt |
| `/rampa-adapt` | Applies the recipes, and writes a report of every change |
| `/rampa-render` | Produces the formats this learner needs |
| `/rampa-review` | Your checklist, then sign-off — and it captures what you corrected |
| `/rampa-memory` | Every few weeks: consolidates what it has learned from you |

Nothing is required beyond an agent. `pandoc`, a headless browser and an offline
TTS each unlock one more output format; without them you still get HTML.

## Profiles describe barriers, not diagnoses

A profile says what the learner finds hard and how they respond best, on ten
axes — decoding, cognitive load, executive function, visual access, and so on.
It carries no name and no clinical label.

Two learners with the same diagnosis need different things. Barriers are also the
only representation that pseudonymises without losing its usefulness.
See [`docs/profile-schema.md`](docs/profile-schema.md).

## The recipes are the project

Every adaptation decision lives in a Markdown recipe that a teacher can read and
correct — not in code. If you know how to adapt material but not how to program,
you are exactly who this needs.

Recipes carry before/after examples and, most importantly, **anti-patterns**: the
things a well-meaning adapter gets wrong. *Don't replace the technical term the
child is being assessed on.* That is the line that separates a good adaptation
from one that quietly strips the curriculum out of a worksheet.

See [`recipes/`](recipes/) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Safeguards

- **Nothing is final without a human.** Output carries a visible draft mark until
  a teacher signs it off.
- **The route changes, the content does not.** No invented facts, no easier
  synonyms for curricular terms, no silent removal.
- **Significant adaptation is escalated, never decided.** Changing objectives or
  assessment criteria belongs to the teaching team and the learner's file.
- **An adapted exam that is also easier is a different exam.** Exam recipes change
  access and response, never what is being assessed.
- **Learner data stays local.** `profiles/`, `material/` and `output/` are
  git-ignored and blocked by a commit hook. Profiles carry no names.
  **But be clear about the limit:** if you type a learner's name in conversation,
  it reaches your AI provider like anything else you type. Nothing here can stop
  that today — see [`docs/adoption-risks.md`](docs/adoption-risks.md) §3.
- **Source material never enters this repository.** Adapting a work for a person
  with a disability is protected by the Marrakesh Treaty and its national
  implementations. Redistributing it is not.

## Licence

- Code, scripts, configuration — **Apache-2.0** ([`LICENSE`](LICENSE))
- Recipes, checklists, templates, docs — **CC BY-SA 4.0** ([`LICENSE-CONTENT.md`](LICENSE-CONTENT.md))

Permissive code so a school, an education authority or a publisher can integrate
it without a legal review. ShareAlike content so the pedagogical commons the
community builds stays common.

## Contributing

Specifications are managed with [Spec Kit](https://github.com/github/spec-kit);
the project's governing principles are in
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).

The most valuable contribution right now is not code. It is a teacher telling us
where the output is wrong.
