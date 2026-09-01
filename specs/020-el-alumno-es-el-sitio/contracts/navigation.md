# Contract — the navigation

Every destination, what may reach it, and the four rules the shell keeps. This is the
whole surface of `020`: no IPC channel changes except `ingest:pending`, which gains a
field.

## The destinations

| Where | Reached from | Owns |
|---|---|---|
| **Caseload** | The rail; the learner's heading; anywhere by pressing «Mis alumnos» | The list, `015`'s filters, and the unfinished-work markers (FR-1825, FR-1827) |
| **Learner ▸ Quién es** | Picking a learner; the learner's menu | The profile editor, the pictogram section, and journal entries scoped to this learner (FR-1818) |
| **Learner ▸ Preparar** | The learner's menu | The two branches, the five steps, and «tenías esto a medias» (FR-1826) |
| **Learner ▸ Lo que le he preparado** | The learner's menu | `014`'s record for this learner, and «hazlo otra vez para otro alumno» |
| **Learner ▸ Su adaptación curricular** | The learner's menu | `017`'s four screens |
| **Learner ▸ Traspaso** · **Borrar** | The learner's menu, set apart | `004` and `003`, unchanged |
| **Configuración** | The rail | Service, house style, display, vault, licences (FR-1817) |

**Nothing else is a destination.** A screen that wants to be reached adds a row here
first, and the row is the argument for why it deserves to be one.

## The four rules

### 1 · The learner's menu never disappears

FR-1807. During every step of every flow, the menu is there and the current step is
marked. She is never held inside a screen she cannot leave — and if leaving costs her
something already paid for, she is **told and not blocked** (FR-1808).

The failure this prevents is not confusion, it is a teacher with a class in ten minutes
who cannot get back to what she was doing.

### 2 · Nothing is reached through a form

FR-1805, and the reason this specification exists. Six destinations were cards under the
edit-profile form. No destination in the table above may require passing through
another destination's editor to get to it.

### 3 · The current destination, pressed again, starts over

FR-1809. «Mis alumnos» from inside a learner returns to the list; `Preparar` from step
four returns to the branches. A control that means «start again here» and does nothing
is worse than one that is absent, and this application shipped that defect once already.

### 4 · One learner's information, never two side by side

`015` FR-1309/1310/1311, restated because the caseload is the screen being rebuilt. The
learner's own axis strip inside their own place is fine and required (FR-1806). Two
learners' strips in aligned columns is not, at any width, in any grouping, including the
grouped view.

## What the shell must not grow

| | Why |
|---|---|
| An action that signs several sheets | `005` FR-512. A menu that can see five sheets is where this arrives by accident |
| A destination that adapts, ingests or calls a provider itself | `016` FR-1410's rule, inherited: the navigation reaches features, it does not become one |
| A learner name in the route, in a log, or in a file | `003`. The heading resolves it for display, and that is the only place it exists |
| A third top-level destination | FR-1802. Five is what this feature is fixing |

## The one channel that changes

```ts
// ingest:pending — gains `learner`
Array<{
  jobId: string;
  pages: number;
  confirmed: number;
  source: string;
  learner?: string;   // ← from `for_learner`; absent for jobs that predate it
}>
```

`learner` is optional **and must stay optional**: every job in every vault today has no
such field, and FR-1827 is the behaviour for exactly those. An implementation that
treated its absence as an error would break the first vault it met.

One call, walking `material/` once, per FR-1828.
