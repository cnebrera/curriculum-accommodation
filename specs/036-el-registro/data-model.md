# Phase 1 · Data model

Nothing new is stored. This feature reads what already exists, and the model is written
down because the spec's requirements are about it.

## The log file

| | |
|---|---|
| **Where** | `<userData>/logs/rampa.log` — the OS application-data directory |
| **Not where** | anywhere under her vault (FR-3402) |
| **Bound** | rotated at 2 MB into `rampa.log.1`, one generation kept (FR-3403) |
| **Written by** | one sink installed at startup; a write failure is swallowed (FR-3405) |
| **Never contains** | a learner's name, her material, or anything reproducing either (FR-3401) |

**Why `userData` and not the vault** is a data-model fact and not a preference: her vault
is what she copies to a new laptop, what a backup copies, and what she hands to a
colleague. A diagnostic in there would travel with all three. The same reasoning keeps the
pictogram licence acceptance out of a handover (`024` FR-2219).

## A log line

```
2026-09-07T13:45:12.345Z INFO  app.started {"version":"0.1.0","platform":"darwin"}
└─ ISO timestamp ────────┘ └level┘ └event┘ └─ sanitised fields ─────────────────┘
```

| Field | Rule |
|---|---|
| `at` | ISO 8601, written by the logger and never by a call site |
| `level` | `debug` \| `info` \| `warn` \| `error`; a packaged build writes `info` and above |
| `event` | a dotted name — `corpus-update.no-destination`, `pictograms.word-chosen` |
| `data` | primitives only, **after `sanitise()`**: forbidden keys become `[omitido]`, strings over 120 chars become `[N caracteres]`, anything else is stringified and cut at 60 |

**`data` is where the whole safety argument lives**, and it is enforced in `Logger.log`
rather than at the call sites — which is why FR-3401 is a description of behaviour and not
a hope. Its edge is recorded in research R1.

## What the screen holds

No entity, no persistence, no state that survives the screen. It reads three things and
keeps none:

- the path (a string),
- the tail (an array of lines, bounded at 200),
- whether reading failed (three distinct answers — research R5).

**Deliberately no «last opened», no «dismissed», no preference.** Nothing here is a
decision she makes, so nothing here is worth remembering. A screen that stored something
would be a screen with state to get wrong.
