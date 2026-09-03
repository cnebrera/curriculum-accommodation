# Contract — a normative corpus in the corpus

What a file in `instructions/normative/` (or in a vault's `normative/`) must contain,
and what the application promises to do with it. **Written for whoever writes the
Galician one** — SC-2705 is a PT producing a working corpus without touching code, and
this document is the whole interface she gets.

It deliberately mirrors
[`specs/011-quien-alumno-edad/contracts/education-model.md`](../../011-quien-alumno-edad/contracts/education-model.md):
same review discipline, same parsing posture, same portability promise.

## The shape

One Markdown file. Front matter carries what code consumes; the prose below it travels
to the model as reading material and is yours to write in your territory's own words.

```yaml
---
id: es-an                 # stable, namespaced by convention (country-territory). The selection key.
label: Andalucía          # what the teacher reads in the picker and in the provenance line
territory: "España — Andalucía"   # informative; never used for matching
last_checked: "2026-08-30"        # the day you read the authority's pages, not the day you edited
reviewed_by_teacher: false        # see below
# reviewed_by: ""   reviewed_on: ""   — filled only when true, per FR-2706

register: Séneca          # the platform of record, used inside phrases

documents:                # the document types your territory names
  - id: acns
    label: Adaptación curricular no significativa (ACNS)
    touches_objectives: false
    roles: "La coordina el tutor o la tutora; la propuesta curricular la completa el profesorado del área."
    sections:             # the acns_sections shape of guide.md, per document type
      - id: datos
        label: Datos del alumno y del área
        sourceable: full
        from: El perfil y el curso. Sin el nombre.
      # …
  - id: acs
    label: Adaptación curricular significativa (ACS)
    touches_objectives: true      # routes it to the ACS locks — which you cannot loosen
    prerequisites: "Una evaluación psicopedagógica previa."
    roles: "La redacta el PT, con el profesorado del área, asesorado por Orientación."
    sections: []

phrases:                  # the sentences that get PRINTED — write them as your normativa says them
  not-filed: >
    Esto no está presentado. El registro es Séneca: esto es material para llevar allí.
  name-line: >
    El nombre lo pones tú en Séneca — yo no lo guardo.
  authorship-footer: >
    …

clinical_terms_extra: []  # terms YOUR territory's documents use that guide.md's list lacks.
                          # Additions only — nothing can be removed from the base list.
---

# (prose: the two-documents explanation, thresholds, procedure — in your words)
```

## What the author promises

1. **Write what your territory actually says**, with `last_checked` set to the day you
   read the authority's own pages. A corpus is orientation vocabulary, not legal advice,
   and nothing in this format can make it more than that.
2. **`reviewed_by_teacher: false` until a practising teacher in that territory has
   disagreed with something concrete.** Not read it — disagreed. The education contract
   learned this from `docs/axis-calibration.md`, and a normativa file with unearned
   authority is worse than the education file's version of the same failure: it gets
   printed into official documents.
3. **`clinical_terms_extra` only adds.** Your documents will use clinical words the base
   list does not know; list them so they stay out of the vault.
4. **`sourceable` is honest.** `none` means Rampa names the section as missing rather
   than filling it plausibly. Marking a judgement section `full` does not make Rampa
   able to source it — it makes the draft lie.
5. **No learner, no person, no school.** A corpus is a fact about a territory.

## What the application promises the author

1. **No code change is needed.** A well-formed file is offered in Configuración; a file
   in the vault's `normative/` is offered after the import flow.
2. **The whole file travels** — the prose is read by the model, not just the front
   matter (Principle I: the text sent is the text you can edit).
3. **A malformed document type degrades**, logged, never fatal; a file with no usable
   `id`/`label` is simply not offered. Unknown fields are preserved.
4. **Provenance is printed.** Every document drafted under your corpus names it, its
   origin and its review status, in the document itself (FR-2705/2706). An edit makes it
   «modificado por ti»; that is visibility, not punishment.
5. **An imported file is shown entire before activation, scanned as untrusted content,
   and refused by default when instruction-shaped content is found** (FR-2707/2708).
   Nothing is ever silently removed from your file.
6. **Deleting or deselecting your corpus falls back to generic mode with a notice** —
   never to a different corpus (FR-2711). Documents already signed keep what they were
   signed under (FR-2710).

## The one thing that is not negotiable

**The hard rules outrank every corpus** (FR-2709, `instructions/hard-rules.md`). This is
structural before it is policy: there is **no field in this contract that reaches any
guard** — no slot for exam rules, the draft mark, redaction, the clinical base list or
the ACS refusal. A corpus that *says* an exam may be made easier has said something the
application cannot act on; the conflict is reported to the teacher at import, and the
content stays inert. If a future field would give a corpus that reach, the field is
wrong, not the rule.

## Adding a territory

1. Copy `es-an.md`. Keep the structure, replace the content — the labels, the roles, the
   register, the sections and the phrases are exactly what varies between territories.
2. Pick a stable `id` that will not collide (`es-md`, `es-ct`, `pt-01`…). Selection is
   by id, never by territory string — two files may both say «Madrid».
3. Run the app's tests: the normative tests read the **shipped** files, so a new bundled
   corpus is checked by the same suite that checks `es-an`. An imported one is checked
   by the import scan.
4. Find a teacher who works under that normativa and get her to disagree with something.
   Then, and only then, `reviewed_by_teacher: true` with who and when.
