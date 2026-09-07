# Quickstart · validating `036`

## Prerequisites

A built application (`npm run build` in `app/`) and a vault with one learner whose name is
set. The name matters: §3 is the criterion the whole feature rests on.

Nothing here needs a provider, a key or money. That is worth saying explicitly, because
most of this repository's quickstarts have a paid section and this one does not.

## §1 · She finds the log without being told where it is (US1, SC-3401)

1. Open the application and let it start.
2. **Configuración ▸ Acerca de y licencias**.
3. Scroll to the log section.

**Expect**: the path to the log, the last lines of it, a way to copy them, and a way to
open the folder. Nothing asked her to know what «application data» means.

## §2 · The three empty states are three different sentences (research R5)

1. **Fresh install, nothing logged** — «todavía no hay nada apuntado». Not an empty box.
2. Make the log unreadable (`chmod 000` on the file) and reopen the screen — «no he podido
   leerlo», and the path still shown so she can look herself.
3. Restore it.

**Expect**: three distinct answers. An empty box is the shape of a rendering fault, and
this is the screen she opens when she already suspects something is broken.

## §3 · What she is about to send carries nothing about a child (US2, SC-3402)

**This is the section that matters.** The log's whole safety argument is «it contains
nothing about a learner», and until now that was our claim about a file she could not see.

1. Adapt material for the learner whose name is set. Let it finish.
2. Come back to the log section and read the lines.
3. Search them for her name.

**Expect**: zero occurrences. Timestamps, event names, codes, counts and durations —
no name, no fragment of the worksheet. If her name appears, **stop**: FR-3401 is broken
and it is not a display defect, it is a call site writing something it must not.

## §4 · A log line that carries document text is text (FR-3410, Principle IX)

1. Adapt material containing something that looks like markup — `<script>`, a Markdown
   link, `**bold**` — and let a warning about it reach the log.
2. Read the lines.

**Expect**: it appears as characters. Nothing is bold, nothing is a link, nothing
executed. A log line can quote a document, and a document is never an instruction.

## §5 · Copy, and it is her act (FR-3409, FR-3411)

1. Press copy.
2. Paste into a text editor.

**Expect**: the same text that was on screen, plain. And nothing left the machine —
which §6 measures rather than assumes.

## §6 · Opening the screen reaches nothing (FR-3413, SC-3404)

1. Launch with `RAMPA_TEST=1`.
2. Open the log section, copy, open the folder.
3. Ask `window.rampa.diagnostics.network()`.

**Expect**: `count: 0` and an empty `urls`. Counted in **both** stacks — Chromium's
session and Node's `fetch` — because a provider call leaves through the second one and a
listener on the first would sit at zero while something escaped.

## §7 · A log that cannot be written does not break anything (FR-3405, SC-3403)

1. Make the `logs/` directory unwritable.
2. Adapt something, compose something, sign a sheet.

**Expect**: everything completes, and **no message about logging reaches her**. Where the
two conflict the work wins. A tool that crashes because it could not write a diagnostic
has turned its diagnostic into a defect.

## §8 · At every width and the largest text (SC-3405)

With the log at its size limit, at 1366px, 900px and 560px, and at `xlarge`.

**Expect**: the lines readable, nothing scrolling sideways, and the section not pushing
the rest of «Acerca de» off the page. A monospaced block of 200 lines is the widest thing
this screen has ever held.
