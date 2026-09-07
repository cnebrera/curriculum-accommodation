# Feature Specification: El registro, y cómo llega ella a él

**Feature Branch**: `036-el-registro`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: «Rampa escribe un registro técnico con cuidado y no hay forma
de que ella llegue a ese fichero. Y todo el subsistema se construyó sin ningún requisito
en ninguna spec.»

## Why this specification exists at all

**The subsystem is already built, and nothing in this repository says what it must do.**

`packages/shell/src/ipc/diagnostics.ts` writes a log. It does four careful things:

- It lives in the operating system's application-data directory and **not in the vault**,
  with the reason written in the file: it must not travel with a handover packet, must not
  be copied by a vault backup, and must not appear in a folder she is encouraged to share.
- It rotates at 2 MB, so it cannot grow without limit on a teacher's laptop.
- Per `@rampa/core`'s log module it **never contains a learner's name, her material, or
  anything that could reproduce them**.
- It captures unhandled failures, with the intent stated in a comment: «an unhandled
  failure is the one a teacher will report, so it must be in the file».

Four good decisions that **nobody can audit, because none of them is written down**. The
constitution's Principle I exists so a teacher can read the judgement; this is the
engineering equivalent — a privacy-relevant subsystem whose rules live only in comments is
one that changes the day somebody refactors a comment away.

And the intent is **unfinished**: the three channels that would take her to the file — its
path, opening its folder, its recent lines — are called by no screen. So the failure she
would report is recorded with care in a file she cannot reach. This was found by sweeping
the 181 exposed channels for readers (BACKLOG G58), not by anybody using the application.

This specification therefore does two things: it **writes down the rules the log already
obeys**, so they are auditable and cannot drift, and it gives her a way in.

## Clarifications

### Session 2026-09-07

- Q: ¿Merece un «copiar al portapapeles» su superficie, o basta con adjuntar el fichero?
  → A: **Sí, soportarlo.** Copiar es lo que ella hará de verdad para pegarlo en un correo.
- Q: ¿El fichero rotado anterior se alcanza desde la pantalla o sólo por la carpeta?
  → A: **Sólo por la carpeta**, y decidido por una medida y no por gusto: una línea son
  unos 100 bytes, así que 2 MB son ~20.000 líneas y una versión empaquetada sólo escribe
  de `info` para arriba — decenas de líneas por sesión, no miles. Son cientos de sesiones,
  más de un curso, antes de que rote una vez. Y en el caso patológico —algo escupiendo
  avisos y llenando 2 MB en días— el fichero interesante es el **actual**. Un selector
  sería superficie para un caso que llega dentro de un año.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Something broke and she wants to say what (Priority: P1)

A worksheet failed to adapt. She has thirty minutes before her next class and no interest
in becoming a diagnostician; what she wants is to tell somebody what happened without
having to describe it from memory. From «Acerca de» she finds where the log is, sees its
recent lines on the screen, and can open its folder to attach the file herself.

**Why this priority**: it is the whole reason the log is written. Without it the careful
redaction, the rotation and the uncaught-exception handler serve nobody — the application
takes notes for an audience of none.

**Independent Test**: cause a failure, open «Acerca de», and produce the file without
leaving the application to hunt for a directory whose location she has no reason to know.

**Acceptance Scenarios**:

1. **Given** the application has run, **When** she opens «Acerca de», **Then** she is told
   where the log is and can see its most recent lines without opening anything else.
2. **Given** she wants to send it, **When** she asks, **Then** the folder holding the file
   opens in her operating system and she attaches it herself.
3. **Given** a fresh installation with nothing logged yet, **When** she looks, **Then** it
   says there is nothing rather than showing an empty box that reads as a fault.
4. **Given** the file cannot be read, **When** she looks, **Then** it says so plainly and
   does not present emptiness as «no ha pasado nada».

---

### User Story 2 - She checks what she is about to send (Priority: P2)

Before attaching a file to an email she reads it. What she finds is timestamps, event
names and numbers — no child's name, no fragment of the worksheet she adapted, nothing
that identifies anybody.

**Why this priority**: the log's entire safety argument is «it carries nothing about a
learner», and today that is **our** claim about a file she cannot see. Letting her read it
is what makes the promise hers. A file we ask her to send blind is a file she has to trust;
one she can read is one she checks. In a school this is the difference between a tool a DPO
permits and one a DPO forbids.

**Independent Test**: adapt material for a learner with a name set, then read the log's
recent lines and find neither the name nor the material.

**Acceptance Scenarios**:

1. **Given** a session that adapted material for a named learner, **When** she reads the
   log's recent lines, **Then** neither the name nor any part of the material appears.
2. **Given** a log line that happens to carry text from a document, **When** it is shown,
   **Then** it is shown as text and never rendered as markup (Principle IX).

---

### Edge Cases

- **Nothing logged yet** — the first run, before anything happens. Said, not shown as an
  empty box.
- **The log has rotated** — the failure she is reporting may be in the previous file. The
  screen shows the current one; the folder she can open holds both, and the screen says so
  rather than implying the older one is gone.
- **The log is 2 MB** — she is shown its recent lines, not the whole file. A screen that
  tried to render two megabytes is a screen that hangs on the machine that most needs it.
- **The file is unreadable** (permissions, a full disk) — reported as unreadable rather
  than as empty.
- **Writing the log fails** — the application carries on. This is the case where the
  ordering matters most: a tool that crashes because it could not write a diagnostic has
  turned its diagnostic into a defect.

## Requirements *(mandatory)*

### Functional Requirements

#### What the log is, written down at last

- **FR-3401**: The log MUST NOT contain a learner's name, their material, or anything from
  which either could be reproduced. This is the rule the log module already follows and it
  is the one that makes every other requirement here safe.
- **FR-3402**: The log MUST live outside her vault. It is a diagnostic and not part of her
  records, so it MUST NOT travel in a handover packet (`004`), MUST NOT be copied by a
  backup of her folder, and MUST NOT appear in a folder she is encouraged to share.
- **FR-3403**: The log MUST be bounded. It cannot grow without limit on a machine she also
  teaches from.
- **FR-3404**: An unhandled failure MUST reach the log. It is the failure she will report,
  so it is the one that must be in the file.
- **FR-3405**: A failure to write the log MUST NOT break, block or interrupt anything.
  Where the two conflict, the work wins and the diagnostic is lost.

#### How she reaches it

- **FR-3406**: She MUST be able to find out where the log is, from inside the application.
- **FR-3407**: She MUST be able to read its recent lines **inside the application**,
  without a text editor and without knowing where the operating system keeps
  application data.
- **FR-3408**: She MUST be able to open the folder containing the log, so she can attach
  the file herself. That folder holds the rotated previous file too, and the screen MUST
  say so — the screen itself offers no way to choose between them (clarified 2026-09-07:
  a line is ~100 bytes, so 2 MB is ~20.000 lines and rotation is a once-a-year event at
  most; a file selector would be surface for a case that arrives next year, and in the
  pathological case the interesting file is the current one).
- **FR-3409**: She MUST be able to **copy** what is shown, because pasting it into an email
  is what she will actually do (clarified 2026-09-07). Copying is her act on her own
  machine and reaches nothing: FR-3411 still holds unchanged.
- **FR-3410**: What is shown MUST be presented as text and never rendered as markup
  (Principle IX). A log line can carry a fragment of a document, and a document is never
  an instruction — nor a link, nor a style. **This governs the copy of FR-3409 as well**:
  what reaches her clipboard is the text of the log and never anything a document could
  have styled into it.

#### What this MUST NOT become

- **FR-3411**: Rampa MUST NOT transmit the log anywhere, ever, on any schedule or trigger.
  Sending it is **her** act, by hand, to a recipient she chose. Nothing about this feature
  is a channel — and a clipboard is not one either: it does not leave her machine, and what
  she does with it afterwards is hers.
- **FR-3412**: This feature MUST NOT introduce telemetry, usage counting, crash reporting
  or any other outbound flow. The declared-destinations list (`034` FR-3204, the amended
  `007` FR-511) MUST NOT grow because of it.
- **FR-3413**: Opening the screen MUST NOT reach the network. Not for a version, not for
  anything.
- **FR-3414**: This feature MUST NOT change what is written to the log, at what level, or
  how it is redacted. It writes down the existing behaviour and adds a way in; a
  specification that quietly redesigned the thing it was written to describe would be
  worse than none.

### Key Entities

- **The log file**: where it is, how large it may grow, what it may never contain, and the
  previous rotation kept beside it.
- **A log line**: a timestamp, an event name and its fields — displayable as text.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-3401**: After a failure, she produces the log file **without leaving the
  application to look for it** and without being told where it lives.
- **SC-3402**: Over a session that adapted material for a learner with a name set, the log
  contains **zero** occurrences of that name and no fragment of the material. This is the
  criterion the other ones depend on.
- **SC-3403**: With the log directory made unwritable, every flow still completes and no
  error about logging reaches her.
- **SC-3404**: Opening the screen produces **zero** outbound requests, counted in both
  network stacks (`035`'s counter).
- **SC-3405**: With a log at its size limit, the screen renders its recent lines and stays
  usable at every window width and text scale (`013` FR-1115/FR-1117).

## Assumptions

- **«Recent lines» is a bounded tail, and 200 lines is the default.** That is what the
  existing channel already offers, it fits an unhandled failure and the events around it,
  and it is small enough to read. Not asked, because the number is adjustable and no
  requirement here depends on it.
- **The screen lives in «Acerca de»** (`025` FR-2307 put it in Configuración). The log is a
  fact about her installation and not about a child, so it belongs where the version, the
  licences and the declared destinations already are. Recorded rather than treated as
  obvious: the alternative — its own top-level entry — would contradict `020` FR-1802,
  which is exactly two destinations.
- ~~No «copy to clipboard»~~ and ~~whether the rotated file is reachable~~ were the two
  questions left open here. **Both answered 2026-09-07** — see Clarifications above, and
  FR-3408/FR-3409. Kept struck through rather than deleted: they are the record of two
  things that were asked instead of guessed, which is the habit AGENTS.md says this
  project's defects live in the absence of.

## Dependencies

- `006-desktop-app` — the application shell that starts logging, and `validation.md`, where
  the human-owned verdicts of this repository are recorded.
- `025-pictogramas-tienen-su-sitio` — «Acerca de» is a section of Configuración, which is
  where this arrives.
- `035-modo-ensayo` — its network counter is how SC-3404 is a measurement rather than a
  claim.
- `034-como-llegan-las-versiones` — the declared-destinations disclosure that FR-3411 says
  must not grow.

## Out of Scope

- Sending the log anywhere automatically, or offering to. Nothing leaves her computer except
  to the provider she chose.
- Telemetry, usage analytics, crash reporting, or an error-reporting service of any kind.
- Changing the logger: its levels, its sinks, its redaction, its rotation size, or what any
  call site records.
- A log viewer with search, filters or severity colouring. She is reading it to check what
  she is about to send, not to debug.
