# Feature Specification: La normativa es un corpus — seleccionable, aportable, de cualquier país

**Feature Branch**: `029-la-normativa-es-un-corpus`

**Created**: 2026-09-03

**Status**: Draft

**Input**: The adversarial review found the normative layer — `instructions/guide.md`,
`instructions/acs.md`, spec `017` — hardcodes the Andalusian model (Séneca, the ACNS/ACS
pair, the Instrucciones de 8-3-2017) and presents it as Spain: sentences naming Séneca
are printed into documents a teacher in Catalonia, Madrid or the Canaries would be
disqualified by. Carlos's decision (P3, his own design):

> Tendremos que permitir que se seleccione un corpus de los que hay — a nivel de
> configuración, reescribible por niño. Si no hay corpus, funcionamos en plan genérico,
> que tampoco es un problema. Y añadimos la opción de subir el corpus de tu comunidad, o
> modificar el existente. Así lo hacemos genérico y funciona para cualquier país.

## The gap, and why the answer is the existing pattern

Rampa already solved this exact shape once: education *systems* live in
`instructions/education/` — one file per system, a declared contract (`011`), the code
reads whichever applies. The normative layer simply never replicated the pattern: there
is one normativa, it is Andalucía, and nothing says so.

This spec promotes the normativa to what the education corpus already is, and further:
**a selectable, replaceable, contributable resource.** Andalucía becomes the first file,
not the truth. A teacher anywhere selects her territory's corpus if it exists, works in
an honest generic mode if it does not, and can bring her own — which is what makes the
product generic for any country, not a Spanish tool with an Andalusian accent.

Three safeguards keep it from turning against the teacher (agreed in review):

1. **Provenance is printed** (Principle VI): a document drafted under an uploaded corpus
   says which corpus, from where, reviewed or not.
2. **An imported corpus is semi-trusted** (Principle IX): it enters prompts as policy, so
   a shared «normativa-madrid.md» from a forum is a real injection vector — shown before
   activation, scanned like untrusted material.
3. **Generic mode is written as its own product**, not Andalucía with the names blanked.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She says where she teaches (Priority: P1)

In Configuración, the teacher selects her territory from the corpora available. From then
on, the guide's reading, the ACNS draft and every normative phrase Rampa prints follow
that corpus. A teacher in Sevilla selects Andalucía and nothing changes for her; the
change is that it is now a **selection**, visible and honest.

**Why this priority**: It converts the review's worst normative finding — a hidden
assumption printed into official documents — into a visible, changeable fact.

**Independent Test**: Two configurations, two territories, one identical request; the
drafted documents cite each territory's register and rules, and each names the corpus it
followed.

**Acceptance Scenarios**:

1. **Given** an available corpus for her territory, **When** selected, **Then** guide
   reading, drafts and printed normative phrases come from that corpus and from nowhere
   else.
2. **Given** any drafted normative document, **When** rendered, **Then** it names the
   corpus it followed and that corpus's review status — «siguiendo el corpus normativo:
   Madrid (subido por ti, sin revisar)» is the dishonest-proof form.
3. **Given** a learner whose situation differs (schooled across territories), **When**
   the profile overrides the territory, **Then** the override wins for that learner —
   the same precedence shape as pictograms (`024` FR-2215).

---

### User Story 2 - No corpus, honest generic (Priority: P1)

A teacher in a territory with no corpus yet uses Rampa in generic mode: the guide still
reads her documents (extraction is normative-agnostic), drafts still help — but they
speak of «el documento de adaptación vigente en tu territorio» and «tu plataforma de
registro», and they say plainly that territory-specific procedure is hers and her
orientador's to verify. Nothing pretends.

**Why this priority**: Generic is the default state for every territory but one, and for
every country but one. If generic is bad, the product is Andalusian with extra steps.

**Independent Test**: With no corpus selected, draft an ACNS-like document; confirm no
territory-specific register, law or procedure is named, and the generic disclaimer is
present.

**Acceptance Scenarios**:

1. **Given** no corpus selected, **When** a normative document is drafted, **Then** it
   contains no named platform, law or territorial procedure, and states its generic
   nature with one pointer to the orientador.
2. **Given** generic mode, **When** she later selects or imports a corpus, **Then** new
   drafts follow it; existing documents are untouched (a document is what it was when
   signed).

---

### User Story 3 - She brings her own (Priority: P2)

A PT in Galicia writes (or receives from a colleague) the Galician corpus. She imports
it: Rampa shows her the full content first, scans it as untrusted material, and only then
lets her activate it. Documents drafted under it print its provenance. She can edit it —
it is Markdown, and the whole argument of Principle I is that she can.

**Why this priority**: This is what makes the layer generic for any country. P2 because
US1+US2 already fix the dishonesty; contribution is the growth path.

**Independent Test**: Import a corpus file; confirm it is displayed before activation,
scanned, refusable, and that documents drafted under it carry its provenance and
unreviewed status.

**Acceptance Scenarios**:

1. **Given** an import, **When** offered, **Then** the full content is shown before any
   activation and activation is a separate explicit act.
2. **Given** an imported corpus containing instruction-shaped content (the injection
   shapes `007` catalogues, plus section-spoofing per P18), **When** scanned, **Then**
   the finding is shown and activation requires her explicit override — refused by
   default, not sanitised (`007` FR-508's refuse-don't-repair).
3. **Given** a corpus edited locally, **When** used, **Then** its review status is
   «modificado por ti» and prints as such — editing is allowed and visible, never
   silent.

---

### Edge Cases

- **A corpus that contradicts a hard rule.** Hard rules outrank every corpus: a
  normativa file cannot authorise lowering exam difficulty or printing a learner's name.
  The hierarchy is stated where corpora are documented.
- **The extraction edge case of `017`** (a DIAC from another territory) inverts: with
  the right corpus selected it is now the *home* case; reading a document from a
  *different* territory than selected degrades gracefully to «measures found», as
  `017` already specifies.
- **Two corpora claim the same territory.** Selection is by corpus, not by territory
  string — she picks a file, not a name that could collide.
- **An update to a corpus she selected** (via `034`'s corpus updates): the change is
  shown before it applies to new drafts; signed documents never retroactively change.
- **The provenance line and the child.** Provenance names the corpus and its origin —
  never the teacher's identity beyond «subido por ti», and nothing about any learner.
- **Deleting a corpus in use**: falls back to generic mode with a notice, never to a
  silently different corpus.

## Requirements *(mandatory)*

### Functional Requirements

#### Selection and precedence

- **FR-2701**: Normative behaviour (guide reading vocabulary, draft structure, printed
  normative phrases) MUST come from a selected normative corpus, selected in
  Configuración from the corpora available.
- **FR-2702**: A learner's profile MAY override the selected corpus for that learner;
  the override wins for that learner's documents (precedence: learner ▸ configuración ▸
  generic).
- **FR-2703**: With no corpus selected or available, the application MUST operate in
  generic mode: no named platform, law, document type or territorial procedure; generic
  vocabulary; an explicit statement of generic-ness with a pointer to the orientador.
- **FR-2704**: The Andalusian content currently hardcoded MUST become the first corpus
  file, selected — not assumed — and `instructions/guide.md`/`acs.md` MUST retain no
  territory-specific content outside corpus files.

#### Provenance is printed

- **FR-2705**: Every drafted normative document and its report MUST name the corpus
  followed, its origin (bundled | subido | modificado) and its review status — in the
  document itself, not only in the UI.
- **FR-2706**: Review status MUST follow the corpus's own pattern
  (`reviewed_by_teacher`-style, extended with who/when where known); an unreviewed or
  user-modified corpus MUST never print as reviewed.

#### Import is shown, scanned, and explicit

- **FR-2707**: Importing a corpus MUST display its full content before activation;
  activation MUST be a separate explicit act.
- **FR-2708**: An imported or edited corpus MUST be scanned as untrusted content
  (`007`'s injection tiers plus P18's section-spoofing shapes) before activation;
  findings are shown, activation defaults to refused, and any override is hers and
  recorded.
- **FR-2709**: Hard rules outrank every normative corpus: no corpus content may weaken a
  hard rule, and a corpus attempting to MUST have that content inert, with the conflict
  reported.

#### Documents keep their history

- **FR-2710**: A signed document never changes because a corpus changed; new drafts
  follow the current selection, existing documents keep what they were signed under
  (the `031`-adjacent principle: freshness is declared, history is immutable).
- **FR-2711**: Deleting or deactivating the selected corpus MUST fall back to generic
  mode with a notice; it MUST NOT silently select another corpus.

### Key Entities

- **Normative corpus**: a Markdown file (or small set) with declared front matter —
  territory/name, origin, review status, and the sections the guide and drafts consume
  (registers, document types, thresholds, procedure vocabulary). The contract mirrors
  `011`'s education-file contract.
- **Selection**: configuración-level choice plus optional per-learner override.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-2701**: A teacher outside Andalucía, with her corpus selected, drafts a document
  that names zero Andalusian artefacts (Séneca, 8-3-2017) — checked over a generated
  corpus for every bundled territory. Invariant.
- **SC-2702**: In generic mode, zero territory-specific names appear in any drafted
  document. Invariant.
- **SC-2703**: 100% of drafted normative documents name their corpus and its review
  status in the printed output. Invariant.
- **SC-2704**: An imported corpus containing any catalogued injection shape does not
  activate without an explicit recorded override. Tested with the `007` fixture corpus
  plus section-spoofing fixtures.
- **SC-2705**: A PT from a second territory, given the import flow and her territory's
  rules, produces a working corpus without touching code. **Needs a teacher** — the
  contract's writability is the claim Principle I stakes.

## Assumptions

- **`017` is amended, not rewritten**: its extraction stays; its Andalusian vocabulary
  moves into the first corpus file, with a dated note in `017` (the FR-1401 amendment
  style, per review P25's convention).
- **Corpus updates travel via `034`** when it lands; until then, import/edit is the
  update path.
- **No legal claim is made.** A corpus is orientation vocabulary, not legal advice; the
  generic disclaimer and the org-level compliance rule (review G28's lesson) stand.
  Validation of any bundled corpus's legal accuracy needs a human from that territory —
  the same «needs a person» honesty as `011`'s curriculum codes (P31).
- **Community contribution flow (sharing corpora between teachers) is out of scope**
  here beyond import of a file she has; a registry/exchange is its own future decision.
