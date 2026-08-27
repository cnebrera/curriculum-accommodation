# Phase 1 — Data model

Every entity is a file the teacher can read. There is no database, and that is a
requirement rather than a simplification: FR-408 says the vault outlives the app.

## Vault

```
<vault>/
├── alumnos/
│   ├── roster.yaml              organisational context, codes only
│   ├── A3/
│   │   ├── perfil.md            axes + qualitative fields
│   │   ├── notas.md             dated history
│   │   └── adaptaciones.md      overlay from the official document (optional)
│   └── archivo/2025-26/         closed years; retention clock running
├── materiales/<trabajo>/
│   ├── origen/                  the teacher's source files
│   ├── ir.md                    intermediate representation
│   ├── adaptado.md              adapted IR
│   └── informe.md               what changed and why
├── salidas/<trabajo>/           HTML, PDF
├── mis-notas.md                 house style
├── diario/                      journal entries
├── recetas-propias/             local overrides, loaded after the corpus
└── .rampa/
    ├── nombres.enc              encrypted name map — never exported
    ├── indice.md                generated
    └── costes.json              usage accounting
```

Everything above `.rampa/` is prose a person can read. Everything inside it is
machinery, and it is the only directory the teacher is told to ignore.

## Entities

### Learner (`alumnos/<CODE>/perfil.md`)

Front matter carries the axes; the body is prose.

| Field | Type | Notes |
|---|---|---|
| `codigo` | string | Generated, never chosen (FR-421). Not initials |
| `ejes.<AXIS>` | 0–3 or null | Ten axes per `docs/axis-calibration.md`. **`null` is not `0`** |
| `ejes_confirmados` | date map | Per-axis `last_confirmed`, for handover staleness (`004` FR-303) |
| `funciona` | list | Supports known to work. Overrides recipe defaults |
| `evitar` | list | Triggers |
| `intereses` | list | |
| `respuesta` | map | Preferred response format, per subject if it varies |
| `idioma` | map | Instruction language, L1, sign language |

No name. No diagnosis field exists, so none can be filled in (Principle V).

### Roster (`alumnos/roster.yaml`)

The only file holding organisational context, and therefore the most sensitive
file in the vault after the name map.

| Field | Notes |
|---|---|
| `curso_escolar` | `"2026-27"`. Structural: drives archiving, retention, handover |
| `centro` | The teacher's own alias — `centro-1`, never the school's name |
| `alumnos[].codigo` | |
| `alumnos[].etapa`, `nivel`, `grupo` | Context enough to find a learner, not enough to name one |
| `alumnos[].estado` | `activo` · `archivado` · `olvidado` |

### Name map (`.rampa/nombres.enc`)

`code → name`, encrypted at rest. **Excluded from every export path**: handover,
share, backup-for-sharing. Present in a full local backup because it lives in the
vault. Losing it costs display names only.

### IR document (`materiales/<job>/ir.md`)

Per `docs/ir.md`. `extraction.verified` gates adaptation. Injection notices from
`007` attach here as block-level annotations so they survive to review.

### Adapted IR (`adaptado.md`)

Same format plus provenance: `data-from`, `data-recipe` (as `id@version`),
`data-axis`. **A block with none of these and not marked `.scaffold` fails the
job** — the traceability rule doubling as the injection detector.

### Journal entry (`diario/<date>-<slug>.md`)

`fecha`, `recetas[]`, `ambito` (learner · practice · corpus), `alumno` when
learner-scoped, `estado`. Pattern, never passage.

### House style (`mis-notas.md`)

Prose. Bounded by convention, not by schema — consolidation warns when it stops
being a style guide and becomes a log.

### Job cost (`.rampa/costes.json`)

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
- `roster.yaml` must contain no free-text field long enough to hold a name; the
  app warns rather than blocks.
- An adapted block without provenance fails the job (`007` FR-512).

## State transitions

**Learner**: `activo` → `archivado` (year closes) → `olvidado` (erasure, `003`
FR-215). Erasure removes files; the roster keeps a tombstone with the code and a
date and nothing else.

**Job**: `ingerido` → `verificado` (human, gates everything downstream) →
`adaptado` → `renderizado` → `firmado` (human). The draft mark clears on the last
transition only, and only the shell can perform it (`007` FR-509).
