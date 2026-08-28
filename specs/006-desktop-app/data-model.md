# Phase 1 — Data model

Every entity is a file the teacher can read. There is no database, and that is a
requirement rather than a simplification: FR-408 says the vault outlives the app.

## Vault

```
<vault>/
├── profiles/                    teacher-owned
│   ├── roster.yaml              organisational context, codes only
│   ├── A3/
│   │   ├── profile.yaml         axes + qualitative fields
│   │   ├── notes.md             dated history
│   │   └── adaptations.md       overlay from the official document (optional)
│   └── archive/2025-26/         closed years; retention clock running
├── material/<job>/              teacher-owned
│   ├── source/                  the teacher's own files
│   ├── ir.md                    intermediate representation
│   ├── adapted.md
│   └── report.md                what changed and why
├── output/<job>/                HTML, PDF
├── memory/                      teacher-owned
│   ├── house.md                 house style
│   ├── journal/
│   └── archive/
├── recipes-local/               local overrides, loaded after the corpus
└── .rampa/                      machine-owned — the only directory she ignores
    ├── names.enc                encrypted name map — never exported
    ├── index.md                 generated from journal front matter
    └── costs.json               usage accounting
```

**The vault layout is stable and changing it needs a migration.** It was drawn to
match the harness's local directories; the harness is gone
([ADR 0006](../../docs/decisions/0006-one-vehicle.md)) and the layout stays,
because it is a good layout, it is Obsidian-compatible, and anything already
written to a vault would be stranded by a rename.

**Directory names are English, and the interface is Spanish.** The vault is
structure, and the constitution puts structure in English so the project is usable
outside Spain; the teacher sees "Alumnos" in the application. Localising the paths
themselves was rejected: it would break handover between teachers of different
languages, and break every test and document that names a path.


Everything outside `.rampa/` is prose a person can read. Everything inside it is
machinery, and it is the only directory the teacher is told to ignore.

## Entities

### Learner (`profiles/<CODE>/profile.yaml`)

Front matter carries the axes; the body is prose.

| Field | Type | Notes |
|---|---|---|
| `code` | string | Generated, never chosen (FR-421). Not initials |
| `axes.<AXIS>` | 0–3 or null | Ten axes per `docs/axis-calibration.md`. **`null` is not `0`** |
| `axes_confirmed` | date map | Per-axis `last_confirmed`, for handover staleness (`004` FR-303) |
| `works` | list | Supports known to work. Overrides recipe defaults |
| `avoid` | list | Triggers |
| `interests` | list | |
| `response` | map | Preferred response format, per subject if it varies |
| `language` | map | Instruction language, L1, sign language |

No name. No diagnosis field exists, so none can be filled in (Principle V).

### Roster (`profiles/roster.yaml`)

The only file holding organisational context, and therefore the most sensitive
file in the vault after the name map.

| Field | Notes |
|---|---|
| `academic_year` | `"2026-27"`. Structural: drives archiving, retention, handover |
| `setting` | The teacher's own alias — `centro-1`, never the school's name |
| `learners[].code` | |
| `learners[].stage`, `year_group`, `group` | Context enough to find a learner, not enough to name one |
| `learners[].status` | `active` · `archived` · `forgotten` |

### Name map (`.rampa/names.enc`)

`code → name`, encrypted at rest. **Excluded from every export path**: handover,
share, backup-for-sharing. Present in a full local backup because it lives in the
vault. Losing it costs display names only.

### IR document (`material/<job>/ir.md`)

Per `docs/ir.md`. `extraction.verified` gates adaptation. Injection notices from
`007` attach here as block-level annotations so they survive to review.

### Adapted IR (`adapted.md`)

Same format plus provenance: `data-from`, `data-recipe` (as `id@version`),
`data-axis`. **A block with none of these and not marked `.scaffold` fails the
job** — the traceability rule doubling as the injection detector.

### Journal entry (`memory/journal/<date>-<slug>.md`)

`fecha`, `recetas[]`, `ambito` (learner · practice · corpus), `alumno` when
learner-scoped, `estado`. Pattern, never passage.

### House style (`memory/house.md`)

Prose. Bounded by convention, not by schema — consolidation warns when it stops
being a style guide and becomes a log.

### Job cost (`.rampa/costs.json`)

Per job: tokens in and out, provider, model, computed cents. Aggregated per
month. Never leaves the machine.

## Relationships

```
roster ──1:N──> learner ──1:N──> job ──1:1──> IR ──1:1──> adapted IR ──1:N──> output
   │                │                                          │
   │                └──> notes, overlay                         └──> report
   └──> archive/<year>/                                   journal ──> index
```

## Validation and repair

Every read follows R3: parse, repair, report, never reject. Validation rules that
matter:

- An axis is `0–3` or absent. **A missing axis is never coerced to `0`** — that
  silently disables recipes and is a real safety issue, not a nicety.
- A learner code must match the generated pattern; a hand-written code that looks
  like initials is flagged to the teacher.
- `profiles/roster.yaml` must contain no free-text field long enough to hold a name; the
  app warns rather than blocks.
- An adapted block without provenance fails the job (`007` FR-512).

## State transitions

**Learner**: `active` → `archived` (year closes) → `forgotten` (erasure, `003`
FR-215). Erasure removes files; the roster keeps a tombstone with the code and a
date and nothing else.

**Job**: `ingested` → `verified` (human, gates everything downstream) →
`adaptado` → `renderizado` → `firmado` (human). The draft mark clears on the last
transition only, and only the shell can perform it (`007` FR-509).
