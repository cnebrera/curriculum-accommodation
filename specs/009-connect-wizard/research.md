# Phase 0 — Research

Unknowns from Technical Context, resolved. Each entry: decision, rationale,
alternatives rejected.

---

## R1 · One adapter for every service that speaks the OpenAI API

**Decision: a single `compatible.ts` adapter, parameterised by base URL and model
from the corpus entry.**

**Rationale.** Groq, DeepSeek, xAI, Moonshot, Mistral, Alibaba, OpenRouter and
Together all expose `POST /chat/completions` with the same request and streaming
shapes. Writing an adapter per service would be the same file eight times, and
this repository has already paid for duplicated logic twice — the renderer and
the memory index, both found diverged (ADR 0006).

The adapter differs from the three existing ones in exactly one way: it takes its
endpoint and default model from the catalogue rather than as constants. That is
configuration, not a capability.

**Alternatives rejected.**

- **One adapter per service.** Eight near-identical files, eight places for a
  streaming fix to be applied to seven of them.
- **A provider SDK per vendor.** Each brings a dependency and a different
  abstraction, for an API surface we use one method of. The three existing
  adapters use `fetch` directly and are ~100 lines each; that has held.

**Consequence.** Differences that are *not* the endpoint — a service that omits
usage counts, or streams a variant frame — must be handled as declared quirks in
the catalogue entry, not as branches on service id inside the adapter. Branching
on id is how a generic adapter rots into eight specific ones.

---

## R2 · What "the configured model endpoint" means (007 FR-511)

**Decision: an endpoint declared in a bundled corpus entry satisfies FR-511. A
free-text endpoint typed by the teacher does not, and stays out of scope.**

**Rationale.** This is where the first version of the spec was wrong twice over.
It deferred the compatible adapter entirely, citing the risk of a
user-configurable destination — which had the effect of restricting the project
to whichever vendors happened to be implemented, and made a Google outage or a
free-tier change a dead end.

The distinction that resolves it: **who authored the destination.** A catalogue
entry is reviewed, ships with the application, is signed into the release, and is
visible in the repository. Choosing DeepSeek from it is exactly as bounded as
choosing Anthropic. A URL a teacher pastes is authored by nobody we can hold
responsible, and it is the only case that genuinely widens egress.

**Alternatives rejected.**

- **Defer the whole adapter** (the first version). Restricts the offer for a risk
  that only one narrow case carries.
- **Allow a free-text endpoint with a warning.** A warning is an instructional
  control where a structural one is available — the exact inversion Principle IX
  forbids. If it is ever wanted, it needs its own spec, its own paragraph in
  `docs/proteccion-de-datos.md`, and a test.

---

## R3 · Keeping provider facts honest as they rot

**Decision: every fact carries `last_checked`; the interface shows the date;
facts older than 180 days are shown with a visible staleness marker; a service
whose facts are older than 365 days is not offered until re-checked.**

**Rationale.** FR-706 requires the date to be shown, which is necessary and not
sufficient: a date nobody acts on is decoration. Prices fall fast, free tiers
change terms and a jurisdiction claim can go silently wrong after an acquisition.

The two thresholds are deliberately different in kind. **180 days shows a marker**
— the teacher sees "comprobado hace 7 meses" and can weigh it. **365 days
withdraws the offer**, because presenting a year-old jurisdiction claim about
children's data as current is the kind of quiet overclaim
`docs/adoption-risks.md` §3 was written to correct.

This is deterministic and needs no model: the parser compares dates.

**Alternatives rejected.**

- **Fetch terms at run time and diff them.** An outbound call to a provider's
  legal page from a teacher's machine, parsing prose for meaning. Fragile, and it
  would be the application forming a legal opinion.
- **Show the date and do nothing else.** Leaves the project shipping stale claims
  indefinitely with a technically-true footnote.
- **A CI check that fails on stale facts.** Attractive, and it belongs in
  `tasks.md` as a follow-up: it puts the burden on contributors rather than on the
  teacher. It is not a substitute for the run-time thresholds, because a released
  build ages after CI has passed.

---

## R4 · The provider is not part of provenance, and should be

**Finding, not a decision.** Adapted material records `data-recipe: id@version`
and the axis that justified each change (Principle VI). It does not record
**which service produced it.**

That matters more once six services are offered and switching is expected: a
teacher comparing last month's sheets with this month's has no way to know
whether a difference came from a recipe change, a corrected note, or a different
model. FR-731 requires that switching not *alter* provenance; it does not require
that provenance name the provider.

**Deferred deliberately, and recorded rather than fixed here**, because it changes
the IR's provenance contract (`docs/ir.md`) and therefore belongs to whatever
feature owns that change — not smuggled in through a connection screen. Raised in
`specs/BACKLOG.md` as G18.

---

## R5 · One key per service

**Decision: the credential store holds a map of service id to key, with one
service marked active.**

**Rationale.** FR-725 requires per-service storage and FR-730 requires a failed
replacement to leave the previous key working. Both are impossible with the
current single-key shape, where saving overwrites.

The migration is trivial and worth doing properly: read the old single-key shape
if present, move it under its provider id, write the new shape. Nobody has a real
installation yet, so this costs one function and closes the question permanently
rather than leaving a shape that would need migrating once someone does.

**Alternatives rejected.** Keeping one key and re-validating on switch: makes
switching lossy and makes a failed replacement destructive, which FR-730 forbids.

---

## R6 · What quality the recommendation reads from

**Decision: a `quality` rank in the catalogue entry, sourced from
`cases/002-model-floor` and dated like every other fact.**

**Rationale.** FR-707a says "best measured quality", which needs somewhere to
read the measurement from. Putting a rank in the catalogue keeps the rule pure
(`recommend.ts` sorts; it does not know that Claude is good) and keeps the
judgement in the corpus where a measurement can update it without a release.

**Until the first measurement exists**, entries carry `quality: unmeasured` and
the rule falls back to a declared `provisional_rank` with the interface saying so:
*"de momento por lo que sabemos, no por lo que hemos medido"*. Honesty about
an unmeasured default costs one sentence and prevents the project from quietly
presenting a guess as a finding.

**Alternatives rejected.**

- **Hardcode the order.** Puts a judgement in TypeScript that a measurement
  should be allowed to overturn.
- **Wait for the measurement before shipping the screen.** Blocks the feature on
  a case that needs real keys, and the screen is what unlocks getting one.

---

## Remaining NEEDS CLARIFICATION

None. The four clarify answers closed the open decisions: which six services, the
recommendation rule, the non-EU/US presentation, and local models as a recorded
non-goal.
