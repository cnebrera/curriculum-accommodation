# Contracts · the three channels, which already exist

**Nothing here is new.** All three are implemented in
`app/packages/shell/src/ipc/diagnostics.ts` and exposed in `preload.ts`, and until this
feature **no screen called any of them** — which is the defect `036` exists to close.
Written down because a contract nobody stated is a contract that changes silently.

## `diagnostics:path` → `string`

Where the log is, as an absolute path on her machine.

- **Never fails.** It composes a path; it does not touch the disk. A path for a file that
  does not exist yet is still the right answer to «where would it be».
- **Shown, not made clickable.** It is a path to a file, and the way to reach it is
  `reveal` — a path she can select and copy is enough (FR-3406).

## `diagnostics:reveal` → `true`

Opens the folder containing the log in her operating system's file manager, with the file
selected.

- **The folder, not the file.** Opening the file would launch whatever editor is
  registered for `.log`, which on a school laptop is anybody's guess. The folder is where
  she can attach it from, and it holds the rotated previous generation too (FR-3408).
- Returns `true` unconditionally: the OS was asked. Whether a file manager appeared is not
  something this process can know.

## `diagnostics:tail(lines = 200)` → `string`

The last `lines` lines of the current log, as one string. Not the rotated generation.

- **A tail and not the file** (research R3): the file may be 2 MB and this screen is
  opened on a machine that is already misbehaving.
- **The current generation only.** The folder holds both and the screen says so; there is
  no selector, and the measurement behind that is in the Clarifications (a line is ~100
  bytes, so rotation is a once-a-year event at most).
- **On failure it must be distinguishable from emptiness.** «Could not read» and «nothing
  logged yet» are different facts and get different sentences (research R5, FR-3407).

## What this feature MUST NOT add

- No channel that sends the log anywhere (FR-3411).
- No new host in the declared-destinations list (FR-3412). A clipboard is not a
  destination — research R4.
- No change to `diagnostics:network`, which is `035`'s counter and is how SC-3404 is
  measured rather than claimed.
