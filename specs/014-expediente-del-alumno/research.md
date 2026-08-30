# Research: the learner's record

## The one real question

**What is "the original" when there is no file?**

FR-1205 says every entry resolves to the source she supplied, the text Rampa
read, and the outputs. For a photographed worksheet those are three different
things. For the other two entry points they are not:

| how it arrived | "what she gave" | "what Rampa read" |
|---|---|---|
| photograph / PDF / Word (`008`) | `material/<job>/source/*` | `ir.md` |
| pasted text (`001`) | the text — **which is `ir.md`** | `ir.md` |
| composed from objectives (`002`) | the objectives and the anchor | `ir.md` |

**Decision.** The record does not pretend there are always three. A pasted job
shows one document and says so; a composed job shows the objectives and the
anchor in place of a file. The alternative — an empty "original" panel — is the
interface lying about having lost something.

**Why it needed deciding rather than discovering:** an implementation reading
`material/<job>/source/` and finding it absent would reasonably conclude the
source is missing, and FR-1206 requires missing documents to be *reported*. So
without this decision the common case would report a fault.

## The reasoning against an index

FR-1214 permits a cache under `.rampa/`. It is not built.

- **Measurement first.** Reading YAML front matter from 400 directories is
  milliseconds on any machine that can run Electron. SC-1207's bar is "no
  perceptible wait", and there is no measurement saying the scan misses it.
- **A cache is a second copy of a truth**, which is the defect this project has
  now found four times (the corpus journal dates, `planForget`, the injection
  notices, `evidence:`). Adding one before it is needed is that defect with a
  performance justification attached.
- **It would need invalidating** on every write, every erasure and every
  hand-edit in Obsidian — and the vault is explicitly editable by hand.

If the measurement fails, the cache is the fix, and it is already permitted.

## What was NOT researched, deliberately

**Full-text search performance.** FR-1201's search matches material text, which
means reading `ir.md` files. At 400 jobs that is tens of megabytes. Deferred to
the point where search is built (Phase 6), because the shape of the answer
depends on whether search turns out to be over the record's own fields — date,
kind, subject — which is cheap, or over the material, which is not. The spec
asks for both; the cheap half may turn out to be what she uses.

Recorded rather than resolved, because guessing at it now would be inventing a
finding.
