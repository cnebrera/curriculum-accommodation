# Phase 0 · Research

Five questions. R1 decides the shape and is the reason SC-3002 can be structural; R3 is
the one where a wrong answer would invent a number about a child.

---

## R1 · What does per-area CUR look like in `profile.yaml`?

**Decision**: the general value stays exactly where it is — `axes.CUR` — and the pairs
arrive as a **new optional top-level field**:

```yaml
axes:
  CUR: 2          # the general value — the same key, the same meaning as today
cur_areas:
  Matemáticas: 2
  Lengua: 0
```

Read through one helper beside `axisLevelOf`:

```
curFor(profile, area?) → cur_areas[area] ?? axes.CUR ?? null
```

An absent area falls back to the general; an absent general is `null` — **unobserved,
never zero**, the same rule `axisLevelOf` already enforces and for the same safety
reason (a guessed 0 silently asserts «no barrier»).

**Rationale — why not inside `axes`**: `validateWithRepair` repairs at the *top-level
field*. If `axes.CUR` became a map, an old app's `axisLevel` union would fail on it, the
repair would set aside **the whole `axes` field**, and every recipe for that learner
would switch off silently — the exact «silently disables adaptations» failure the
schema's own comment warns about. As a sibling field, `cur_areas` is simply unknown to an
old app: `carriedThrough` preserves it verbatim, `ProfileEditor` already spreads carried
fields back on save, and the old app behaves as the spec's packet edge case requires —
**it sees the general value**. Compatibility is not a migration; it is the absence of
one (FR-3005).

**Why keys are area names, values are plain 0–3**: the same four levels, the same
calibration in `instructions/axes.md` and `docs/axis-calibration.md`. A per-area value
with its own scale would be a second axis wearing the first one's name. The 0–3 downward
scale also leaves P9's future upward direction to a future spec, as the spec's note asks
— nothing in this shape precludes it, and nothing here builds it.

**Alternatives considered**: `axes.CUR: {general: 2, Matemáticas: 2}` — rejected above,
it detonates on every old reader. `CUR@Matemáticas: 2` inside `axes` — rejected: it
pollutes the axis record, every `AXES.map` iteration would trip over it, and it smuggles
area machinery into the structure all ten axes share, which FR-3002 exists to forbid.
A separate `cur.yaml` file — rejected: one learner, one profile file is `006` FR-410's
readable-without-tooling promise, and a second file is a second place to disagree.

---

## R2 · Where does the area vocabulary come from, and what stops «Mates» and «Matemáticas» becoming two areas?

**Decision**: suggested from **the subjects the vault already knows** — the union of the
roster's `subjects` (`rosterEntrySchema.subjects`, `012`) and the `subject` best-effort
field on the learner's record entries (`record/scan.ts:170`) — free-named beyond that,
with creation **explicit** and near-duplicates **flagged, never merged** (FR-3007).

**Rationale**: the spec's Key Entities say it outright: «a subject name as the vault
knows subjects; no new taxonomy». Both sources already exist and already mean «a subject
this teacher works with»; inventing a canonical list of Spanish school subjects would be
the taxonomy the spec refuses, wrong the week it ships, and a Principle I violation
besides (what counts as an área is judgement).

**Near-duplicate detection is deterministic and shallow**: case- and accent-insensitive
comparison plus prefix containment («Mates» / «Matemáticas»), using the same
normalisation discipline the redaction layer already applies (accents are this project's
known blind spot — found once by test, not review). When she types a name close to an
existing one the editor says so and offers the existing one; **choosing to keep her
spelling wins**, because a merge she did not ask for is the tool renaming her subjects.
Never silent in either direction.

**One caveat carried from `014`**: a record's `subject` was read out of a document
somebody else wrote — it is content (Principle IX). Suggestions built from it render as
plain text, exactly the rule `RecordScreen.tsx` already keeps for the same field.

**Alternatives considered**: a fixed enum of areas — the refused taxonomy. Silent
canonicalisation to the closest known subject — rejected: «normalisation is suggestion,
never silent merging» is the spec's own line, and a silent merge of «Lengua» into
«Lenguaje musical» is the kind of plausible-wrong this project fears most. Asking the
model to unify names — rejected without discussion (Principle II).

---

## R3 · How does the area's CUR reach level derivation — and where does a job's area come from?

**Finding first**: today a composed job has **no area at all**. `ComposeRequest` carries
learner, objectives, kind, target year — no subject. The record's `subject` comes from
ingested documents' front matter; nothing writes it for compositions. So before the
area's CUR can be consulted, the job must *have* an area.

**Decision, part 1 — the job's area**: the compose flow asks it, suggested from R2's
vocabulary, optional (a job with no area uses the general CUR — fallback, never a
refusal), and writes it to the sheet's front matter as **`subject`** — the field
`record/scan.ts` has read best-effort since `014`. An existing reader finally gains a
writer; no new field, no new taxonomy.

**Decision, part 2 — what the CUR value actually does**: it decides **whether the silent
`enrolled` fallback is honest** in `targetYear`'s chain, and it never computes a year.

| Area's effective CUR (`curFor`) | The chosen → overlay → enrolled chain |
|---|---|
| she chose, or the overlay states a year | unchanged — her input outranks everything, as today |
| 0 or 1 (at level / within the course) | `enrolled` stands, quietly — it *is* the level, by her own observation |
| 2 or 3 (contenidos de cursos anteriores / muy alejado) | `enrolled` is contradicted by her own recorded observation for **this area**, so the screen asks her the target level before composing, and `explainTarget` names the area's gap instead of today's generic «si le llevas dos cursos de desfase» |
| `null` (nobody assessed this area, no general) | unchanged — `explainTarget`'s existing enrolled sentence |

**Rationale**: CUR 2 and 3 are deliberately unquantified. Mapping «contenidos de cursos
anteriores» to `enrolled − 2` would put an invented number on a child's worksheet — the
one property of composed material «a teacher cannot check at a glance and would have no
reason to suspect» (`level.ts`'s own words). The only person who can name the level is
her, and asking is already what compose does when no course is recorded — this extends
P32's «solo se pregunta si tampoco hay curso» with its honest sibling: *or the course on
record is disproved by her own per-area observation*. P32 survives intact: she names the
course (her answer is `she-chose`), the corpus defines what it contains (FR-122), and
nothing is the application's own judgement (FR-129) — the per-area CUR is **her recorded
observation**, not an inference.

**And the tripwire**: asking is not blocking, and must never become blocking. The
question has a default path (compose at enrolled anyway, with the report naming who did
not decide), because a mandatory gate keyed on CUR ≥ 2 would be P12's condemned
profile-keyed stop reborn at finer grain (FR-3006).

**A smaller consequence for adapted (not composed) material**: `prompt/adapt.ts` sends
every axis as one line (`CUR: 2`). For a job whose `subject` is known, the effective CUR
for that area is what the line should carry — otherwise Marco's Lengua worksheet is
prompted as two courses behind, which is US1's «nothing about Lengua is treated as
delayed» failing in the prompt while succeeding in compose. Same helper, same fallback,
data not policy.

**Alternatives considered**: derive the year from CUR arithmetically — rejected above.
Store a per-area *target year* in the profile — rejected: it duplicates what the overlay
already is for the recurring case (an ACS names the level), and it is a second stored
fact that can go stale against the first. Ask the area per compose from a free text box
with no suggestions — rejected: that is how «Mates»/«Matemáticas» becomes two areas by
accident, the exact edge the spec names.

---

## R4 · How does per-area CUR travel in handover (`004`) and coordination (`030`) packets?

**Decision**: as **profile data it already is** — no packet format change. `004` sends
the profile with evidence markers and `last_confirmed` (FR-301/303); `030` sends profile
*deltas* with per-item accept/skip and provenance (FR-2801/2804/2805). `cur_areas`
entries ride both as ordinary profile facts: name-free (an area name is a subject, and
the packet's existing no-names rule and egress redaction apply to it like any string),
each pair an individually acceptable item on import.

**The older-receiver case is R1's shape paying off**: a receiver whose app predates this
feature imports a profile whose `cur_areas` is an unknown key — preserved verbatim by
`carriedThrough`, invisible in the UI, general value in effect. That is exactly the
spec's edge case («a receiver on an older app version sees the general value»), and it
degrades to *less detail*, never to wrong detail.

**The vault schema version (P50) is the guard that makes this stop being luck**: the
packet states the schema version it was written under, and a reader on an older version
can say «este paquete trae datos de una versión más nueva; verás el valor general» —
a sentence instead of a silent difference. See R5.

**Alternatives considered**: a packet-level `cur_areas` section of its own — rejected:
the packet already carries profile deltas, and a parallel channel for one field is the
two-copies defect in transit. Blocking import on version mismatch — rejected: `004`
FR-314 makes inheritance declinable item by item; a version wall would take that choice
from her.

---

## R5 · Where does the vault schema version marker live? (P50 / COLA 1.17 — prerequisite, built here)

**Decision**: a small YAML file in the app-owned metadata directory that already exists —
**`.rampa/vault.yaml`**, `schema: <integer>` — with **absence meaning version 1**, read
and written through one module in `packages/core/src/vault/`. This feature bumps the
vault to the version that means «profiles may carry `cur_areas`» **on the first write of
a per-area value**, not on read and not on install (FR-3005: reading requires no
migration; a vault nobody wrote per-area values into stays version 1).

**Rationale**: `.rampa/` is already where the app keeps derived metadata (`.rampa/index.md`),
so a marker there does not clutter the teacher's own files, and the vault stays readable
without tooling — the marker is *about* the format, not part of her data. Absence-is-v1
means every existing vault is already versioned without being touched, which is the only
honest retrofit. One integer, monotonic, because the marker answers exactly one question:
«does this vault contain shapes older readers do not know?».

**Why write-time bumping**: a version bumped on read would rewrite vaults that gained
nothing — on a synced OneDrive/Drive folder, that is a conflict generator; and a bump
without a shape change would make the marker cry wolf.

**Alternatives considered**: a version field per file — rejected: N files disagreeing
about one vault. A version in `roster.yaml` — rejected: the roster is hers and optional,
and the marker is the application's. Semver — rejected: nothing here has an API surface;
one integer, compared with `>`, is the whole requirement. Doing it in a separate feature
first — rejected by the facts: COLA 1.17 is unimplemented and this is the first stored
format change that motivated it, so this feature owns it and COLA 1.17 cites these tasks
(the `021`/`020` `startedFor` precedent: whichever feature arrives first owns the shared
piece, and both point at one implementation).
