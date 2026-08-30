# Quickstart: proving the record

## Prerequisites

A vault with at least two learners and one worksheet adapted for both — which is
now one action (`005`).

## Offline

```bash
cd app && npm test
```

`packages/core/test/record.test.ts`:

- a job adapted for two learners appears in both records, linked to one source
- an unsigned sheet appears, marked unsigned
- a pasted job says the source and the read text are the same document
- a composed job shows objectives instead of a file
- a document deleted by hand appears in `missing` rather than vanishing
- a vault built entirely before this feature yields a full record (FR-1204)
- a learner directory whose learner no longer exists does not break the scan

## The one to run by hand

**Delete the record and reopen the learner.** SC-1203, and the one that says
whether the design held:

```bash
rm ~/Rampa/profiles/E38/record.md
rm -rf ~/Rampa/.rampa/
```

Reopen the learner. The list must be identical, and `record.md` must be back.

## Erasure — the case that is easy to get backwards

```bash
cd app && npx vitest run packages/core/test/record-erasure.test.ts
```

Two learners, one shared worksheet. Erase the first:

- their adaptation, their renders and their record are gone
- **the second learner's adaptation is untouched**
- **the shared source is untouched**, because somebody still references it
- erasing the second then removes the source, because nobody does

Getting this backwards destroys another child's material or leaves an orphaned
photograph in her folder for ever. It is the only genuinely subtle logic here.

## Performance

SC-1207: 400 jobs, no perceptible wait. Generate them and time
`record.forLearner`. If it misses, the cache under `.rampa/` is the fix and
FR-1214 already permits it — but the measurement comes first, which is the whole
argument in [research.md](research.md).

## What none of this proves

Whether she finds it. The record is only worth building if she opens it a year
later and finds the thing she half-remembers, and that is one teacher, once.
