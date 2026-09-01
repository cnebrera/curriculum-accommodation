# Data model

Two shapes in memory, one field on disk. That ratio is the point: this feature is about
where things are, and a redesign that needed a new data model would be redesigning
something else.

## `Route` — where she is

```ts
/** The learner's sections. Four, and two more set apart. */
export type LearnerTab =
  | 'who'          // Quién es
  | 'prepare'      // Preparar
  | 'made'         // Lo que le he preparado
  | 'curriculum'   // Su adaptación curricular
  | 'handover'     // Preparar el traspaso
  | 'erase';       // Borrar todo lo suyo

/** A step of a flow inside `prepare`. Absent when she is choosing a branch. */
export type Flow =
  | { of: 'adapt';   step: 'kind' | 'bring' | 'verify' | 'whoElse' | 'review' }
  | { of: 'compose'; step: 'ask' | 'summary' | 'whoElse' | 'review' };

export type Route =
  | { at: 'caseload' }
  | { at: 'settings'; pane: SettingsPane }
  | {
      at: 'learner';
      /** The code. Never the name — see the note below. */
      code: string;
      tab: LearnerTab;
      /** The job this flow is about, once one exists. */
      job?: string;
      flow?: Flow;
      /** Who else it is for, chosen at the `whoElse` step. Includes `code`. */
      also?: string[];
    };
```

### Rules

**The route holds a code, never a name.** A name exists only in memory
(`003`); the heading resolves it for display. A `Route` carrying a name would be a name
in application state that a future «restore where I was» could try to persist — and
FR-1806 exists so that path never opens.

**It is not persisted.** Restarting lands on the caseload. `015` settled the same
question for filters: a half-finished state restored on Monday is a screen that looks
wrong with no visible cause.

**`also` always contains `code`.** The learner she entered through is *in* the batch, not
beside it. Modelling it as «the others» is how `016` FR-1411 gets broken by a data
structure rather than by a screen.

**A `Flow` cannot exist without a `tab: 'prepare'`.** Enforced by the type, so no screen
can render a step outside the section that owns it.

## `LearnerPlace` — what the shell needs to draw the learner

```ts
export interface LearnerPlace {
  code: string;
  /** Display only, resolved in memory (013 FR-1107 joins it once). */
  name: string;
  /** Her own strip, in her own place — not a comparison (015 FR-1312). */
  axes: Record<string, number>;
  /** Work left half-finished, if any (FR-1825). */
  unfinished?: { job: string; pages: number; confirmed: number };
}
```

No new field about the learner is introduced: `015` FR-1308 forbids it, and every
value here already exists.

## `for_learner` — the one field on disk

```yaml
---
source: photos
for_learner: E38          # ← new
extraction: { verified: false }
---
```

**What it means**: the learner this job was started for. Provenance, not a claim about
who it ended up serving — a job serves everyone in `also`, and the record derives that
from the directories exactly as `005`'s data model says.

**Why it has to exist**: an ingested job has never recorded it (research R3). Until now a
job became a learner's only when `material/<job>/<code>/adapted.md` appeared, which is
*after* the adaptation — so «which learner has work half-finished?» had no answer, and
the pending card could only offer a job id.

**Why it is not a second copy of a truth**: the truth it records — *she said this was for
this child* — is not written anywhere else. What **is** derived, and stays derived, is
who a finished job served.

### The older spelling

`002` already writes `composed_for` for the same fact (`compose/sheet.ts`), read by
`record/scan.ts` so a composed job appears in her record before it is adapted. So:

```ts
export const startedFor = (fm: Record<string, unknown>): string | undefined =>
  str(fm['for_learner']) ?? str(fm['composed_for']);
```

One reader, both spellings, `for_learner` written from now on. The alternative —
`composed_for` for composed jobs and `for_learner` for ingested ones — is two names for
one fact, which is the defect this project has found more times than any other.

## What deliberately gains no field

| | Why |
|---|---|
| «Sections she has visited» | Nothing needs it, and it would be behaviour tracking a teacher did not ask for |
| «Last learner opened» | The route is not persisted (above) |
| A stale/fresh flag | Derived, decided yesterday for `005` FR-520 and unchanged |
| Who a job finally served | Derived from the directories (`005`) |
