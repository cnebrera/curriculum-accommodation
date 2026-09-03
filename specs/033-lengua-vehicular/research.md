# Phase 0 · Research

Four questions. R3 is the one where the spec's assumption met the code and lost a
piece: ARASAAC the *service* carries many languages, but the set on her disk carries
only the languages she downloaded, and the publisher declaration in the corpus names
seven — none of them Arabic or Ukrainian. The feature's honesty story (FR-3106) turns
out to be its week-one story too.

---

## R1 · What shape does the mark take in the profile?

**Decision**: an optional `vehicular` block in `profile.yaml`, **beside the axes and
not inside them**, following the precedent `pictograms` set in
`app/packages/core/src/vault/schema.ts`:

```yaml
vehicular:
  intensity: 2          # 0-3, the axes' own grammar
  languages: [ar]       # languages she recorded him as knowing. Optional
  noted_on: 2026-09-03  # when she noted or last changed it. Real, never derived
```

**Rationale**: the mark has semantics no axis has — it is *expected to expire*. An
axis describes a stable functional barrier; putting the mark in the `axes` record
would make it the eleventh member of `AXES`, selectable by every future axis-keyed
mechanism, exportable as a barrier, and read by `docs/axis-calibration.md`'s
machinery as if it were one. That is the falsified-profile workaround (LIN:3 on a
child who simply does not know Spanish) rebuilt with a new name. The schema already
holds one profile fact that is not an axis and carries its own decision semantics:
`pictograms`, with its `decided_on` date. The mark is the same shape of thing —
state that is hers, dated, beside the axes.

**Intensity follows the 0–3 grammar** because the teacher already knows it, the
recipes' condition parser already speaks it, and US2's «supports thin out» needs
ordered levels. **0 is an observation, not a deletion** (US2 scenario 2): the block
stays, with its real date, and no recipe keyed `vehicular>=1` fires. Absent block
means *not observed* — the same null-vs-zero rule as the axes, and for the same
safety reason.

**Dates are real (P44)**: `noted_on` is the date she saved the observation or the
change, written by the editor at save time — never a fabricated «observed» marker.
The history of changes lives where all profile history lives: `notes.md`, dated.

**Known languages are codes** (the 2–3 letter codes the pictogram metadata files
use: `pictograms.<lang>.json`), because the bridge lookup joins on them (R3). The
interface shows her language names, never codes — rule 7 of AGENTS.md.

**Alternatives considered**: an eleventh axis in `AXES` — rejected above. Reusing
the existing `language:` record (`language.l1`) — rejected: that record is
free-text-per-key qualitative data with no intensity, no date, and no schema; the
mark needs all three, and overloading a field that `docs/profile-schema.md`
documents as «Language of instruction; L1 if different; sign language» would make
one key mean two things. The `language:` record stays what it is.

---

## R2 · How does a recipe activate on the mark and not on an axis?

**Decision**: a new front-matter key, `marks:`, parsed with the same condition
grammar as `axes:`, and three small changes in
`app/packages/core/src/recipes/index.ts`:

```yaml
---
id: vocabulario-clave-con-puente
version: 1
axes: []
marks: [vehicular>=2]
scope: [instruction, exercise, assessment]
...
---
```

1. `parseRecipe` reads `marks:` into `MarkCondition[]` (same `>=|<=|=` grammar,
   levels 0–3, mark names from a known list — today just `vehicular`).
2. `applies(r, p)` holds when **every axis condition and every mark condition**
   holds. A mark condition reads `profile.vehicular?.intensity`, with absent
   meaning `null`, never 0 — the axes' own rule.
3. `isGuard(r)` becomes `r.axes.length === 0 && r.marks.length === 0`. Without
   this, a vehicular recipe with `axes: []` would be classed a guard — never
   droppable in conflict resolution and treated as always-applying, both wrong.

`selectRecipes`'s signature does not change: the profile it already receives
carries the mark. Which recipes apply is orchestration, so this is `app/` work;
*what the recipes say* stays corpus (Principle I). `scripts/validate-recipes.sh`
gains the `marks:` grammar — a deterministic script change, no model.

**Why this closes this case's instance of P1's empty-selection stop**: P1 decided
the job stops before calling when selection is empty. A profile with only the mark
would today select nothing — exactly the anemic-adaptation trap (P15) PROD-07
described. With mark-keyed recipes, that profile selects the vehicular recipes, so
the selection is non-empty and the stop never triggers for this case. The stop
itself (P1's own work) is untouched. The recipes are **mono-condition**, per P1's
decision to keep AND and write the missing single-condition recipes — corpus work,
not a change to the AND.

**Alternatives considered**: overloading `axes:` with a pseudo-axis `VEH>=1` —
rejected: it re-enters the axis machinery R1 just kept the mark out of, and
`parseAxisCondition` guards on membership of `AXES` precisely so conditions cannot
name things that are not axes. A separate `selectVehicularRecipes()` path —
rejected: two selection functions is two places for conflict resolution to
disagree, and the edge case «mark + a real axis» (an L2 learner with TDAH) needs
one resolver seeing both sets.

---

## R3 · What languages does the downloaded ARASAAC metadata actually carry?

**Finding, checked in the code rather than assumed**: the local set is **one
metadata file per language** — `readSet` in
`app/packages/core/src/pictograms/set.ts` matches `pictograms.<lang>.json`
(`/^pictograms\.([a-z]{2,3})\.json$/`) and builds `byLanguage: Map<lang, Map<keyword,
ids>>`. The download (`app/packages/shell/src/pictograms/download.ts`) fetches **one
language per run** from the publisher's indexed endpoint, and **refuses a language
the publisher does not declare**: `if (!args.publisher.languages.includes(language))
throw RampaError('pictogram-language', …)`.

The publisher declaration lives in the corpus, `instructions/pictograms.md`:

```yaml
languages: [es, en, ca, gl, eu, fr, pt]
```

So today: **no Arabic, no Ukrainian, no Romanian** — the three most common
late-incorporation bridge languages are not downloadable, whatever ARASAAC's API
actually serves. And a teacher who ran `024` downloaded **Spanish only**, so even
`en` glosses need a second metadata download.

**Decision, in three parts**:

1. **The bridge is the pictogram id.** The same id appears in every language's
   metadata file, so a Spanish keyword resolves to ids (the existing matching),
   and the ids' keywords in the bridge language's map are the gloss. Deterministic,
   pure, `packages/core` — a new module beside `set.ts`, no model, no network.
   This is the only gloss source v1 defines (FR-3106); anything further (word
   lists per language pair) is corpus growth, per the spec's assumption.
2. **Extending `languages:` is a corpus edit, gated on verification.** The file's
   own convention is «Comprobado el <date>» against the live API; adding `ar`,
   `uk`, `ro` (or any language) requires that check at implementation time, not a
   guess here. If ARASAAC does not serve a language, it is simply not offerable —
   which the degradation path (R4) already handles.
3. **Fetching a bridge language's metadata reuses `024`'s flow** — her click, the
   licence she already accepted, one language per run, images deduplicated by id
   (they are language-neutral drawings; most are already on disk). No new
   download machinery.

**What this does to Amina's week one, honestly**: until `ar` is verified against
the publisher and downloaded, her supports are **visual-only with the report
saying so** — which is the exact degradation FR-3106 requires anyway. The plan
does not promise Arabic glosses on day one; it promises no *invented* Arabic ever.

**Alternatives considered**: bundling a word list — rejected: Rampa bundles no
pictogram-set data (018 FR-1601, licence incompatibility) and a hand-made bilingual
word list is pedagogical content nobody here is qualified to write (the same
«needs a person» honesty as `011`'s curriculum codes). Asking the model to
translate the vocabulary — rejected outright: that is the fabrication risk the
spec names; the model inventing Arabic it was not asked to verify is how a wrong
word reaches a child whose teacher cannot check it.

---

## R4 · How does the degradation to visual-only work, and where does the report say it?

**Decision**: the gloss lookup returns **glosses plus a named absence**, and both
travel.

- The deterministic lookup (R3's module) produces, for a document's key vocabulary
  and the profile's known languages: the glosses it could resolve, and a reason
  when it could not — `no-set`, `language-not-in-set`, `word-has-no-entry`. Named,
  not collapsed, following `SetProblem`'s pattern in `set.ts`.
- The prompt carries **only the resolved glosses**, as data in their own section,
  with the recipe text stating glosses come only from that list. No glosses
  resolved → no gloss section at all — the «no fields means no section» rule from
  `buildAdaptPrompt`, because an empty section invites the model to fill it, which
  is precisely the invented-gloss failure.
- The report (`buildReport`) prints the degradation in her words: which language
  was asked for, that no bridge exists for it, and that supports were applied
  visual-only. That line is what makes SC-3103 checkable: zero glosses in output
  whose bridge language is not in the profile **and** zero silent degradations.

**One boundary kept deliberately**: the visual support recipe does **not** enable
pictograms. `instructions/pictograms.md` is explicit — «Nunca: activar esta familia
desde un eje del perfil» — and `018` made enablement a recorded human decision
(`pictograms.decided_on`, SC-1603). The mark is not an axis, but the reason holds
identically: a sheet covered in pictograms marks the child out, and that trade-off
is hers. So the vehicular recipes ask for visual support in wording and structure,
use the pictogram layer **where she has enabled it**, and the profile screen can
*suggest* enabling pictograms when the mark is set — a suggestion, her click.

**Alternatives considered**: failing the adaptation when no bridge exists —
rejected: visual support and transitional wording are most of the value, and
refusing them because glosses are unavailable is the anemic-adaptation trap with
extra steps. Letting the model note the missing bridge — rejected: the degradation
is a deterministic fact the code knows before the model is called; asking the model
to report it is a structural defence weakened into an instruction (hard rule 5 of
AGENTS.md).
