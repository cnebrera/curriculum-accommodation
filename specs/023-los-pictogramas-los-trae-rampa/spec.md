# Feature Specification: Los pictogramas los trae Rampa

**Feature Branch**: `023-los-pictogramas-los-trae-rampa`

**Created**: 2026-09-02

**Status**: Draft

**Input**: Carlos, twice, looking at the screen that tells her to go and download a folder:

> «esto que mierda es? no puedo decirle al usuario que se tiene que bajar algo... la
> herramienta va a ser gratis, podemos usar eso o no?»

and, after `022` shipped without touching it:

> «Sigue sin haber un botón para descargar los pictogramas...»

## What was blocking it, and what unblocked it

`018` FR-1601 forbids Rampa from downloading pictograms, and its clarification says so
in the strongest available terms: «**No, and not even behind a confirmation.** A download
button makes us the distributor of CC BY-NC-SA content inside an Apache-2.0 application.»

That was my call, made on 2026-08-30 without reading ARASAAC's terms of use, and the
caution was in the wrong place. Read on 2026-09-02, the terms say:

1. **ARASAAC publishes a public API for exactly this.** `https://api.arasaac.org/v1`
   serves pictogram metadata and images with **no key, no registration and no
   authentication** — verified against `pictograms/es/search/casa` and
   `pictograms/6964`. An open endpoint offered to applications is not a thing one
   circumvents by using it.
2. **Nothing in the conditions restricts automated download or inclusion in software.**
   What they require is attribution (Sergio Palao, ARASAAC, the Gobierno de Aragón, and
   the licence), non-commercial use, and ShareAlike **on derivative works of the
   pictograms**.
3. **A download on her command is not redistribution.** The copy travels from ARASAAC's
   server to her disk. Rampa never holds it, never ships it, and never puts it in an
   installer — which is why the *bundle* and *redistribute* halves of FR-1601 survive
   this specification untouched. A user agent fetching a licensed file at its user's
   request is the shape of every browser ever written.

So the distinction FR-1601 collapsed is the one that matters: **shipping** the
pictograms would hand every downstream user of an Apache-2.0 application a restriction
our licence says they do not have. **Fetching** them, once, on her instruction, under
terms she has accepted on screen, is the same shape as `009`'s API key — her
relationship with the third party, our tool for using it.

## The design, in one sentence

**The downloader writes the format the reader already reads.**

`018` built a reader for a folder of `pictograms.<lang>.json` plus image files, and
deliberately named no source in it (FR-1604). This feature adds a producer of that
format. Everything downstream — matching, the ambiguity omission, provenance by id,
attribution, the black-and-white check, the missing-image gap — is untouched and
untouchable, and **a set she brought by hand keeps working identically**. Downloading
becomes one more way to fill the folder, not a second pictogram subsystem.

## Not the whole catalogue

ARASAAC holds some fourteen thousand pictograms. Fetching all of them would be hundreds
of megabytes, most of it vocabulary no learner of hers will meet, and it would turn a
button into a download she has to babysit.

So Rampa fetches **the words she needs**: the vocabulary of the material in front of
her, plus anything she adds by hand. A word at a time, resumable, and already-present
words are not fetched again.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She presses a button and gets pictograms (Priority: P1)

She has turned pictograms on for Iker. The screen says which licence applies and what it
asks of her. She accepts, presses **Traer los pictogramas**, and Rampa fetches the
vocabulary of the sheet she is adapting. When it finishes it says how many words it
found, how many it could not, and the sheet renders with pictograms and its attribution.

**Why this priority**: It is the complaint, twice. Without it the feature that `018`
built in full is reachable only by a teacher willing to go and assemble a folder in the
format of a contract document she has never read.

**Independent Test**: With pictograms on and no set present, accept the licence, press
the button, and confirm images and metadata land in the vault in the format `018`'s
reader consumes — then confirm the sheet renders with them.

**Acceptance Scenarios**:

1. **Given** no set present and the licence accepted, **When** she asks for a word list,
   **Then** the fetched pictograms are written where `018`'s reader finds them, and it
   reads them with no change to that reader.
2. **Given** a word ARASAAC does not have, **When** the fetch finishes, **Then** that
   word is reported as not found and every other word is still fetched.
3. **Given** the network is unavailable, **When** she presses the button, **Then** she is
   told so in her own language, nothing is half-written, and pressing it again resumes.
4. **Given** a set she assembled by hand, **When** this feature exists, **Then** it still
   works exactly as `018` promised and nothing was downloaded.
5. **Given** words already present, **When** she asks again, **Then** they are not
   fetched a second time.

---

### User Story 2 - She knows what she is agreeing to, before anything moves (Priority: P1)

**Why this is P1 alongside US1**: it is the entire basis on which the download is
legitimate. Without the acceptance, Rampa is a program that silently copies somebody
else's licensed work onto a teacher's computer.

**Independent Test**: a fresh vault, and no request reaches ARASAAC until acceptance is
recorded.

**Acceptance Scenarios**:

1. **Given** the licence has not been accepted, **When** anything would fetch a
   pictogram, **Then** no request is made and she is asked first.
2. **Given** the acceptance screen, **When** she reads it, **Then** it names the author,
   the owner, the licence, what non-commercial means for her classroom, and what
   ShareAlike does and does not do to her own worksheets.
3. **Given** she accepts, **When** the acceptance is recorded, **Then** it records what
   she accepted and when, and it is hers to withdraw.
4. **Given** she withdraws it, **When** she does, **Then** nothing further is fetched and
   what is already on her disk is hers, under the licence she accepted.

---

### User Story 3 - The words that leave her machine are only words (Priority: P1)

A search term travels to a server in Aragón. That is the first outbound request in this
application that is not to her AI provider, and it must carry nothing about a child.

**Why this is P1**: `009` and `011` spent two specifications keeping a learner's name off
a disk she owns. A name leaving for a third party would undo that from a direction
nobody was watching.

**Independent Test**: drive a fetch from material containing a learner's name and school,
and assert what was requested — vocabulary only.

**Acceptance Scenarios**:

1. **Given** a word list, **When** it is sent, **Then** every request carries a single
   vocabulary word and nothing else — no learner code, no name, no profile, no identifier
   of her or of this installation.
2. **Given** a name in the material, **When** the vocabulary is collected, **Then** the
   name is not in it (`018` FR-1610, now applied to sending and not only to matching).
3. **Given** any fetch, **When** it runs, **Then** it happened because she pressed
   something. Nothing fetches on a timer, on launch, or as a side effect of adapting.

### Edge Cases

- **She has no internet at all.** Everything except the fetch must keep working, which is
  `006`'s standing promise; the folder path she used before is still there.
- **ARASAAC is down, or slow.** A partial fetch leaves a usable set, says what is
  missing, and resuming costs only what is missing.
- **A word with several pictograms.** `018` FR-1609 makes ambiguity an omission at match
  time; fetching all the candidates is right, and picking one at fetch time is not.
- **The same word in two languages.** The set is per language; a fetch is for one.
- **Her disk fills up.** Reported as itself, not as a failed download.
- **A word that is a name she did not tell us about.** `018` FR-1610 protects the names
  Rampa knows. A first name that is also a common noun is a real limit, stated in the
  assumptions rather than pretended away.
- **The licence text changes at ARASAAC.** What she accepted is recorded with a date;
  Rampa cannot detect the change and does not pretend to.

## Requirements *(mandatory)*

### What replaces FR-1601

- **FR-2101**: `018` FR-1601 is **narrowed**: Rampa MUST NOT bundle or redistribute
  pictograms, and MAY fetch them from their publisher at her explicit request. The
  installer, the repository and every release artefact MUST remain free of them.
- **FR-2102**: The fetch MUST write only into the pictogram set folder, in the format
  `018`'s reader consumes, and MUST NOT require any change to that reader.
- **FR-2103**: A set assembled by hand MUST keep working, with no downloaded set present
  and no network available.

### Before anything moves

- **FR-2104**: No request MAY be made to any pictogram publisher until she has accepted
  its licence on screen. The acceptance MUST be recorded with what was accepted and when.
- **FR-2105**: The acceptance screen MUST name the author, the owner, the licence, and —
  in her language, not the licence's — what non-commercial means for her classroom and
  what ShareAlike does and does not do to her own worksheets.
- **FR-2106**: She MUST be able to withdraw the acceptance, which MUST stop further
  fetching and MUST NOT delete what is already hers.
- **FR-2107**: Every fetch MUST be the direct result of an action she took. Nothing MAY
  fetch on launch, on a timer, or as a side effect of adapting or composing.

### What is sent

- **FR-2108**: A request MUST carry a single vocabulary word and nothing else. No learner
  code, no name, no profile, no installation identifier, no counter.
- **FR-2109**: A learner's name MUST NOT appear in a word list (`018` FR-1610 extended
  from matching to sending).
- **FR-2110**: She MUST be told, before the first fetch, that the words travel and where
  they go.

### What is fetched

- **FR-2111**: Only the words she asked for MAY be fetched. The whole catalogue MUST NOT
  be fetched.
- **FR-2112**: A word already present MUST NOT be fetched again.
- **FR-2113**: Every candidate pictogram for a word MUST be recorded, so `018` FR-1609
  can still make an ambiguous word an omission rather than a guess.
- **FR-2114**: A word the publisher does not have MUST be reported by name, and MUST NOT
  stop the rest.
- **FR-2115**: An interrupted fetch MUST leave a readable set and MUST be resumable at
  the cost of what is missing.
- **FR-2116**: Attribution MUST record which publisher each pictogram came from, so a
  set built from two sources can still be attributed correctly (`018` FR-1603, FR-1611).

### The bound

- **FR-2117**: The number of words in one fetch MUST be bounded, and a bound reached MUST
  be reported rather than silently applied (the rule `008` and `022` already use).
- **FR-2118**: A fetch MUST be interruptible, and interrupting it MUST NOT corrupt the
  set.

### Key Entities

- **Publisher**: who serves pictograms, its licence, and what its attribution must say.
  Named data, so `018` FR-1604's replaceability survives — ARASAAC is the first entry,
  not a hard-coded assumption.
- **Word list**: the vocabulary to fetch, with a language. Never contains a name.
- **Fetch outcome**: what was found, what was not, what was already there, and what a
  bound cut.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-2101**: A teacher with pictograms on and no set gets a working set by accepting a
  licence and pressing one button, without leaving Rampa and without reading a format
  contract.
- **SC-2102**: `018`'s reader is unchanged by this feature. Asserted by its tests passing
  untouched against a downloaded set.
- **SC-2103**: No request reaches any publisher before acceptance is recorded. Asserted
  against a fake transport that fails the test if called.
- **SC-2104**: Every request carries a vocabulary word and nothing else. Asserted by
  inspecting what the transport was asked for, driven from material containing a name, a
  learner code and a school.
- **SC-2105**: An interrupted fetch leaves a set `018`'s reader reads without problems.
- **SC-2106**: A hand-assembled set works with the network unavailable and nothing
  downloaded — `018`'s promise, still true.
- **SC-2107**: A teacher who has never seen Rampa reaches a rendered sheet with
  pictograms without asking what a pictogram set is. **Needs a teacher.**

## Assumptions

- **ARASAAC's API is public and unauthenticated.** Verified 2026-09-02 against
  `api.arasaac.org/v1`. If they ever close it, this feature degrades to `018`'s folder,
  which is why that path stays.
- **The licence question is settled enough to build on, and is flagged for review.**
  The reading above is mine, not a legal opinion: an open API, terms that require
  attribution and non-commercial use rather than prohibiting software use, and a fetch
  that is hers by acceptance. **Backlog G28's legal-review item now covers this**, and it
  is the kind of call the project should have confirmed by someone qualified before a
  release rather than before a branch.
- **A first name that is also a common noun can be sent.** `018` FR-1610 removes the
  names Rampa knows; «Rosa» typed into a word list by hand is indistinguishable from the
  flower. Stated rather than solved.
- **The vocabulary comes from material she is already working on**, so no new extraction
  is invented for this feature.
- **Images are fetched at one size** and `018` already owns how they are embedded and how
  they degrade.
- **`024` is the conversation** and unrelated.
