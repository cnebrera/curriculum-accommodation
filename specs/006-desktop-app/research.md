# Phase 0 — Research

Unknowns from Technical Context, resolved. Each entry: decision, rationale,
alternatives rejected.

---

## R1 · Shell framework: Electron or Tauri

**Decision: Electron.**

**Rationale.** FR-425 requires the app to render HTML and PDF itself with nothing
to install, and FR-427 requires output legible on a black-and-white photocopy.
Both make print fidelity a product property, not a detail: a worksheet must come
out identically on the teacher's Windows laptop and on a Mac. Electron bundles
Chromium, so the PDF a teacher prints is produced by the same engine we tested
against. `webContents.printToPDF()` is the exact primitive the requirement needs.

The contributor pool matters too. This is an unfunded open-source project whose
survival depends on other people picking it up, and TypeScript reaches an order
of magnitude more of them than Rust.

**Alternatives rejected.**

- **Tauri.** Genuinely attractive: ~10 MB binaries against ~150 MB, lower memory,
  and a capability allowlist that would implement "writes confined to the vault"
  as configuration rather than as our own code. Rejected because it renders
  through the system webview — WebKit on macOS, WebView2 on Windows — so print
  output differs per platform exactly where we cannot afford it. The security
  advantage is real but reproducible: confining writes to the vault is one module
  in the shell, and it is testable.
- **A local web server the teacher opens in a browser.** Same install barrier,
  worse first impression, and no access to the credential store.

**Consequence to accept.** A ~150 MB download on school wifi. One-time, mitigated
by delta auto-updates. Print fidelity is permanent; the download is not.

---

## R2 · Enforcing "the core never calls a model"

**Decision: a module-graph test in CI, not a code-review convention.**

**Rationale.** Principle II is NON-NEGOTIABLE, and conventions decay. The test
asserts that nothing under `packages/core` transitively imports `packages/
providers`, `node:http`, `node:https`, `undici`, or references `fetch`. A
violation fails the build with the principle quoted in the message.

The core's own test suite runs with no network and no API key configured, so an
accidental call fails there too.

**Alternatives rejected.** Lint rule only (easy to disable inline); trusting
review (this is the principle most likely to be eroded by a well-meaning
shortcut).

---

## R3 · Damage-tolerant vault parsing

**Decision: parse, repair, report — never reject.**

FR-410 says a hand-edit that breaks structure is our defect. The parser therefore
has no failure mode that loses the teacher's words:

1. Try YAML front matter. On failure, treat the entire file as body prose and
   synthesise front matter from the filename and file dates.
2. Validate with `zod`; on a field mismatch, keep the raw value in a
   `_unparsed` map rather than dropping it.
3. Write back only on an explicit action, never on read.
4. Record every repair and surface it: *"He arreglado el formato de dos fichas.
   No he cambiado nada de lo que escribiste."*

**Alternatives rejected.** Strict schema with errors — turns the teacher's editing
into a failure state, which is the opposite of the vault's purpose. Silent
normalisation on read — invisible edits to her files destroy trust the first time
she notices.

---

## R4 · Where the name map lives

**Decision: encrypted with Electron `safeStorage`, stored *inside* the vault,
with an explicit export for moving machines.**

**Rationale.** Three requirements pull against each other: names must be
recoverable for the teacher (FR-420), absent from anything shared or handed over
(FR-417), and the vault must be portable by copying (FR-408).

Keeping the ciphertext in the vault means a backup is still a complete backup. OS
encryption means a copied or shared vault leaks nothing — the recipient sees an
opaque file. The cost is that `safeStorage` is bound to the OS user, so moving to
a new machine loses the mapping.

That cost is acceptable and the failure is benign: profiles, notes and history
are intact, only the code→name display is lost, and an explicit "export names"
action covers the deliberate move. Privacy holds by default; recovery is a
deliberate act.

**Alternatives rejected.** A passphrase — adds a step to onboarding for a cold
user, which is the one thing we cannot afford. OS keychain outside the vault —
a backup would silently be incomplete. Plaintext — fails FR-417 outright.

---

## R5 · Detecting names we do not know

**Decision: dictionary plus a narrow heuristic, deterministic, always asking.**

FR-419 requires flagging probable names the system has not been told about. This
must run in `core`, so no model: a list of common Spanish given names, plus
capitalised tokens that are not sentence-initial and not in a common-word list,
scoped to text the teacher types rather than to material content.

It asks; it never blocks and never silently rewrites. FR-514's logic applies here
too — a detector that fires constantly is one she learns to dismiss.

**Alternatives rejected.** A model-based NER pass — forbidden in `core` by
Principle II, and it would mean sending the text somewhere to find out whether it
is safe to send. Circular and wrong.

---

## R6 · Providers for v1

**Decision: Anthropic and Google, with Google as the no-card path.**

FR-404 requires at least one provider reachable without a payment card; Google AI
Studio's free tier is the obvious candidate. Anthropic is the quality default.

The adapter surface stays deliberately small — one method, streaming, plus a
capability probe for vision — so adding a provider is a file, not a refactor.

**NEEDS CLARIFICATION resolved by decision, flagged for revisit:** free-tier terms
change. The onboarding must read its provider list from configuration, not from
compiled-in copy, so a changed free tier is an update rather than a release.

---

## R7 · Cost display

**Decision: count tokens locally, price from a bundled table, show cents.**

Providers report usage per response; the app accumulates it per job and per
month. Prices live in a data file updated with the corpus.

Shown as **"unos 3 céntimos"**, never as tokens. FR-422 exists because a teacher
fearing an unknown bill stops using the tool — the number's job is to end the
worry, so it must be in the units of the worry.

---

## R8 · Corpus bundling and licence compliance

**Decision: build-time copy from `recipes/`, shipped read-only, with both licences
and attribution in the installer.**

The Constitution Check flagged this: the app is Apache-2.0 and bundles CC BY-SA
4.0 content. Distribution without the content licence and attribution is
non-compliant, and it would be a bad look for a project whose whole argument is
that the commons should stay common.

An "Acerca de" screen carries both, and the build fails if the licence files are
absent from the bundle.

---

## R9 · Testing the part most likely to fail

**Decision: Playwright end-to-end on onboarding first, plus a scripted
observation protocol for the human test.**

SC-407 makes every observer intervention a logged defect, which only works if the
observation is structured. The protocol: the teacher is given the installer and
nothing else; the observer records timestamp, screen, and what she said out loud
at each hesitation; the observer may not speak until she asks twice.

Automated tests cannot find what confuses a person. They exist to stop the flow
regressing between the sessions where a person does.

---

## Remaining NEEDS CLARIFICATION

| Item | Why it is open | Who decides |
|---|---|---|
| Code-signing certificates for Windows and macOS | Annual cost and legal identity of the holder. FR-426 cannot be met without them, and unsigned builds are a worse first impression than any missing feature | Project owner |
| Whether Linux ships at all in v1 | No signing story, small audience, real maintenance cost | Project owner |
