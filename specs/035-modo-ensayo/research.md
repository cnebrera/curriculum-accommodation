# Phase 0 · Research

Six questions. R1 and R2 are the structural decisions; R6 is the one that had to be asked
because the answer *looked* like it should be yes.

---

## R1 · Where does the rehearsal store live, and what is its lifecycle?

**Decision**: a second `Vault` instance over `app.getPath('userData')/ensayo/`, laid out
identically to the real vault. Starting a rehearsal seeds it from the bundled sample set;
discarding it is `rm -rf` of that one directory; re-entering re-seeds. Nothing else has a
lifecycle, because nothing else exists.

**Rationale**: three facts already in the code make this the cheap answer.

- `Vault` is a class constructed over a root (`packages/core/src/vault/io.ts`), and
  `resolveInVault` **refuses** any path that leaves that root. Instantiating it over a
  second root gives the rehearsal the entire confinement machinery for free: a rehearsal
  write cannot reach the real vault for the same reason a real write cannot reach `/etc`.
- `userData` is where this project already keeps machine state that is *not* part of her
  professional record: the credential store (`009` FR-725 — a vault she hands over in
  June must not carry it) and the display settings (`010` FR-820). A fictional learner is
  exactly that kind of thing: it belongs to the installation, not to her record.
- The layout mirrors `VAULT` (`paths.ts`) so that `resolveDocument`, `isSignedOff`,
  `renderHTML`, the output checks — everything that takes a `Vault` — runs over the
  rehearsal unmodified. A rehearsal-shaped layout would need rehearsal-shaped readers,
  which is a second pipeline (Principle IV, refused).

**Why discard = delete is the whole erasure story**: the spec's edge case says it —
rehearsal artefacts live outside the real vault, so `003`'s promises are untouched and
discarding needs no verifier. That is only true if *everything* rehearsal-touched is under
the one root: the seeded sample, anything she typed, outputs, the rehearsal's own state
file. So the rule is absolute: **the ensayo module owns exactly one directory and writes
through exactly one `Vault` instance.** FR-3308 falls out of the same rule.

**Alternatives considered**: a `vault-ensayo/` sibling next to her real vault — rejected:
her vault's location is her choice, and planting a second folder beside it is writing to
a place she designated for something else; also visible in Obsidian, where a fictional
learner would sit beside real ones. A subfolder inside the real vault (`.rampa/ensayo/`)
— rejected outright: that is the filter the spec forbids (FR-3306), SC-3303's byte-level
inspection would fail by construction, and `003`'s erasure would suddenly have rehearsal
artefacts in scope. A temp directory — rejected: mid-rehearsal restart must be resumable
(US2 scenario 3), and temp directories are cleared by the OS on its own schedule.

---

## R2 · The simulation seam: a fake `Provider` injected, or pre-computed jobs served?

**Decision**: **pre-computed jobs served** by the `ensayo:*` IPC, with the real
deterministic code running everywhere a model is not. No fake `Provider` exists anywhere
in the tree.

**Rationale**: the provider seam today is `activeProvider()` in
`packages/shell/src/ipc/keys.ts` — it resolves the credential store's active entry
through the catalogue to a `Provider` and hands `{ provider, key }` to `adapt.ts` and
`ingest.ts`. A fake provider would have to be resolvable *there* to be reached by the
real pipeline, which means either an entry in the credential store (a canned provider one
`activate()` away from serving a real job — plausible output that is wrong in a way
nobody sees, the project's named number-one failure mode) or a branch in
`activeProvider()` (the if-statement the spec's checklist forbids, moved one layer down).
Both put the simulation *inside* the real pipeline; the point of FR-3306 is that nothing
rehearsed is inside anything real.

There is also an honesty argument (FR-3309): a fake provider would make the simulated
steps *behave* like real ones — streaming, retrying, pricing — which is precisely the
claim the rehearsal must not make. Serving the pre-computed result behind a staged
progress that says «simulado» presents the seam as what it is.

**What stays real, and it is most of the journey**: the verification screen reads the
sample IR and its source photo from the rehearsal vault through the real reader; the name
question runs core's deterministic detector (`packages/core/src/redact/names.ts`) over
what she types; the draft mark is derived from the document (`isSignedOff`), comes off
through the real sign-off logic pointed at the rehearsal vault, and is per sheet; print
renders through `renderHTML` and the real output checks. Only two arrows are canned: photo
→ reading, and IR → adapted+report. That split is FR-3309's sentence in architecture:
the rehearsal never claims more, and never less, than the product.

**The refactor this requires**: `renderJob` (`jobs/print.ts`) and the sign-off
(`ipc/signoff.ts`) currently call `currentVault()` internally. They take a `Vault`
parameter instead; the real IPC handlers pass `currentVault()` (no behaviour change), the
ensayo IPC passes the rehearsal vault. The seam is then a *parameter*, and the boundary
test (R6) makes the wrong argument unimportable.

**Alternatives considered**: fake provider, above. Running the real `runAdaptation` with
a canned transport — rejected: it would recompute recipe selection at run time and could
drift from the authored report, and FR-3310 says the report *is* the authored one.
Generating the sample at build time with a real model — rejected by the spec itself
(assumption: determinism and quality control over the one adaptation everyone will see),
and by Principle II: scripts never call a model.

---

## R3 · Who is the fictional learner, and who authors the sample?

**Decision**: one learner and one worksheet, authored in Spanish as repository content
under `sample/ensayo/`, reviewed in PR like corpus, licensed CC BY-SA, bundled beside the
corpus by `bundle-corpus.mjs`. The profile declares its own inventedness in its front
matter **and** in its visible text; the adaptation and report are written by hand against
real recipes at their bundled versions.

**Rationale**: `seed-learners.mjs` already established the register for invented
children: ordinary given name, no surname, invented school, a *combination of barriers*
written on the axes rather than anything resembling a person (its comment: «a synthetic
profile can be argued about in public, and a real one cannot»). The sample learner is
that, plus one thing the seeds do not need: a declaration. The seeds are a developer's
tool; this profile is the first profile a teacher ever reads, and Principle VII's honesty
applies to it — a fabricated child is fabricated loudly (FR-3307). Front matter carries
`sample: true` (structural, so screens and tests can gate on it); the profile's own prose
says it («Este alumno no existe: es un ejemplo para aprender la herramienta»), so the
declaration survives printing, hand-editing and being read outside Rampa.

**The deliberate imperfection (FR-3310)**: the sample's reading disagrees with the source
photo in exactly one authored place — the kind a camera really produces (a digit
misread, a dropped line of one exercise) — so the verification screen has something true
to catch. Checking is the point of that screen; a rehearsal whose reading is perfect
teaches her to skip it, which is training the wrong reflex on the product's second most
important gate. The flaw is documented in the sample's manifest so a test can assert it
exists and the walkthrough can confirm it is findable without being told where.

**Why authored content and not app resources**: the sample is pedagogy — what a good
profile looks like, what a good report reads like, what is worth catching in a reading.
That is judgement, and judgement lives in Markdown reviewed by people who can judge it
(Principle I). Bundling it beside the corpus also gives it the corpus's licence handling
for free, and `034`'s corpus channel can carry a refreshed sample when recipes move.

**Alternatives considered**: reusing a `seed-learners` profile — rejected: those are
seven and undeclared, and a rehearsal wants one child chosen for the journey, loudly
invented. Generating the profile from `profiles.example/` at run time — rejected: the
sample set must be one reviewed, coherent whole (profile ↔ recipes cited ↔ adaptation),
and assembling it mechanically breaks that chain.

---

## R4 · How is «ensayo» marked, on screen and on paper?

**Decision**: on screen, structurally — every rehearsal screen renders inside
`EnsayoFrame`, which paints a permanent, unmissable mark; no rehearsal screen exists
outside it, so SC-3304's «100% of screens» is a property of the component tree, not a
checklist. On paper, **in the documents themselves**: every sample document carries the
«material de ejemplo» sentence in its own content, so every rendering of it — HTML, PDF,
any modality — carries the mark by construction, with no renderer branch.

**Rationale**: the two precedents are both in this repository. For screens: `013`'s rule
that a screen declares what it is and the shell renders it — a per-screen «remember the
banner» is the instructional defence the constitution ranks below structural ones. For
paper: `021` T022 put the exam's limits **on the document, not only on the screen**,
because a printed page outlives the screen it was made on — and a rehearsal sheet in a
photocopy pile is exactly that case (spec edge case: a rehearsal sheet must not be usable
as if adapted for a real child). A renderer flag (`renderHTML(..., { ensayo: true })`)
was rejected: it is a parameter someone passes, which is the same shape as the
`signedOff` parameter `007` had to remove — the mark must be derived from the document,
never from the caller.

**The ledger mark is an absence**: would-be costs are shown in the moment, labelled as
estimates in `006` FR-403's register («esto habría costado unos 3 céntimos»), and
recorded nowhere. Structurally: `recordCost` writes through `currentVault()`, which the
ensayo module cannot import (R6's boundary test), and the rehearsal root's own
`.rampa/costs.json` simply never exists — asserted, because an empty ledger and no ledger
are different facts.

---

## R5 · What does the rehearsal present as real, and what as simulated?

**Decision**: **simulated, and said so**: reading the photo, and the adaptation — the two
model calls. **Real, and said so**: everything else — the profile and its axes, the
verification of the reading, the name question, the review with its genuine report, the
draft mark and sign-off, print and its output checks, the record within the rehearsal,
and `028`'s pictogram materials (agendas, sequences), which never needed a key at all.

**Rationale**: FR-3309 is a truth-in-labelling requirement in both directions. Claiming
more than the product (a rehearsal that never fails, costs that are always three cents)
sells; the spec wants teaching. Claiming *less* is the subtler loss: a teacher who leaves
believing everything needs a key will not discover that `028`'s materials, the profiles
and the record work offline for real — which for a teacher without a key yet is the
actual first-night value. So the UI carries the distinction in her language: the
simulated steps say «simulado — con tu clave, aquí trabajaría la IA», and the
deterministic features say «esto ya funciona de verdad sin clave». The would-be cost
label does double duty here: it marks the step as simulated *and* answers the fear the
cost display exists to end (`006` US4), before she has spent anything.

**Consequence for scope**: the rehearsal does not simulate failure modes (spec
assumption) and has no correction step — a correction is a model call, and a canned
correction would be a canned conversation, which is a demo. Recorded in tasks as out of
scope so it stays a decision.

---

## R6 · Does the rehearsal share seams with the test machinery (`RAMPA_TEST`/`RAMPA_HIDDEN`)?

**Finding**: **no — and there is less machinery than the question assumes.** Checked:
`RAMPA_TEST` and `RAMPA_HIDDEN` appear in exactly one production file
(`packages/shell/src/main.ts`) and affect only window visibility — inactive window, no
dock icon, or never shown. There is no fake provider, no canned transport, no test vault
factory in the shell: the e2e suite runs real windows over real temp vaults and simply
never exercises the model steps. So there is no test seam for the rehearsal to reuse,
and nothing was lost by not finding one.

**Decision**: the rehearsal shares *the test flags' benefit* — `e2e/ensayo.spec.ts` runs
under `RAMPA_TEST`/`RAMPA_HIDDEN` like every other spec — and **nothing else**. What is
deliberately NOT shared, in both directions:

- The ensayo store is not the e2e suite's vault fixture. Tests get throwaway roots per
  test; the rehearsal root has a lifecycle a teacher controls (resume, discard,
  re-enter). Conflating them would couple a teacher-visible feature to test hygiene.
- The rehearsal must never become the suite's way to fake a provider. A teacher-reachable
  mode that tests lean on inverts both purposes: tests would pin the rehearsal's
  behaviour (making the sample unrefreshable), and the rehearsal would grow test-only
  affordances a teacher can trip over. If the suite ever needs a canned provider, that is
  its own decision with its own spec — recorded here so it stays one.

**One thing the rehearsal takes from `main.ts`'s comment rather than its code**: the
instrumentation habit. SC-3302's network counter is installed under `RAMPA_TEST` the same
way the window tricks are — a test-time observation point, not a behaviour branch — and
it must watch **both** stacks (Chromium's session *and* Node's `fetch`, because provider
calls leave through undici in the main process). The structural half is a module-graph
test in the shape of `npm run test:isolation`: nothing under `ensayo/` may reach
`@rampa/providers`, `ipc/keys.js`, `ipc/vault.js` or `ipc/cost.js`.
