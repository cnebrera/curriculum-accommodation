# Contract — what actually enforces the handover

The deliverable of `004`'s verification pass.

*Audited 2026-08-28. 25 assertions in `app/packages/core/test/handover.test.ts`.*

**None of this spec's fourteen requirements was cited anywhere in `app/`** before
this pass, and `handover.ts` implemented a good deal of it. That is the worst of
the three states these audits keep finding: code with no trace to the requirement
it serves, so nobody can say which requirements it meets and nobody notices when
it stops.

## The audit found two things

### An unconfirmed axis was stamped with today's date

`buildPacket` used `learner.profile.axes_confirmed?.[axis] ?? today()`. An axis
nobody had ever confirmed came out dated **today** — so the receiving teacher read
"confirmed today" for a claim that had never been confirmed at all, on the one
field whose entire job is to say how old the claim is.

It is the same mistake the credential store deliberately avoided, in a comment
written a few files away: *"Empty rather than today's date: claiming we checked it
this morning would be a fabrication on the one screen whose job is to report that
fact."* Written there, missed here.

An invented date is worse than a gap in a document whose whole purpose is to be
believed less than it could be. It is now empty, and renders as «sin fecha» —
because a blank cell in a table reads as a rendering fault while «sin fecha» reads
as the fact she needs.

### There was no way to review a packet

FR-305 says nothing leaves without the sending teacher's review, and no review
existed. So a handover either did not happen, or happened unreviewed — and the
second is worse: a document about a child, sent to a colleague, that nobody
checked.

`HandoverReview.tsx` now exists. It also fixed FR-304's second half: what she
removes is **dropped from the packet**, not flagged inside it, because a flag
protects nothing once the file is an email attachment.

## The fourteen

| # | Enforced by | State |
|---|---|---|
| **301** | `buildPacket` — profile, summary, official-file reference | **Partly.** The dated *notes* are not carried; the summary is where she writes the narrative by hand. Arguably better — a raw dump of a year of notes is the label this spec avoids — but it is not what the requirement says. **Decided: keep the current behaviour**, and the requirement should be amended rather than the code |
| **302** | Every claim carries evidence and a date | Met — with a limit named below |
| **303** | `axes_confirmed`, empty when absent | Met **as of this audit** |
| **304** | Review drops what she removed | Met **as of this audit** |
| **305** | `HandoverReview.tsx`; nothing writes a packet without it | Met **as of this audit** |
| **306** | `packetToMarkdown`, prose first, the limit above the claims | Met |
| **307** | — | **Absent** — see below |
| **308** | — | **Absent** |
| **309** | — | **Absent** |
| **310** | — | **Absent** |
| **311** | `isStale`, one academic year | Met, and does not guess at a malformed year |
| **312** | The packet carries codes; re-identification is a human act at the school | Met by construction |
| **313** | The markdown says it accompanies and does not replace | Met |
| **314** | — | **Absent** |

## The receiving half is deferred, and this is the reason

FR-307 to FR-310 and FR-314 — import, confirmation state, disconfirmation with
history, surfacing what stayed unconfirmed, and declining the inheritance — are
absent. All five are about *receiving*, which this spec itself calls the hard half.

**Deferred deliberately, for one reason that is not effort:** the receiving
teacher does not have this application. Handover happens between two teachers at
one school in September, and the realistic case is that one of them uses Rampa and
the other opens an attachment. An import path built now would serve the case where
both do — which is the rarer one — while the common case is served by the document
itself.

So the mitigation is in the document, and it has to be, because prose in an email
is all that will reach her: the packet leads with «esto no es un diagnóstico»,
says «trátalas como hipótesis que confirmar en las primeras semanas», marks every
claim «sin confirmar», and says that a claim which no longer fits may mean the
child changed rather than that the previous teacher was wrong.

That is weaker than FR-307's mechanical `unconfirmed` state. It is what can be
delivered to a teacher who will never install anything, and **the whole point of
those five requirements is achieved for the common case by a document that argues
against its own authority.**

What is genuinely lost by deferring: FR-308's report line ("this adaptation relied
on an inherited item nobody has confirmed") and FR-309's retained history of a
disconfirmed claim. Both matter, and both only exist once import does.

Build them when a second Rampa user receives a packet from a first. Not before.

## One thing no test can check

`buildPacket` marks every claim `evidence: 'observed'`, including axis levels — a
claim about *how the sending teacher knew*, which the application cannot know. A
level she inferred from one lesson and one she watched for a term both come out as
«observado».

A test can check the marker exists. Only a human can check it is true, and FR-302's
value depends entirely on the human doing so. The review screen shows the marker
beside each claim for exactly that reason, and it is still the weakest link in
this spec.
