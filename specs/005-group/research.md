# Research: one worksheet, several learners

**Nothing needed researching, and that is a finding rather than a shortcut.**

Every question this feature would normally open was closed by earlier work, so
this file records *which* work closed it — because "no research needed" written
without that list is indistinguishable from research not done.

## What would have needed research, and did not

**Where a second learner's adaptation goes.** Settled 2026-08-28 as T092b, after
a defect: the layout held one `adapted.md` per job, so adapting the same
worksheet for a second learner overwrote the first, and `nextRevision` would have
recorded learner B's sheet as "revision 2" of learner A's. `jobLearnerDir`,
`jobAdapted`, `jobRejected`, `jobReport` and `outputDir` all take a code already.

**Whether one extraction can serve several adaptations.** `runAdaptation` reads
`jobIR(jobId)` and writes under `jobLearnerDir(jobId, code)`. It has never
written to the extraction. So the answer is yes and has been since it was
written; nothing has ever called it twice for one job to find out.

**Concurrent or sequential.** Settled in clarification: sequential, because the
saving is the *ingest* — which happens once either way — and concurrency against
a rate-limited provider (`009`) converts one failure into several.

**Whether the provider needs anything new.** No. Three adaptations are three
ordinary calls; the batch is a loop in our process, invisible to the provider.

## The one thing that is genuinely unknown

**What a teacher does when one of three fails.** The spec assumes she wants the
other two and a named failure she can retry alone (US2), which is the behaviour
that keeps the most work. It is an assumption about her, not a fact, and SC-506
is where it gets checked — by a person, once.

Recorded here rather than resolved, because inventing a research finding to
close it would be worse than leaving it open.
