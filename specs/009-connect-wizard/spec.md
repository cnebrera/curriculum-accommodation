# Feature Specification: Connecting — the guided walkthrough per provider

**Feature Branch**: `009-connect-wizard`

**Created**: 2026-08-28

**Status**: Draft

**Input**: 006 FR-403/404 require the connection step to deep-link, accept a
paste and validate — but say nothing about *walking her through getting the key
in the first place*, and only two providers exist. ADR 0005 named this the
decisive screen: *"the key step is the single biggest drop-off point in any
bring-your-own-key onboarding, not because it is hard but because none of the
vocabulary is familiar. 'Create an API key' is five unfamiliar words before
anything works."*

## Why this is its own feature

Everything else in this project can be fixed later. **This screen gets one
chance.** A teacher who cannot get past it never sees an adaptation, never
corrects a recipe, and never tells us anything — so a failure here is
indistinguishable from the project not existing.

It is also the screen most likely to rot without anyone noticing: provider
consoles get redesigned, free tiers change terms, buttons move. A walkthrough
compiled into the application is wrong within months and needs a release to fix.

## The decision that shapes it

**The walkthrough is corpus, not code.** Research R6 already required this of the
provider list — *"the onboarding must read its provider list from configuration,
not from compiled-in copy, so a changed free tier is an update rather than a
release"* — and the per-provider steps are the same kind of content, only more
volatile.

So each provider ships a Markdown file a human can read and correct, and updating
it is a corpus update. This is Principle I's reasoning applied one layer out: the
people who will notice that Google moved a button are not the people who can
compile a TypeScript file.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She picks a provider by what she cares about (Priority: P1)

She is not choosing a model vendor; she is answering "which of these can I
actually use?". The choice is presented as **card or no card, and what a
worksheet costs** — never as model names or context windows.

**Why this priority**: A screen that asks a teacher to compare model families has
already lost her.

**Acceptance Scenarios**:

1. **Given** the connection step, **When** it opens, **Then** each provider shows
   its label, whether it asks for a payment card, and the cost of a worksheet in
   cents — and the no-card option is offered first.
2. **Given** the list, **When** she reads it, **Then** no model name, token
   count, or context size appears anywhere on it.
3. **Given** a provider without vision, **When** it is shown, **Then** the fact
   that photographs will not work with it is stated before she chooses, not after
   (spec 008 depends on vision).

---

### User Story 2 - She is walked to the key, step by step (Priority: P1)

She picks a provider and gets a short numbered walkthrough: what she is about to
do, the deep link to the exact page, what the page will look like when she gets
there, and what to copy.

**Why this priority**: This is the drop-off point. It is the whole feature.

**Acceptance Scenarios**:

1. **Given** a chosen provider, **When** the walkthrough shows, **Then** it opens
   with one plain sentence about what a key is and why it is needed, in her
   language, with no jargon.
2. **Given** the walkthrough, **When** she follows it, **Then** the steps are
   numbered, each is one action, and the count is small enough to hold — no more
   than about six.
3. **Given** a step that happens on the provider's site, **When** it is shown,
   **Then** it says what she will see there ("un botón azul que dice *Create API
   key*"), because a step she cannot recognise is a step she abandons.
4. **Given** the link, **When** she opens it, **Then** it goes to the exact key
   page in her normal browser, never inside the application.
5. **Given** she gets lost, **When** she looks, **Then** there is a "no encuentro
   eso" section for that provider covering the two or three things that actually
   go wrong.
6. **Given** she closes the application mid-walkthrough, **When** she reopens it,
   **Then** she is on the same provider's walkthrough, not back at the start
   (006 FR-401).

---

### User Story 3 - Pasting tells her the truth immediately (Priority: P1)

She pastes. Within a second or two she knows whether it worked, and if it did not,
she knows which of the four or five actual problems she has.

**Why this priority**: 006's edge cases already demand this ("*invalid* is not an
acceptable answer to a teacher"); this feature is where it is delivered.

**Acceptance Scenarios**:

1. **Given** a pasted key with surrounding whitespace or quotes, **When** it is
   validated, **Then** it is trimmed and works. She copied it from a web page.
2. **Given** a key from a different provider, **When** it is validated, **Then**
   she is told which provider it belongs to and offered the switch — not told it
   is invalid.
3. **Given** a key that is malformed, expired, or has no credit, **When** it is
   validated, **Then** each says what it is and what to do next, distinctly.
4. **Given** no connection, **When** she validates, **Then** she is told the
   check could not run, not that her key is wrong.
5. **Given** a valid key, **When** it is accepted, **Then** she sees the answer
   to the question she is actually asking: **"✓ Conectado. Unos 3 céntimos por
   ficha."**
6. **Given** validation, **When** it runs, **Then** it costs approximately
   nothing — the smallest request the provider allows.

---

### User Story 4 - She can change it later without fear (Priority: P2)

The connection is not a one-time gate. She can come back, see which provider is
connected, replace the key, or switch providers, without touching her learners or
her material.

**Acceptance Scenarios**:

1. **Given** a working connection, **When** she opens the connection screen from
   the application, **Then** it shows which provider is connected and when it was
   last verified — never the key itself.
2. **Given** she replaces a key, **When** the new one fails validation, **Then**
   the old one is still in place and she is told so.
3. **Given** she switches provider, **When** she does, **Then** her vault is
   untouched and previously adapted material keeps its recorded provenance.

### Edge Cases

- **She pastes into the wrong box, or pastes a whole page.** Detected by length
  and shape; she is asked to paste just the key.
- **The provider's free tier changes its terms.** A corpus update, not a release.
  The cost and card facts live in the same file as the steps for that reason.
- **The key page is behind a sign-up she has not done.** The walkthrough says so
  at step one rather than letting her hit it at step four.
- **She has a key from her school or a colleague.** Supported without comment:
  paste it. Whose key it is is not our business, and the cost display makes usage
  visible either way.
- **A provider requires selecting a project or enabling billing first.** That is
  in the walkthrough for that provider, or the provider is not offered.
- **Two providers, one key each.** Only one is active; switching does not lose
  the other. Keys are stored per provider.
- **An OpenAI-compatible endpoint** (aggregator, gateway, local model). See
  Assumptions: specified, deliberately not built in v1.

## Requirements *(mandatory)*

### The offer

- **FR-701**: The provider list, its walkthroughs, its cost figures and its
  card/vision facts MUST be read from the bundled corpus at run time, and MUST NOT
  be compiled into the application (research R6).
- **FR-702**: Providers MUST be presented by what a teacher decides on: whether a
  payment card is needed, what a worksheet costs, and whether photographs work.
  Model names, token counts and context sizes MUST NOT appear.
- **FR-703**: A provider reachable without a payment card MUST be offered first
  (006 FR-404).
- **FR-704**: At least three providers MUST be offered, and adding one MUST be a
  corpus file plus one adapter file, with no change to the wizard.

### The walkthrough

- **FR-705**: Each provider MUST ship a numbered walkthrough of at most about six
  steps, each one action, in the teacher's language.
- **FR-706**: Each step happening on the provider's site MUST describe what she
  will see there, not only what to do.
- **FR-707**: The walkthrough MUST deep-link to the exact key page, opened in her
  browser and never inside the application.
- **FR-708**: Each provider MUST ship a short "no encuentro eso" section for what
  actually goes wrong on that provider.
- **FR-709**: Walkthrough position MUST be resumable: reopening returns her to
  the provider she was working on.

### Pasting and validating

- **FR-710**: Pasted keys MUST be trimmed of whitespace and surrounding quotes
  before validation.
- **FR-711**: Validation MUST distinguish, with a distinct sentence and a next
  step for each: malformed, wrong provider, expired or unauthorised, no credit,
  and no connection. "Invalid" MUST NOT be shown alone.
- **FR-712**: A key recognised as another supported provider's MUST name that
  provider and offer to switch.
- **FR-713**: Validation MUST use the cheapest request the provider allows, and
  MUST NOT send any learner data or material.
- **FR-714**: Success MUST be reported in cost terms, in cents, per worksheet.
- **FR-715**: Keys MUST be stored per provider, encrypted, outside the vault
  (006 FR-417's reasoning: a credential is not part of her records).

### Living with it

- **FR-716**: A connection screen reachable after onboarding MUST show the active
  provider and when it was last verified, and MUST NOT display the stored key.
- **FR-717**: A failed replacement MUST leave the previous working key in place
  and say so.
- **FR-718**: Switching provider MUST NOT touch the vault, and MUST NOT alter the
  provenance of already-adapted material.

## Success Criteria *(mandatory)*

- **SC-701**: A teacher who has never used AI gets from the connection screen to
  "✓ Conectado" **unassisted**, in under ten minutes, on the provider she chose.
  This is the feature's pass/fail and it is a component of 006 SC-401.
- **SC-702**: Zero observer interventions during the connection step
  (006 SC-407). Every one is a logged defect and this is where they are expected.
- **SC-703**: She can say, unprompted, roughly what a worksheet costs her
  (006 SC-406) — measured right after connecting, not at the end.
- **SC-704**: Every validation failure path produces a distinct, actionable
  sentence, verified by triggering all five.
- **SC-705**: Updating a provider's walkthrough, cost or free-tier terms requires
  no code change and no release — verified by editing the corpus file.
- **SC-706**: Adding a provider touches exactly two files: its corpus
  walkthrough and its adapter.

## Assumptions

- **Providers in v1: Google (Gemini), Anthropic (Claude), OpenAI.** Google is the
  no-card path and is offered first. Two of the three are already implemented;
  OpenAI is one adapter file per `contracts/provider-adapter.md`.
- **An OpenAI-compatible endpoint option is specified and deliberately not built
  in v1.** It would cover aggregators, gateways and local models, and it is the
  most requested kind of option — but it makes the destination of a request
  user-configurable, which widens where a child's material can go and interacts
  with 007 FR-511. It is a security decision for the project owner, not a
  convenience to add quietly, and it needs a warning, a data-protection paragraph
  and its own test before it ships.
- **Cost figures shipped in the corpus are estimates** and are marked as such.
  `cases/002-model-floor` measures the real ones per provider and tier, and the
  corpus files are updated from that measurement rather than from a price page.
- **Vision matters to the choice**, because spec 008 makes photographs the common
  path. A provider without it is offered only with that stated up front, or not
  offered.
- This feature does not manage billing, quotas or organisation accounts. If a
  teacher's key comes from her school, that is between her and her school.
