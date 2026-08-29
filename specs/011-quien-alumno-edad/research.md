# Phase 0 — Research

One question: what the Spanish system's stages and years actually are, including
the three Carlos asked for by name — FP, educación especial and adult education —
which is where age and year come apart and therefore where this feature earns its
keep.

## R1 · The Spanish system, as it ships

**Decision: the table below, in `instructions/education/es.md`, with a
`last_checked` date and the same staleness discipline the provider catalogue
uses.**

**Rationale for the discipline, not the numbers:** an education system is a fact
about the world that changes — LOMLOE replaced LOMCE, and FP has been
reorganised twice in a decade. The provider catalogue already learned this lesson
about third parties, and it applies identically here. A year list with no date on
it is a claim nobody can age.

| Stage | Years | Typical age at the start of the course |
|---|---|---|
| Infantil (2.º ciclo) | 1.º, 2.º, 3.º | 3, 4, 5 |
| Primaria | 1.º–6.º | 6, 7, 8, 9, 10, 11 |
| ESO | 1.º–4.º | 12, 13, 14, 15 |
| Bachillerato | 1.º, 2.º | 16, 17 |
| FP Grado Básico | 1.º, 2.º | 15, 16 — *entry is typically 15–17, often after repetition* |
| FP Grado Medio | 1.º, 2.º | 16, 17 — *and frequently older* |
| Educación especial | *(no ordinary year)* | **none** — see below |
| Personas adultas (ESPA) | Nivel I, Nivel II | **none** — 18 and up |

**Infantil's first cycle (0–3) is deliberately absent.** A PT is not adapting a
worksheet for a two-year-old, and listing it would put four entries in a dropdown
that nobody will ever pick.

**Two rows have no typical age, and that is the point of FR-912.** In educación
especial the administrative year and the working level separate completely, and
in adult education the learner is an adult. Filling a default there would be
worse than filling nothing: a wrong age is acted on, an absent one is asked about.

## R2 · What "typical age" means, and why it is a table

**Decision: an explicit age per year, not arithmetic.**

The obvious implementation is `6 + yearIndex`. It works for Primaria and ESO and
breaks on everything else: Bachillerato continues the sequence but FP Grado Básico
restarts at 15, Grado Medio overlaps Bachillerato, and two rows have no age at all.

A formula that is right for two thirds of a table and silently wrong for the rest
is worse than a table, because the third it is wrong about is the third this
feature exists for.

**Also: age at the *start* of the course**, which is the convention a Spanish
teacher uses, and it is what makes the number stable across a school year rather
than changing on a birthday.

## R3 · Where the education file lives

**Decision: `instructions/education/<system>.md`, one file per system.**

Third time this project has answered "where does a fact about the world live" with
"not in TypeScript" — after the provider catalogue and the axis descriptors — and
the answer keeps being right for the same reason: a Spanish teacher can read and
correct this table, and a British one can add hers, and neither should need a
release.

**Alternatives rejected.** A JSON blob in the app: unreadable to the person most
likely to spot an error in it. A single file with every country: it would be
edited by people who do not share a language, and a mistake in one country's rows
would ship in everyone's release. Deriving from `Intl` locale data: it knows about
dates and numbers, not about Bachillerato.

## R4 · What the model is told when age and year diverge

**Decision: state the divergence explicitly, in the prompt, in words.**

A fourteen-year-old in 5.º de Primaria is not an error to correct and not a
curiosity — it is the single most useful thing the model could know about that
learner, because register and curricular demand have come apart and the whole rule
in `instructions/adapt.md` is about pitching them separately.

Left to inference, a model given "age 14, year 5.º de Primaria" may well notice.
Told plainly, it cannot fail to. The cost is one sentence.

**Threshold: two years or more from the year's typical age**, in either direction.
One year is ordinary — a summer birthday, a late start — and flagging it would
make the sentence appear on most learners and stop being read.

## R6 · What the corpus says about *what is taught*

*(Carlos, 2026-08-29: "tendrás que tener en tu corpus qué coño se da en cada
sistema… en España depende de la comunidad autónoma… al final te lo va a decir la
PT, pero creo que este corpus ayuda.")*

**Decision: orientation, not curriculum. Explicitly labelled as such, and the
teacher's word beats it every time.**

His last clause is the design, not a caveat: *la PT te lo va a decir*. So the
corpus is not trying to be right about what a child studies in Extremadura this
year. It is trying to stop the model producing something absurd for the age when
she has told it nothing — a text about mortgages for a nine-year-old, or counting
bears for a sixteen-year-old.

### What each year carries

- **What a learner at this point can typically *do*** — sentence length they read
  comfortably, how many steps of instruction they hold, whether abstraction is
  available yet, what arithmetic is assumed. This is the part the adaptation
  actually needs, and it is far more stable than content.
- **A broad sketch of content areas**, at the grain of "fracciones, decimales,
  proporcionalidad" — never a list of learning outcomes.
- **Nothing at all for FP, educación especial or adults**, where the year does not
  predict content and pretending otherwise would be the worst kind of wrong.

### The three things that make this dangerous, named

**1 · Seventeen autonomous communities.** Spain sets *enseñanzas mínimas* at state
level and each community develops its own curriculum on top. A file claiming to
say what is taught in 5.º de Primaria is claiming something that varies. So the
file says **state-level minimum, as orientation**, and says so in its own text
where a teacher reading it will see it.

**2 · Bachillerato has modalidades.** Ciencias y Tecnología, Humanidades y Ciencias
Sociales, Artes, and General are genuinely different, and a sixteen-year-old's
material depends on which. Years therefore carry an optional modality, and
Bachillerato is the only stage that uses it today.

**3 · I am generating this from general knowledge, and some of it will be wrong.**
That has to be written down rather than discovered. It ships marked as orientation
with a `last_checked` date, and it carries the same status as
`docs/axis-calibration.md` and backlog **G2**: *not closed until someone who
teaches has disagreed with it.* A corpus file that looks authoritative and was
written by a language model is exactly the failure this project's whole
architecture is arranged against.

### Why this is worth building anyway

Because the alternative is not "no orientation" — it is **the model's own
unstated assumptions about what a ten-year-old knows**, which are also generated
from general knowledge and are not written down, not dated, not reviewable and not
correctable by a teacher.

Putting them in a file makes them visible, argued-with and fixable. That is the
same argument that moved the axis descriptors out of TypeScript, and it is
stronger here because the assumptions exist either way.

### And it pays into spec 002

Composing from an objective — *"que aprenda a multiplicar con llevadas"* — needs
exactly this: where that sits, what comes before it, what a child at that point can
already do. `002` is deferred, and this is the half of its groundwork that is worth
building now because `011` needs it anyway.

## R5 · Whether these fields are a re-identification risk

**Decision: no change to the vault's posture, and the reasoning is recorded so
nobody has to redo it.**

Age plus year plus group in a small school narrows a learner considerably. But:
the profile already carries the barrier axes, which narrow further; the vault
never leaves the machine; the name map is separate and encrypted; and the handover
packet already excludes learner-scope material by construction.

What this does change is that **the output check must cover the new fields**
(FR-910). An age on a child's own worksheet is exactly the sort of leak `007`
FR-506/507 exists to stop, and adding fields to the profile without adding them to
the check is how that guarantee quietly narrows.
