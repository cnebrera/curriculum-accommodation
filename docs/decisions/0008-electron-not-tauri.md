# 0008 — Electron, not Tauri

**Status:** Accepted · 2026-08-29 · **revised the same day, after being challenged**

## Context

[ADR 0005](./0005-delivery-vehicle.md) chose a desktop application and listed the
option as **"Tauri/Electron"** — one row in a table, never split. `006` research
R11 then chose `electron-builder`, which presupposes Electron.

The choice was therefore made by implication and never argued, which is how a
decision gets relitigated by whoever is looking at it that day. It was relitigated
on 2026-08-29 by someone looking at an ugly screen and reasonably asking whether
the framework was to blame.

It was not — see [ADR 0009](./0009-composition-not-tokens.md). But the question was
fair and had no written answer.

**This ADR was written once, challenged, and rewritten.** The first version gave
three reasons; two of them were overstated and are corrected below, because an ADR
with a bad argument in it is worse than no ADR — it gets quoted.

## The numbers, measured on this machine

| | Electron | Tauri |
|---|---|---|
| Download | ~110 MB | ~10 MB |
| Resident memory | **383 MB**, production build, measured | ~120 MB |
| Our own code | 1.1 MB | 1.1 MB |

The first draft blamed the memory figure on dev mode. It did not: a production
build measured 383 MB against 398 MB in dev. **The numbers favour Tauri and are
not close**, and nothing below softens that.

## What moving would actually cost

Also worth measuring rather than asserting. Only one package is tied to Electron:

| | Lines | Survives a move? |
|---|---|---|
| `packages/core` | 4,476 src · 4,898 test | **Yes** — platform-agnostic TypeScript |
| `packages/providers` | 867 · 1,050 | **Yes** — `fetch` |
| `ui` | 4,344 | **Yes** |
| `packages/shell` | **3,035** · 739 | No. This is the Electron edge |

So it is ~3,000 lines plus the PDF problem, not a rewrite. The first draft implied
otherwise.

## Two arguments the first draft got wrong

**"Three webview engines mean three print outputs."** Overstated.
`checkPhotocopy` operates on the **HTML string**, not on rendered pixels, so it is
engine-independent. The engine matters for the PDF and for nothing else.

**"The privileged side must be TypeScript, or the security posture collapses."**
Overstated. Tauri v2 has capability scoping that could enforce vault paths, and
`isolation.test.ts` walks a TypeScript import graph that survives any host. The
redaction chokepoint is a property of the code, not of the process boundary.

## The one argument that decides it

**Tauri has no programmatic HTML-to-PDF, and this application's output is a PDF
file that a teacher sends to a colleague.**

Not "a different engine" — none. The available paths are:

1. **A `wkhtmltopdf` sidecar.** A per-platform binary of an archived project, and
   `006` **FR-425 forbids it by specification**: *"MUST render HTML and PDF itself,
   with no external tooling."* Not a matter of taste.
2. **`window.print()` and a dialog.** She saves-as by hand, differently on each
   platform, and there is no file to attach until she has. WebView2 has
   `PrintToPdfAsync`; Tauri does not expose it.
3. **Lay the PDF out ourselves** with `pdf-lib` or similar: rebuild text wrapping,
   page breaks and tables — for a document whose entire purpose is careful
   typographic presentation for a learner with reading difficulties.
4. **Rasterise the HTML into an image.** Kills text selection and PDF
   accessibility. For material aimed at learners who may need a screen reader or
   reflow, that is a regression aimed precisely at the people this exists for.

And the PDF is not merely how she prints. `docs/escenario.md`: *"El tutor de Hugo
le pide la ficha para tenerla en clase: le reenvía el PDF ya firmado."* It is the
artefact that leaves her hands.

## Decision

**Electron**, on that one reason. The ten-times download and three-times memory buy
a programmatic, identical-everywhere HTML-to-PDF that the product's output depends
on, and there is no equivalent.

**And the decision is made cheap to reverse.** `packages/shell` is already the
boundary; `013` tightens it so that a future move is a known 3,000 lines rather
than an unknown. That is the honest response to a decision whose numbers point the
other way: not to defend it harder, but to keep the exit affordable.

## What would reopen this

1. **Tauri gains programmatic HTML-to-PDF.** [tauri#12284](https://github.com/tauri-apps/tauri/issues/12284)
   and [wry#707](https://github.com/tauri-apps/wry/issues/707) are the issues to
   watch. If that lands, this ADR has no argument left and should be revisited on
   the numbers, which favour Tauri.
2. **A teacher does not install it because it is 110 MB.**
3. **The trolley laptop is unusable with it open** — 1366×768, probably 4–8 GB.
   383 MB is one application's worth, and Chrome with three tabs is worse, but it
   is measured on a developer's machine and not on hers.

None of 2 or 3 is measured. Until one is, this stands on the PDF path alone.

## Sources

- [tauri-apps/tauri#12284 — PDF generation programmatically](https://github.com/tauri-apps/tauri/issues/12284)
- [tauri-apps/wry#707 — print webview to pdf silently](https://github.com/tauri-apps/wry/issues/707)
- [tauri-apps/tauri#4917 — Provide print API](https://github.com/tauri-apps/tauri/issues/4917)
- [tauri-apps discussion #2591 — How to print to pdf?](https://github.com/tauri-apps/tauri/discussions/2591)
