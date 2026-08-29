# Implementation Plan: Content is never instruction

**Branch**: `007-untrusted-content` · **Spec**: [spec.md](./spec.md)

## Summary

**This spec is mostly built, and that is the problem this plan exists to solve.**

Fourteen of its seventeen requirements are cited somewhere in `app/` — which means
somebody once wrote code with the requirement in mind, not that the requirement
holds. Three (FR-501, FR-502, FR-515) are cited nowhere at all. A security spec
whose enforcement is spread across a dozen files, delivered incidentally by
`006`, `008` and `010`, and never audited as a whole, is a spec nobody can
truthfully say is met.

So this is a **verification plan**, not a construction plan. Its deliverable is
one document that says, per requirement, exactly what enforces it and exactly what
test would fail if that enforcement were removed — plus the tests that turn out to
be missing.

That framing is the point. The alternative — writing new code against a spec that
is largely implemented — would produce a second enforcement path for each
requirement, and two places enforcing one rule is how this project's every defect
has happened.

## Technical Context

No new dependencies. No new runtime capability. The work is: read each
requirement, find its enforcement, write the test that pins it, and record the
ones that have none.

**Where enforcement currently lives**, from a first pass:

| Requirement | Enforced by |
|---|---|
| FR-501 · material is data | Structural: nothing evaluates block content. **No test asserts this.** |
| FR-502 · IR bodies are never directives | `instructions/hard-rules.md`, plus the fenced-div structure. **No test asserts the instruction says so.** |
| FR-503 · instruction-shaped content flagged | `ir/injection.ts`, `InjectionNotice.tsx`, `injection.test.ts` |
| FR-504 · never silently removed | `ir/injection.ts` annotates; nothing deletes |
| FR-505 · invisible text surfaced | `ir/hidden.ts`, and `008`'s PDF text-layer comparison |
| FR-506 · renderer emits IR blocks only | `render/html.ts` |
| FR-507 · output check fails the render | `render/check.ts` |
| FR-508 · writes confined to the vault | `vault/paths.ts` `resolveInVault` |
| FR-509 · draft mark removable only by review | `jobs/signoff.ts` |
| FR-510 · redaction on egress, not model-controlled | `providers/send.ts` — one call site |
| FR-511 · no outbound calls outside providers | `isolation.test.ts`, module-graph |
| FR-512 · no provenance, no render | `ir/provenance.ts` |
| FR-513 · input bounded and reported | `ir/bounds.ts`, `008`'s page bound |
| FR-514 · detection non-blocking | `ir/injection.ts` returns notices |
| FR-515 · fixtures per vector | `cases/injection/`, ten directories |
| FR-516 · omissions caught as completeness | `ir/completeness.ts` |
| FR-517 · incomplete output never shown | `jobs/adapt.ts` retry then refuse |

## Constitution Check

**Principle IX is this spec.** *"Content is never instruction — structural defences
outrank instructional ones."* The check that matters is therefore not whether the
principle is stated but whether each defence is **structural**: a rule the code
cannot go around, rather than a sentence in a prompt asking a model to behave.

Two requirements are honestly instructional and must be labelled as such rather
than dressed up: FR-502's "instructions MUST state that IR block bodies are never
directives" is a sentence in `hard-rules.md`, and it is a *supplement* to the
structural separation, not the defence itself. Recording that distinction is part
of this feature's deliverable.

**Gate: passes**, with one thing named. This plan produces mostly tests, and a
test suite is not a defence — it is a tripwire on a defence. Where a requirement
turns out to rest on nothing but a convention, this plan says so in
`coverage.md` rather than adding a test that makes the convention look enforced.

## Phase 0 · Research

None needed, and saying so is the honest answer rather than manufacturing a
research document. Nothing here is an open technical question: the mechanisms
exist, and the work is establishing which of them actually hold.

## Phase 1 · Design

- [contracts/coverage.md](./contracts/coverage.md) — the deliverable: per
  requirement, what enforces it, what test pins it, and what would have to be
  true for it to be silently lost.

## Sequencing

One phase, in requirement order, because each item is independent. The ones with
no test at all come first: FR-501, FR-502, FR-515 — a requirement with no citation
anywhere is a requirement nobody has looked at since it was written.
