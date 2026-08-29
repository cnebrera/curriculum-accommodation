# 0008 — Electron, not Tauri

**Status:** Accepted · 2026-08-29

## Context

[ADR 0005](./0005-delivery-vehicle.md) chose a desktop application and listed the
option as **"Tauri/Electron"** — one row in a table, never split. `006` research
R11 then chose `electron-builder`, which presupposes Electron.

So the choice was made by implication and never argued, which is how a decision
gets relitigated every six months by whoever is looking at it that day. It was
relitigated on 2026-08-29, correctly, by someone looking at an ugly screen and
reasonably wondering whether the framework was to blame.

**It was not.** The screen was ugly because a design system was built and never
composed into a page — recorded separately in [ADR 0009](./0009-composition-not-tokens.md).
But the question deserved a real answer, and there was none written down.

## The numbers, measured

| | Electron | Tauri |
|---|---|---|
| Download | ~110 MB | ~10 MB |
| Resident memory | ~400 MB (dev; production lower) | ~120 MB |
| Our own code | 1.1 MB | 1.1 MB |

Tauri wins on both, by a lot, and neither number is close. Any argument for
Electron has to be worth **ten times the download** on a school's wifi.

## What decides it

Three things, all specific to this project rather than general:

### 1 · Print fidelity is the product

What leaves this application is a sheet a child holds — printed, and photocopied
in black and white by a machine nobody maintains. `checkPhotocopy` exists;
`printToPDF` is the render path.

**Electron ships one Chromium on all three platforms.** What she prints is what we
tested, once.

**Tauri uses the system webview**: WebKit on macOS, WebView2 on Windows, WebKitGTK
on Linux. Three engines, three print outputs, and the one we cannot test is the
one on her machine. A single guarantee becomes three, of which we would verify
one — and the failure would be invisible until a sheet came out of a photocopier
wrong.

### 2 · The privileged side is TypeScript, and it is where the guarantees live

667 tests cover vault path resolution, IR parsing, recipe selection, name
redaction and the egress chokepoint. All of it runs in the main process, in Node.

In Tauri the privileged side is Rust. Two options, both bad:

- **Rewrite it in Rust.** Not a discussion.
- **Move it into the webview.** Then the renderer has file access — and
  `resolveInVault`, "the renderer never composes a path" (`009`), and the
  single-chokepoint redaction guarantee (`007` FR-510) *all* assume a privileged
  process the renderer cannot reach. The security posture is not a layer on top
  of the architecture; it **is** the architecture.

### 3 · The isolation guarantee is a module-graph test

`isolation.test.ts` fails the build if anything in `@rampa/core` can reach the
network. It is 48 assertions over a TypeScript import graph, and it is how
Principle II is enforced rather than requested.

Across a Rust/JS boundary that check does not exist in the same form.

## Decision

**Electron.** The ten-times download is paid for by one rendering engine, a
privileged process that speaks the same language as the guarantees, and a module
graph a test can walk.

## What this does not fix

- **The unsigned installer still warns** on Windows and macOS (`006` R14). That is
  a certificate problem, not a framework one, and Tauri would carry it identically.
- **~400 MB resident** on the laptop on the trolley — 1366×768, probably 4–8 GB —
  is noticeable. Survivable because it is one application and Chrome with three
  tabs is worse, but **measured on a developer's machine and not on hers.**

## What would reopen this

Either of these, and both are measurable the day there is a teacher:

1. **A teacher does not install it because it is 110 MB.** Download size becoming
   the barrier, rather than the vocabulary, would change what "cheapest vehicle
   that reaches teachers" means (ADR 0005's own test).
2. **The trolley laptop is unusable with it open.** Not slow — unusable, alongside
   whatever else the school makes her run.

Neither is measured. Until one is, this ADR stands on the three reasons above and
not on the numbers, which favour the other option.
