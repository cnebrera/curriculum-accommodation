# Case 002 — The model floor: the cheapest tier that is still good enough

**Question:** what is the minimum model tier, per provider, at which Rampa's
output is usable — so that the free/cheap path is a recommendation backed by a
measurement instead of a hope, and so that Phase 0 validates the project rather
than accidentally validating one model.

Decided 2026-08-28. Runs **before** the Phase 0 teacher session; the session then
uses a tier at or above the measured floor, recorded in `validation.md` as an
experimental condition.

## Why this exists

Quality varies widely across providers and tiers, and that risk has been on the
books since the vision document (§12). Two product decisions hang on this
measurement, and neither should be made by intuition:

1. **What the onboarding recommends.** "Sin tarjeta" is only an honest default if
   the no-card tier clears the floor.
2. **What Phase 0 means.** If validation ran on a below-floor model and failed,
   the project would have spent its only first impression answering the wrong
   question.

## Method

Same fixture jobs — openly licensed or invented material plus the type-profiles
in `profiles.example/` (`A3` exercises the most recipes; `B7` exercises the
non-visual branch) — run once per (provider × tier) rung:

| Rung | Examples (update as tiers move) |
|---|---|
| Free / no-card | Gemini free tier |
| Cheap | Haiku-class |
| Default | Sonnet-class |
| Top | Opus-class |

Both pipeline stages are measured, because they fail differently:

- **Ingest** (spec 008): extraction of the photographed fixtures. Hard floor:
  numbering preserved, no invented content where the ground truth says
  `[UNREADABLE]`, structural validation passes within the bounded retries.
- **Adapt**: hard floor: the deterministic verifiers — provenance, completeness,
  no dropped guard — pass **without needing the bounded retry** on a majority of
  runs (a tier that lives off its retry is below the floor). Soft floor: a blind
  read of shuffled outputs, same protocol as `cases/001-corpus-ablation`: which
  would you hand to this learner, and is there anything you would refuse?

Run each rung at least three times; single samples show noise, and run-to-run
variance is itself a finding (a tier that is sometimes great and sometimes
unusable is below the floor for a teacher who gets one first impression).

## Reading the result

- **The floor per provider** goes in this directory as a dated table, and drives
  the onboarding copy: a below-floor tier is offered with an honest warning or
  not offered.
- **Cost at the floor** (with prompt caching on) replaces the estimate in the
  connect step, so "unos N céntimos por ficha" is measured, not hoped.
- Re-run when tiers or prices move. Prices move often; floors move rarely.

## Materials

Shares the fixture set spec 008 builds (photographed badly on purpose) plus the
adapt fixtures from `cases/001-corpus-ablation`. Do **not** use a textbook page —
see `CONTRIBUTING.md`. Needs real keys and spends real cents: this is the one
case that cannot run in CI, and that is fine — it answers a question CI cannot.
