# Data model

Two types in memory, one new vault directory, one new profile field. Origin is derived,
never stored (research R5), and the contract has no field that maps to a guard
(research R1) — both absences are the design.

## `NormativeCorpus` — one parsed corpus file

```ts
export interface NormativeDocumentSection {
  id: string;
  label: string;
  /** Can Rampa source it from what it has? The `acns_sections` shape, generalised. */
  sourceable: 'full' | 'partial' | 'none';
  /** Where it comes from, or why it cannot be sourced. Shown to her verbatim. */
  from: string;
}

export interface NormativeDocumentType {
  id: string;                    // 'acns', 'acs' — stable within the corpus
  label: string;                 // what she reads and what the draft is titled
  /** Does this document modify objectives/criteria? Routes it to the ACS locks. */
  touchesObjectives: boolean;
  /** Who authors/coordinates/advises — printed, per 017 FR-1504. */
  roles: string;
  /** What must exist first («evaluación psicopedagógica previa»), or nothing. */
  prerequisites?: string;
  sections: NormativeDocumentSection[];
}

export interface NormativeCorpus {
  id: string;                    // 'es-an' — the selection key, never the territory string
  label: string;                 // 'Andalucía'
  territory?: string;            // informative only
  lastChecked?: string;
  /** The education-file pattern, extended per FR-2706. */
  review: { reviewed: boolean; by?: string; on?: string };
  /** The platform of record («Séneca»), used inside `phrases`. */
  register?: string;
  documents: NormativeDocumentType[];
  /** The printed normative sentences: 'not-filed', 'name-line', 'authorship-footer'… */
  phrases: Record<string, string>;
  /** Territory-specific *additions* to the clinical filter. Additions only. */
  clinicalTermsExtra: string[];
  /** The whole raw file — what actually travels to the model (Principle I). */
  raw: string;
}
```

**Parsing is repair-not-reject for bundled files** (`011` FR-907's rule: a broken
document type is dropped, the rest loads, logged) — but a file that yields no `id` or no
`label` is not offered at all, like a malformed education system. Unknown fields are
preserved so a newer corpus runs on an older build.

## `ResolvedNormative` — the answer to «which normativa, and how do I say so?»

```ts
export type ResolvedNormative =
  | {
      of: 'corpus';
      corpus: NormativeCorpus;
      /** Derived from where the file was read and the activation hash — research R5. */
      origin: 'bundled' | 'subido' | 'modificado';
      /** Which rung of the precedence chose it. The report says so when it was the learner's. */
      via: 'learner' | 'configuracion';
      /** «siguiendo el corpus normativo: Madrid (subido por ti, sin revisar)» — built here,
          once, so no caller composes its own and drifts (FR-2705/2706). */
      provenanceLine: string;
    }
  | {
      of: 'generic';
      /** Why generic: nothing selected, the learner forced it, or the selected corpus is
          missing — the last one carries the FR-2711 notice, never a silent substitute. */
      because: 'nothing-selected' | 'learner-override' | 'selected-missing';
      provenanceLine: string;   // the generic statement + the orientador pointer (FR-2703)
    };
```

**Rules:**

- **Precedence is `learner ▸ configuración ▸ generic`** (FR-2702), the `024` FR-2215
  chain. A learner's `normative_corpus: none` forces generic for that learner — the
  cross-territory schooling case.
- **`selected-missing` is a notice, not a fallback to another corpus** (FR-2711). The
  resolver never picks a file she did not pick.
- **`provenanceLine` is composed in the resolver and nowhere else.** Every drafted
  document and report prints it (FR-2705); an unreviewed or modified corpus can never
  print as reviewed because the line is built from `review` + `origin` in one place
  (FR-2706).

## The selection, and the activation log — `normative/selection.md` (vault)

Front matter only; the body is hers to annotate.

```yaml
selected: es-an          # a corpus id, or absent = generic
activations:
  - corpus: madrid-claudia
    on: "2026-09-10"
    content_sha256: "…"      # what was activated; a later mismatch = «modificado por ti»
    findings: 2              # what the scan showed her (quotes live in the scan output she saw)
    overridden: true         # activation despite findings is hers, and recorded (FR-2708)
```

- **The hash is the only stored derivative**, and it exists because the alternative is
  worse: without it, «modificado por ti» would need a second stored copy of the file —
  the two-copies defect — or would be undetectable.
- An activation with `findings > 0` and `overridden` absent is a corrupt state the
  loader treats as **not activated**: refuse-don't-repair.

## The profile field

```yaml
# profiles/<code>/profile.yaml — one optional field, beside 018's pictogram overrides
normative_corpus: es-an   # a corpus id, or 'none' to force generic; absent = follow Configuración
```

Parsed in `vault/schema.ts`; absent means absent, never defaulted. It never appears in
learner-facing output — the existing output check extends to it (`011` FR-910's rule).

## What deliberately gains no field

| | Why |
|---|---|
| Any field mapping to a guard (recipes, exam rules, draft mark, redaction, decline) | **FR-2709 as structure.** A corpus with no slot to weaken a guard through cannot weaken it; the scan then only has to *report* the attempt, not defeat it |
| `origin:` in the corpus file | A stored copy of what the filesystem says; it lies the moment the file is copied (research R5) |
| A `generic.md` corpus file | Generic is the absence of a corpus (research R3): a deletable, importable, spoofable generic breaks FR-2711 and FR-2703 |
| Teacher identity on import | Provenance says «subido por ti» and no more (spec edge case). No name, no machine id |
| Anything about a learner | A corpus is a fact about a territory. The clinical filter and the output checks apply to what it produces like anything else |
| Legal-validity flag | A corpus is orientation vocabulary, not legal advice. `review` says who disagreed and when; nothing in the format can claim more |

## What changes on disk, in one table

| Path | Change |
|---|---|
| `instructions/normative/es-an.md` | New — the extracted Andalusian corpus |
| `instructions/normative/README.md` | New — points at the contract; states hard rules outrank every corpus |
| `instructions/guide.md`, `instructions/acs.md` | Rewritten generic; lose `acns_sections` and every Séneca/8-3-2017 mention; keep clinical base list, decline, `proposal_phrases`; gain the generic scaffold and provenance/disclaimer templates |
| `<vault>/normative/*.md` | Her imported corpora |
| `<vault>/normative/selection.md` | Selection + activation log |
| `profiles/<code>/profile.yaml` | Optional `normative_corpus` |
| Signed documents | **Nothing.** A selection change writes no existing file (FR-2710); a document's provenance line is already inside it |
