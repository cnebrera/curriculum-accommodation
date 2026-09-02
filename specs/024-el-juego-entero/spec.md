# Feature Specification: El juego entero, de una vez

**Feature Branch**: `024-el-juego-entero`

**Created**: 2026-09-02

**Status**: Draft

**Input**: Carlos, on `023` as shipped:

> «nos falta el botón de aceptar condiciones y que **se lo baje solo** al directorio
> donde están las cosas de rampa para que lo pueda usar... y si ya lo tiene que **no me
> lo vuelva a preguntar** salvo que haya una actualización. Lo que no vale es que me
> digas hay pictogramas dime donde están y que me los tenga que bajar yo sin ni
> siquiera saber de dónde.»

## What `023` got wrong

`023` built the download and then made her do the work anyway. It asks her to **type
the words she needs** — «casa, perro, comer» — which is a different task from the one
she wanted done, and one she cannot do well: she does not know which words the next
worksheet will contain, and she should not have to.

The reasoning at the time was that the whole catalogue would be «hundreds of megabytes
of vocabulary no learner of hers will meet, in a download she has to babysit». That was
a guess, and the numbers are on the record now:

| Measured 2026-09-02 | |
|---|---|
| The whole index — 13.802 pictograms with all their words | **one request, 8,1 MB** |
| One image at 300px | **4 KB** (500px is 15 KB) |
| The whole catalogue at 300px | **~55 MB** |
| Is 300px enough? | Yes. `instructions/pictograms.md` requires 12 mm minimum; 300px prints to 25 mm at 300 dpi |

So the objection was wrong by an order of magnitude, and the design that came from it —
word-by-word — is the wrong design. It gets replaced by one press.

## And the reason it delivers nothing today

`023` closed with a warning that has now become the blocker (backlog G30). The first real
fetch returned **26 pictograms for three words**, because most words have several
candidates — and `018` FR-1609 deliberately gives an ambiguous word **no pictogram**.

That rule is right: the child reads the picture, she reads the text, and a wrong
pictogram is worse than none. But the consequence is that she can accept a licence,
download 55 MB, and get a worksheet with nothing on it.

`018` FR-1612 already promises her the override, and `profile.pictograms.overrides`
already exists in the schema — **carried by the profile editor and surfaced by nobody**.
It is the twelfth field in this project written, parsed, typed and read by no screen.

So this feature is two halves, and neither works without the other: **bring the whole
set, and let her choose.**

## Where her choice belongs

`018` put `overrides` on the **learner**. Its own rationale gives the game away: «her
school uses a different picture for *recreo*». That is a fact about her school, not
about one child — and stored per learner she picks the same picture again for every
child in her caseload.

So this feature adds **her vocabulary**, once, at the vault. The per-learner override
stays, for the genuine per-child exception, and still wins.

| Order of precedence | |
|---|---|
| 1 | This learner's override (`018` FR-1612) — the exception |
| 2 | **Her vocabulary** — new here; her school's answer, chosen once |
| 3 | The set, when exactly one candidate |
| 4 | Nothing, and reported, when several (`018` FR-1609) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One press, and it is hers (Priority: P1)

She turns pictograms on for Iker. The screen says whose they are and what the licence
asks. She accepts, presses **Traer los pictogramas**, and Rampa brings the whole set
into her own Rampa folder — most-used first, so it is usable within a minute and
complete within ten. She can close the window and it picks up where it left off.

**Why this priority**: It is the request, and `023`'s version made her do the part she
was asking to have done.

**Independent Test**: accept, press once, type nothing, and end with a set `018`'s
reader reads and a worksheet that renders.

**Acceptance Scenarios**:

1. **Given** the licence accepted, **When** she presses once, **Then** the whole index
   is brought in one request and the images follow, **with no words typed**.
2. **Given** a download in progress, **When** she stops it or closes the window,
   **Then** what arrived is usable and pressing again fetches only what is missing.
3. **Given** the set is complete, **When** she opens the screen again, **Then** it does
   **not** ask her for anything — it says what she has.
4. **Given** images arriving, **When** the first minute has passed, **Then** the
   most-used pictograms are already there, because the order is by the publisher's own
   download count and not by id.
5. **Given** no internet, **When** she presses, **Then** she is told so, nothing is
   half-written, and a folder she assembled by hand still works.

---

### User Story 2 - The word with four pictures (Priority: P1)

Her worksheet says «casa» and ARASAAC has four. Rampa puts none, says so, and shows her
the four, biggest-used first. She clicks one. It never asks again — for that word, for
any child, on any sheet.

**Why this is P1 alongside US1**: without it the download produces empty worksheets, so
US1 alone is 55 MB and a broken promise.

**Independent Test**: adapt material containing an ambiguous word, choose, re-adapt, and
the pictogram is there — with no second question.

**Acceptance Scenarios**:

1. **Given** a word with several candidates, **When** the sheet is made, **Then** no
   pictogram is placed and the word is listed with its candidates (`018` FR-1609).
2. **Given** that list, **When** she picks one, **Then** it is recorded in her
   vocabulary and used from then on, for every learner.
3. **Given** a choice she has made, **When** a learner has an override for that word,
   **Then** the learner's override wins.
4. **Given** a choice she has made, **When** she changes her mind, **Then** she can
   change it, and sheets made before are marked stale rather than silently rewritten
   (`005` FR-520).
5. **Given** she does not choose, **When** the sheet is made, **Then** it renders
   without that pictogram and says so. Choosing is never compulsory.
6. **Given** the candidates on screen, **When** she looks at them, **Then** she sees the
   pictures, not the ids — an id is not a thing anybody can choose between.

---

### User Story 3 - Asked once, and told when it matters (Priority: P2)

Months later ARASAAC has added pictograms. Rampa says so once, she presses once, and
only the new ones arrive.

**Why this priority**: it is the second half of «que no me lo vuelva a preguntar»,
and it is P2 because the first half — not asking — is what US1 delivers.

**Independent Test**: a set on disk, an index with more entries, and an offer that
fetches only the difference.

**Acceptance Scenarios**:

1. **Given** a complete set, **When** she opens the screen, **Then** there is no
   question and no button asking for something she has already done.
2. **Given** the publisher's index has changed, **When** Rampa has looked, **Then** it
   says how many are new and offers to bring them.
3. **Given** an update offered, **When** she declines, **Then** it does not ask again
   until the index changes further.
4. **Given** an update, **When** it is brought, **Then** only what is missing is
   requested.
5. **Given** she has never asked for an update check, **When** the application starts,
   **Then** **no request is made** (`023` FR-2107 stands).

### Edge Cases

- **Her disk is nearly full.** 55 MB is small but not nothing: reported as itself,
  before starting, and the download stops cleanly rather than corrupting the set.
- **The index says a pictogram exists and its image 404s.** Reported and skipped;
  `018` FR-1616 already renders a named gap.
- **A word whose candidates are all withdrawn upstream.** Her choice is kept, the gap is
  named, and the provenance still says which id it wanted (`018` FR-1611).
- **She chose, and ARASAAC later changes that pictogram's drawing.** Nothing detects it.
  Stated in the assumptions rather than pretended away.
- **Two teachers, one vault** — `004`'s handover. Her vocabulary is a professional
  judgement about her school, so it travels; her acceptance of the licence does not.
- **A word that is ambiguous in one language and not another.** The vocabulary is per
  language, like the set.
- **13.802 requests to a public service.** Throttled, resumable, and never repeated for
  something already on disk.

## Requirements *(mandatory)*

### One press

- **FR-2201**: Bringing the set MUST require **no word list from her**. The word-by-word
  fetch introduced by `023` is withdrawn as the primary path.
- **FR-2202**: The index MUST be brought in a single request and MUST be the source of
  which words exist.
- **FR-2203**: Images MUST be fetched in order of the publisher's own popularity, so the
  set is useful long before it is complete.
- **FR-2204**: Images MUST be fetched at the smallest size that satisfies the corpus's
  minimum print size, and that size MUST be recorded in the corpus rather than in code.
- **FR-2205**: The set MUST land inside her Rampa folder, so that what she backs up
  includes it.
- **FR-2206**: A download MUST be resumable, interruptible, and MUST never request
  something already on disk.
- **FR-2207**: Concurrency against the publisher MUST be bounded, and the bound MUST be
  corpus data.
- **FR-2208**: Before starting, free disk space MUST be checked against the expected
  size, and an insufficient disk MUST be reported before anything is written.

### Asked once

- **FR-2209**: Where the set is complete, the screen MUST NOT ask her for anything. It
  says what she has.
- **FR-2210**: Rampa MUST NOT check for updates on launch, on a timer, or as a side
  effect of any other work (`023` FR-2107).
- **FR-2211**: An update check MUST cost one request and MUST report how many entries
  are new.
- **FR-2212**: A declined update MUST NOT be offered again until the index changes
  further.
- **FR-2213**: What was downloaded MUST be recorded — when, how many, and the
  publisher's own high-water mark — so «is this current?» is answerable offline.

### Her vocabulary

- **FR-2214**: Where a word has several candidates, she MUST be able to choose one, and
  the choice MUST be recorded **once, for every learner** (her vocabulary).
- **FR-2215**: A learner's own override MUST win over her vocabulary (`018` FR-1612).
- **FR-2216**: Choosing MUST be optional. An unchosen word renders without a pictogram
  and is reported (`018` FR-1609 unchanged).
- **FR-2217**: The candidates MUST be shown as **pictures**, largest-used first. An id is
  not something a person can choose between.
- **FR-2218**: Changing a choice MUST mark the sheets made from the old one as stale
  rather than rewriting them (`005` FR-520).
- **FR-2219**: Her vocabulary MUST travel in a handover (`004`); her licence acceptance
  MUST NOT.
- **FR-2220**: Her vocabulary MUST be per language.
- **FR-2221**: Her vocabulary MUST NOT contain a learner's name, code, or any other fact
  about a child (`011` FR-910).

### Reachable

- **FR-2222**: Bringing the set MUST be reachable without first ticking a box inside one
  learner's profile. It is a fact about her installation, not about a child.

### Key Entities

- **Set inventory**: what is on disk — how many, at what size, from whom, when, and the
  publisher's high-water mark. Derived from the disk where possible, never a second copy
  of a truth the folder already holds.
- **Her vocabulary**: language → word → the pictogram she chose. Hers, once.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-2201**: A teacher goes from «pictograms on» to a rendered worksheet **with
  pictograms on it** by accepting a licence and pressing one button, typing nothing.
- **SC-2202**: The complete set is on disk in under fifteen minutes on a school
  connection, and the most-used two thousand within one.
- **SC-2203**: A second press after completion makes **zero** requests for images
  already present.
- **SC-2204**: No request is made on launch. Asserted against a transport that fails the
  test if called.
- **SC-2205**: An interrupted download leaves a set `018`'s reader reads with no
  problems, at any point.
- **SC-2206**: An ambiguous word chosen once is used for every learner and never asked
  about again.
- **SC-2207**: `018`'s reader, matcher and attribution are unchanged. Asserted by their
  tests passing untouched.
- **SC-2208**: A teacher with a pictogram-using learner reaches a usable sheet without
  asking what a pictogram set is. **Needs a teacher** — inherited from `023` SC-2107 and
  still not met.

## Assumptions

- **The numbers above hold.** Measured against the live service on 2026-09-02. If
  ARASAAC changes them the corpus is where the sizes live, so it is an edit.
- **`static.arasaac.org` is a CDN and serving files is its purpose.** 13.802 requests
  once per installation, throttled, is what it is for. The API host is used only for the
  index, once.
- **300px is enough**, from the corpus's own 12 mm minimum. If a PT says printed
  pictograms look soft, the size is a corpus edit and a re-fetch.
- **Popularity is a reasonable order and not a recommendation.** It decides what arrives
  first, never which pictogram is used — that stays FR-1609 and her choice.
- **The licence reading is `023`'s and is still under review** (backlog G28). Nothing
  here revisits it.
- **`025` is the conversation.**
