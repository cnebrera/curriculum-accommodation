# Phase 0 · Research

Six questions. R1 is the one that shapes the feature; R4 found that half the revision
story was already built by `021` and the remaining work is convergence, not invention.

---

## R1 · Is a turn a re-run of the job, or an edit of the document?

**Decision**: **an edit.** One new operation, `runTurn`, whose input is the *current
revision* plus her sentence, and whose output is the next revision. It never goes back to
`ir.md`'s extraction or the stored `ComposeRequest`.

**Rationale**: the two operations that exist both start over. `runAdaptation` re-adapts
the extraction with corrections appended; `correctComposition` re-runs `runCompose` with
her correction added to the objectives (`jobs/compose.ts`, where `asked` is rebuilt from
`request.objectives` plus the corrections). Starting over is precisely the cost the spec
exists to end — «quita los tres últimos» must not re-generate, and put at risk, the
seventeen exercises that were already right. It is also why SC-2401 can be met at all:
a turn's prompt is one document and one sentence, not the whole compose pipeline.

**What this does not change**: the re-run operations stay. A correction that should
apply to *every future adaptation* is still a correction plus memory plus re-run; the
turn is for **this sheet, now**. The panel does not replace the correction box — the
spec's edge case about learning (`026` FR-2411) is the boundary between them.

**Alternatives considered**: reusing `job:revise`/`correctComposition` with the turn text
as a correction — rejected, it re-runs (cost, and the good parts are re-rolled), and
`021` research R3 already established that pointing one channel at two different
operations is how callers end up guessing. A patch-format response (model returns a
diff, code applies it) — rejected for now: it halves output tokens but invents a second
document format the parser, the verifiers and the teacher would all have to learn, and a
misapplied patch is a corrupted sheet; the IR round-trips and its diffs are legible,
which is what the format was chosen for.

---

## R2 · Where does the conversation live in the vault?

**Decision**: one Markdown file **beside the document it is about**:
`material/<job>/<learner>/conversation.md` for an adapted sheet,
`material/<job>/conversation.md` for a composed one. Append-only; one file per
conversation, one conversation per document (`026` FR-2401).

**Rationale**: the spec's own scope rule decides it — «a conversation about a child's
sheet is the child's data» (`003`'s scope). Deleting the learner deletes
`material/<job>/<learner>/` today, so a conversation stored there is deleted by the
mechanism that already exists, with no new erasure path to specify, build and forget
(the CONS-04 lesson: every new store outside the vault is a `forget` gap waiting to be
found). It is also a plain file she owns, can read in Obsidian and can back up by
copying a folder — Principle VIII's storage rule applied to a thing that is not memory
but lives by the same reasons.

**Placement note**: `resolveDocument` (`021`) already answers «which document?» for a
job and learner; the conversation file sits in the directory of whatever it returns, so
the two families need no separate rule.

**Alternatives considered**: a `.rampa/` store outside the vault — rejected, that is
where the names map lives and CONS-04 documents what happens to erasure promises there.
Inside the record (`014`) — rejected, the record is derived by scanning; storing primary
data in it inverts what it is. Front matter of the document — rejected, a turn would
then rewrite the document it is about, and a signed revision must never be touched.

---

## R3 · How is «what changed» derived, so it cannot be what the model says it did?

**Decision**: a deterministic **block diff between the previous and the new revision**,
in `packages/core`: `revisionDiff(before, after)` over parsed IR (`parseIR` gives stable
block ids), classifying each block as kept, changed, added or removed, and flagging
quantity changes inside exercises. Its sentences — «he quitado 3 ejercicios», «he
cambiado el enunciado de e4 sin tocar las cantidades» — are rendered from the diff
alone. The model's own account, if it offers one, is never shown as the answer to «¿qué
ha cambiado?» (`026` FR-2404, `004`'s anti-fabrication rule).

**Rationale**: the IR was chosen partly because «its diffs are legible» (`ir/parse.ts`
says so in its header), and blocks carry ids, so a structural diff is cheap and honest.
A model asked what it changed will confidently answer, including about changes it did
not make — the same failure `004` closed for reports and `014` closed for dates.

**The diff is also the gate-adjuster this feature needs**: `checkCompleteness` compares
against the original extraction and treats a dropped block as a defect; a turn exists to
drop blocks *when she asked*. So a turn's gates are: `checkStructurallyComplete` (no
truncation), **provenance against the previous revision** (`findUnaccountedBlocks` with
the previous revision as the baseline — nothing appears from nowhere), the verifiers
(R6) — and every removal *reported* by the diff instead of blocked. The weakening is
deliberate and recorded in the plan's Constitution Check.

**Alternatives considered**: trusting the model's summary — the exact thing FR-2404
forbids. A raw-text diff (line-based) — rejected, it reports formatting noise in a
register she cannot act on; the block diff speaks in exercises and instructions, which
are her units.

---

## R4 · How do composed documents get `005`'s revision behaviour without a second mechanism?

**Finding**: **the shape already exists twice.** `jobs/adapt.ts` archives the previous
sheet as `adapted.rN.md` (`nextRevision`, counting `adapted.r(\d+).md` plus the working
file), and `021` gave compositions the same shape as `ir.rN.md`
(`nextComposedRevision` in `jobs/compose.ts`). Two private copies of «archive the
previous, number the next», one per file stem — the drift `021` research R2 warned
about, one feature later.

**Decision**: one module, `packages/core/src/vault/revisions.ts`, generalised over the
document's stem (`adapted` or `ir`, from `resolveDocument`): `listRevisions`,
`archivePrevious`, `restoreRevision`. `runTurn` uses it; the two existing copies
converge on it in this feature so the third copy is never written.

**Restore semantics (US3)**: restoring revision N means **archive the current working
file as its own revision, then write revision N's content as the working file**. Nothing
is ever deleted or renumbered; the numbers only grow. The signature travels with the
content because it lives in the document's front matter (`isSignedOff` reads the
document, `007` FR-509) — so restoring a signed revision restores a signed document, and
a signed `rN` file on disk stays signed forever (`005` FR-511).

**Alternatives considered**: a `current_revision` pointer field — rejected, a stored
copy of what the filesystem says, the defect `014` catalogued and `021`'s data model
refused for the same reason. Making the working file itself `rN.md` with no stem file —
rejected, every reader in the application (`resolveDocument`, print, sign-off, the
record) knows the working file by its stem; moving the fact into a filename convention
would touch all of them for no behaviour she can see.

---

## R5 · Who decides a refusal, and how does it reach her with its rule?

**Decision**: **the judgement is corpus, the guarantee is code.** A new
`instructions/iterate.md` states, in teacher-readable Markdown: a turn changes the HOW
and never the WHAT; requests that would touch objectives, contents or evaluation
criteria are refused *because of what the request would change*, never because of the
profile (P12's re-keying); the hard rules outrank the turn and a refusal names the rule
it stands on (`026` FR-2407, `011` FR-910). The model declares a refusal in a structured
form (a `report-notes` block with a `data-refusal` attribute — the channel `T087`
created for exactly this kind of model-to-teacher speech). Code guarantees the part that
must not depend on the model: **a turn that refuses mints no revision** — the previous
revision stays the working document untouched, and the refusal text lands in the
conversation file, not on the sheet.

**Rationale for the split**: whether «ponlo más fácil» touches the WHAT is judgement —
Principle I says a teacher must be able to read and correct that rule, so it cannot live
in `turn.ts`. Whether a refusal leaves the document untouched is mechanics, and
structural defences outrank instructional ones (Principle IX), so that part is code and
a test. The deterministic backstops do not care what the model decided: the verifiers
re-check every quantity regardless (R6), and provenance-against-previous catches
invented content regardless.

**Alternatives considered**: a keyword classifier over her turn text in code — rejected
twice over: it is adaptation policy in TypeScript (Principle I), and P12's whole finding
is that this decision is about meaning, not surface. Refusing exams any turn at all —
rejected, P12 explicitly protects access changes («letra más grande» on an exam is the
legal, daily work of the PT).

---

## R6 · What does «re-verified» mean per turn, for each document family?

**Decision**: the same deterministic verifiers, run over **every verifiable exercise of
the new revision, before she sees it** (`026` FR-2405), with family-specific
consequences:

| | Composed document | Adapted document |
|---|---|---|
| Quantities | Recomputed by the verifier from the exercise statement; a quantity the model altered is **corrected from the exercise**, and the correction reported | Same check; additionally the diff flags any quantity change so a silent renumbering is visible even where no verifier covers the skill |
| The answer key | **Regenerated and re-verified in the same step** and written to `jobAnswers` — `021` FR-1919's rule, now per turn: a stale key is worse than none | Not applicable (no key) |
| Unverifiable exercises | Keep their `data-unverified` marking; the honest state survives the turn | The draft mark plus the diff are the control, as at adaptation time |
| Diagrams (`022`) | A diagram whose exercise's numbers changed is redrawn from the exercise or removed (`022` FR-2016) — never left with the old numbers | Same |

**Rationale**: SC-2402 is an invariant over the vault («zero revisions where a quantity
came from the model»), and an invariant is only checkable if the mechanism is the same
one every time — `verifierFor` and the compose verifiers, not a conversation-flavoured
re-implementation. The `002` rule is not «verified once at birth»; it is «verified in
whatever state she can print», and a turn creates printable states.

**Alternatives considered**: verifying only blocks the diff says changed — rejected, an
optimisation that turns an invariant into a sample; the verifiers are deterministic and
cheap, and SC-2402 says «checked as an invariant, not sampled». Trusting a turn that
claims it only touched wording — that is the model reporting on itself, R3 again.
