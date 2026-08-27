# 0002 — No clinical material in the repository

**Status:** Accepted · 2026-08-27

## Context

If the system must adapt for any disability, it is tempting to ship clinical
reference material so the agent knows what each condition implies.

## Decision

**No clinical or diagnostic literature enters this repository.** Ever.

Four reasons:

1. **It contradicts Principle V.** The architecture is barriers, not diagnoses.
   Clinical material reintroduces the diagnosis → adaptation shortcut that the
   principle exists to prevent, through the back door.
2. **It mispositions the project.** A repository containing clinical guidance
   looks like it gives clinical advice. It does not and must not.
3. **Licensing.** Almost none of it is redistributable.
4. **It rots.** A frozen copy of clinical guidance is worse than none.

## What this does and does not cover

| Material | In the repo? |
|---|---|
| Clinical or diagnostic literature | **No** |
| A specific learner's clinical report | **No.** The teacher translates it to barriers in `/rampa-profile`; the report never touches the repository |
| Official educational adaptation guidance (education authorities) | **As a link in `docs/references.md`**, never copied — and check the licence even when public |
| Accessibility standards (WCAG, UNE 153101, UDL) | **Yes** — these are operational, not clinical. Cited in a recipe's `evidence` field |

## Consequences

- `docs/references.md` holds pointers and standards, no copied content.
- When a teacher mentions a diagnosis in conversation, the agent records the
  barrier it produces, never the label.
- A pull request adding clinical content is rejected on sight, with this ADR as
  the reason.
