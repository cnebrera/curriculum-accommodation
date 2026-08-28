# Contract — a service in the catalogue

What a file in `instructions/providers/` must contain, and what the application
promises to do with it. **Written for whoever adds the seventh service**, which is
the point of the format existing at all: adding one is a Markdown file and no
code.

Breaking this contract breaks the connection screen, which is the screen the
project can least afford to break.

## The file

```markdown
---
id: groq
adapter: compatible
label: Groq
vendor: Groq
endpoint: https://api.groq.com/openai/v1/chat/completions
model: llama-3.3-70b-versatile
requires_card: false
free_tier: "Un límite de fichas seguidas. Si lo alcanzas, hay que esperar un rato."
vision: false
key_url: https://console.groq.com/keys
key_prefix: gsk_
cost_cents: 0
cost_measured: false
processed_in: EEUU
jurisdiction: us
trains_on_input: no
quality: unmeasured
provisional_rank: 5
suits: "La alternativa gratis si Google cambia su plan. Muy rápido."
last_checked: 2026-08-28
---

## Qué es esto

Una o dos frases. Sin jerga. Lo que va a doler se dice aquí, no más abajo.

## Pasos

1. Un paso, una acción. Di lo que va a VER, no sólo lo que tiene que hacer.
2. …

## No encuentro eso

- **Lo que de verdad sale mal aquí.** Y qué hacer.

Field meanings are in [../data-model.md](../data-model.md); this file is about the
obligations either side takes on.

## What the author of an entry promises

1. **Every fact is checked on the date in `last_checked`**, by reading the
   provider's own pages — not copied from another entry and not inferred. That
   date is load-bearing: past a year the application stops offering the service.
2. **`jurisdiction` and `trains_on_input` report what the terms say**, not a
   judgement about whether that is acceptable. If the terms are unclear, the value
   is `unclear`, which is a legitimate answer and more useful than a guess.
3. **`label` and `suits` are written for a teacher.** No model names, no token
   counts, no context windows anywhere she can see (FR-702). "Muy rápido" is
   allowed; "500 tok/s" is not.
4. **Steps say what she will see.** "Busca el botón azul que dice *Create API
   key*" survives a teacher who reads no English. "Authenticate via the console"
   does not, however correct it is.
5. **At most about six steps.** If a service needs more, that is a fact about the
   service worth knowing before adding it.
6. **`signup_first` carries anything that will block her** — a card, a phone
   check, an identity check, an install. Discovering it at step four is the
   failure this field exists to prevent.

## What the application promises the author

1. **No code change is needed.** A file with a registered `adapter` is offered.
2. **Unknown fields are preserved and ignored**, so a newer catalogue does not
   break an older build.
3. **A malformed entry is skipped and logged, never fatal.** The screen a teacher
   is standing on does not crash because a file is wrong.
4. **`endpoint` is honoured only for `adapter: compatible`**, and ignored with a
   log line otherwise. It is the one field that could redirect traffic, so it is
   narrow by construction.
5. **Nothing here is ever presented as approval.** The application shows these
   facts with their date and points at `docs/proteccion-de-datos.md`. It does not
   describe any service as compliant, safe or approved (FR-711).
6. **`cost_cents` is shown as an estimate until `cost_measured: true`**, which
   only `cases/002-model-floor` sets.

## The one thing that is not configurable

**A teacher cannot type an endpoint.** Every destination is declared in a
reviewed file that ships with the release. That is what keeps 007 FR-511 true
while still offering a dozen services — see `research.md` R2, where deferring the
whole adapter and allowing free-text URLs were both rejected, in opposite
directions.

## Quirks

Differences that are not the endpoint — a service that omits usage counts, or
streams a variant frame — are declared here as named quirks, not handled by
branching on `id` inside the adapter:

```yaml
quirks: [no-usage, no-stream-options]
```

Branching on service id is how one generic adapter rots into eight specific ones,
which is the duplication this format exists to prevent.
