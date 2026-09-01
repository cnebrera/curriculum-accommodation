# Phase 0 · Research

Six questions. Five had answers in the repository; one changed the scope.

---

## R1 · How is «where she is» represented?

**Decision**: a `Route` value and a pure `reduceRoute`, in `ui/src/nav/route.ts`. No
routing library.

**Rationale**: there is no URL in this shell, so a router would contribute a
dependency, a `<BrowserRouter>` and an API, and solve nothing that a discriminated union
does not. The precedent is exact and in this repository: `ui/src/door/intent.ts` holds
`Intent` + `reduceIntent`, tested offline in `ui/test/door-intent.test.ts`, and it exists
because the door **forgot which child it was for** when its state lived inside the
screen that navigation unmounted.

The second navigation defect points the same way: «Mis alumnos» did nothing when she was
already inside a profile, because the rail set a `view` it already had while the
screen's own `editing` state survived. Both are navigation state in the wrong place, and
both are answered by one value that owns the answer.

**Alternatives considered**: `react-router` in memory mode — rejected for the dependency
and because `013` FR-1112 already constrains what may cross into the renderer;
keeping `useState<View>` and adding cases — rejected, it is what produced the two
defects above.

---

## R2 · What happens to `016`'s `Intent`?

**Decision**: it dissolves, and two of its three fields move into the route or the flow.
`whatIsMissing` survives almost verbatim.

**Rationale**: `Intent = {learners, work, kind}` answered the door's three questions.
Afterwards:

| Field | Where it goes |
|---|---|
| `learners` | The route: the learner is *where she is*, and the others are chosen at the «who else?» step |
| `work` | The branch she picked inside `Preparar` — adapt or compose |
| `kind` | Step 1 of the flow, unchanged, still never defaulted |

`whatIsMissing` is the function that turns an incomplete answer into the sentence
«Dime qué es este material» (`013` FR-1105: a primary control that greys out with no
explanation is a dead end). The flow still needs exactly that, so it moves rather than
being rewritten — with its tests.

**What must not be lost**: `door/intent.ts`'s reducer drops the kind when the door
changes, because an exam that becomes a composition must not silently keep «examen». The
flow inherits that rule; it is a test in `door-intent.test.ts` today and it moves too.

---

## R3 · Which learner does a half-finished job belong to? — *the one that changed scope*

**Finding**: **an ingested job has never recorded who it is for.** `runIngest` writes
`material/<job>/ir.md` with the source, the pages and the notices, and nothing about a
learner (`packages/shell/src/jobs/ingest.ts:223`). A job becomes a learner's only when
`material/<job>/<code>/adapted.md` appears — *after* adaptation.

Which means FR-1825, «the learner with work half-finished is marked in her caseload»,
has nothing to read. Today the pending card in `IngestScreen` shows `2 de 3 páginas` and
a job id, because a job id is genuinely all it knows.

**Decision**: `ir.md` records `for_learner: <code>` when the job is created, and
`ingest:pending` returns it. Written at creation because in the new shape **there is
always a learner by then** — she entered through one.

**And half of it already exists under another name.** `002` writes `composed_for` for
exactly this fact: this job was started for this child (`compose/sheet.ts:271`, read by
`record/scan.ts` so a composed job appears in her record before it is adapted). Two
field names for one fact is this project's most-repeated defect, so:

- `for_learner` is the name, for both paths.
- `composed_for` is **still read**, as the older spelling — the same accommodation
  `isGenerated` makes for `kind: generated`, and for the same reason: a vault written
  last week has documents in it.

**Migration**: jobs already on disk have neither. They are FR-1827's case — surfaced in
the caseload unattached, asking who they are for when she resumes. That is not a
consolation prize for old data; it is the correct behaviour, because for those jobs
nobody ever said.

**Alternatives considered**: infer the learner from the directory — impossible, the
directory is created by adaptation, which is the thing that has not happened yet; scan
every learner's record to find the job — FR-1828 forbids it, and it would be one read
per learner at exactly the roster size the product is for.

---

## R4 · How does the learner's heading get a name?

**Decision**: `useLearners()` / `names.all()`, unchanged.

**Rationale**: the join already lives in the data layer (`013` FR-1107), added because
three screens each did it by hand and one of them kept two `useState`s that could
disagree about which learners exist. The heading is a fourth consumer of a solved
problem. Names stay in memory and never reach a file — the code is what goes to disk.

---

## R5 · What does the learner's menu do in a narrow window?

**Decision**: a second column when there is room, a horizontal strip when there is not,
decided by a **container query** on the shell rather than a media query.

**Rationale**: `013` FR-1116 requires a layout rule that depends on available room to be
expressed against that room, and the mechanism is already in this codebase — `body {
container: window / inline-size }` with `.main` as a second container, queried in `em`
so the text scale participates (`FR-1117`). A media query in pixels cannot see that the
same window holds a third less text at `xlarge`, and this application has a control that
does exactly that.

**The risk this leaves**: three columns at the narrowest width is the failure, and it is
a *looked-at* failure rather than an asserted one. `013` FR-1118 says so, and SC-1805
keeps it.

---

## R6 · What does this cost the e2e suite?

**Finding**: less than feared, because the navigation is already centralised.

| | |
|---|---|
| `e2e/door.ts` | The one helper that knows how to walk to a screen. Becomes `e2e/nav.ts` |
| 5 specs | Use the helper — fixed by fixing it: `a11y`, `door`, `group`, `layout`, `material` |
| 4 places | Navigate by hand via the rail's «Mis alumnos» |
| 3 lists | Enumerate «the five rail screens» and become «the two»: `a11y.spec.ts:159/220`, `layout.spec.ts:135`, `group.spec.ts:118` |

**Decision**: rewrite the helper first, with US1. A suite whose helper already agrees
with the new shape verifies every later step; a suite migrated at the end verifies the
last one.

**What must not happen**: loosening an assertion to make a walk pass. `door.spec.ts`
asserts both branches start `aria-pressed="false"` and that the primary control names
what is missing — those assertions move to the new location and stay exact. The routes
change; what they check does not.
