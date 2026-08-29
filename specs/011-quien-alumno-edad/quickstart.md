# Quickstart — validating who the learner is

Prerequisites: `cd app && npm ci && npm run bundle:corpus && npm run build`.

## §1 · The Spanish file parses, and says what it should

```
npx vitest run packages/core/test/education.test.ts
```

Reads the **shipped** `instructions/education/es.md`. Asserts every stage Carlos
named is present — Infantil, Primaria, ESO, Bachillerato, FP Básica y Grado Medio,
educación especial, personas adultas — that Bachillerato carries its modalities,
that educación especial and adults carry `typical_age: null`, and that the file
states in its own text that it is the state minimum.

Also asserts `reviewed_by_teacher: false`, and will keep asserting it until a
teacher has disagreed with something. **That assertion failing is good news.**

## §2 · Repair, not reject

Same file. A missing id, a broken year, an absurd `typical_age`, a system with no
stages — each degrades as the contract says and none throws.

## §3 · The profile carries it, and the vault stays readable

```
npx vitest run packages/core/test/profile-roundtrip.test.ts
```

A profile with age, year and stage round-trips; a profile without them still
loads; `stage` is stored as a label so the YAML is legible with no application.

## §4 · The prompt says who he is

```
npx vitest run packages/core/test/prompt.test.ts
```

Age, year and stage reach the prompt. A two-year divergence is stated in words. A
one-year difference is not — a sentence that fires on most learners stops being
read. **No fields means no section**, never "edad: desconocida".

## §5 · It never reaches the child

```
npx vitest run packages/core/test/untrusted.test.ts
```

`007` FR-506/507 extended: the renderer is not handed the new fields, and
`checkOutput` fails a render containing them.

## §6 · One choice, in the real window

```
npx playwright test e2e/learner.spec.ts
```

The system is asked once at first run and not again. Picking a year fills the
stage and the age; changing the age leaves the year alone; a year with no typical
age fills nothing.

## §7 · With a teacher — not automated, and the only one that matters

Show her the Spanish file. Not the interface: the file.

Ask her where it is wrong. If she says it is fine, ask again about the year she
teaches — politeness reads as agreement and it is not.

Then set `reviewed_by_teacher` and record what she changed in
`specs/006-desktop-app/validation.md`.
