# Phase 1 — Data model

Two entities, and only one of them is new. Both are files a person can read: the
catalogue is corpus, the credential store is machine-owned.

## Service entry (`instructions/providers/<id>.md`)

Markdown with YAML front matter. The front matter is facts; the body is what she
reads. Full contract in [contracts/provider-catalogue.md](./contracts/provider-catalogue.md).

| Field | Type | Notes |
|---|---|---|
| `id` | string | Must match an adapter id, or `adapter` must be set |
| `adapter` | `google` \| `anthropic` \| `openai` \| `compatible` | Which adapter drives it. Defaults to `id` |
| `label` | string | What she sees. Her vocabulary: "ChatGPT (OpenAI)", never "gpt-4o" |
| `vendor` | string | Shown small beside the label |
| `endpoint` | url | **`compatible` only.** Declared here, never typed by a teacher (research R2) |
| `model` | string | Default model. Never shown to her (FR-702) |
| `requires_card` | bool | Drives the one required question |
| `free_tier` | string \| absent | Plain description of the limit, not a token count |
| `vision` | bool | Photographs work. Spec 008 makes this load-bearing |
| `key_url` | url | Deep link to the *exact* key page, not the docs |
| `key_prefix` | string | Recognises a key pasted from the wrong service (FR-722) |
| `cost_cents` | number | Per worksheet |
| `cost_measured` | bool | `false` → shown as an estimate (FR-710) |
| `processed_in` | string | Where the controller is established. `depende` for aggregators |
| `jurisdiction` | `eu` \| `us` \| `other` \| `varies` | Drives FR-707b. Never used to certify |
| `trains_on_input` | `no` \| `yes` \| `opt-out` \| `unclear` | What their terms say, not our reading of them |
| `quality` | number \| `unmeasured` | Rank from `cases/002-model-floor` (research R6) |
| `provisional_rank` | number | Used only while `quality` is `unmeasured`, and the interface says so |
| `suits` | string | One sentence: who this is for |
| `signup_first` | string \| absent | What blocks her before step one (FR-716) |
| `last_checked` | date | **Required.** Drives the staleness rules below |

### Validation and repair

Read through the same repair-not-reject path as the vault (`006` R3), because a
malformed catalogue entry must degrade to "this service is not offered" rather
than crash the screen a teacher is standing on.

- Missing `id`, `key_url` or `last_checked` → the entry is skipped and the
  omission is logged. A service we cannot describe honestly is not offered.
- Unknown fields → preserved and ignored, so a newer catalogue works on an older
  build.
- `endpoint` present with an adapter other than `compatible` → ignored, and
  logged. It would be the one field capable of redirecting traffic.
- No adapter registered for `adapter` → skipped. A file cannot conjure a
  capability.

### Staleness (research R3)

| Age of `last_checked` | Behaviour |
|---|---|
| ≤ 180 days | Shown normally |
| 181–365 days | Offered, with a visible "comprobado hace N meses" |
| > 365 days | **Not offered.** A year-old jurisdiction claim about children's data is not a current fact |

Computed by comparing dates. Deterministic, no model, and it applies to the
released build rather than only to CI — a build ages after its checks passed.

## Credential store (OS user data, not the vault)

Extends `006`'s single-key shape. Outside the vault because a credential is not
part of her records (FR-725).

```
{
  "active": "anthropic",
  "keys": {
    "google":    { "key": "…", "verified_at": "2026-08-28" },
    "anthropic": { "key": "…", "verified_at": "2026-08-28" }
  }
}
```

| Field | Notes |
|---|---|
| `active` | The service a job uses. Exactly one |
| `keys[id].key` | Encrypted at rest via `safeStorage`, as today |
| `keys[id].verified_at` | Shown on the connection screen (FR-729). The key itself is never displayed |

**Migration from the single-key shape**: if the old `{providerId, key}` is found,
move it under `keys[providerId]`, set `active`, write the new shape. One function,
run once (research R5).

**A failed replacement never writes.** Validate first, then store — which is what
makes FR-730 ("the old one still works and she is told so") true by construction
rather than by an undo path.

## Derived: the recommendation

Not stored. Computed on every render from the catalogue and her one answer, so a
corpus update changes the recommendation without any state to invalidate.

```
recommend(catalogue, { canUseCard, locationConstraint? }) → { service, reason }
```

Rule, per FR-707a/707b:

1. Drop services that are stale beyond a year, or whose adapter is missing.
2. Drop services whose `requires_card` conflicts with her answer.
3. Drop services whose `jurisdiction` conflicts with a stated constraint, if she
   stated one.
4. **Never recommend `jurisdiction: other` or `varies`**, whatever remains.
5. If she cannot use a card, require `vision: true` — a no-card recommendation
   that cannot read a photograph is a dead end given spec 008.
6. Of what is left, take the best `quality` (or `provisional_rank` while
   unmeasured); tie-break on lower `cost_cents`.
7. If nothing remains, return the conflict rather than an empty result (FR-713).

The reason string is assembled from *why this one survived* — "sin tarjeta y lee
fotos", "la mejor calidad medida", "procesado en la UE, como te pidió tu centro" —
so it is generated from the rule rather than written per service, and cannot
drift from the actual decision.
