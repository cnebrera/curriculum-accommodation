# Quickstart — validating the feature

The order matters, and it is the reverse of how tempting it is: the machine checks
are cheap and catch regressions, the person is the one who decides whether the
feature exists at all.

## Prerequisites

Node 22 LTS. **No API key for sections 1–4** — that is the point of the parser,
the rule and the normaliser living in the deterministic core. Section 5 needs one
real key; section 6 needs a teacher.

## 1 · The catalogue parses, and refuses what it should

```bash
cd app && npm ci
npm run bundle:corpus
vitest run packages/core/test/catalogue.test.ts
```

**Expected**: the six shipped entries parse; an entry missing `id`, `key_url` or
`last_checked` is skipped rather than crashing; unknown fields survive a
round trip; an `endpoint` on a non-`compatible` adapter is ignored; an entry whose
`adapter` has no implementation is skipped.

**And the staleness rules**: an entry dated 200 days ago is offered with a marker;
one dated 400 days ago is not offered at all. Fix the clock in the test, never
`Date.now()` — a test that changes behaviour in January is not a test.

## 2 · The recommendation is the rule, not an opinion

```bash
vitest run packages/core/test/recommend.test.ts
```

**Expected**, straight from FR-707a/707b:

- No card → a no-card service that reads photographs. Never one that cannot,
  because spec 008 makes that a dead end.
- Card → the best measured quality. With `quality: unmeasured` everywhere, the
  provisional rank decides **and the reason says it is provisional**.
- **A service with `jurisdiction: other` is never recommended**, even when it is
  cheapest and ranks best. It still appears in the full list.
- An aggregator (`jurisdiction: varies`) is never recommended either.
- A stated location constraint that nothing satisfies returns the conflict, not an
  empty list.
- The reason string is derived from why the winner survived, so it cannot drift
  from the decision.

## 3 · A pasted key is treated like something copied from a web page

```bash
vitest run packages/core/test/key-normalise.test.ts
```

**Expected**: whitespace, smart quotes, a trailing newline and a `KEY=…` prefix
are all stripped. `sk-ant-…` is identified as Anthropic and not as OpenAI —
longest prefix wins. A pasted paragraph is recognised as not-a-key. None of this
asks her to be careful.

## 4 · The screen, end to end, with no provider

```bash
npm run test:e2e -- connect
```

**Expected**: one required question; a recommendation with a reason; the full
comparison one click away and showing the location and date columns; the
walkthrough numbered with its "no encuentro eso"; the key page opening **outside**
the application. Every failure sentence distinct — trigger all five by pasting a
malformed key, another service's key, and with the network down.

Also: no jargon anywhere in the rendered text. The e2e asserts the absence of
"IR", "corpus", "token", "prompt", "endpoint", and any model name.

## 5 · One real key, once

Not automated, and deliberately so: the first real call to each service is where
the documented shapes meet reality.

```bash
npm run dev
```

Connect each of the six for real. **Expected**: validation succeeds within about
three seconds; the success line reads in cents; the key survives a restart; a
deliberately wrong key produces the right one of the five sentences and **leaves
the working key in place** (FR-730).

Record which services were actually reached in `validation.md`. An adapter
implemented against documentation and never called is not verified, and saying so
is the whole point of that document.

## 6 · The test that actually decides it

Everything above can pass while the feature fails.

**Protocol.** Give a special-education teacher who has never used AI the
application and nothing else. Say nothing. Record the timestamp, the screen, and
what she says out loud at every hesitation. **Do not speak until she has asked
twice.**

**Pass**: from this screen to "✓ Conectado" unassisted, no documentation, under
ten minutes (SC-701).

**Every intervention is a logged defect** (SC-702) — including the ones where
staying silent felt unkind. This screen is where they are expected, so those
entries are the most valuable output of the whole session.

Afterwards, ask two questions and write the answers verbatim:

- Roughly what does a worksheet cost you? (SC-703)
- Which service did you pick, and why? (SC-704)

If she cannot answer the second, the recommendation was something she clicked
past rather than a decision she made — and that is a defect in this feature, not
in her.
