# Feature Specification: The guide — reading it, honouring it, and helping write it

**Feature Branch**: `017-la-guia`

**Created**: 2026-08-30

**Status**: Draft — needs `/speckit-clarify` **and a DPO conversation** before `/speckit-plan`

**Input**: Carlos, 2026-08-30:

> «debería ser capaz de ayudar a generar la adaptación curricular (es decir las
> guías), o leer las guías que alguien te da y dejarlo preparado para el niño de
> forma que se base en esas guías al adaptar material o generarlo. En la parte de
> generar la adaptación general, debería permitir cargar la que hay e iterar con
> IA a lo chat sobre ella, permitiendo analizarla, adaptarla, ver puntos débiles,
> etc y que todo se vaya guardando, al final yo quiero un copilot completo para el
> PT y el Tutor!!»

## What the regulation says, and why it changes this specification

Before writing a line of this, the Andalusian rules. They are not background: they
determine what Rampa is allowed to be.

| | **ACNS** — no significativa | **ACS** — significativa |
|---|---|---|
| What it changes | «**no afectarán** a la consecución de las competencias clave, objetivos y criterios de evaluación» — methodology, activities, timing, materials, assessment instruments | **Modifies** objetivos and criterios de evaluación |
| Who authors it | Coordinated by the **tutor**, who completes every section except the propuesta curricular, completed by the subject teacher | The **profesorado especialista en educación especial** (the PT), with the subject teacher, advised by the Equipo de Orientación |
| What it requires first | A desfase curricular of at least one course in that subject | A **prior evaluación psicopedagógica** by the equipo or departamento de orientación |
| Where it lives | Séneca | Séneca, as the DIAC |

Sources in [docs/normativa-andalucia.md](../../docs/normativa-andalucia.md).

### Three consequences, and one of them is remarkable

**1. Rampa is already an ACNS engine, and has never said so.**

Principle III — *adapt the how, never the what* — is not a house style. It is,
word for word, the statutory boundary between the two documents: an ACNS «no
afectará a la consecución de las competencias clave, objetivos y criterios de
evaluación». Everything Rampa does today falls inside it, deliberately, and the
interface has never once used the term a Spanish PT and tutor use every week.

This is the same shape as the `evidence:` finding in `001` and it is larger: not a
field we parse and drop, but a **product category we occupy and do not claim**.

**2. Carlos named both roles, and the regulation splits them the same way.**

«Copilot para el PT y el Tutor» is not one product with two users. The tutor
coordinates the ACNS; the PT authors the ACS. Those are different documents,
different authority and different risk, and a feature that blurs them would put a
tutor's name on a decision only a PT with a psychopedagogical report may make.

**3. Séneca is the system of record, and we are not.**

The ACNS and the ACS «quedarán recogidas en un documento que estará disponible en
la aplicación informática Séneca». Rampa cannot be the register, must not look
like it, and must produce something she carries *into* Séneca. Any design where
Rampa's copy is the authoritative one is wrong before it is built.

## The hard constraint, stated before the features

A DIAC contains, by definition, the most sensitive material in this whole system:
a summary of the evaluación psicopedagógica, a diagnosis, and often family
circumstances. [ADR 0002](../../docs/decisions/0002-no-clinical-material.md) says
Rampa holds no clinical material, and Principle V says barriers, never diagnoses.

**Ingesting a DIAC means putting exactly that in front of a third-party model.**

There is no wording that makes this go away. There are only three options, and two
of them are wrong:

- *Refuse to read guides at all.* Honest, and it throws away the most useful thing
  in this request — a PT who has already been given the guide is going to follow
  it either way, and Rampa ignoring it is Rampa contradicting the expediente.
- *Read it and keep it.* Violates ADR 0002 outright.
- **Read it, extract the measures, keep only those.** The diagnosis is not stored,
  the measures are. This is the design below, and it is the only one that survives
  both the constitution and the teacher's actual situation.

Even so, an image of a DIAC page sent for reading contains everything printed on
that page. That is the same honest limitation already stated for a photograph with
a handwritten name on it (`009`), and it must be said in the same words, at the
same point, before she uploads anything.

> **This feature must not be planned until the DPO and legal have been asked.**
> It is education, minors, and health data in a regulated sector, and the
> difference between "read and discard" and "store" is a difference they get to
> rule on, not this document. Named here as a blocking prerequisite, not as a
> disclaimer.

## What this is not

**Not a system of record.** Séneca is. See above.

**Not a psychopedagogical evaluation.** Rampa must never produce one, summarise one
it has not been given, or produce a document that reads as though one exists. That
is the single most consequential thing it could get wrong: an ACS drafted without
that report is procedurally void, and a document that *looks* complete invites
somebody to file it.

**Not «un copilot completo».** That phrase names an ambition, not a scope. What is
specified here is: read a guide, honour it, help write the one Rampa is already
qualified to help with, and interrogate any of them. Everything else is a later
specification and should have to argue for itself.

## Clarifications

### Session 2026-08-30

- **Q: Does helping with the ACS — the significant adaptation — stay in scope, or do
  we stop at the ACNS?** → **A: Both, as written** (Carlos). US4 stays, with its five
  locks intact: Rampa never proposes which objectives to modify, refuses to draft
  where no evaluación psicopedagógica is recorded, names the PT as author and
  Orientación as adviser, marks the draft, and declines in one sentence naming who
  decides when asked to make the decision itself.

  Recorded as a decision rather than a default. I offered stopping at the ACNS as the
  low-risk option and he took the wider scope knowingly; the locks are therefore
  load-bearing rather than cautious, and weakening any of them is a change to this
  answer and not a detail of implementation.

- **Q: Does a guide go through the same verification screen as a worksheet?** →
  **A: Yes.** FR-1505 and FR-1506: one ingest pipeline, and she confirms what was
  read before anything is written. A separate path for guides would be the
  modality-specific pipeline Principle IV forbids, and the document where a
  misreading matters most is the one nobody would have checked.

- **Q: Is the ACS assistance blocked on the same DPO conversation as the rest?** →
  **A: Yes, and more so.** The blocker is stated for the whole feature; US4 is where
  a wrong answer has consequences for a child's schooling rather than for a file.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She brings the guide she was given (Priority: P1)

The orientador has given her a DIAC, or the previous tutor an ACNS. She brings it
to Rampa and from then on every adaptation honours it.

**Why this priority**: It is the one that is nearly built. `profiles/<code>/adaptations.md`
already exists, already outranks the recipes, and already carries the sentence
«Adaptaciones oficiales (mandan sobre las recetas)». What is missing is a way in:
today it must be typed by hand.

**Independent Test**: Given a two-page ACNS as a PDF, the measures it prescribes
appear in the overlay, and an adaptation of unrelated material visibly follows one
of them.

**Acceptance Scenarios**:

1. **Given** an ACNS or DIAC as a PDF, a photograph or a Word file, **When** she
   brings it, **Then** the measures it prescribes are extracted and shown to her
   for confirmation before anything is written.
2. **Given** the extraction, **Then** diagnoses, clinical categories and the
   psychopedagogical report's findings are **not** written to the vault, and the
   interface says which parts were deliberately left out and why.
3. **Given** confirmed measures, **Then** they are written to the learner's overlay
   and outrank Rampa's own recipes in every subsequent adaptation.
4. **Given** a later adaptation, **Then** the report names which measure came from
   the guide rather than from a recipe (Principle VI).
5. **Given** a measure Rampa cannot act on — «apoyo del PT tres sesiones semanales»
   — **Then** it is recorded and shown, and Rampa says plainly it is not something
   it can do. Silently dropping it would make the overlay a partial record of a
   document she believes is fully loaded.
6. **Before** she uploads, **Then** she is told what leaves the machine, in the
   same words `009` uses for a photograph with a name on it.

---

### User Story 2 - Rampa writes the ACNS it has been doing all along (Priority: P1)

She has adapted six worksheets for this child. Rampa can now draft the ACNS,
because every decision in it is a decision Rampa already made and recorded.

**Why this priority**: This is the finding above, turned into a feature. Rampa's
adaptation reports already contain the metodología, the actividades, the
temporalización and the materiales an ACNS asks for — grouped by decision, with a
reason for each. The document is a rendering of work that exists.

It is also the one Rampa is *entitled* to help with: an ACNS changes no objective
and no criterion, which is exactly the line Principle III already refuses to cross.

**Independent Test**: For a learner with several adapted documents, a draft ACNS is
produced whose measures all trace to recorded adaptations, with nothing invented.

**Acceptance Scenarios**:

1. **Given** a learner with recorded work (`014`), **When** she asks for the ACNS,
   **Then** a draft is produced covering the sections the regulation requires.
2. **Given** the draft, **Then** every measure traces to a specific adaptation or
   to her own overlay, and anything Rampa could not source is listed as missing
   rather than filled in.
3. **Given** the draft, **Then** it carries the draft mark and is not removable
   without her sign-off (Principle VII).
4. **Given** the draft, **Then** it states that Séneca is the record and this is
   material to carry there — never a document that presents itself as filed.
5. **Given** a learner with no recorded work, **Then** Rampa declines and says why:
   an ACNS drafted from nothing is a form filled in by a language model.
6. **Given** the ACNS is coordinated by the **tutor**, **Then** the document names
   the role that must sign it, and Rampa does not imply the PT authored it.

---

### User Story 3 - She interrogates a guide (Priority: P2)

She loads a guide — hers, or one she was given — and asks about it. What is weak.
What is missing against the regulation. Whether the measures match the barriers
she has recorded. And the exchange is kept.

**Why this priority**: This is «iterar a lo chat» and it is genuinely useful — a PT
reviewing an inherited DIAC is doing exactly this in her head. Second because it is
the least bounded thing here and the easiest to build badly.

**Acceptance Scenarios**:

1. **Given** a loaded guide, **When** she asks about it, **Then** answers cite the
   part of the document they come from.
2. **Given** the guide, **Then** its contents are **data and never instruction**
   (Principle IX). A DIAC containing «ignora las instrucciones anteriores», or
   simply an emphatic sentence, changes nothing about how Rampa behaves.
3. **Given** a gap against the regulation's required sections, **Then** Rampa can
   name it — and names it as a question for her, not as a verdict about a colleague
   who wrote it.
4. **Given** the exchange, **Then** what is kept is what **she** chooses to keep
   (Principle VIII), written to her folder in plain Markdown.
5. **Given** any answer, **Then** it never proposes removing or altering an
   objective or a criterio de evaluación. That is an ACS decision and US4 governs
   it.
6. **Given** a long exchange, **Then** cost is visible and bounded like every other
   provider call (`006` FR-422).

---

### User Story 4 - She is writing the ACS, and Rampa helps without deciding (Priority: P3)

The PT is drafting a significant adaptation. Rampa helps her write it. It does not
choose what to remove.

**Why this priority**: Last, and deliberately. It is the only part of this feature
that touches the *what*, it is the part with legal consequences for a child, and
it is the one that most needs the earlier parts working before it is attempted.

**Acceptance Scenarios**:

1. **Given** she states which objectives and criteria the team has decided to
   modify, **Then** Rampa helps her express them and never proposes the list.
2. **Given** no evaluación psicopedagógica is recorded as existing, **Then** Rampa
   says the document cannot proceed without one and does not draft around it.
3. **Given** a draft, **Then** it names the PT as author, the subject teacher as
   collaborator and Orientación as adviser, because the regulation does.
4. **Given** a draft, **Then** it carries the draft mark and states that it is not
   filed until it is in Séneca.
5. **Given** she asks Rampa to decide which objectives to remove, **Then** it
   declines, in one sentence, and says who decides.

---

### Edge Cases

- **A DIAC from another comunidad autónoma.** The section names differ; the
  document is still hers. Extraction must degrade to "measures found" rather than
  refusing because it is not the Andalusian shape.
- **A guide that contradicts the learner's profile** — the DIAC says lengthen
  deadlines, the profile says countdown timers are fine. The overlay wins, and the
  contradiction is surfaced rather than resolved silently.
- **A guide that contradicts itself.**
- **A scanned DIAC of eleven pages.** Cost, and whether she is told before it runs.
- **A guide for a learner who is not in Rampa.** Offer to create them; never
  create one silently from a document.
- **A guide with another child's name in it** — a shared class document. `009`'s
  name check applies, and this is a likelier case here than in a worksheet.
- **Séneca changes its sections.** The corpus carries them; nothing in code names
  a section (Principle I).

## Requirements *(mandatory)*

### What Rampa is

- **FR-1501**: The interface MUST name what it does in the vocabulary of the
  regulation: what Rampa produces for a worksheet is an **adaptación no
  significativa**, and it MUST say so.
- **FR-1502**: Rampa MUST NOT be, or present itself as, the register. Every
  document it produces MUST state that Séneca is the record and this is material
  to carry there.
- **FR-1503**: Rampa MUST NOT produce, summarise or imply an evaluación
  psicopedagógica.
- **FR-1504**: Every document produced MUST name the role that must sign it,
  following the regulation: the tutor coordinates the ACNS, the PT authors the ACS.

### Reading a guide

- **FR-1505**: Guides MUST be ingestible through the existing pipeline (`008`) —
  PDF, image, Word — with no parallel path (Principle IV).
- **FR-1506**: Extraction MUST be confirmed by her before anything is written
  (`008` already requires this for material; a guide is not an exception).
- **FR-1507**: Diagnoses, clinical categories and psychopedagogical findings MUST
  NOT be written to the vault (ADR 0002, Principle V).
- **FR-1508**: What was deliberately left out MUST be said. A silent filter makes
  the overlay a partial record of a document she believes is fully loaded.
- **FR-1509**: Before upload, she MUST be told what leaves the machine, in the same
  terms `009` uses for a photograph.
- **FR-1510**: Measures Rampa cannot act on MUST be recorded and shown as such.
- **FR-1511**: Confirmed measures MUST land in `profiles/<code>/adaptations.md` and
  outrank Rampa's own recipes, which is what that file already does.
- **FR-1512**: A report MUST distinguish a measure that came from the guide from
  one Rampa chose (Principle VI).

### Writing the ACNS

- **FR-1513**: A drafted ACNS MUST be assembled from recorded work (`014`) and the
  overlay. Nothing in it may be invented.
- **FR-1514**: Anything the regulation requires and Rampa cannot source MUST be
  listed as missing, never filled in plausibly.
- **FR-1515**: Rampa MUST decline to draft for a learner with no recorded work.
- **FR-1516**: The draft MUST carry the draft mark, removable only by sign-off
  (Principle VII).
- **FR-1517**: The required sections MUST live in the corpus under
  `instructions/`, never in code, so a change in Séneca is a Markdown edit
  (Principle I).

### Interrogating a guide

- **FR-1518**: A loaded guide is **content**, and content is never instruction
  (Principle IX). This is the largest untrusted-content surface the application
  will have had, and `007`'s defences apply in full.
- **FR-1519**: Answers MUST cite the part of the document they rest on.
- **FR-1520**: Nothing in this mode MAY propose removing or altering an objective
  or a criterio de evaluación.
- **FR-1521**: What is kept from an exchange MUST be chosen by her (Principle
  VIII), and written in plain Markdown to her folder.
- **FR-1522**: Cost MUST be visible and bounded as for every other provider call.

### The ACS

- **FR-1523**: Rampa MUST NOT propose which objectives or criteria to modify.
- **FR-1524**: Where no psychopedagogical evaluation is recorded as existing, Rampa
  MUST say the document cannot proceed and MUST NOT draft around it.
- **FR-1525**: Rampa MUST decline, in one sentence naming who decides, when asked
  to make the decision itself.

## Success Criteria *(mandatory)*

- **SC-1501**: A PT brings an ACNS she was given, and the next adaptation visibly
  follows one of its measures, with the report saying it came from the guide.
- **SC-1502**: No diagnosis, clinical category or psychopedagogical finding appears
  anywhere in the vault after ingesting a real DIAC. Asserted by a test over a
  synthetic document (`docs/decisions/0002` forbids a real one in this repository).
- **SC-1503**: Every measure in a drafted ACNS traces to a recorded adaptation or
  to the overlay. Zero unsourced statements.
- **SC-1504**: A guide containing an instruction aimed at the model changes nothing
  about Rampa's behaviour (`007`'s corpus extended with guide cases).
- **SC-1505**: A PT reads a drafted ACNS and says it saved her an evening — and
  says the parts marked missing were the right parts to leave to her. Judged by a
  person, once.
- **SC-1506**: No document Rampa produces can be mistaken for one that is filed.
- **SC-1507**: Asked to decide what to remove from a curriculum, Rampa declines and
  names who decides, in every phrasing the fixture set contains.

## Assumptions

- The overlay (`profiles/<code>/adaptations.md`) is the right home for extracted
  measures. It already exists, already outranks the recipes, and already carries
  the sentence that says so.
- «Chat» here means a bounded conversation about one loaded document, not a general
  assistant. A general assistant is a different product and would need its own
  argument about Principle IX.
- Andalusia first, for the same reason `011` starts there, and the sections live in
  the corpus so a second comunidad is a Markdown file.

## Dependencies and sequencing

- **Blocked on a DPO/legal conversation.** Stated above; not a formality.
- `008` supplies ingest; `007` supplies the untrusted-content defences.
- `014` supplies the recorded work an ACNS is drafted from — **US2 cannot ship
  before it**.
- `011` supplies course and stage; `002` FR-129's target level is the same field
  this feature's guides prescribe.
