# 0006 — One vehicle: the application

**Status:** Accepted · 2026-08-28

**Supersedes:** the "A stays the contributor path" part of
[ADR 0005](0005-delivery-vehicle.md). The rest of 0005 — why the desktop
application was chosen over a hosted service, a local web app, or a chat-project
bundle — still stands.

## Context

ADR 0005 chose the desktop application and added, almost in passing, that the
harness "stays the contributor path and keeps working against the same vault".
That sentence created a second product.

Three months of drift later, what that actually cost:

1. **The judgement layer forked, and the application lost.** The harness had
   ~400 lines of carefully written procedure in `harness/commands/`. The
   application had a twelve-line Spanish string hardcoded in
   `packages/shell/src/jobs/adapt.ts`. The good version was bundled into the
   installer and **never read** — as were `checklists/` and `templates/`.

2. **That was a live violation of Principle I.** The policy governing every
   adaptation was in TypeScript, where no teacher can read or correct it. The
   plan for `006` predicted the leak and looked for it in the wrong place
   ("wizard copy and validation messages"); it arrived through the front door
   instead, as the entire system prompt.

3. **Two implementations of the same thing, already diverged.** `scripts/
   render.sh` + `templates/base.html` against `core/render/html.ts` — and the
   Pandoc template had a per-page print watermark the application's renderer
   never had, so a separated page two of an unreviewed worksheet announced
   nothing. `scripts/memory-index.sh` against `core/memory/buildIndex()`.

Every one of these is the same defect the cross-artifact pass of 2026-08-27
already diagnosed: *a new artifact restating what an older one defined, instead
of pointing at it.* Two vehicles guarantee it structurally.

## Decision

**One delivery vehicle: the application.** The harness is removed, not deprecated.

- `harness/commands/` becomes `instructions/`, part of the corpus, **read by the
  application at run time**. The judgement layer stops being decoration in the
  installer and becomes what the model is actually sent.
- `checklists/review.md` is read by the review screen.
- The Pandoc template and the shell scripts that rendered, extracted, converted
  and indexed are deleted. Their behaviour lives in `packages/core`, which is
  tested.
- The teacher-facing agent skills are deleted. `/speckit-*` remains: it is for
  building Rampa, not for using it.
- `scripts/` keeps only repository hygiene — `setup-hooks.sh` and
  `validate-recipes.sh`, both of which serve contributors and CI.

**The contributor path is not the harness, and never needed to be.** Somebody
changing a recipe needs `cases/` and a test run, not an agent with seven
commands. `npm run dev` and `npm test` cover it with a fraction of the surface.

## What this does not change

**Principle I is not weakened by having one vehicle — it is repaired.** The
concern in 0005 was that an application would bury the recipes where a teacher
could not reach them. That concern was right, and the answer is not a second
vehicle; it is that the corpus stays Markdown, ships read-only, is loaded from
the vault's local overrides when the teacher wants her own, and is now *actually
read* rather than restated in code.

**The vault format does not change.** The layout in `006`'s data model was
written to be identical to the harness's directories. It stays as it is: it is a
good layout, it is Obsidian-compatible, and changing it would strand anything
already written.

## A premise worth correcting, since it came up

The argument that made this decision urgent was "the audience barely knows how to
use ChatGPT, so simplify". The conclusion is right and the reasoning does not
support it: the application also asks a teacher to install software and paste an
API key, which is not ChatGPT-level either. Option E of ADR 0005 — the corpus as a
chat project — is the option that literally satisfies that premise.

The application is chosen for two different reasons, and they should be the stated
ones: **it is the only vehicle that can keep the name-redaction promise**, and the
only one where the teacher's professional record is hers rather than trapped in a
provider's project. Both are load-bearing. "It is easier for a beginner" is not,
and claiming it would fail at the first validation.

## Consequences

- Contributors have one place to look and one thing to run.
- The application's system prompt is now `instructions/hard-rules.md` +
  `instructions/adapt.md`, so improving how Rampa adapts no longer requires
  touching TypeScript. This is the point.
- `hard-rules.md` is sent with every request, so anything added to it is paid for
  on every worksheet. That is a real constraint on its length.
- Specifications `001`–`004` describe the pipeline in terms of `/rampa-*`
  commands. Their **requirements remain valid** — they specify behaviour, not a
  vehicle — but the command names are historical. Each carries a banner saying
  so rather than being rewritten, per this directory's rule that records are
  superseded and not edited.
- One risk accepted knowingly: **the application has never been run by anyone**,
  and the harness was the only path that had ever produced an adaptation. Removing
  it before the application has done one end-to-end run means there is currently
  no demonstrated working path. That is uncomfortable and it is the right trade
  anyway — keeping a second vehicle alive as insurance is what produced the drift
  above — but the first real run is now the highest-priority piece of work in the
  project, ahead of any new feature.
