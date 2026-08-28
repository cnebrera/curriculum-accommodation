# Contributing to Rampa

The most valuable contribution to this project is not code. It is a special
education teacher saying "this adaptation is wrong, and here is why".

## Before anything else: what must never enter this repository

**Learner data.** No names, no diagnoses, no real profiles, no anonymised-ish
profiles that a colleague could de-anonymise. A real teacher's profiles live in
her own vault; `profiles/` here is git-ignored and blocked by a commit hook. Run
`scripts/setup-hooks.sh` after cloning.

**Copyrighted classroom material.** Not the original, and not your adaptation of
it. Adapting a work for a person with a disability is protected in the EU by the
Marrakesh Treaty and its national implementations. Redistributing that adaptation
is not, and the exception does not travel with the file.

If you want to show an example, invent one or use openly licensed material.

## Contributing a recipe

This is the main path, and it needs no programming.

1. Read `recipes/README.md` and an existing recipe.
2. Copy its shape into `recipes/core/` (if the rule holds in any language) or
   `recipes/lang/<code>/` (if it does not).
3. Keep it to **one decision**. A recipe that does three things cannot be
   selected, conflicted or reviewed properly.
4. Include a real before/after from material you have actually adapted — with the
   source material itself left out.
5. **Include anti-patterns.** A recipe without them will be sent back. They are
   the part that carries the expertise; the rest an agent could have guessed.

Good anti-patterns are specific and come from having seen them go wrong:
*"chopping sentences at commas produces fragments that no longer connect"* is
useful. *"Don't oversimplify"* is not.

## Contributing code

Read `.specify/memory/constitution.md` first. Two principles are non-negotiable
and reject changes on sight:

- **Adaptation policy never goes in code.** If your patch encodes a rule about
  *how to adapt*, it belongs in a recipe or in `instructions/`. This is the rule
  most often broken, including by us: the whole adaptation prompt was once a
  string in the application.
- **Scripts never call a model.** No API keys, no network, no provider-specific
  behaviour. Scripts must run and be tested offline.

Specifications are managed with [Spec Kit](https://github.com/github/spec-kit),
and the flow is a gate rather than a suggestion:

```
/speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks → /speckit-implement
```

**No implementation without a numbered task**, and a specification never lands in
the same commit as its implementation — the plan is where the Constitution Check
runs and clarify is where the questions get asked. `scripts/check-spec-kit.sh`
enforces it from the commit hook and in CI. Run `scripts/setup-hooks.sh` after
cloning so it applies to you too.

There is one command layer here, `/speckit-*`, and it is for building Rampa. A
teacher uses the built application; nobody drives the pipeline by hand in this
repository — see [ADR 0006](docs/decisions/0006-one-vehicle.md).

To try a change, build and run the application:

```bash
cd app && npm ci && npm test && npm run dev
```

## Contributing a test case

Cases in `cases/` are how we tell whether a change to a recipe improved the
output or degraded it. A case is openly licensed or invented material, a
type-profile, and the adaptation we expect.

As the recipe corpus grows this becomes the most important safeguard in the
project.

## Reporting that an adaptation is wrong

Open an issue with:

- What the recipe produced (paste the adapted block, not the source material).
- What it should have produced.
- Why — the pedagogical reason, in your own words.

You do not need to propose a fix, and you do not need to know how the code works.

## Language

Repository structure, code, identifiers and commit messages are in English so the
project stays usable outside Spain. The application's interface and user-facing
documentation are translated; Spanish is the first fully populated locale. Recipes
are split accordingly: `recipes/core/` is language-neutral, `recipes/lang/<code>/`
is not.

Write issues in whatever language you are comfortable with.

## Licence of your contribution

By contributing you agree to license your work under the licence covering that
path: Apache-2.0 for code, CC BY-SA 4.0 for recipes, instructions, checklists and
documentation. See `LICENSE-CONTENT.md`.
