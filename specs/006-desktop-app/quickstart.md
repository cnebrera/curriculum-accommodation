# Quickstart — validating the feature

How to prove this works. The order matters: the machine tests are cheap and catch
regressions; the human test is the one that decides whether the feature exists.

## Prerequisites

Node 22 LTS. No API key needed for anything but the last section — that is the
point of Principle II.

## 1 · The core is deterministic and model-free

```bash
cd app && npm ci
npm run test:core           # offline: no key, no network
npm run test:isolation      # fails if core can reach the network
```

`test:isolation` asserts the module graph under `packages/core` never reaches
`packages/providers`, `node:http`, `node:https`, `undici` or `fetch`. **Expected:
pass with the principle quoted on failure.** This is the constitution as a test.

## 2 · The vault survives a teacher

```bash
npm run test:vault
```

Covers R3: broken YAML, unknown keys, an axis out of range, a renamed file, a
duplicated learner. **Expected: every case repaired and reported, no case
rejected, no teacher-authored text lost in any case.**

## 3 · Content cannot become instruction

```bash
npm run test:injection      # fixtures from specs/007-untrusted-content
```

**Expected, for every fixture**: adapted as content; a teacher-visible notice
quoting and locating it; nothing silently removed; no learner data in
learner-facing output; no write outside the vault.

The two clean controls — a Language worksheet on imperatives, a computing
worksheet with example commands — must adapt normally **and raise no notice**. A
detector that cries wolf is a detector that gets ignored.

## 4 · Print output is what we think it is

```bash
npm run render:sample && npm run check:photocopy
```

Renders the sample worksheet to PDF and checks it survives black-and-white
reproduction: contrast after desaturation, no meaning carried by colour alone, no
structure lost. **Expected: pass at every profile-driven colour setting.**

## 5 · The journey, end to end

```bash
npm run test:e2e            # Playwright, onboarding first
```

Drives install → vault → key → learner → adapt → print. **Expected: completes with
no step requiring knowledge outside the app.**

## 6 · The test that actually decides it

Everything above can pass while the feature fails.

**Protocol.** Give a special-education teacher who has never used AI the installer
and nothing else. Say nothing. Record the timestamp, the screen, and what she says
out loud at every hesitation. **Do not speak until she has asked twice.**

**Pass:** installer to printed adapted worksheet, unassisted, no documentation,
under 30 minutes (SC-401).

**Every intervention is a logged defect** (SC-407) — including the ones where
staying silent felt unkind. Those are the most valuable entries in the log.

Afterwards, ask two questions and write down the answers verbatim:

- Where are your files, and how would you back them up? (SC-404)
- Roughly what does a month of this cost? (SC-406)

If she cannot answer either, the feature is not finished, however well the tests
went.
