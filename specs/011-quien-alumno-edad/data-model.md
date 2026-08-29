# Phase 1 — Data model

Three things: four fields on the profile, one corpus format, one settings entry.

## The profile gains four fields

`profiles/<CODE>/profile.yaml`, all optional.

| Field | Type | Notes |
|---|---|---|
| `age` | int \| absent | Years, at the start of the course. **Absent, never guessed** — the same rule as an unobserved axis, and for the same reason: a guessed age is acted on |
| `age_recorded` | date \| absent | When she wrote it. Present whenever `age` is |
| `year` | string \| absent | The year's id in the chosen system: `es:primaria-5` |
| `stage` | string \| absent | Derived from the year on save, stored so a profile is readable without the education file |

**Why `stage` is stored rather than derived on read:** the vault must be readable
without this application (`006` FR-410). A profile saying `stage: Primaria` is
legible to anyone; one saying only `year: es:primaria-5` needs the corpus to
decode, and a folder she can open is the promise this project makes about her
data.

**Why `age` and not `date_of_birth`:** a date of birth is a strong identifier, and
this project stores no learner name on disk precisely to avoid holding one. An age
that drifts by a year is a smaller problem than a DOB in a file about a child, and
`age_recorded` is what lets the application say *"esto lo anotaste hace 14 meses"*
rather than drifting silently.

### Where they must not go

`007` FR-506/507: the renderer receives axis **levels** and nothing else. These
four fields must not join that call, and `checkOutput` must reject a sheet
containing them — an age on a child's own worksheet is exactly the leak that
check exists to stop, and adding profile fields without extending it is how a
guarantee quietly narrows (FR-910).

## The education system (`instructions/education/<id>.md`)

Front matter for the machine, prose for the human. Full contract in
[contracts/education-model.md](./contracts/education-model.md).

```yaml
---
id: es
label: España
last_checked: "2026-08-29"
reviewed_by_teacher: false
stages:
  - id: primaria
    label: Primaria
    years:
      - id: primaria-5
        label: 5.º de Primaria
        typical_age: 10
        can: >
          Lee párrafos de 3-4 frases sin cansarse. Sostiene instrucciones de dos
          o tres pasos. Empieza la abstracción, y todavía se apoya en lo concreto.
        studies: "Fracciones y decimales, proporcionalidad sencilla, textos expositivos."
  - id: bachillerato
    label: Bachillerato
    modalities: [ciencias, humanidades, artes, general]
    years:
      - id: bach-1
        label: 1.º de Bachillerato
        typical_age: 16
        studies_by_modality:
          ciencias: "…"
          humanidades: "…"
  - id: especial
    label: Educación especial
    years:
      - id: especial
        label: Educación especial
        typical_age: null      # ← no typical age, and that is the point
---
```

| Field | Notes |
|---|---|
| `typical_age` | `null` where a year does not predict an age — educación especial, adults. FR-912: the application then fills **nothing** |
| `can` | What a learner at this point can typically do. **The load-bearing half**: far more stable than content and closer to what the adaptation needs |
| `studies` | A broad sketch. Never learning outcomes. Absent where the year does not predict content |
| `modalities` | Bachillerato only today. A sixteen-year-old's material depends on which (FR-915) |
| `reviewed_by_teacher` | **False until a practising teacher has disagreed with something.** Same status as `docs/axis-calibration.md` and backlog G2 |

### Validation and repair

Through the same path as the provider catalogue and the vault (`006` R3): a
malformed file degrades to "this system is not offered", logged, never fatal.

- Missing `id` or `label`, or no stages with years → the system is not offered.
- A year with no `id` or `label` → that year is dropped, the rest load.
- `typical_age` outside 3–99 → treated as absent and logged. A corpus edit must not
  be able to tell a teacher a Primaria pupil is 40.
- Unknown fields → preserved, so a newer corpus runs on an older build.

### Staleness

An education system is a fact about the world that changes — LOMLOE replaced
LOMCE, FP has been reorganised twice in a decade. Same discipline as the provider
catalogue: `last_checked`, surfaced where she chooses the system, and a CI check
before it reaches her.

**Unlike a provider entry, a stale education file is not withdrawn.** A year list
from last year is still broadly right, and removing the only system would leave
her unable to create a learner at all. It is marked, not hidden.

## Settings (outside the vault… and one that is inside)

| Where | Field | Why |
|---|---|---|
| Vault | `education_system` | **Inside**, unlike the display preferences: it is a fact about her school, it belongs with the learners it describes, and a vault handed to a colleague at the same school should carry it |

## What reaches the prompt

A new section, before the material and after the barriers:

```
## Quién es este alumno
Tiene 14 años y está en 5.º de Primaria (Primaria).

Ojo: le llevas dos años o más a la edad habitual de ese curso. El registro va
por la edad; la exigencia curricular, por el curso.

Lo que suele poder un alumno de este curso: …
Lo que se suele dar: …
Esto es orientación de los mínimos del Estado, no el currículo de tu comunidad.
Lo que tú digas manda sobre esto.
```

Three deliberate choices:

- **The divergence is stated, not left to inference** (FR-905, research R4).
  Threshold two years, because one is ordinary and a sentence that fires on most
  learners stops being read.
- **The orientation says it is orientation** (FR-914), where the model reads it
  rather than only in the file.
- **Absent fields produce no section at all** — not "edad: desconocida", which
  invites a guess.
