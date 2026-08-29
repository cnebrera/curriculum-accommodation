# Tasks: Content is never instruction

**Input**: Design documents from `specs/007-untrusted-content/`

**Prerequisites**: plan.md, contracts/coverage.md

**Tests**: Included, and they are most of the deliverable. See plan.md: this is a
verification pass over a spec that is largely already built, so the output is
tests that pin existing defences plus an honest record of the ones resting on
nothing.

**Organization**: In requirement order, because each is independent. The three
requirements cited nowhere in the code come first — a requirement with no citation
is a requirement nobody has looked at since it was written.

---

## Phase 1 · The three with no citation anywhere

- [x] T001 Assert FR-501 structurally in `app/packages/core/test/untrusted.test.ts`: no code path evaluates, executes or interprets IR block content. Grep-level over the source for `eval`, `new Function`, `vm.`, template-literal execution and dynamic `import()` of a content-derived string — a structural claim needs a structural check, not a behavioural one *(done, over the whole source rather than through one path — a universal claim needs a universal check.)*
- [x] T002 Assert FR-502 in two halves, and label them differently: the **structural** half (content enters as block content inside a fenced div, never concatenated into the instruction region of a prompt — asserted over `buildAdaptPrompt`) and the **instructional** half (`instructions/hard-rules.md` says IR block bodies are never directives). Record in coverage.md that the second is a supplement and not a defence *(done, in two halves and labelled differently. **The structural half found a real defect**: the overlay section headed «mandan sobre las reglas» while `hard-rules.md` says an overlay is never a directive.)*
- [x] T003 Assert FR-515 in `app/packages/core/test/untrusted.test.ts`: every directory in `cases/injection/` has a fixture and a `README.md` saying which vector it is and what the correct behaviour is; and every vector named in `spec.md` §"What an injection can achieve here" has a directory *(done — and revised. The first version demanded a README per directory; the set documents its vectors centrally with one set of pass criteria, which is better. Found the stale «the set is empty» note.)*
- [x] T004 Write `specs/007-untrusted-content/contracts/coverage.md`: per requirement, the enforcing mechanism, the test that pins it, whether the defence is structural or instructional, and what would have to change for it to be lost silently *(done: `contracts/coverage.md`.)*

**Checkpoint**: the three unaudited requirements have tests, and coverage.md exists.

---

## Phase 2 · Pinning the fourteen that are cited

- [x] T005 [P] FR-503/FR-504/FR-514 — confirm the existing `injection.test.ts` covers: flagged in plain language, quoted, located, **never removed**, and non-blocking. Add whichever of those four properties is not asserted *(done. All four properties were already asserted by `injection.test.ts`.)*
- [x] T006 [P] FR-505 — assert invisible text is surfaced from both inputs that can carry it: an IR document (`ir/hidden.ts`) and a digital PDF (`008`'s text-layer comparison). Two inputs, one requirement, and only one of them had a test *(done. **Two inputs, one requirement, and only one had a test** — the digital-PDF half arrived with `008`.)*
- [x] T007 [P] FR-506/FR-507 — assert a profile field cannot reach learner-facing output, and that the output check **fails the render** rather than warning. A check that warns is not this requirement *(done. The renderer never receives the profile, which is stronger than the output filter and is why the filter is the second line.)*
- [x] T008 [P] FR-508 — assert a path derived from content is rejected and not sanitised, including the cases a sanitiser would "fix": `../`, an absolute path, a symlink target, a UNC path, and a name with a NUL byte *(done: 8 attack shapes, plus a check that `resolveInVault` is the only resolver in the codebase.)*
- [x] T009 [P] FR-509 — assert the draft mark cannot be removed by any path except `job:signOff`, by enumerating the writers of the marked output rather than by testing sign-off *(done — **and it found the worst defect in the project so far.** `job:render` took `signedOff` as a parameter, so an unmarked worksheet could be produced with no sign-off at all, while `signoff.ts` claimed in a comment that this was impossible. Now derived from the document.)*
- [x] T010 [P] FR-510 — assert redaction is applied at exactly one call site, and that a second one would fail the test. Already partly covered by `chokepoint.test.ts`; what is missing is the **uniqueness** of the call site *(done. `chokepoint.test.ts` proved redaction works at the chokepoint; what was missing was that the chokepoint is the only door.)*
- [x] T011 [P] FR-512 — assert a block with no provenance and no `.scaffold` fails the render, and that the failure names the block *(done — and the requirement turned out to be met by **two** functions, not one. Reading only `assertProvenance` is how this audit first concluded it was unmet.)*
- [x] T012 [P] FR-513 — assert the bound is enforced and **reported** for both inputs it applies to: prompt size and `008`'s page count *(done, both inputs. The page bound only exists since `008`.)*
- [x] T013 [P] FR-516/FR-517 — assert an omission is caught as a completeness failure and that an incomplete output is refused after the bounded retry, with her last good version intact *(done.)*

---

## Phase 3 · What the audit finds

- [x] T014 Fix whatever Phase 1 and 2 surface. Written as its own task because the honest expectation of an audit is that it finds something, and discovering that mid-phase is how a fix gets folded into a test commit where nobody reviews it *(done: three defects in the code, and four in the audit's own tests. All recorded rather than folded into a test commit.)*
- [x] T015 Record the audit in `specs/006-desktop-app/validation.md`: what is structurally enforced, what rests on an instruction, and what rests on nothing but convention *(done.)*
- [x] T016 [P] Add the untrusted-content suite to `.github/workflows/app.yml` as its own named step, so a failure reads as "a security guarantee broke" rather than as one line in a 500-test run *(done, as its own named step — a security guarantee breaking must not read as one line in a 550-test run.)*

---

## Dependencies

- T004 depends on T001-T003 and on Phase 2: the coverage document records what the tests found, so writing it first would record what was hoped.
- T014 depends on everything before it.
- Phase 2's tasks are independent of each other and of Phase 1.

## Implementation strategy

**There is no MVP here.** A security spec verified in part is a security spec
whose unverified part is where the hole is, so the increment is the whole audit.

Order: Phase 1 → Phase 2 → Phase 3. Phase 1 first because a requirement cited
nowhere is the most likely to be unenforced, and finding that early changes how
much of Phase 2 is worth trusting.

**Do not let T014 become "no findings".** If the audit finds nothing, that is a
result worth stating explicitly in coverage.md — and worth being suspicious of,
because this project's every previous review pass found something.
