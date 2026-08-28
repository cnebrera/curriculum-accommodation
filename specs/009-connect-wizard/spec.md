# Feature Specification: Connecting — choosing a service, and getting the key

**Feature Branch**: `009-connect-wizard`

**Created**: 2026-08-28

**Revised**: 2026-08-28, twice. The first version offered three providers with no
way to compare them and deferred the compatible-endpoint option, which in
practice closed the project to Google. The second made data location the opening
filter, which put the question a teacher is least able to answer in front of the
one she can — now disclosed rather than imposed, with the reasoning for why it is
disclosed at all written down so it can be removed when it stops being true.

**Status**: Draft — pending `/speckit-clarify` before `/speckit-plan`

**Input**: 006 FR-403/404 require the connection step to deep-link, accept a
paste and validate, but say nothing about *choosing* between services or about
*getting* the key. ADR 0005 named this the decisive screen: *"the key step is the
single biggest drop-off point in any bring-your-own-key onboarding, not because
it is hard but because none of the vocabulary is familiar."*

## Clarifications

### Session 2026-08-28

- Q: How many services ship in the first version? → A: Six — Gemini and Groq (no
  card), Mistral (EU), Claude (quality), OpenAI (the name she knows), DeepSeek
  (cheapest). Two jurisdictions, a fallback if Google changes its free tier, and
  the rest are one Markdown file each afterwards.
- Q: With a card available, which service is recommended? → A: The one with the
  highest measured quality (today Claude). The first impression turns on whether
  the adaptation is good; three cents a worksheet is not a barrier.
- Q: Is the local-model option (Ollama) built now? → A: No, and it leaves the
  first version's scope. A mid-range school laptop does not have the power to
  produce good enough output — an empirical claim, so it is recorded with what
  would reopen it rather than removed.
- Q: How are services established outside the EU and the US offered? → A: Always
  present in the full list with their processing-location row and no judgement
  from us, but never proposed by the default recommendation.

## Why this is its own feature

Everything else in this project can be fixed later. **This screen gets one
chance.** A teacher who cannot get past it never sees an adaptation, never
corrects a recipe, and never tells us anything — so a failure here is
indistinguishable from the project not existing.

It is also the screen most likely to rot unnoticed: consoles get redesigned, free
tiers change terms, new services appear every few months and prices fall fast.
A walkthrough compiled into the application is wrong within months.

## What she is actually deciding

A teacher is not choosing a model vendor. She is answering one question she can
answer — **"¿cuál de estos puedo usar yo?"** — meaning card or no card, what a
worksheet costs, whether photographs work.

Where the data is processed is **a fact we disclose, not a filter we impose**.
It is asked only when her school has actually told her something, because for
most teachers the honest answer is "no lo sé", and making that the first gate
turns the screen into a bureaucratic obstacle before she has seen the tool work.

The first version of this spec had it the other way round. That was wrong on
usability grounds — and the correction has a limit worth writing down, because
the obvious next thought is *"if nothing personal leaves, why mention it at
all?"*

### Why jurisdiction is disclosed at all, and what would remove it

The goal is minimisation strong enough that this question dissolves. It has not
dissolved yet, for three reasons that are specific and checkable:

1. **Pseudonymised is not anonymous.** The profile carries barriers and an opaque
   code, never a name — that is real, structural and tested. But the teacher holds
   the code-to-name mapping, so re-identification is possible for her, which under
   GDPR (recital 26) keeps it personal data. Anonymous data would put this whole
   section out of scope; pseudonymised data does not.
2. **The material cannot be pseudonymised.** The worksheet goes to the provider as
   it is, and spec 008 makes a **photograph** the common path. Photographed
   worksheets frequently carry a handwritten name on the top line. 008 US4 already
   records this as an accepted, documented residual: the application warns and
   offers to crop, and it cannot remove a name from an image. So "nothing personal
   leaves" is a goal, not a current property, and a spec that claimed otherwise
   would be the kind of overclaim `docs/adoption-risks.md` §3 was written to
   correct.
3. **The decision is not ours.** The constitution's disclosure mandate requires
   the project to state plainly what is sent at each step so a school can perform
   its own assessment. A school's DPO *will* ask where it is processed. Answering
   that with a dated fact costs one table column; refusing to is what blocks the
   careful, senior teachers whose adoption carries the most weight
   (`adoption-risks.md` §4.7).

**What would demote this to a footnote**, and should: local OCR that strips a
name from a photograph before it is sent, which is currently out of 008's scope.
If that ships and the residual closes, this column becomes trivia rather than a
decision input — and this section should be revisited then rather than left
standing out of habit.

**Rampa presents dated facts. It never certifies compliance.** Saying "este
cumple el RGPD" is advice this project is not qualified to give and must not
imply. `docs/proteccion-de-datos.md` is the artifact the school's DPO reads, and
this screen points at it.

## The shaping decision: many services, four adapters

**Breadth comes from the corpus, not from code.** Research R6 already required
the provider list to be configuration rather than compiled-in copy; extended:

| Adapter | Covers |
|---|---|
| Google | Gemini |
| Anthropic | Claude |
| OpenAI | GPT |
| **OpenAI-compatible** | Groq and DeepSeek at first release; then xAI (Grok), Moonshot (Kimi), Alibaba (Qwen), OpenRouter, Together as one file each |

Four adapter files; a dozen or more offers. **Adding a service is one Markdown
file and no code**, which is what keeps the list current when a cheaper or
better-located option appears.

### The security question, resolved rather than deferred

The first version deferred the compatible adapter because a user-configurable
endpoint widens where a child's material can go (007 FR-511). That conflated two
different things:

- **A service chosen from the corpus** — reviewed, with its endpoint, jurisdiction
  and terms declared in a file that ships with the application. Picking DeepSeek
  from that list is no more open-ended than picking Anthropic. FR-511 holds: the
  endpoint is still *the configured model endpoint*.
- **A free-text endpoint the teacher types** — genuinely open-ended, and the
  actual risk. That stays behind an explicit advanced action, off by default,
  with a warning, and it is the only part that remains deferred.

Local runners would be the interesting edge — nothing leaves the machine at all —
and they are **out of scope**; see the non-goal below.

### Non-goal: running the model locally

A local runner (Ollama, LM Studio) would send nothing at all, which is the
strongest possible answer to a school that forbids data egress
(`adoption-risks.md` §5). It is **out of scope for the first version**, and the
reason is hardware rather than principle: **a mid-range school laptop does not
have the power to produce output good enough to hand to a child.** A weaker
adaptation is not a privacy win — it is the failure this project exists to
prevent, arriving by a different door.

That is an empirical claim, so it has a test rather than a verdict. What would
reopen it: `cases/002-model-floor` measuring a locally-runnable model that clears
the floor on the hardware a school actually has. If that day comes, the shape is
already understood — the adapter carries no key, so "validate" means "is it
running?", which is a different contract and the reason it was never a cheap
add-on.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One question, then one recommendation (Priority: P1)

She is not shown twelve services. She answers **one** plain question — can she
use a payment card — and gets **one recommendation with its reason**, plus "ver
todas las opciones" for anyone who wants it.

**Why this priority**: Breadth without choice paralysis is the whole design
problem. A list of twelve is worse for her than a list of three; a list of three
is worse for the project than a list of twelve. The funnel is how both are true.

**Acceptance Scenarios**:

1. **Given** the connection step, **When** it opens, **Then** the only required
   question is whether she can use a payment card.
2. **Given** her answer, **When** the recommendation is shown, **Then** it names
   the service, what a worksheet costs, and **one sentence of why this one**.
3. **Given** the recommendation, **When** she wants alternatives, **Then** the
   full comparison is one click away and never blocks her.
4. **Given** the recommendation, **When** it is shown, **Then** a single quiet
   line offers the data-location question — *"¿tu centro te ha dicho algo sobre
   dónde pueden procesarse los datos?"* — as something she may open, not
   something she must answer.
5. **Given** she opens it and states a constraint, **When** she does, **Then** the
   recommendation is recomputed and the reason names the constraint.
6. **Given** she opens it and does not know, **When** that happens, **Then** she
   is offered `docs/proteccion-de-datos.md` for her school and the recommendation
   is unchanged — not knowing must never be a dead end.
7. **Given** no service satisfies a stated constraint, **When** that happens,
   **Then** the conflict is explained rather than an empty list shown.

---

### User Story 2 - She can compare, in her terms (Priority: P1)

The full list compares services on what actually decides it, with the facts
dated, and never on model names or context windows.

**Why this priority**: Equal P1. Without it the recommendation is a black box,
and a teacher who cannot see why cannot take it to her head teacher.

**Acceptance Scenarios**:

1. **Given** the comparison, **When** she reads it, **Then** each service shows:
   whether a card is needed, whether there is a free tier and its limit, cost per
   worksheet, where it is processed, what its terms say about training on her
   data, whether photographs work, and one plain sentence about who it suits.
2. **Given** any fact about a provider, **When** it is shown, **Then** it carries
   the date it was last checked, because these change.
3. **Given** a cost figure, **When** it has not been measured by
   `cases/002-model-floor`, **Then** it is marked as an estimate.
4. **Given** a service whose quality is below the measured floor, **When** it is
   listed, **Then** that is stated plainly or the service is not offered.
5. **Given** the comparison, **When** she reads it, **Then** no model name, token
   count or context size appears anywhere.
6. **Given** any presentation of jurisdiction or terms, **When** shown, **Then**
   it states facts and points at the school's own assessment. **Rampa MUST NOT
   describe any service as compliant, safe or approved.**

---

### User Story 3 - She is walked to the key, step by step (Priority: P1)

She picks a service and gets a short numbered walkthrough: what she is about to
do, a link to the exact page, what the page will look like when she gets there,
and what to copy.

**Why this priority**: This is the drop-off point.

**Acceptance Scenarios**:

1. **Given** a chosen service, **When** the walkthrough shows, **Then** it opens
   with one plain sentence about what a key is, with no jargon.
2. **Given** the walkthrough, **When** she follows it, **Then** steps are
   numbered, each is one action, and there are at most about six.
3. **Given** a step on the provider's site, **When** shown, **Then** it says what
   she will *see* there ("un botón azul que dice *Create API key*"), because a
   step she cannot recognise is a step she abandons.
4. **Given** the link, **When** she opens it, **Then** it goes to the exact key
   page in her normal browser, never inside the application.
5. **Given** she gets lost, **When** she looks, **Then** there is a "no encuentro
   eso" for that service covering what actually goes wrong there.
6. **Given** anything that will block her later — a card, a sign-up, a phone
   verification, an install — **When** the walkthrough starts, **Then** it is
   stated at step zero, not discovered at step four.
7. **Given** she closes the application mid-walkthrough, **When** she reopens,
   **Then** she is where she was (006 FR-401).

---

### User Story 4 - Pasting tells her the truth immediately (Priority: P1)

She pastes. Within a second or two she knows whether it worked, and if not, which
of the actual problems she has.

**Acceptance Scenarios**:

1. **Given** a key pasted with whitespace, quotes or as `KEY=...`, **When**
   validated, **Then** it is normalised and works. She copied it from a web page.
2. **Given** a key belonging to another supported service, **When** validated,
   **Then** she is told which one and offered the switch — not told it is invalid.
3. **Given** malformed, expired, no-credit, or no-connection, **When** validated,
   **Then** each has its own sentence and its own next step.
4. **Given** a valid key, **When** accepted, **Then** she sees the answer to the
   question she is asking: **"✓ Conectado. Unos 3 céntimos por ficha."**
5. **Given** validation, **When** it runs, **Then** it uses the cheapest request
   the service allows and sends no learner data and no material.

---

### User Story 5 - She can change it later without fear (Priority: P2)

The connection is not a one-time gate. She can return, see what is connected,
replace the key, or switch services, without touching her learners or material.

**Acceptance Scenarios**:

1. **Given** a working connection, **When** she opens the connection screen,
   **Then** it shows the active service and when it was last verified, and never
   the key.
2. **Given** she replaces a key, **When** the new one fails, **Then** the old one
   is still in place and she is told so.
3. **Given** she switches service, **When** she does, **Then** the vault is
   untouched and already-adapted material keeps its recorded provenance.
4. **Given** she switches, **When** the new service is in a different
   jurisdiction, **Then** she is reminded once, because that is the fact her
   school cared about.

### Edge Cases

- **"No lo sé" to the data question.** The expected answer. It must produce a
  usable recommendation plus the document for her school, never a dead end.
- **A free tier changes its terms, or a service appears.** A corpus update, not a
  release. That is why the facts live beside the steps.
- **A service requires a phone number or an identity check.** Stated at step
  zero, or the service is not offered.
- **An aggregator** (OpenRouter and similar) means the request may be routed to
  another vendor again. That must be said: for the data question, an aggregator
  answers "depends", and "depends" is not an answer a school can act on.
- **She pastes a whole page** instead of the key. Detected by shape and length.
- **Two services, one key each.** Keys are stored per service; switching does not
  lose the other.
- **A key that works but is rate-limited on its free tier.** A wait, not an error
  (contracts/provider-adapter.md rule 5).
- **A free-text custom endpoint.** Deferred; see Assumptions.

## Requirements *(mandatory)*

### What is offered

- **FR-701**: The service list, walkthroughs, cost figures, jurisdiction and
  terms facts MUST be read from the bundled corpus at run time and MUST NOT be
  compiled into the application (research R6).
- **FR-702**: Services MUST be presented by what a teacher decides on. Model
  names, token counts and context sizes MUST NOT appear anywhere she can see.
- **FR-703**: At least one service usable **without a payment card** MUST be
  offered, and MUST be reachable from the recommendation path (006 FR-404).
- **FR-704**: Adding a service MUST be one corpus file and no code change, except
  where its API is not covered by an existing adapter.
- **FR-705**: The application MUST ship an OpenAI-compatible adapter, so that
  services sharing that API are corpus entries rather than code.
- **FR-706**: Every provider fact MUST carry a `last_checked` date, and the
  interface MUST show it wherever the fact is shown.

### Choosing

- **FR-707**: The chooser MUST require exactly one answer — whether she can use a
  payment card — and MUST produce a single recommendation with one sentence of
  reasoning.
- **FR-707a**: The recommendation rule MUST be: **no card** → the no-card service
  with the best measured quality that supports photographs; **card** → the service
  with the best measured quality overall. Quality is the measurement from
  `cases/002-model-floor`, not an opinion, so the rule survives new services
  appearing and prices moving.
  Rationale, recorded because the cheaper rule is tempting: the first impression
  turns on whether the adaptation is good — one bad worksheet and she does not
  come back — and three cents a worksheet is not a barrier for anyone. Cost is
  visible in the comparison for a teacher who wants to optimise it.
- **FR-707b**: The default recommendation MUST NOT propose a service established
  outside the EU or the US, however cheap or capable it measures. Those services
  MUST still appear in the full comparison with their processing-location row and
  no evaluative language.
  Rationale: recommending, by omission, where a minor's barrier profile is
  processed is a decision for the school, not for this project. Presenting the
  option is disclosure; defaulting to it would be advice.
- **FR-708**: The data-location question MUST be optional, offered as one line
  beside the recommendation. "No lo sé" MUST be a first-class answer, MUST leave
  her with a working recommendation, and MUST offer
  `docs/proteccion-de-datos.md` for her school.
- **FR-708a**: The application MUST state the residual honestly wherever data
  location is discussed: barriers and notes travel pseudonymised, and a name
  written on a photographed worksheet reaches the provider inside the image
  (008 US4). It MUST NOT claim that nothing personal leaves.
- **FR-709**: The full comparison MUST be reachable in one action and MUST NOT
  block the recommended path.
- **FR-710**: The comparison MUST show, per service: card required, free tier and
  its limit, cost per worksheet, where it is processed, what its terms say about
  training on submitted data, whether photographs work, and one plain sentence
  about who it suits.
- **FR-711**: Rampa MUST NOT describe any service as compliant, safe, approved or
  recommended-for-minors. It states dated facts and points at the school's own
  assessment.
- **FR-712**: A service whose adaptation quality is below the floor measured in
  `cases/002-model-floor` MUST either not be offered, or be offered with that
  stated plainly.
- **FR-713**: Where no service satisfies her stated constraints, the conflict
  MUST be explained rather than an empty list shown.

### The walkthrough

- **FR-714**: Each service MUST ship a numbered walkthrough of at most about six
  steps, one action each, in the teacher's language.
- **FR-715**: Each step on the provider's site MUST describe what she will see.
- **FR-716**: Anything that will block her — card, sign-up, phone verification,
  install — MUST be stated before step one.
- **FR-717**: The walkthrough MUST deep-link to the exact key page, opened in her
  browser, never inside the application.
- **FR-718**: Each service MUST ship a "no encuentro eso" section.
- **FR-719**: Walkthrough position MUST be resumable.

### Pasting and validating

- **FR-720**: Pasted keys MUST be normalised — whitespace, quotes, `KEY=` prefix
  — before validation.
- **FR-721**: Validation MUST distinguish, each with its own sentence and next
  step: malformed, wrong service, expired or unauthorised, no credit, and no
  connection. "Invalid" MUST NOT be shown alone.
- **FR-722**: A key recognised as another offered service's MUST name it and
  offer the switch.
- **FR-723**: Validation MUST use the cheapest request the service allows and
  MUST send no learner data and no material.
- **FR-724**: Success MUST be reported in cost terms, in cents, per worksheet.
- **FR-725**: Keys MUST be stored per service, encrypted, outside the vault.

### Living with it

- **FR-729**: A connection screen after onboarding MUST show the active service
  and last verification, and MUST NOT display the key.
- **FR-730**: A failed replacement MUST leave the previous key working and say so.
- **FR-731**: Switching service MUST NOT touch the vault or alter provenance, and
  MUST remind her once when the jurisdiction changes.

## Success Criteria *(mandatory)*

- **SC-701**: A teacher who has never used AI gets from this screen to
  "✓ Conectado" **unassisted** in under ten minutes. Pass/fail, and a component
  of 006 SC-401.
- **SC-702**: Zero observer interventions during the connection step
  (006 SC-407). Every one is a logged defect; this is where they are expected.
- **SC-703**: She can say, unprompted, roughly what a worksheet costs
  (006 SC-406), measured immediately after connecting.
- **SC-704**: She can say which service she chose and one reason why — evidence
  the recommendation was a decision she made rather than one she clicked past.
- **SC-705**: Every validation failure path produces a distinct, actionable
  sentence, verified by triggering all five.
- **SC-706**: Updating a walkthrough, a cost, a jurisdiction fact or a free-tier
  term requires no code change and no release, verified by editing the corpus.
- **SC-707**: Adding a service on an existing adapter touches exactly one file.
- **SC-708**: Six services are offered at first release — Gemini, Groq, Mistral,
  Claude, OpenAI, DeepSeek — spanning at least two jurisdictions and including at
  least two with no payment card.


## Assumptions

- **Adapters at first release: Google, Anthropic, OpenAI, and one
  OpenAI-compatible adapter.** Six services ride on them: Gemini, Groq, Mistral,
  Claude, OpenAI, DeepSeek. The compatible adapter is what makes the rest cheap —
  xAI, Moonshot, Alibaba, OpenRouter and Together become one corpus file each,
  with no code.
- **Cost and jurisdiction facts shipped in the corpus are dated and fallible.**
  Prices fall fast and terms change. `cases/002-model-floor` measures cost and
  quality; jurisdiction and training terms are read off the provider's own
  published terms with the date recorded, and corrected like any corpus error.
- **The chooser's recommendation is a default, not advice.** The reasoning is one
  sentence and the alternatives are one click away, because a teacher who cannot
  see why cannot defend the choice to her head teacher.
- **A free-text custom endpoint remains deferred.** A corpus-declared service is
  reviewed; an arbitrary URL a teacher types is not, and that is where the real
  egress risk sits. It stays behind an explicit advanced action, off by default,
  and needs its own warning and data-protection paragraph before it ships.
- **Local models are a recorded non-goal, not an oversight.** See the section
  above: the blocker is the hardware a school actually has, and the reopening
  condition is a measurement rather than a change of mind.
- **This feature does not manage billing, quotas or organisation accounts.** If a
  key comes from her school, that is between her and her school; the cost display
  makes usage visible either way.
- **Aggregators are a special case, and the spec says so** rather than treating
  them as one more row: they answer "depends" to the jurisdiction question, and a
  school cannot act on "depends".
- **The aspiration is that jurisdiction stops mattering.** Pseudonymisation
  already removes the name from every file and every text payload. What keeps the
  question alive is the image path (008 US4) and the fact that pseudonymised data
  is still personal data. Local OCR before send would close the first; only true
  anonymisation would close the second, and this project cannot claim it while the
  teacher holds the mapping — which she must, because she teaches the child. So:
  disclose, do not gate, and revisit when the image residual closes.
