# Phase 1 — Data model

Three entities. Two are new; the third is `006`'s job record gaining a field it
was always going to need.

## Extracted page (what the model returns, per call)

The wire format. Validated before anything is built from it (FR-602, FR-615), and
never stored in this shape — the IR is what persists.

```json
{
  "page": 1,
  "quality": "good",
  "sheets": 1,
  "blocks": [
    { "id": "b1", "class": "heading", "text": "Los ecosistemas" },
    { "id": "b2", "class": "instruction", "text": "Lee el texto y responde." },
    { "id": "b3", "class": "exercise", "number": "3", "text": "¿Qué come el búho?" },
    { "id": "b4", "class": "aside", "text": "Recuerda: [UNREADABLE: palabra borrosa]" },
    { "id": "b5", "class": "figure", "role": "informative",
      "short": "Un búho en una rama.",
      "long": "Un búho posado en una rama seca, de noche, con la luna detrás." }
  ],
  "notes": ["Hay texto de la plataforma alrededor de la ficha; lo he ignorado."]
}
```

| Field | Type | Notes |
|---|---|---|
| `page` | int | 1-based, as the teacher counts |
| `quality` | `good` \| `poor` \| `unusable` | `unusable` rejects the page with advice, never a bad extraction |
| `sheets` | int | >1 means two worksheets in one photo — flagged, never split by the model |
| `blocks[].id` | string | Unique within the page. Code checks, not the model |
| `blocks[].class` | enum | `heading` `paragraph` `instruction` `exercise` `aside` `figure` `table` `caption` |
| `blocks[].number` | string \| absent | The printed number, **verbatim**. `"3"`, `"3.a"`, `"b)"` — never renumbered |
| `blocks[].text` | string | `[UNREADABLE: …]` in place for anything not legible |
| `blocks[].role` | `decorative` \| `informative` \| `essential` | `figure` only |
| `blocks[].short` / `long` | string | `figure` only. Both required for non-decorative |
| `notes[]` | string[] | What the model chose to ignore or could not decide. Surfaced, never silent |

### Validation, in code

Rejection is per page and drives the retry (FR-603). Every rule below is a code
rule, because a model asked to check its own output is one model call, not two.

- Schema mismatch → reject.
- Duplicate `id` within a page → reject.
- `figure` with a role other than `decorative` and a missing `short` or `long` →
  reject. A figure with no description is the accessibility failure the whole
  project exists to prevent, arriving through its own pipeline.
- `exercise` numbers, read in order, not monotone → **flag, do not reject.** A
  worksheet may genuinely restart numbering per section, and rejecting that
  discards a good extraction. Monotonicity is evidence, not a rule.
- `quality: unusable` → not a rejection: a *stop*, with advice to the teacher.
  Retrying a dark photograph produces a second bad extraction and a second bill.
- Any `[UNREADABLE` marker → accept, and carry it to the front of verification.
  Flagging is the correct behaviour, so it must never look like failure.

## Extraction (per job, persisted)

Written to `material/<job>/extraction.json`. The IR lives beside it as
`material/<job>/ir.md`.

| Field | Notes |
|---|---|
| `source` | `photos` \| `pdf-scanned` \| `pdf-digital` \| `docx` \| `pasted` |
| `pages[]` | `{ image, verified, problems[], attempts }` — `image` relative to the vault |
| `verified` | True only when every page's `verified` is true (FR-608) |
| `boundReached` | True when FR-612's page bound cut the job. Never silent |
| `costCents` | Accumulated per page into the job's visible cost (FR-611) |

`verified` is derived, never set directly: a single writable flag is a flag
something will eventually set for convenience, and this one gates adaptation.

## Ingest budget (corpus, `instructions/ingest.md` front matter)

```yaml
attempts_per_page: 2
pages_per_job: 20
image_long_edge: 1600
image_quality: 0.82
```

Read at run time (FR-617). Missing or absurd values fall back to these, with a
log line — a corpus edit must not be able to set `attempts_per_page: 500` and
spend a teacher's money.

## Settings (outside the vault)

| Field | Notes |
|---|---|
| `photoNameWarningAcknowledged` | FR-609. Once, per machine. Not in the vault: it is a fact about her workflow, and a handover packet must not carry it |
