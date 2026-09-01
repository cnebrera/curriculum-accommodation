# Contract — the document, and what may be done to it

`021`'s whole surface. One resolver, eight callers that stop hard-coding a path, and four
rules the viewer keeps.

## The resolver

```ts
resolveDocument(vault, job, learner?): Promise<ResolvedDocument>
```

**The only place that answers «which document?».** Every caller below asks it; none
constructs a path of its own. That is the contract, and it is checkable: a grep for
`jobAdapted(` outside the resolver and the writers should return nothing.

## What every caller gets, and what changes for it

| Caller | Today | After |
|---|---|---|
| `job:render` (HTML) | `jobAdapted` or refuse | The resolved document; composed material renders |
| `job:pdf` | ″ | ″ |
| `job:odt` | ″ | ″ |
| `job:audio`, `job:brailleReady` | ″ | ″ |
| `job:signOff`, `job:isSignedOff` | ″ | ″ — a signature is about a document (Principle VII) |
| `job:openForEditing` | ″ | ″ |
| `job:reportData` | ″ | ″ |
| **new** · the viewer | — | The resolved document, rendered, read-only |
| **new** · the answer key's renderings | — | Its own file, its own heading |

**What does NOT change**: `job:adapt` still writes `material/<job>/<code>/adapted.md`, and
`runCompose` still writes `material/<job>/ir.md`. The writers keep their paths; the
readers stop assuming one.

## The four rules

### 1 · The draft mark stays derived from the document

`007` FR-509, and it is the rule most at risk here. `isSignedOff(doc)` is read from the
document and is **never** a parameter — because it used to be one, defaulting to false and
passed straight through, so `job.render(job, learner, true)` produced an unmarked
worksheet with no sign-off having happened.

Routing through a resolver must not reintroduce that. The mark is read from whatever
document the resolver returned, and no caller may say otherwise.

### 2 · The viewer executes nothing

FR-1924, Principle IX. The document is rendered as the HTML the printer produces, in a
frame with **no script permission, no navigation, no form submission and no remote
reference**.

`renderHTML` emits no `<script>` — checked, zero occurrences — so the sandbox is not
compensating for what we generate. It is the guarantee for what the *document* may
contain: a composed sheet rests on an anchor she pasted, and `007` treats that text as
content, not as instruction.

### 3 · The answer key never shares a file or a page with the sheet

`002`'s rule, extended to every rendering. And every rendering of the key says on its face
that it is the solutions and is not to be handed out (FR-1922).

**Checked on both sides** (SC-1908): no answer in any rendering of a learner's material,
and the heading on every rendering of the key. One of those two failing is what puts
solutions in a child's hands.

### 4 · Nothing here starts an adaptation, and nothing here calls a model

FR-1906. Viewing, printing, exporting and signing are deterministic. The only operation in
this feature that spends money is a correction, and it spends it the same way composing
already does.

## Correcting composed material

**A separate operation from `job:revise`** (research R3), because it is a different thing:

| | `job:revise` | composed correction |
|---|---|---|
| Runs | `runAdaptation` | `runCompose` again |
| Produces | a new adaptation | a new composition **and a regenerated answer key** |
| Re-verifies | nothing further | **the key, before she is shown anything** (FR-1919) |

Pointing `job:revise` at a composed job would ask a model to adapt it — producing the
wrong kind of document and leaving `answers.md` describing exercises that no longer exist.

The scope question is asked exactly as it is after an adaptation, and nothing infers it
(FR-1917, Principle VIII). A signature does not survive it (FR-1920).

## What is refused outright

| Asked for | Response |
|---|---|
| A mark scheme, weighting or pass mark | Not produced, anywhere, for any kind (FR-1913) |
| Marking a learner's answers | Not done, and not reachable through this feature (FR-1914) |
| Printing an exam whose key could not be fully verified | What could not be checked is named **before** the print, not after (FR-1915) |
| Removing the draft mark without signing off | Structurally impossible: the mark is derived (`007` FR-509) |
