# Screenshots

The record for `013`, whose success criterion is visual and therefore cannot be
asserted — only shown.

- `013-before/` — every screen at 1366×768 on 2026-08-29, **before** the
  composition work. Taken after Carlos opened the application and said the front
  end looked terrible.
- `013-after/` — the same screens, same size, once the shell exists.

## Why these are committed

A visual change with no *before* is a change nobody can review, including the
person who made it — who by then remembers only the after.

## Why there is no pixel-diff test

[ADR 0009](../decisions/0009-composition-not-tokens.md). Pixel diffs on a young
interface fail on every intentional change, get updated without being read, and
then assert whatever the last commit produced. These are a record for a human, not
a gate.

## Taking them

`app/scripts/screenshot.mjs`, against the built application.
