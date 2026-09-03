# Data model

One new block in the profile, one new condition list on recipes, one value type for
glosses. The finding that shapes it: **the mark is not an axis and never enters
`AXES`** — it lives beside them with its own transitory semantics (research R1).

## The `vehicular` block — beside the axes, like `pictograms`

In `app/packages/core/src/vault/schema.ts`, on `profileSchema`:

```ts
vehicular: z.object({
  /** 0-3, the axes' grammar. 0 is an observation («follows the classroom's
   *  language now»), not a deletion — the block stays, dated. */
  intensity: axisLevel,
  /** Languages she recorded him as knowing, as the set's metadata codes
   *  (`pictograms.<lang>.json`). Optional; empty means none recorded. */
  languages: z.array(z.string()).default([]),
  /** When she noted or last changed the mark. Written by the editor at save
   *  time — a real annotation date, never derived or backfilled (P44). */
  noted_on: yamlDate,
}).optional(),
```

### Rules

**Absent means not observed, 0 means observed and over.** The axes' null-vs-zero
rule, kept exactly: an absent block activates nothing and asserts nothing; a block
at intensity 0 is her statement that the barrier has expired, with the date she
made it. History stays in `notes.md`, where all profile history lives.

**Languages come only from her.** The schema has no country, no origin, no
nationality, no default. FR-3102's tripwire test asserts — behaviourally and by
structural grep — that no code path derives a language from any other datum.

**Codes in the vault, names on screen.** The vault stores metadata codes so the
gloss lookup joins without a mapping table; the interface shows «árabe», never
`ar`, per AGENTS.md rule 7.

**Repair semantics like everything else.** A malformed block is set aside in
`_unparsed` and reported, never dropped, never coerced — `validateWithRepair`
already does this for free.

## `MarkCondition` — how a recipe names the mark

In `app/packages/core/src/recipes/index.ts`, beside `AxisCondition`:

```ts
export interface MarkCondition { mark: 'vehicular'; op: '>=' | '<=' | '='; level: number; }
```

Recipe front matter gains an optional `marks:` list with the axes' condition
grammar:

```yaml
axes: []
marks: [vehicular>=1]
```

Three semantics changes, and only these:

- `applies(r, p)` — every axis condition **and** every mark condition must hold.
  An absent block is `null` for every mark condition, so it fails them — never a 0.
- `isGuard(r)` — `axes.length === 0 && marks.length === 0`. A vehicular recipe is
  an adaptation, not a guard; classing it as a guard would make it undropppable in
  conflicts and always-applying, both wrong.
- `parseRecipe` reads `marks:`; unknown mark names are rejected like unknown axes.

`selectRecipes`'s signature, the conflict resolver and the scope filter are
untouched: the profile it already receives carries the mark, and the edge case
«mark + a real axis» resolves in the one resolver that sees both condition kinds.

## `BridgeGloss` — a gloss the code resolved, never the model

In `app/packages/core/src/pictograms/bridge.ts` (new, pure, no model, no network):

```ts
export interface BridgeGloss {
  /** The vocabulary word, in the material's language. */
  word: string;
  /** What the bridge language's metadata says for the same pictogram id. */
  gloss: string;
  /** The id that joins them — the bridge itself. */
  pictogramId: string;
  /** The bridge language, from the profile. */
  language: string;
}

/** Why a word or a whole language produced no gloss. Named, never collapsed —
 *  the `SetProblem` pattern from set.ts. */
export type BridgeAbsence =
  | { kind: 'no-set' }
  | { kind: 'language-not-in-set'; language: string }
  | { kind: 'word-has-no-entry'; word: string; language: string };
```

The prompt receives **only resolved glosses**, as data. No glosses → no gloss
section at all (the no-fields-no-section rule from `buildAdaptPrompt`). Every
`BridgeAbsence` that degraded support to visual-only reaches the report in her
words (FR-3106) — a deterministic fact the code states, never a judgement
delegated to the model.

## The report's attribution (FR-3108)

`buildReport` groups changes whose recipe carries mark conditions under their own
heading — transitional supports for the classroom's language — distinguishable
from disability-driven adaptations. No new stored data: the recipe's parsed
`marks` list is already in memory at report time, and `data-recipe: id@version`
traceability is unchanged.

## What deliberately gains no field

| | Why |
|---|---|
| An eleventh entry in `AXES` | The mark is not a barrier axis; entering `AXES` would feed it to every axis-keyed mechanism and make the falsified-profile workaround structural (research R1) |
| Country, origin or nationality on the profile | Not needed for any adaptation, and its only imaginable use — inferring a language — is exactly what FR-3102 forbids |
| A default for `languages` | A guessed language is acted on: a gloss in a language nobody checked reaches a child whose teacher cannot verify it |
| `pictograms.enabled` flipped by the mark | `018` SC-1603: no profile enables pictograms without a recorded human decision, and «Nunca: activar esta familia desde un eje del perfil» holds for the mark for the same reason |
| A stored copy of resolved glosses | Recomputed per run from the set's metadata — a cache is a second copy that goes stale when she downloads or replaces the set |
| An expiry date or auto-decay on the mark | Transitoriness is *observed*, not scheduled. The tool lowering a mark by calendar would be deciding what only she can see in the classroom |
