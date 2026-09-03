# Data model

The finding of Phase 0, stated as a ratio: **one new root, zero new facts in the real
vault.** The rehearsal store mirrors the vault's own layout so that everything which takes
a `Vault` runs over it unchanged, and the real vault does not gain a file, a field or a
flag — separation you can inspect byte-for-byte (SC-3303) rather than trust.

## The rehearsal root

```
<userData>/ensayo/               ← the ONE directory the ensayo module owns
  profiles/
    E00/profile.yaml             ← the fictional learner. sample: true, declared in prose
    E00/notes.md                 ← authored note (contains the name the gate must catch)
    roster.yaml
  material/
    ensayo-1/source/…            ← the sample photo, as she «brought» it
    ensayo-1/ir.md               ← the reading, with its ONE authored imperfection
    ensayo-1/E00/adapted.md      ← the pre-computed adaptation. Carries the ensayo mark
                                   and the pending-review mark IN THE DOCUMENT
    ensayo-1/E00/report.md       ← the genuine report: real recipes, id@version
  output/…                       ← whatever she prints, confined here like everything else
  .rampa/
    ensayo.json                  ← rehearsal state: step reached, startedAt
```

**It is the vault's layout on purpose.** `resolveDocument`, `isSignedOff`, `renderHTML`,
the output checks and the record scan all take a `Vault` and read these paths through
`packages/core/src/vault/paths.ts`. A rehearsal-shaped layout would need rehearsal-shaped
readers — a parallel pipeline, which Principle IV refuses.

**What is deliberately NOT in it**: `.rampa/costs.json` (a would-be cost is recorded
nowhere — asserted as an absence, because an empty ledger and no ledger are different
facts); `memory/` (no correction step in v1, so nothing may write one); `credentials`
(they were never in any vault, `009` FR-725).

## `SampleSet` — the embedded sample, and its manifest

Authored under `sample/ensayo/` in the repository, reviewed like corpus, bundled by
`bundle-corpus.mjs`. Seeding a rehearsal copies it into the root above.

```ts
/** sample/ensayo/manifest.yaml — read at seed time, and by the tests. */
export interface SampleSet {
  learner: string;              // 'E00'
  job: string;                  // 'ensayo-1'
  /**
   * The ONE authored disagreement between source photo and reading (FR-3310).
   * Named so a test can assert it exists and stays findable — a sample whose
   * flaw got «fixed» by a well-meaning edit is a verification screen with
   * nothing to teach.
   */
  flaw: { page: number; what: string };
  /**
   * What an equivalent real run would cost, in cents, per step — authored with
   * the sample, shown in 006 FR-403's register, written to no ledger.
   */
  wouldCost: { readCents: number; adaptCents: number };
}
```

### Rules

**The adaptation is authored, never generated** (spec assumption). Its front matter and
body carry, like any real adaptation: `data-recipe: id@version` for every change, the
pending-review mark, and — new, and in the *content* — the «material de ejemplo»
sentence, so every rendering in every modality carries the ensayo mark by construction
(research R4). No renderer takes an `ensayo` flag; that would be `007`'s removed
`signedOff` parameter, reborn.

**Every recipe the report cites must resolve in the bundled corpus at that version.**
Asserted by a test. A report citing recipes that do not exist is the sample lying about
traceability — the one property (Principle VI) the report exists to teach.

**The profile declares itself** (FR-3307): `sample: true` in front matter (for screens
and tests to gate on) *and* the sentence in its visible text (for the printed page, the
hand-edit, the reader outside Rampa). Axes only, ordinary given name, no surname,
invented school — `seed-learners.mjs`'s register, plus the declaration it never needed.

## `EnsayoState` — where she is, so a restart resumes

```ts
/** .rampa/ensayo.json inside the rehearsal root. Never anywhere else. */
export interface EnsayoState {
  step: 'bring' | 'verify' | 'adapt' | 'review' | 'sign' | 'print' | 'done';
  startedAt: string;            // ISO date
}
```

Resume or start over are both fine (US2, scenario 3) — the state is one small file inside
the root, so «start over» is the same operation as discard-and-seed, and a crashed
rehearsal leaves nothing outside the root either way.

## What the REAL vault and stores gain

| | Gains |
|---|---|
| The vault | **Nothing.** No file, no front-matter field, no roster entry — SC-3303 checks bytes, not intentions |
| The ledger (`.rampa/costs.json`) | **Nothing.** A simulated cent in the ledger is a lie in both directions (spec edge case) |
| The credential store | **Nothing.** No fake service, no sentinel key — research R2's rejected alternative |
| The record / caseload / memory | **Nothing.** The fictional learner exists only under the rehearsal root |
| `userData` | One directory, `ensayo/`, wholly owned by the ensayo module, deletable in one call |

The only durable trace that a rehearsal ever happened is the rehearsal root itself — and
discarding it removes that too, totally and without a verifier (FR-3308, `003` untouched).
