# Feature Specification: Cómo llegan las versiones — la app avisa, el corpus viaja solo

**Feature Branch**: `034-como-llegan-las-versiones`

**Created**: 2026-09-03

**Status**: Draft

**Input**: The adversarial review's completeness critic (CRIT-01): no update mechanism
exists, no spec owns one, and the corpus — the pedagogical policy this project's whole
argument says is correctable in Markdown — only reaches an installed app by a manual
full reinstall. «Para un producto cuyo argumento es que el criterio se corrige en
Markdown, no tener camino de entrega de esas correcciones es un agujero de producto.»
Carlos's decision (P49):

> **Aviso + corpus separado**: la app comprueba y avisa «hay versión nueva» con enlace,
> sin auto-instalar; y el corpus se actualiza por separado, sin reinstalar la app.

## The gap

Today, the day somebody fixes the tilde printed on every exam, or a PT reviews a recipe
and flips `reviewed_by_teacher`, every existing installation keeps the old judgement
until a non-technical teacher downloads and reinstalls an entire application by hand.
That is not an ops detail; it is the delivery path of the product's core promise.

Two channels, deliberately different:

| | App | Corpus |
|---|---|---|
| What changes | code | pedagogical policy in Markdown |
| How it arrives | **notice + link**, she installs | **in-app update**, she reads what changed and accepts |
| Why | installing software is hers and her IT's act | reading corrected judgement is exactly what Principle I promises she can do |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - «Hay una versión nueva» (Priority: P1)

Rampa checks for a new app version and, when there is one, says so — one quiet line with
what is new in her language and a link to download. Nothing installs itself; nothing
nags; offline changes nothing except that the check silently waits for next time.

**Why this priority**: Without it, every fix this review produced strands on the
machines that need it.

**Independent Test**: Against a fixture release feed: newer version → notice with
human-readable summary and link; same version → silence; no network → silence and no
error surfaced.

**Acceptance Scenarios**:

1. **Given** a newer app version exists, **When** Rampa checks, **Then** a notice names
   the version, summarises what changed in plain language, and links to the download —
   and does nothing else.
2. **Given** no network, **When** a check would run, **Then** work is unaffected and no
   error interrupts her (offline-first: `006`'s promise extends here).
3. **Given** the notice, **When** she dismisses it, **Then** it stays dismissed for that
   version — a notice that returns daily is a nag, and a nag trains dismissal.
4. **Given** any check, **When** it runs, **Then** the only data leaving the machine is
   the request itself, and the disclosure (`about`/DPO section) says this destination
   exists — the P23 rule: network destinations are declared, all of them.

---

### User Story 2 - The corpus updates itself, shown first (Priority: P1)

A corpus correction ships (the exam tilde, a reviewed recipe, a new vehicular recipe from
`033`). Rampa offers it: «hay una corrección del criterio pedagógico», with the actual
change readable — this is Markdown written for her (P28: en español). She reads, accepts,
and the new corpus applies to *new* jobs from that moment. No reinstall, no restart
ceremony beyond what applying needs.

**Why this priority**: This is Principle I's delivery mechanism. The judgement being in
Markdown was always half the point; the other half is that corrected judgement arrives.

**Independent Test**: Serve a fixture corpus update; confirm it is shown as readable
change before acceptance, applies only after acceptance, affects only new jobs, and can
be declined indefinitely.

**Acceptance Scenarios**:

1. **Given** a corpus update, **When** offered, **Then** what changed is readable in
   full before any acceptance — shown, not summarised away (the `029` FR-2707 pattern:
   policy is seen before it acts).
2. **Given** acceptance, **When** the next job runs, **Then** it uses the new corpus and
   its report cites the corpus version it ran under (Principle VI: traceability to the
   policy that governed).
3. **Given** she declines, **When** jobs run, **Then** the current corpus continues
   governing, and the offer remains available without nagging.
4. **Given** any already-signed document, **When** a corpus updates, **Then** nothing
   about it changes — history is immutable (`029` FR-2710's rule, same sentence).
5. **Given** a corpus update requiring a newer app than installed, **When** offered,
   **Then** it is declared incompatible with the reason, never half-applied (the corpus
   carries a format version; the P50 discipline, applied to the corpus).

---

### User Story 3 - She can go back (Priority: P2)

The updated recipe reads worse to her than the old one. She returns to the previous
corpus version from the same screen; the report of subsequent jobs cites the version she
returned to. Corpus versions she has had are kept locally.

**Why this priority**: Reversibility is what makes acceptance safe enough to say yes to.
P2 because decline-first (US2) already protects her.

**Acceptance Scenarios**:

1. **Given** previously applied corpus versions, **When** she reverts, **Then** the prior
   version governs new jobs and the change is as visible as an update.

---

### Edge Cases

- **A user-modified corpus** (she edited a recipe locally, or `029`'s normative corpus):
  an update MUST NOT silently overwrite her changes — the conflict is shown per file:
  keep hers, take the update, or view both. Her judgement outranks the shipped one on
  her machine; that is Principle I's whole posture.
- **The update source is a new network destination**: declared in the corpus per the
  amended `007` FR-511 (P23), listed in the disclosure, and reachable only when checking
  — never during jobs.
- **Integrity**: a corpus update is content until verified — it must arrive with a
  means of knowing it is what the project published (the plan decides the mechanism; the
  spec requires that a tampered or truncated update is refused, not half-applied).
- **A malicious «corpus update»** is the `029` import threat with a distribution
  channel: the same scan-and-show rules apply before activation. An update is an import
  with better provenance, not a bypass.
- **Ensayo mode (`035`)**: updates are irrelevant inside a rehearsal; the notice does
  not interrupt it.
- **The teacher who never updates**: everything keeps working forever offline; version
  drift surfaces only as honest incompatibility messages when artefacts (packets from
  `030`, vaults under P50) arrive from newer versions.

## Requirements *(mandatory)*

### Functional Requirements

#### The app channel

- **FR-3201**: The application MUST be able to check for a newer application version
  and, when one exists, notify with version, plain-language summary and download link.
  It MUST NOT download or install application code itself.
- **FR-3202**: Checks MUST be silent in failure and absence: no network, no server, no
  new version — no interruption. Work never depends on a check.
- **FR-3203**: A dismissed notice MUST stay dismissed for that version.
- **FR-3204**: The check's destination MUST be declared in the corpus (the amended `007`
  FR-511 list) and in the user-facing disclosure; the check sends nothing beyond the
  request itself.

#### The corpus channel

- **FR-3205**: Corpus updates MUST be obtainable and applicable in-app without
  reinstalling the application.
- **FR-3206**: An update MUST be shown — full readable content of what changed — before
  acceptance; acceptance is explicit; declining is stable and unnagged.
- **FR-3207**: An applied update governs new jobs only; signed documents and existing
  outputs never change. Reports MUST cite the corpus version that governed the job.
- **FR-3208**: Previous corpus versions MUST remain locally available; reverting is a
  first-class act, as visible as updating.
- **FR-3209**: Locally modified corpus files MUST NOT be overwritten silently: conflicts
  are shown per file with keep/take/view-both. Her edits outrank shipped policy on her
  machine.
- **FR-3210**: The corpus MUST carry a format version; an update incompatible with the
  installed application is refused whole, with the reason (no partial application).
- **FR-3211**: A corpus update is untrusted content until verified: integrity MUST be
  checkable and a failed check refuses the update; content passes the same
  scan-before-activation as `029` imports.

### Key Entities

- **Release notice**: version, summary, link, dismissed-state.
- **Corpus version**: identifier, format version, the changed files, provenance;
  locally retained history.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-3201**: A corpus correction published today is running on a test installation
  without reinstalling the app, with the change read on-screen before acceptance and the
  next report citing the new version. End-to-end against fixtures.
- **SC-3202**: With no network, 100% of functionality is unaffected — the full offline
  suite passes with the update machinery present and unreachable. Invariant.
- **SC-3203**: Zero application code arrives through the update channel — the app
  channel is notify-only, verified by the absence of any code-install path.
- **SC-3204**: A tampered fixture update is refused with zero files changed. Invariant.
- **SC-3205**: A teacher reads a corpus update offer and can say in her own words what
  will change about the material. **Needs a teacher** — the offer's readability is the
  Principle I claim itself.

## Assumptions

- **Distribution host**: the project's existing public repository/releases
  infrastructure; the spec requires the destination be declared, not which it is.
- **Signing/code identity for the app installer is `COLA` P52's item** — separate, and a
  release-gate there; this spec's app channel only points at downloads.
- **Automatic vs on-demand checking is the plan's call** (with consent and the
  disclosure updated either way); the spec fixes what a check may do and say, not its
  schedule.
- **The corpus history retention depth is the plan's call**; «previous version» (one
  step) is the minimum that satisfies FR-3208.
- **Vault schema (P50) and corpus format version (FR-3210) are siblings, not the same
  number** — a vault belongs to her, the corpus to the project.
