# Validation record — 006

What has actually been verified, and what has not. Run of 2026-08-27.

## Verified by machine

| Check | Command | Result |
|---|---|---|
| Principle II — the core is model-free | `npm run test:isolation` | **Pass.** 26 source files, no network path, no provider import, no key read |
| The vault survives a teacher | `npm run test:vault` | **Pass.** 14 cases: broken YAML, unknown keys, out-of-range axis, missing profile, repeated appends |
| Content is never instruction | `npm run test:injection` | **Pass.** 53 assertions over 10 fixtures, both clean controls silent |
| Egress redaction | `vitest packages/providers` | **Pass.** 9 cases, zero name occurrences in any payload |
| End to end over the real corpus | `vitest pipeline.test.ts` | **Pass.** 9 cases: recipes load, selection, conflict resolution, render, report |
| Types | `npm run typecheck` | **Pass.** 0 errors |
| Build | `npm run build` | **Pass.** main, preload and renderer bundles |
| Linux packaging | `electron-builder --linux` | **Pass.** AppImage 104 MB, deb 72 MB |
| Licence compliance | inspection of the built AppImage | **Pass.** `resources/corpus/` contains `LICENSE`, `LICENSE-CONTENT.md`, `NOTICE` |

139 tests, all offline, no API key present.

## Four defects the tests found

None of these would have been caught by review, and two were safety-relevant.

1. **Redaction was not accent-insensitive.** A teacher typing quickly writes
   "lucia"; an exact match on "Lucía" let the name through, defeating the one
   promise the application exists to keep. The first fix was itself wrong — it
   looked up the accented character rather than the base — and the test caught
   that too.
2. **Path confinement was not cross-platform.** `resolve()` treats
   `C:\Windows\System32` as relative on POSIX, so the check passed on Linux
   while failing to protect the Windows machine a teacher would use.
3. **The injection detector flagged a Language worksheet about the imperative.**
   Rebuilt on two tiers: an imperative counts only beside something naming the
   system, or when the text asks for a capability a worksheet never mentions.
4. **Conflict resolution dropped the exam guard.** `exam-access-not-difficulty`
   names no axis, so it scored zero severity and lost to a simplification recipe
   — an adaptation quietly making an exam easier, which is the exact failure this
   project is built around. Guards are now never dropped; they constrain.

## NOT verified

Stated plainly, because a validation report that implies more than it measured
is worse than none.

- **The application has never been run.** No GUI session in this environment: the
  window, onboarding flow, print dialogue and file pickers are typechecked and
  built, not exercised. Playwright end-to-end tests are specified (T040, T060)
  and not yet written.
- **No provider has been called.** Both adapters are implemented against
  documented shapes and tested with a stub. The first real call will find things.
- **`printToPDF` has not produced a PDF.** The code path exists; nothing has
  driven Electron to run it.
- **The photocopy check has not been checked against a photocopier.** It
  reasons about luminance; it has not been compared to a real reproduction.
- **No teacher has seen any of it.** This is the only line that matters.

## The measurement still missing

SC-401 is the feature's pass/fail: *a teacher who has never used AI goes from
installer to a printed adapted worksheet, unassisted and without documentation,
in under 30 minutes.*

Nothing above measures it. And per ADR 0005 the first run will carry an
asterisk: signing is deferred, so a hand-installed build cannot honestly test the
installer step on Windows or macOS. Everything after the first screen is real.

**Linux is the exception**: the AppImage above needs no installer, no signature
and no administrator rights. If the validating teacher uses Linux, SC-401 can be
measured honestly today.

Per SC-407, every intervention during that session is a logged defect — including
the ones where staying silent feels unkind. Those are the most valuable entries.


---

# Appendix — what a second review found · 2026-08-28

A line-by-line read of the implementation against specs 003, 006 and 007, done
before handing implementation to the Spec Kit flow. Method: every FR traced to
the code that enforces it, every core export traced to a caller. Nothing below
was caught by the 139-test run above, because every one of them lives between
tested units — each unit is correct, and the seam is missing.

| Found | Where it landed |
|---|---|
| Vault never persisted or reopened; the app breaks on second launch | tasks T083 |
| Learner notes loaded, then dropped before the prompt; corpus journal entries untagged and unloadable — memory works in 1 of 3 scopes | T084-T086 |
| No completeness check; truncation repaired into silent loss; the model has no channel into the report it is told to write to | T087-T088 · 007 FR-516/517 · docs/ir.md |
| `assertProvenance`, `findUnaccountedBlocks`, `assertWithinBounds` exported and never called; `InjectionNotice` never mounted; notices returned as a bare count | T088-T089 |
| Revise prompt says teacher corrections beat "las reglas" — hard rules included | T084 · instructions/adapt.md §3 |
| Unknown-name ask-before-send only covers pasted text; notes/house/journal are flagged after the request streams | T090 |
| No `cache_control` anywhere: the "unos 3 céntimos" promise is optimistic 2-3× | T092 |
| Cost pre-warning channel exists, UI never calls it | T091 |
| Photo/PDF ingest absent; the verification gate verifies the teacher's own paste | spec 008 |
| Pipeline-vs-agent never decided | ADR 0007 |

The line that still matters most is unchanged from the first run of this
document: **no teacher has seen any of it, and the application has never been
run.** The list above is why running it first would have been the wrong order —
three of these would have survived a demo and failed in week two.
