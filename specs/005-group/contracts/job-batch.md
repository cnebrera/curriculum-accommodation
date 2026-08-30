# Contract: adapting for several learners

## The change

```ts
// before
job.adapt(jobId: string, learner: string): Promise<AdaptResult>

// after
job.adapt(jobId: string, learners: string | string[]): Promise<BatchOutcome>
```

**A string is still accepted**, and returns a `BatchOutcome` with one entry
rather than the bare `AdaptResult` it used to. Callers change; the wire shape
tolerates both inputs.

Accepting both is not politeness to old callers — there are none outside this
repository — it is so the e2e suite, which drives the application the way a
teacher does, keeps working through the change and can therefore catch a
regression *in* the change.

## Guarantees

| | |
|---|---|
| **One extraction** | `ir.md` is read once per batch and never written |
| **Order-independent** | The set of documents produced does not depend on the order of `learners` |
| **Isolated** | A throw for one learner is caught, recorded against that learner, and the loop continues |
| **Atomic per sheet** | A learner's `adapted.md` is written whole or not at all |
| **Sequential** | Never concurrent (FR-518) |
| **Deduplicated** | A repeated code in the list adapts once |

## Progress

`job:progress` gains `learner`, `index` and `of`. A single-learner run sends
`of: 1`.

## What is unchanged

`job:revise`, `job:render`, `job:pdf`, `job:signOff`, `job:isSignedOff`,
`job:reportData` and `job:openForEditing` all stay **per (job × learner)**.
Nothing gains a list.

That is the contract's most important line. Rendering, signing and reviewing are
per sheet because a signature is per sheet (Principle VII), and a `job:signOff`
that took a list would be the «firmar todo» button FR-512 forbids — arriving
through the API rather than through the interface, which is exactly how a
forbidden affordance gets built by accident.
