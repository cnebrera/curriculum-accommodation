# Contract — the structure document and its builder

## The builder

```
buildStructure(args: BuildArgs) → Built            // packages/core/src/structure/build.ts
```

Guarantees, in order of what they protect:

1. **Deterministic.** Same args, same document, bit for bit. No clock except `created`
   (supplied by the caller, not read here), no randomness, no model (FR-2602, FR-2603).
2. **One precedence.** Every drawing comes from `matchWord` — override ▸ vocabulary ▸
   set ▸ nothing (FR-2605). The builder contains no access to `set.byLanguage`. A test
   asserts this at source level.
3. **Refusal over guessing.** `ambiguous` and `none` become declared gaps in the
   document and are returned in `gaps` verbatim, so the screen can offer the `024`
   chooser for the ambiguous ones (FR-2606).
4. **Names get nothing.** `names` flows into `matchWord` exactly as in `jobs/adapt.ts`
   (`018` FR-1610) — a moment named after a child renders the word, no drawing, no
   report line.
5. **Her order is the order.** The builder never sorts, dedupes or completes `items`.

## The document

Front matter and block shapes per [data-model.md](../data-model.md). What every consumer
may rely on:

- `source: structure` ⇒ `isGenerated()` is true ⇒ `resolveDocument` serves it, the
  draft mark derives from it, sign-off signs it — the `021` path, unchanged.
- `startedFor(frontMatter)` returns the learner code ⇒ the record lists it and erasure
  removes it (FR-2604).
- `structure:` names the kind for the record's label and the reprint entry.

## The four rules every rendering keeps

1. **No learner fact on the page** (FR-2608). Structural: the renderer takes an IR and
   no profile; `assertNoLearnerData` checks the output anyway. The test is written
   before the first render path exists.
2. **The word is always beside the drawing** — a greyscale photocopy is the delivery
   format (FR-2607, `010` FR-812; the existing `.picto` rendering already does this).
3. **Attribution is derived, never optional** (FR-2607): `attributionFor(doc)` emits the
   set's real credit whenever the document carries a pictogram. No parameter exists.
4. **The draft mark is derived, and one IPC removes it** (FR-2609 for the historia; the
   same path for all three kinds, per research R4).

## The story job

```
runStory({ learner, situation, attached? }, onProgress) // packages/shell/src/jobs/structure.ts
```

- System prompt = `hard-rules` + `social-story` from the corpus. No judgement string in
  the job (Principle I).
- `situation` is her instruction; `attached` is content, delimited via the existing
  annotation (FR-2610, Principle IX).
- Egress only through `sendRedacted`; cost through the existing recording; output is an
  unsigned structure document (`structure: historia`) whose report carries the
  invented-details line (FR-2611).
