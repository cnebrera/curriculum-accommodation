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


---

# Phase 11 implemented · 2026-08-28

All ten review defects closed, with 188 offline tests (up from 139) and no key
present. Verified by machine:

| Check | Result |
|---|---|
| Vault survives a relaunch (T083) | **Pass.** 4 cases: first run, remembered root, folder gone, corrupt settings — all fail safe into onboarding |
| The prompt carries her notes (T084) | **Pass.** 8 cases. Also pins that corrections beat recipes and **never** the hard rules, and that notes stay bounded by dropping oldest whole sections |
| Silent content loss (T087, T088) | **Pass.** 11 cases: a vanished block fails, a declared `[dropped:ID]` passes, merges pass, truncation fails, `.report-notes` never renders and is provenance-exempt |
| Profile round-trip (T092c) | **Pass.** 6 cases, and it found a second defect — see below |
| Prompt caching arithmetic (T092) | **Pass.** Cached prefix costs less; cache writes counted at their premium; every priced model declares both rates |
| Everything above, plus the prior suite | **Pass.** 188 tests, 13 files, offline |

## A defect the new tests found

**zod was silently stripping unknown keys.** `contracts/vault-format.md` promises
*"unknown keys are preserved verbatim — the app is a guest in these files"*, and
`validateWithRepair` relied on validation *failing* to notice a field. A
successful parse dropped anything the schema did not declare, so a teacher who
added a field of her own by hand lost it the next time she pressed Guardar.

That is the second data-loss defect in the same area — the first was the profile
editor blanking `interests` and `response` outright (T092c). Both were invisible
to review and both were found by a round-trip test, which is the pattern this
project keeps re-learning: the seam between two correct units is where the
defects live.

## Still NOT verified

Unchanged from the first run, and worth repeating because Phase 11 did not touch
it:

- **The application has still never been run.** No GUI session, no window, no
  print dialogue. The new code is typechecked and unit-tested, not exercised.
- **No provider has been called.** Prompt caching is implemented against the
  documented shape and tested arithmetically; the first real call will tell us
  whether the breakpoint lands where we think.
- **No teacher has seen any of it.**

Next: spec 008 (vision ingest) before any teacher session, then the first real
end-to-end run. The model floor (`cases/002-model-floor`) runs before the teacher
session, not after.


# Phases 12 and the corpus guarantees · 2026-08-28

206 offline tests, 15 files, no key. What was added:

| Check | Result |
|---|---|
| Consolidation proposes with evidence (T093) | **Pass.** 11 cases: a theme repeated 3× is proposed with all its dates, a one-off is not, retention surfaces a stale learner and stays quiet about an active one, archiving is proposed for promoted and superseded entries and never for a lone open one |
| Corpus is read-only at runtime (T080) | **Pass.** No shell module both locates the bundle and holds a write primitive; `ipc/corpus.ts` reads and cannot write |
| Provenance survives an update (T081) | **Pass.** Every bundled recipe declares an integer version; the update path cannot reach `material/`; both licences ship; the bundle contains only what something reads |

**T059 resolved without code.** A crash mid-adaptation cannot corrupt anything,
because nothing is written until the output gate passes — the previous sheet,
the kept revisions, the IR and the profile are untouched, and a rejected second
attempt lands in its own file. Recorded as a property rather than a module, and
still unverified by an actual crash.

## What is left, and why

Four tasks, all needing the application to actually run:

- **T040, T060, T075** — Playwright end-to-end (onboarding, degradation,
  accessibility). These need a GUI session and a Playwright install.
- **T073** — corpus update as one action.

Everything else in `006` is implemented and tested offline. The honest summary
has not changed: **the application has never been run and no teacher has seen
it.** Next is spec 008, because without vision ingest the verification gate
verifies the teacher's own paste and SC-401 cannot be measured as written.


---

# The application has been run · 2026-08-28

**The line that mattered most in this document is no longer true.** Playwright
drives the real Electron application: 5 end-to-end tests, plus 209 offline unit
tests and the isolation gate. `npm run test:e2e`.

## Four production defects, found in the first ninety seconds

Every one of them would have shipped. None was visible to the typecheck, the 206
unit tests, or `npm run build` — which reported success throughout.

1. **The renderer was built to the wrong directory.** `outDir` was relative to
   the renderer root and resolved to the *repository* root, two levels above
   where `main.ts` loads it. `npm run dev` hid it by serving from the Vite dev
   server. A packaged build would have opened a blank window. (It also explains
   the stray `out/renderer` that was once committed and that I had dismissed as
   a stray build.)
2. **The preload path pointed at a file that never existed.** `main.ts` resolved
   it to `out/main/preload.js`; electron-vite emits `out/preload/preload.js`. So
   `window.rampa` was undefined and **every IPC call in the application was
   dead** — a blank window with a console error nobody had ever read.
   The first version of the build-layout test *passed* while this was broken: it
   checked that the emitted file existed and that main.ts had a preload line,
   never that they were the same path. The test had the same blind spot as the
   code.
3. **The corpus could not be found.** `app.getAppPath()` is the entry script's
   directory (`out/main`), so `corpusRoot()` pointed nowhere. **Zero recipes
   loaded** — and this one is the worst of the four, because it does not crash:
   an adaptation would have run with no judgement layer at all and produced
   plausible output with every guard absent, which is the precise failure this
   project exists to prevent. Now resolved by search, and `assertCorpus()` stops
   the job rather than adapting without rules.
4. **The interface mixed languages.** `detectLocale()` followed
   `navigator.language`, so on any machine not set to Spanish the screens wired
   to the i18n context switched to the partial English locale while the ones
   importing `es` directly stayed Spanish. Her first screen read *"Let's get you
   set up"* above *"¿Dónde guardo tus cosas?"*. Spanish is now the default per
   FR-406, and the language switch is hidden until T095 wires the components
   that bypass the context.

There was also an environment failure worth recording: `npm ci` left Electron
half-installed — `path.txt` empty and `Electron Framework.framework` missing —
and the extraction failed silently. Anyone hitting *"Electron failed to install
correctly"* should extract the cached zip manually into
`node_modules/electron/dist` and write `path.txt`.

## What this changes about the project's own claims

The pattern is now measured rather than asserted: **every defect found in three
review passes and this first run lived in a seam** — between two artifacts,
between two layers, or between the build and the runtime. Three of these four
were a path string on one side not matching a path string on the other.

## Still NOT verified

- **No provider has been called.** Prompt caching, streaming, vision — all
  implemented against documented shapes, none exercised. `cases/002-model-floor`
  is where that happens, and it needs a real key.
- **`printToPDF` has still not produced a PDF.** The e2e stops before print
  because printing needs an adapted document, which needs a model.
- **No teacher has seen any of it.**

Next: spec 008 (vision ingest), then the model floor, then the teacher.


---

# Spec 010 · the design system lands · 2026-08-28

232 offline tests (up from 209), 5 e2e on real Electron, typecheck clean.

## The contrast test found two real defects on its first run

It exists for exactly this, and it earned itself in the first minute. Both were
mine, introduced when I designed the v2 palette by eye:

| Defect | Measured | Required |
|---|---|---|
| `--line-strong` on `--paper`, light | **1.79:1** | 3:1 — WCAG 2.2 SC 1.4.11, a border that identifies a control |
| `--line-strong` on `--paper`, dark | **1.84:1** | 3:1 |
| `--ink-faint` on `--surface`, light | **4.40:1** | 4.5:1 — passed on paper, failed on a card |

The third is the instructive one: metadata passed against the page background and
failed against the card background it actually sits on. That is invisible to the
eye and invisible to review, and it is exactly the class of thing this project
keeps finding in seams.

The test reads the **shipped** `tokens.css` rather than a copy of the palette,
across all four palettes — light, dark, high-contrast light, high-contrast dark.
A duplicated palette in the test would have drifted and then reported success
while the application failed.

## And a duplication it exposed

`contrastRatio` already existed in `render/photocopy.ts`. Two implementations of
WCAG luminance arithmetic, neither aware of the other, which collided at the
export the moment a second one appeared. Now one, shared. This repository's
recurring defect in its smallest possible form.

## What landed

- **Tokens and components** lifted verbatim from the design project, so the
  visual system has one source of truth and a change is reviewed as a preview
  before it reaches a screen.
- **Atkinson Hyperlegible bundled** — 47 KB for both weights, with the real SIL
  OFL from the Braille Institute, and a test asserting the licence ships and the
  stylesheet points at files that exist.
- **The report is no longer a text dump.** `ReportView` renders `buildReport()`'s
  structures, grouped by decision, leading with what was not done. This was the
  least finished thing in the application and it sat on the screen where the
  teacher's judgement is the product.
- **The axis descriptors moved to the corpus** (`instructions/axes.md`), closing
  T096. They were calibration guidance about children living in TypeScript.
  A test asserts the corpus covers all ten axes, names them in her words, and
  never writes a bare adjective where a behaviour belongs.
- **The draft mark** as a component: words as well as colour, hatched at the
  logo's 1:12.
- Components: `Callout`, `Field` (label + help + associated message), `Badge`,
  `Segmented` (no default, because inferring scope is a privacy incident),
  `EmptyState`, `Progress`, `Logo`.

## What the gates found once they existed (T018–T021, T031)

Phase 4 was written and every one of these came out of its first run. None was
visible to typecheck, to the 232 offline tests, or to reading the code.

- **Fifteen buttons had been unstyled since the v2 rewrite.** The design system
  renamed `.primary` to `.btn .btn-primary`; the stylesheets were rewritten and
  nine components were not. They rendered as 22px of browser default — under the
  24×24 of WCAG 2.2 SC 2.5.8 — and nothing failed.
- **`.app` and `.main` were used by `App.tsx` and defined nowhere.** The
  application shell had no layout at all: no grid, no rail column, no page
  padding. Likewise `.muted` (seven components), `.axis-grid`, `.levels`, and
  `.badge.accent` against a stylesheet defining `.badge-accent`.
- **`.axis` meant two different things** — the read-only strip and the editor's
  scoring cell — sharing one name and therefore one cascade.
- **Four hardcoded `box-shadow` literals survived high-contrast mode**, whose
  entire purpose is to remove shadows, and rendered as dark teal on a dark
  ground in the dark theme. Now `--shadow-accent-hi`, `--inset-press`,
  `--inset-well`, `--inset-well-deep` and `--sheen`, defined in all four modes.
- **A `<textarea>` with no accessible name** on the notes screen — axe
  `label`, critical. An unnamed box for a screen-reader user.
- **The About screen had no `h1`**, so its headings started at `h2`.
- **A `<code>` element pushed the page sideways at 200% zoom.** Every learner
  code fits comfortably at 100%, which is why only the layout suite could find it.

The seam held again: every one of these lived between two artifacts that each
looked correct alone — a `className` and a stylesheet, a component and its
sibling, a token and the mode meant to override it.

`@axe-core/playwright` cannot run against Electron at all — it opens a second
page for frame traversal and the protocol answers `Target.createTarget: Not
supported`. The suite injects `axe-core` into the window instead: same engine,
same ruleset, no frame traversal, which costs nothing in a single-window offline
application. Worth knowing before someone concludes the gate is broken.

Also machine-checked now, in `ui/test/styles.test.tsx`: no literal colour outside
`tokens.css`, no off-scale spacing, no `outline: none`, and no class in a
`className` that no stylesheet defines. Three of `plan.md`'s four reviewer rules
were promoted from a checklist to a test, because a human reviewer read the v2
rewrite and missed fifteen stale class names.

## Spec 009 — the connect wizard (T041)

**Six services offered, none of them connected for real.** That is the honest
line and it is the one that matters, so it goes first.

`quickstart.md` §5 asks for all six to be connected once with a real key. That
needs six accounts, two of them with a payment card and money in them, and it has
not been done. Every adapter here was implemented against documentation and
against a stubbed endpoint. **An adapter implemented against documentation and
never called is not verified**, and this document exists to say so.

What *is* verified, and by what:

| | Verified by |
|---|---|
| Six entries parse, and every fact the screen needs is present | `catalogue.test.ts`, 28 tests, reading the **shipped** entries |
| A malformed entry degrades to "not offered" rather than crashing | same, 11 repair cases |
| Staleness at 180 / 365 days, with `today` as a parameter | same, 6 cases |
| `endpoint` ignored on a non-`compatible` adapter | same — the one field that could redirect traffic |
| The recommendation rule, all seven steps | `recommend.test.ts`, 21 tests |
| **A `jurisdiction: other` service is never recommended, even when cheapest** | same |
| **A no-card recommendation always reads photographs** | same |
| Every conflict carries a next step | same |
| Key normalisation, longest-prefix identification, the five shape failures | `provider-key.test.ts`, 23 tests |
| The compatible adapter: streaming, split frames, usage, quirks, five status codes | `compatible.test.ts`, 33 tests, against a stub |
| No branch on service id inside the adapter | same — asserted over the source |
| The redaction invariant for **all six**, including catalogue-built providers | `chokepoint.test.ts` |
| One key per service; migration; a failed replacement is not destructive | `credentials.test.ts`, 16 tests |
| The screen: one question, one recommendation, the comparison, the walkthrough | `e2e/connect.spec.ts`, 12 tests, in a real Electron window |
| No model name, no token count, no project jargon on any of the four screens | same |
| Three of the five failure sentences, end to end | same |

Not verified, and named:

- **Expired key, no credit, and a genuine network failure** are asserted against
  a stub in `compatible.test.ts` and never against a real account. The first
  genuine 402 a teacher hits will be the first anyone has seen.
- **The costs are estimates.** Every entry carries `cost_measured: false`, and
  the interface says «estimado» for all six. Only `cases/002-model-floor` may set
  that true, and it has not run.
- **The quality order is provisional.** `quality: unmeasured` on all six, so the
  ranking is `provisional_rank`, which is a judgement and labelled as one.
- **Facts checked on 2026-08-28, by reading the providers' pages.** CI fails at
  300 days. That date is a claim about work performed on one day, by one person,
  and a provider can change a free tier next week without telling anyone.

### A defect this feature exposed

Adapting resolved its provider with `providerById`, which knows the two
hand-written adapters. The moment `009` let her connect Groq, Mistral, DeepSeek
or OpenAI, adapting would have thrown *«todavía no has conectado Rampa con tu
servicio de IA»* — with the key connected and a green tick on the connection
screen, and no way for her to tell the failure was ours. Now resolved through
`providerFor` over the catalogue, with a test asserting the resolution covers the
whole catalogue rather than a list.

The same seam again: two artifacts, each correct alone.

## Spec 008 — vision ingest (T037)

**No page has ever been extracted by a real model.** That is the honest headline
and everything below is qualified by it.

The pipeline is built and every deterministic part of it is tested offline. What
has not happened is one call to a provider with one photograph, which is the only
thing that can tell us whether `instructions/ingest.md` actually produces the JSON
the validator wants.

Verified without a key:

| | Verified by |
|---|---|
| The schema, and that a printed number stays a string | `extraction.test.ts`, 37 tests |
| The three outcomes stay distinct — accept, retry, **stop** | same. A dark photo is a stop: retrying it charges her twice for a photograph she must retake either way |
| A figure with no description is rejected | same |
| `[UNREADABLE]` is **accepted** and promoted to the top | same. The instructions tell the model to flag rather than guess, and that is only credible if the pipeline rewards it |
| Non-monotone numbering flags and does not reject | same, plus a dedicated fixture, so nobody "fixes" it into a rejection |
| **Vision and digital paths produce byte-identical IR** | same. Otherwise "nothing downstream knows which path ran" is a claim with no check |
| The IR round-trips through the existing parser | same |
| Budgets come from `instructions/ingest.md`, clamped in code | `ingest-budget.test.ts`, 14 tests |
| PDF text layer, scanned-vs-digital routing, hidden text, DOCX, image headers | `documents.test.ts`, 14 tests, against a committed fixture |
| **No dependency requires a native build** (SC-606) | `build-layout.test.ts`. `pdfjs-dist`, `mammoth`, `libheif-js` are all JS or WASM |
| Names in extracted text become codes; unknown names are asked about | `ingest-redaction.test.ts`, 7 tests |
| The image residual is documented and never explained away | same — asserted over `docs/proteccion-de-datos.md`, including the negative |
| Formats accepted and refused; a mixed drop refused | `e2e/ingest.spec.ts`, 14 tests |
| **Confirming one page of two does not open the gate** | same |
| A page with unresolved problems can never count as confirmed | same |
| The one-click verify refuses material that came from a file | same |
| Her correction lands in the IR attributed to her | same |
| The name-in-photo warning fires once, outside the vault | same |
| Both new screens under axe, four modes, and at 1366×768 stacked and side by side | `a11y.spec.ts`, `layout.spec.ts` |

### Three defects the suites found

- **The one-click verify.** `job:verify` flipped `verified: false` to `true` with a
  regular expression over the whole document, for any document. The gate this
  project calls its defence against contaminating every output with one reading
  error could be passed by clicking once, having read nothing. It is now per page,
  derived, and refuses anything that came from a file.
- **The verification screen was unreachable after a restart.** It could only be
  opened by the ingest that produced it, so an extraction she did not finish
  confirming was lost along with what it cost — and `006`'s whole premise is that
  she is interrupted. Found by writing the accessibility test for that screen and
  discovering there was no way to get to it. Fixed with "Seguir con esto".
- **The wrapped IPC error.** `Error invoking remote method 'ingest:run': Error:
  [rampa:ingest-empty] No has añadido ningún fichero.` — Electron's wrapper, the
  project's own wire prefix, and then the sentence written for her, in that order,
  on screen. Found on the first e2e run.

Plus a JPEG header walker whose bounds check was one byte too strict, which
returned zero dimensions for a JPEG whose frame header is its last segment.

### Not verified, and named

- **SC-601 and SC-602 need the fixture photographs.** `cases/003-ingest-fixtures/`
  holds the worksheets and their hand-written ground truth — the part that can be
  written. Printing and photographing them badly on purpose needs a printer and a
  phone, and has not been done. Fixture 03 additionally cannot publish its
  screenshot at all, because the content belongs to a publisher; the note says so.
- **SC-603 needs a stopwatch and a key.** Whether ingest plus verification of a
  two-page photographed worksheet fits inside fifteen minutes is unmeasured.
- **The extraction prompt has never been run.** `instructions/ingest.md` is the
  whole judgement layer for this stage and no model has read it. The first real
  page may well fail validation twice and surface its problems, which is the
  designed behaviour and would still be a disappointing Tuesday.
- **HEIC decoding has been exercised against no real file.** The path is written
  and typed; `libheif-js` has not been handed a photograph from an actual iPhone.

## Spec 007 — the audit of Principle IX (T015)

Fourteen of `007`'s seventeen requirements were cited somewhere in `app/` before
this pass. That meant somebody had once written code with the requirement in mind.
**Two of the fourteen did not hold**, and three were cited nowhere at all.

The full table — mechanism, test, structural or instructional, and how each could
be lost silently — is
[`specs/007-untrusted-content/contracts/coverage.md`](../007-untrusted-content/contracts/coverage.md).
What belongs here is what it found.

### The draft mark could be removed without signing off

`job:render` and `job:pdf` took `signedOff` as a boolean parameter, defaulting to
false and passed straight to the renderer. So
`window.rampa.job.render(jobId, learner, true)` produced an **unmarked worksheet
with no sign-off having happened** — Principle VII and FR-509 both broken by one
optional argument.

`signoff.ts` carried a comment saying *"the renderer only omits the banner when
this has run."* It had been there, unchallenged, since the handler was written, and
it was false.

`cases/injection/05-remove-the-draft-mark` exists because the consequence is
unreviewed material in a child's hands. The fixture was written for the *model*
asking for it. Nobody had checked whether the application would simply do it when
asked by its own renderer.

This is the most consequential defect found anywhere in this project so far, and it
was found by an audit whose whole premise was that a cited requirement is not a met
requirement.

### A school's paperwork outranked the hard rules

`buildAdaptPrompt` headed the overlay section «Adaptaciones oficiales (mandan
sobre las reglas)» while `hard-rules.md` rule 10 says text inside an overlay is
never a directive. Two instructions in one request, contradicting each other about
the same document. FR-501 names overlays explicitly as data.

It now outranks the recipes and says, where the document appears, that it does not
outrank the hard rules — which the corrections section already did.

### A stale note

`cases/injection/README.md` still said the fixture set had not been built, long
after all ten landed.

### And four defects in the audit's own tests

Worth recording because they are the same class of error the audit exists to
catch: a check that looks like a guarantee and is not.

- A pattern matching `.exec(` flagged fourteen files, every one of them
  `RegExp.prototype.exec`. A rule that fires on the standard library gets deleted.
- Two assertions were written in Spanish against a corpus file written in English.
- One read `checkBounds` at exactly the boundary, where the boundary is inclusive —
  it would have passed for the wrong reason.
- One demanded a README per fixture directory, where the set documents its vectors
  centrally with a single set of pass criteria. Ten copies of a pass criterion
  drift; one does not.

### What the audit cannot close

- **No injection fixture has been run against a real model.** The detector is
  tested; the model's behaviour is not. The structural defences exist so that it
  does not have to be trusted, which is the design working rather than an excuse.
- **The two clean controls are two.** Better than none, and not a false-positive
  rate.

## Spec 003 — the audit of memory (T016)

Seven of `003`'s twenty requirements were cited in `app/`; thirteen were cited
nowhere, while the modules implementing them existed and were used. Full table in
[`specs/003-memory/contracts/coverage.md`](../003-memory/contracts/coverage.md).

### Every corpus-scope correction was silently discarded. Forever.

`journalEntrySchema` had `date: z.string()`. `js-yaml` parses an unquoted
`2026-08-28` into a **`Date`**. `ipc/memory.ts` wrote `date: ${stamp}` unquoted. So
every corpus-scope journal entry the application ever wrote failed validation, was
dropped by `loadJournal`, and **was never loaded again**.

The consequence is the exact failure this spec exists to prevent. She notices a
rule did not work, records it, sees the file appear in her own folder — and the
next adaptation has never heard of it. Not once, ever, with nothing on screen to
explain why, and one plausible conclusion available to her: *that the tool does not
really learn.*

This is the second time the same defect has been found today. `008`'s catalogue
parser had it too, in a different module, caught by a test written for an unrelated
reason. Two independent occurrences of one mistake is a pattern about the project's
YAML handling, not two coincidences — every schema reading a date from front matter
should be assumed to have it until a test says otherwise.

### Erasure had no way in

`planForget`, `executeForget`, `verifyForgotten` and `tombstone` were written,
tested, exposed over IPC — and **called by nothing**. Including two carefully-worded
lists saying exactly what erasure cannot reach: `survives` (a pattern already
contributed to the corpus does not come back) and `outOfReach` (the copy she made
onto a USB stick is hers to delete).

So the one action a school is legally obliged to be able to perform was
unreachable, and the sentences that make it honest had never been read by anybody.
`ForgetLearner.tsx` now exists, and `e2e/erasure.spec.ts` asserts the thing only an
end-to-end test can: after removal, **no file anywhere in the vault** holds the code
or the content — not "the profile directory is gone".

### A spec conflict, resolved out loud

FR-216 forbids any file containing the learner's code; FR-217 requires the removal
be recorded. A record that cannot name what was removed records nothing, so
`.rampa/erasures.md` keeps the code — defensible because the code is a pseudonym
and the name map is deleted with everything else. The e2e asserts the map is gone
in the same test, because **if it ever survived, the exception would stop being
defensible.**

### FR-210 and FR-209, closed 2026-08-29

**FR-210's gap was noise, not absence.** The channel existed end to end and carried
`effect: 'Apliqué lo aprendido antes'` for **every entry the run loaded**, with a
file path as the source. An entry that merely matched a recipe id and changed
nothing read exactly like a correction that did — and a list where everything is
claimed is a list she stops reading, taking the one line that mattered with it.

The model now declares `[memory:<recipe>]` in `.report-notes`, and `buildReport`
**checks the declaration against the entries actually loaded**. A claim about
learning it was never given is dropped rather than shown with a caveat. That check
is the whole value: a line saying *"your correction changed this"* is worth reading
only if a model that never saw the correction could not have produced it.

`instructions/adapt.md` already listed *"apply what you learned without saying so"*
under **Never**. The rule existed and there was no form to say it in.

**FR-209 is met, and half of it is not what it sounds like.** The overlay is read
before selection and does not *influence* selection: `selectRecipes` takes a
profile and a language. Turning an official document's prose into recipe selection
would mean interpreting a legal instrument with pattern matching — wrong quietly,
in a direction nobody chose. Precedence is exercised in the prompt, above the
recipes, in a section that says it outranks them and does not outrank the hard
rules. A model could still ignore both, and that is stated rather than implied.

### Still absent, deliberately

- **FR-212/213** — the de-identification rewrite and the memory export. There is no
  community corpus repository to export to, and an export with no consumer is a
  privacy surface with no benefit. The two belong together, when there is
  somewhere for it to go.

## Spec 004 — the audit of handover (T011)

**Zero of `004`'s fourteen requirements were cited anywhere in `app/`**, and
`handover.ts` implemented a good deal of them. Full table in
[`specs/004-handover/contracts/coverage.md`](../004-handover/contracts/coverage.md).

### An unconfirmed axis was stamped with today's date

`buildPacket` fell back to `?? today()`. An axis nobody had ever confirmed reached
the receiving teacher dated **today** — on the one field whose entire job is to say
how old the claim is.

The same mistake the credential store deliberately avoided, in a comment written a
few files away. That is the third time today one module has made a mistake another
module had already documented avoiding: the journal date, the catalogue date, and
now this. The pattern is not carelessness — it is that a decision recorded in one
file's comments is invisible from every other file.

### There was no way to review a packet

FR-305 requires the sending teacher's review and none existed. A handover either
did not happen or happened unreviewed. `HandoverReview.tsx` now exists, and what
she removes is dropped from the packet rather than flagged inside it — a flag
protects nothing once the file is an email attachment.

### The receiving half is deferred, with a reason

FR-307 to FR-310 and FR-314 are absent, and the reason is not effort: **the
receiving teacher does not have this application.** Handover happens between two
teachers at one school in September, and the realistic case is one of them uses
Rampa and the other opens an attachment.

So the mitigation is in the document, because prose in an email is all that will
reach her. The packet leads with «esto no es un diagnóstico», says to treat the
claims as hypotheses to confirm in the first weeks, marks everything «sin
confirmar», and says that a claim which no longer fits may mean the child changed
rather than that the previous teacher was wrong.

Weaker than a mechanical `unconfirmed` state, and it is what can be delivered to a
teacher who will never install anything. What is genuinely lost: FR-308's report
line when an adaptation relied on an unconfirmed inherited item, and FR-309's
retained history of a disconfirmed claim. Build them when a second Rampa user
receives a packet from a first.

### One thing no test can check

Every claim is marked `observed`, including axis levels — a claim about how the
sending teacher knew, which the application cannot know. A level inferred from one
lesson and one watched for a term both read «observado». The review screen shows
the marker beside each claim for that reason, and it remains the weakest link in
this spec.

## Spec 001 — the question this was all for (T004)

**SC-001 is unmeasured.** *Does a real special-education teacher find the output
usable with minor edits?*

Every one of `001`'s fifteen requirements is met, traced in
[`specs/001-phase-0-worksheet/contracts/trace.md`](../001-phase-0-worksheet/contracts/trace.md).
The question they exist to make askable has not been asked, and that is the whole
of what is left.

Also unmeasured: SC-002 (how long the journey takes her), SC-005 (whether she reads
the report instead of re-reading the worksheet), and `010`'s SC-805/806/807.

What measuring it needs, written down in
[`contracts/protocol.md`](../001-phase-0-worksheet/contracts/protocol.md) so the
first attempt is not improvised: one practising teacher, **a worksheet she brought
herself**, a real learner of hers, an hour, and no help from us while she works.
The protocol's second half is what *not* to say — do not explain the interface,
do not say what is being watched, do not justify a failure, do not ask whether she
likes it.

### Two requirements at the heart of this project are not enforced by code

FR-010 (escalate when the *what* would change) and FR-011 (`.assessment` blocks:
presentation only) live in `instructions/hard-rules.md` and a corpus recipe. There
is no mechanical test for whether an adaptation lowered a demand: a simplified
sentence and a reduced expectation look identical to a parser.

What surrounds them: provenance names the recipe behind each changed block,
completeness proves nothing vanished undeclared, and the report puts every decision
in front of her before she signs. So an over-adaptation is **visible** without being
**prevented** — and her signature is the actual enforcement.

That is the honest architecture, and it belongs in this document rather than
implied: the project's central promise is kept by a person, supported by machinery
whose job is to make breaking it visible.

## Spec 002 — deferred, and why

Composing material from objectives has no plan, deliberately. The reason is
recorded in the spec's own header: composition has **no anchor**. Adaptation can be
checked against the original — numbering preserved, nothing dropped undeclared,
provenance per block — and composition cannot, so every structural defence this
project relies on is unavailable to it.

Building it before `001`'s SC-001 is answered would put the harder half of the
product on top of an unanswered question. Nothing in the application gestures at
it, which is intentional: a half-present generation path would be worse than none.

## NOT machine-checkable, and not claimed

- **SC-805 — "it does not look unfinished."** There is no test for this and there
  will not be one. It needs a teacher's first impression, once, in the first ten
  seconds, and it can only be collected before she has been told what to look at.
- **SC-806 — the display preferences are findable without being told** (T029).
  The panel is in the rail under "Cómo se ve", next to the cost badge. Whether
  she finds it is an observation, not an assertion, and writing a test that
  clicks a button we already know the selector of would prove nothing.
- **SC-807.** Same class: a judgement about whether the interface reads as
  calm rather than as an alarm. Deferred to the same session.

Each needs the same thing everything else in this project needs and has not had.

## NOT done, and named

- **T029 and the two success criteria above need a teacher.** Recorded here
  rather than ticked.
- **Spec `009` — the connect wizard — is implemented**, 42 of 43 tasks. The
  remaining one is connecting all six services for real, which needs six accounts
  and money in two of them.
- **Spec `008` — vision ingest — is implemented**, and everything it cannot claim
  is listed above. Not one page has been extracted by a real model.
- **Specs `001`–`004` and `007` have no plan.** `007` is largely delivered through
  `006` — 14 of its 17 requirements are cited in the code — and `002` is
  deliberately deferred post-Phase-0 by a recorded decision. Neither statement is
  a substitute for the plan pass that would confirm it.
- **No teacher has seen any of it.** Unchanged, and still the only line that
  decides anything.
