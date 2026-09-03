# Quickstart — proving structure material is material

Ordered so everything checkable offline is checked before anything spends money — which
here is almost everything: only §7 touches a provider.

## Prerequisites

```bash
cd app
npm ci
npm test          # typecheck + the whole offline suite
```

A vault with one learner, and the pictogram fixture set the `018`/`024` tests already
use. **No API key is needed until §7.**

---

## §1 · The test to write first

```bash
npx vitest run packages/core/test/structure-no-learner-facts.test.ts
```

An agenda travels in a backpack — out of the school, past every screen. Both halves of
SC-2603, over a generated corpus of structure documents:

- No rendering — HTML, ODT, linear — contains the learner's code, a name, or any other
  learner fact (`assertNoLearnerData`, plus fixtures with accented names).
- Every rendering with a pictogram carries the set's real attribution, derived.

## §2 · Offline · the builder and the one precedence

```bash
npx vitest run packages/core/test/structure-build.test.ts
```

| Case | Expected |
|---|---|
| Word with one drawing in the set | matched, `source: 'set'` |
| Word she chose in her vocabulary | her drawing, `source: 'vocabulary'` |
| Word with a per-learner override | the override wins over vocabulary and set |
| Word with four candidates | a declared gap, and the word reported for choosing |
| Word with none | the word renders, gap stated, no report noise |
| A child's name as a moment | the word, no drawing, no report line |
| Same args twice | byte-identical document (SC-2602's core half) |

Plus the structural one: **no access to the set's keyword maps outside `match.ts`** — a
source-level assertion, because a second lookup is how the four rungs fork.

## §3 · Offline · a structure job is a job

```bash
npx vitest run packages/core/test/ packages/shell/test/
```

- `resolveDocument` over a structure job: serves it, refuses it to another learner,
  derives the draft mark from it.
- The record lists it — kind, date — before and after sign-off; erasing the learner
  removes it with everything else.
- `checkPhotocopy` passes over an agenda and a sequence rendering.
- The isolation suite still green: the builder lives in `core` and calls nothing.

## §4 · With a window · the five-minute agenda (SC-2601)

```bash
npm run build && RAMPA_TEST=1 npx playwright test e2e/structure-agenda.spec.ts
```

1. Open a learner, pick «agenda visual» — **with the network disabled**.
2. Add asamblea, mesa de trabajo, patio, comedor; reorder one; one word is ambiguous and
   the screen offers the same chooser as everywhere, nothing pre-chosen.
3. Save, sign, print. No provider call, no cost entry, the strip carries the attribution
   and — checked against the fixture — nothing about the child.
4. With **no set configured**: the door is reachable, explains what is missing, and
   points at Configuración ▸ Pictogramas (FR-2612). Not hidden, not broken.

## §5 · With a window · the sequence that reprints (SC-2602)

```bash
RAMPA_TEST=1 npx playwright test e2e/structure-sequence.spec.ts
```

Build «lavarse las manos» in five numbered steps, save, close, reopen from the record,
reprint: **identical content**. Then change her vocabulary's drawing for one of the
words and reprint again: **still identical** — saved material does not chase the
vocabulary (`024`'s already-made-sheets rule).

## §6 · Looked at, not asserted

```bash
npm run shots
```

Open them. An agenda strip at print width — is it readable across a classroom, not just
at a desk? The numbered sequence — does the number read before the drawing? The
missing-drawing gap — does it look deliberate rather than broken? And the SAAC hint
(FR-2613) — does it read as honesty rather than legal boilerplate?

## §7 · The one that costs money, last

Ask for a historia social: «el jueves vamos al parque de bomberos».

1. The draft arrives **marked as a draft**, its cost shown in the usual terms.
2. The report says the concrete details are invented until she edits them (FR-2611).
3. Key words carry her vocabulary's drawings — the same machinery, visibly.
4. Put a classmate's name in the situation text: the redaction gate catches it exactly
   as it does in notes.
5. Print unsigned: the mark is on it. Sign, print: it is gone — via the one sign-off,
   nothing new.

## §8 · The verdict I cannot produce (SC-2605)

Give a PT with a new TEA learner the week-one set — the agenda, two sequences, one story
— and ask whether it replaced the scissors-and-laminator afternoon. The time half is
measurable; «replaced» is hers to answer, and «why not» is worth more than the answer.
