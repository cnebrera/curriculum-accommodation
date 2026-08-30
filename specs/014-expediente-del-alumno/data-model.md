# Data model: the learner's record

## Nothing new on disk that the application reads

```
material/<job>/ir.md              the extraction        ← already there
material/<job>/source/            what she brought      ← already there
material/<job>/<code>/adapted.md  the adaptation        ← already there
material/<job>/<code>/adapted.rN.md   revisions         ← already there
material/<job>/<code>/report.md   the report            ← already there
output/<job>/<code>/              what she prints       ← already there
profiles/<code>/record.md         NEW — written, never read
```

Every column of every row comes from files that already exist. That is the whole
design: `005` writes them, `014` reads them back the other way round.

## The entry

```ts
interface RecordEntry {
  jobId: string;
  learner: string;              // the code; the name is resolved for display only
  date: string;                 // ISO, from the adapted document's front matter
  schoolYear: string;           // e.g. "2025-2026"
  kind: MaterialKind | 'material';   // 012; 'material' until 012 ships
  subject?: string;
  objectives?: string[];        // 002
  signedOff: boolean;           // VII — an unsigned draft appears, marked
  revision: number;

  source:
    | { of: 'file';       paths: string[] }     // photograph, PDF, Word
    | { of: 'pasted' }                          // the IR *is* what she gave
    | { of: 'composed';   objectives: string[]; anchor?: string };

  documents: {
    ir: string;                 // material/<job>/ir.md
    adapted: string;
    report?: string;
    revisions: string[];
    rendered: string[];         // output/<job>/<code>/*
  };

  /** Paths in `documents` that are not on disk (FR-1206). */
  missing: string[];
}
```

**`missing` is a field rather than a filter.** A record that silently drops rows
whose files it cannot find would tidy away her history to keep its own list
clean — which is the opposite of what she opens it for.

## Where each field comes from

| field | derived from |
|---|---|
| `date`, `schoolYear`, `kind`, `subject` | the adapted document's front matter |
| `signedOff` | the same document's `review.signed_off` — the same source `job:isSignedOff` uses, so the record and the sheet can never disagree |
| `revision` | the highest `adapted.rN.md` present |
| `source.of` | `material/<job>/source/` exists → `file`; else the IR's own `source:` front matter |
| `missing` | `stat` on each path |

Nothing is derived from `record.md`. FR-1213.

## The school year

Recorded on the adapted document at the moment it is written, defaulting to one
derived from the date. The boundary rule (September–June in Spain) lives in the
education corpus of `011`, not in code — it is wrong in the southern hemisphere
and in several systems Rampa will meet.

Stored rather than computed at read time, so a record built next August still
says a sheet made in May belonged to 2025-2026.

## `record.md`

Plain Markdown, relative links, regenerated whole. Written when the work changes
— a job completing, a sign-off, an erasure — and never on opening a screen, so a
synced vault does not generate conflicts from being read (FR-1215).

```markdown
# Lo que he preparado para E38

*Generado por Rampa. Si lo borras, se vuelve a escribir solo.*

## 2025-2026

### 12/05/2026 · Ficha · Naturales
- [La ficha adaptada](../../material/job-20260512T101500/E38/adapted.md) — **sin firmar**
- [Lo que traje](../../material/job-20260512T101500/source/)
- [Lo que leyó Rampa](../../material/job-20260512T101500/ir.md)
```

The name is **not** in it: the file lives at `profiles/<code>/` and is keyed by
code, because a plaintext file carrying names would be a second copy of the name
map without its encryption (FR-1207).
