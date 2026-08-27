# Learner profile schema

A profile describes **what a learner finds hard and how they respond best**. It
does not describe a diagnosis.

Two learners with the same diagnosis need different things, and the same learner
needs different things in maths and in reading. Barriers are also the only
representation that survives pseudonymisation with its usefulness intact.

## Rules

- **No identity.** No name, no surname, no school, no date of birth, no
  identity-document number, no verbatim clinical diagnosis.
- The file is named by an opaque code: `profiles/A3.yaml`. The teacher keeps the
  mapping to a real learner outside this repository.
- `profiles/` is git-ignored and blocked by the commit hook.

## Axes

Each axis takes a level from 0 to 3.

| Level | Meaning |
|---|---|
| 0 | No barrier |
| 1 | Mild — copes with light support |
| 2 | Moderate — needs adaptation to access the task |
| 3 | Severe or total — needs an alternative route |

**These four words are not enough to score a child consistently.**
See [`docs/axis-calibration.md`](axis-calibration.md) for the observable
behaviour at each level of each axis, and for how to tell the hard pairs apart —
`DEC` from `LIN`, `COG` from `ATE`. Recipes trigger on these numbers, so a level
that means something different in each school makes the corpus unportable.

| Axis | Key | What it captures |
|---|---|---|
| Visual access | `PER-V` | From low vision to total blindness |
| Auditory access | `PER-A` | From hearing loss to deafness; sign language as L1 |
| Decoding | `DEC` | Reading speed and accuracy, independent of comprehension |
| Linguistic comprehension | `LIN` | Vocabulary, complex syntax, figurative language, inference |
| Cognitive load | `COG` | Working memory; simultaneous elements tolerated |
| Attention | `ATE` | Sustained and selective; tolerance of on-page distractors |
| Executive function | `EJE` | Planning, sequencing, starting a task, self-regulating |
| Motor and response | `MOT` | How the learner can answer: write, type, point, dictate |
| Sensory regulation | `REG` | Saturation by colour, density, sound; need for predictability |
| Curricular level | `CUR` | Gap against year group. **Only relevant to significant adaptation** |

`CUR` is the one axis that must never drive a recipe on its own: acting on it
means changing objectives, which is a decision for the teaching team.

## Qualitative fields

These carry more weight in practice than the numbers.

| Field | Why it matters |
|---|---|
| `works` | Supports already known to work. Never contradict these |
| `interests` | A worksheet about dinosaurs lands where one about medieval trade does not |
| `avoid` | Triggers: specific images, sounds, colours, topics, time pressure |
| `response` | Preferred response format, per subject if it varies |
| `language` | Language of instruction; L1 if different; sign language |

## Example

See `profiles.example/A3.yaml` — an invented profile, safe to read and copy.

```yaml
code: A3
axes:
  PER-V: 0
  PER-A: 0
  DEC: 2
  LIN: 2
  COG: 3
  ATE: 2
  EJE: 3
  MOT: 1
  REG: 1
  CUR: 1
works:
  - "One task per page; blank space around it"
  - "Numbered steps, ticked off as they are done"
interests: ["dinosaurs", "football"]
avoid:
  - "Dense pages with several exercises visible at once"
  - "Timed tasks"
response:
  default: short
  writing: "Dictates; an adult transcribes"
language:
  instruction: es
notes: |
  Reads aloud accurately but loses the thread on questions with more than one
  clause. Starts a task much faster when the first step is already done as an
  example.
```

## The three files of a learner

| File | What it is | Written by |
|---|---|---|
| `profiles/<CODE>.yaml` | **State.** Axis levels and qualitative fields | `/rampa-profile` |
| `profiles/<CODE>.notes.md` | **History.** Dated notes from review sessions | `/rampa-review` |
| `profiles/<CODE>.adaptations.md` | **Overlay.** The learner's official adaptations, when the teaching team has produced them | The teacher, once |

The YAML is what recipes read. The notes are the narrative behind it: when a note
stabilises, `/rampa-memory` proposes promoting it into the YAML.

The overlay is different in kind. It is **instructions from the teaching team**,
and it **takes precedence over the corpus** — read it before selecting recipes.
What it does not cover, the corpus fills. Format in
[`docs/memory.md`](memory.md).

The one exception to following it: if an overlay statement would breach a hard
rule — falsifying content, easing an assessment criterion — flag the conflict and
ask. Never silently obey, never silently refuse.

## Reading a profile as an agent

- Never infer an axis value that is not written down. Ask the teacher.
- Never write a diagnosis into the profile, even if the teacher mentions one in
  conversation. Record the barrier it produces instead.
- `works` and `avoid` override recipe defaults. A recipe that contradicts a
  documented working support is not applied.
- Load the notes and, if present, the overlay alongside the YAML. A profile read
  without its notes discards everything the teacher has corrected so far.
