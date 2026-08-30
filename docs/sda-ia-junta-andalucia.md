# SDA-IA (Junta de Andalucía) — what it does, and what we take from it

Reviewed 30 August 2026, from a black-box analysis of `edea.juntadeandalucia.es/sda-ia/`
v3.5.5.13 (the analysis itself is not in this repository; it was supplied and read).

This is a companion to [market-landscape.md](market-landscape.md), and it
**corrects that document**: it says of the existing tools that "all of it is built
on IDEA/FERPA. It knows nothing of ACI/DIAC, LOMLOE, or competencias específicas
and criterios de evaluación." That is no longer true. SDA-IA knows all of it, in
depth, from a database, with the official Andalusian codes intact.

## What it actually is

A **prompt compiler with a curriculum database behind it**. It does not generate
pedagogy: it composes a ~26 000-character prompt from (a) a guided form, (b) the
official Andalusian curriculum served from a REST API — competencias específicas,
criterios de evaluación, saberes básicos, descriptores operativos, each with its
official code — and (c) a 12 500-row CSV of prompt fragments. The teacher either
downloads the prompt or sends it to Gemini server-side and gets a *Situación de
Aprendizaje* back as HTML or DOCX.

## It is not our competitor, and that is the useful part

| | SDA-IA | Rampa |
|---|---|---|
| The artefact | The **teacher's** planning document (a SdA, as the Orden de 30 de mayo de 2023 requires it) | The **child's** material: the worksheet, the exam, the study text |
| The moment | Planning a unit, weeks ahead | Tomorrow's lesson, tonight |
| Who it serves | Any teacher; PT/AL is a block inside the form | A PT, with this child |
| Where the knowledge lives | Curriculum in a database, prompt text in a CSV | Judgement in `instructions/` and `recipes/`, Markdown |
| Persistence | **None.** A page refresh loses the whole form | The vault |

They overlap on exactly one thing: both need to know what a child at a given
course is supposed to be learning. That overlap is where everything below lives.

## The four things worth taking

### 1. The curriculum, with its official codes, as an anchor

Their strongest design decision, and they say so themselves: the competencias,
criterios and saberes come from a database with their official coding
(`MAT.3.1.1.Reconocer de forma verbal o gráfica, problemas…`), never from the
model. Their words: *elimina la alucinación curricular*.

That is our corpus-as-truth pattern, arrived at independently — which is worth
knowing, because it is the fourth time this project has reached for it and the
first time somebody else has reached for it too.

But they have something we do not. `instructions/education/es.md` carries stages,
years, typical ages and a rough sense of content. It does not carry
**criterios de evaluación with their codes**. For `002` — compose material from
objectives — that is the difference between "material about carrying in
multiplication" and "material anchored to `MAT.3.A.2.7`, which a PT can put in
front of a jefatura de estudios". `002` FR-102 already requires an anchor and
FR-122 already says the level comes from the education corpus; this is what those
requirements were reaching for.

**→ `011`: the education corpus should be able to carry competencias, criterios
and saberes per course and subject.**
**→ `002`: an official criterio should be admissible as the anchor.**

### 2. The PT / AL objective taxonomy

The single most transferable asset in the whole application: six areas, ~24
blocks and ~110 objectives for PT, and ~30 blocks and ~130 objectives for AL —
the AL one with an extra *ámbito* level for fonética, fonología, semántica,
morfosintaxis and pragmática.

This is what a PT actually writes in a programa específico. «2.1. Memoria de
trabajo», «1.5. Fonema /R/», «3.4. Resolución de conflictos».

It does **not** compete with our axes. Ours say *what gets in the way*; theirs say
*what we are working on*. A child can have `ATE: 3` (our axis) and be working on
`1.2 atención selectiva` (their objective), and those are two different sentences
about the same child. `002` asks her for objectives in free text; a corpus of the
objectives her profession already names would make that question answerable
instead of blank.

**Licensing caution.** The structure — areas, blocks, the shape of the tree — is a
fact about the profession and traceable to the Instrucción de la Consejería they
cite. The exact wording of 240 objectives is *their* file. Build ours from the
structure and the source instruction; do not copy the CSV.

**→ a new corpus under `instructions/`, the same shape as `education/es.md`.**

### 3. Say «DUA» out loud

They anchor the whole prompt to LOMLOE, the Orden andaluza, **UDL/DUA 3.0** and
the ODS, with literal links to the BOE, the BOJA and CAST's guidelines. Every
generated activity must name the *pauta DUA aplicada*, the strategy and the tool.

Our recipes **are** DUA. They do not say so anywhere a teacher can see. That is a
gap in her vocabulary, not in our behaviour: a PT defending an adapted exam to
jefatura de estudios needs to name the pauta, and right now our report gives her
excellent reasons in plain Spanish and not one word the administration recognises.

Tagging each recipe with the DUA guideline it serves is cheap, it is corpus rather
than code, and it turns Principle VI's traceability into something that survives
contact with an inspection.

**→ a `dua:` field on each recipe, surfaced in the report.**

### 4. Sessions, and the level the material targets

Two fields their form has and ours does not:

- **Sesiones** — how many sessions this material is for. A PT works in sessions;
  we have no concept of one.
- **Curso adaptado** — the curricular level the material targets, which for a
  child working below their year is *not* their own course. `011` records the
  child's age, year and stage and the divergence between them. It does not record
  «this material is aimed at 2.º» for a child in 5.º.

The second one needs care. Principle III says we adapt the how and never the what,
and silently lowering the level of a worksheet is precisely what that forbids. But
`002` **composes** material from objectives, and composing at a stated level is a
different act from quietly rewriting somebody else's worksheet — and it is a
decision the team has already made and recorded, which is what
`profiles/<code>/adaptations.md` exists to carry.

**→ `002`: the target level is an input, and it comes from the overlay or from her,
never from the application's own judgement about the child.**

## What we deliberately do not take

| | Why not |
|---|---|
| **Actas, instrumentos de evaluación, actividades** (their "tareas docentes") | Teacher paperwork, not material for a child. A good adjacent product and a different one. Naming it here so the decision is deliberate rather than an oversight. |
| **The «Déficit/dificultad» free-text field** | Their own analysis flags it as the tool's biggest RGPD risk: it invites a diagnosis, and that text is sent to a third-party model. Principle V forbids it structurally — we record barriers, never diagnoses — and `002-no-clinical-material` already decided this. |
| **Generating an ACS** | Principle III. We do not decide significant adaptations; the team does and the expediente records it. We already have the right shape: the overlay carries a decision somebody else made, and it outranks our recipes. |
| **Their CSV-and-formula prompt engine** | Same instinct as Principle I — pedagogical text out of code, editable by non-programmers — and they got there independently, which is good evidence the instinct is right. But 12 501 rows of which 7 000 are empty, 2.6 MB downloaded per session, `(fila,col)` references as the addressing scheme, and no versioning. Markdown with front matter and a bundled, versioned corpus is the better shape. Nothing to take, something to be encouraged by. |

## What it validates, which is worth writing down

Their analysis lists six compliance risks and eight technical debts. Read as a
list of things a tool in this space gets wrong, five of them are things this
project's constitution structurally prevents — not by being careful, but by
having made a decision early enough that the failure cannot occur:

| Their finding | Our principle |
|---|---|
| «Sin descargo de responsabilidad sobre el resultado. El documento generado por IA no lleva marca de origen ni advertencia de revisión obligatoria» — flagged against AI Act transparency duties | **VII · the draft announces itself.** The mark is on the document and only `job:signOff` removes it |
| «Datos de salud de menores en texto libre… se transmite a un proveedor de IA de terceros» | **V · barriers, not diagnoses**, and the egress chokepoint |
| «Sin trazabilidad visible del prompt enviado ni del resultado» | **VI · traceability**, and the report |
| «Las validaciones de concreción están comentadas: se puede generar un prompt sin competencias, criterios ni saberes» → SdA with no curricular anchor | `002` **FR-102**, the anchor is required and refusal is the behaviour |
| «Sin control de cuota ni de coste» | The cost estimate, the unusual-cost gate, the month badge |
| «Refrescar la página pierde el formulario entero» — and they rank persistence as their **highest-impact** improvement | The vault, and `014` |

The last row is the one to notice. The team that built this thing, looking at
their own product, says the single most valuable thing they could add is *keeping
the teacher's work*. That is what `014` specifies, and it arrived from Carlos
saying the same sentence about Rampa on the same day.

## Sources

The application at `edea.juntadeandalucia.es/sda-ia/` (authenticated, v3.5.5.13),
via a black-box analysis supplied 30 August 2026. Its own normative anchors:
LOMLOE (BOE-A-2020-17264), Orden de 30 de mayo de 2023 de Andalucía
(BOJA23-104-00208-9731-01), CAST UDL Guidelines 3.0.

The application declares itself a **demo**: the full catalogue of 13 courses and
up to 28 subjects is navigable, but the team validates only 1.º and 2.º de
Primaria in Matemáticas and Lengua. Some of the debt above is probably deliberate
in a pilot, and it is fair to read it that way.
