# Contract — a pictogram set

What Rampa reads, and what a set has to provide to be usable. **Nothing here names
ARASAAC** (FR-1604): it is the set to design against because it is the one Spanish
schools have, and nothing depends on it.

## The layout

A directory she points Rampa at. Rampa reads it; Rampa never writes to it and never
fetches it (FR-1601).

```
<set>/
  pictograms.es.json      one file per language, named by its code
  pictograms.en.json
  2483.png                images named by id
  2484.png
  LICENSE                 optional, and shown to her when present
```

## The metadata file

```json
[
  { "id": "2483", "keywords": ["rana", "sapo"] },
  { "id": "2484", "keywords": ["rana"] }
]
```

- `id` — a string, and the only identity. It is what provenance records
  (FR-1611), so it must be stable across versions of the set. If a set renumbers,
  old sheets render a named gap (FR-1616) rather than the wrong picture.
- `keywords` — the words this picture is for, in that file's language. Several
  keywords per picture is normal and correct.
- **Anything else in the object is ignored**, so a richer set loses nothing by
  being read by this.

### The direction that matters

The map Rampa builds is **keyword → ids**, plural. Two pictures claiming «rana» is
an ambiguity, and an ambiguity produces **no pictogram** plus a report line with
the candidates (FR-1609). It is never resolved by picking the first, the
lowest-numbered, or the one whose file exists.

## A set that cannot be used

Rampa says so, naming which of these it is, rather than guessing:

| | What Rampa says |
|---|---|
| No metadata file for any language | «Esta carpeta no trae la lista de palabras, así que no puedo saber qué dibujo va con cada palabra.» |
| Metadata for a language, no images | «He encontrado la lista de palabras y ninguna imagen.» |
| Metadata that is not readable JSON | Named, with the file, and the rest of the set still loads |
| Images only, no metadata | The same as the first row. **Filenames are not metadata** — guessing «rana.png» is the wrong-pictogram failure US3 exists to prevent |

## What Rampa records in the vault

The set's **location and licence**, so a colleague who opens the folder knows what
is required (US1 scenario 3). Never a copy of the set, and never a cached index of
it: a plaintext index would be a second copy of somebody else's licensed content
living inside our vault.

## Matching

Deterministic, in this order:

1. **Her override wins** (FR-1612). Her school uses a different picture for
   «recreo»; that is not an error to be corrected.
2. **A name is never matched** (FR-1610). The name check runs first, and «Lucía»
   gets nothing even if the set has a keyword for it.
3. Normalise: lower case, accents folded, whitespace collapsed. `Rana` and `raná`
   find `rana`; nothing else is inferred — no stemming, no plural rules, no
   synonyms. A word the set does not have gets **nothing**, which is the correct
   outcome and not a gap to be closed with cleverness.
4. Exactly one id → use it. More than one → omit and report. None → omit silently;
   most words have no pictogram and reporting each would bury the ones that matter.

## What no set may cause

- **Automatic enabling.** No property of a set, and no axis value, enables this
  family (FR-1605). It is her decision per learner, recorded as hers.
- **A failed render.** A missing image, a moved set, a deleted folder: the sheet
  renders with a named gap and the provenance still says which id it wanted
  (FR-1616).
- **A silent attribution.** Any output containing a pictogram carries author,
  source and licence, and there is no setting for it (FR-1603).
