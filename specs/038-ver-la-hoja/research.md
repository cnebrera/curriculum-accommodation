# Research · Ver la hoja

Four unknowns. Three were resolved by reading the code and one by measuring an artefact
that already exists.

---

## R1 · How does the record obtain a rendered sheet?

**Decision: drive the application over IPC — `job:render` and `job:pdf` — from the
existing `screenshot.mjs`, against a temporary vault seeded with the hand-authored
sample.**

**Rationale.** Two independent reasons land on the same answer, which is the comfortable
kind of decision.

The first is a hard constraint, and it was not obvious until checked.
`app/packages/core/package.json` declares:

```json
"main": "./src/index.ts"
```

`@rampa/core`'s entry point is **TypeScript**. `app/scripts/screenshot.mjs` is plain ESM
run by `node`, so it cannot import `renderHTML` at all. Every path that reaches the
renderer from that script goes through the application.

The second is that it makes FR-3609 true by construction rather than by care. What gets
captured is what `job:pdf` produces for a teacher — same renderer, same options, same
presentation resolution in `jobs/print.ts`, same `checkOutput` on the way out. A record
that rendered by a private route would be a record of something nobody receives, and
that is the failure mode of every screenshot suite that has ever drifted.

And the script already does this. It drives `window.rampa.vault.use`,
`learners.newCode`, `learners.save` and `names.set` today; adding `job.render` and
`job.pdf` is the same kind of call.

**Alternatives considered.**

| | Why not |
|---|---|
| Move the record into a playwright `.spec.ts`, which can import `core` | A spec fails builds. FR-3604 says this must never fail anything, and ADR 0009 explains why: a record that gates a build becomes a baseline somebody updates without looking |
| Reuse `sheet-a11y.spec.ts`'s hidden `BrowserWindow` and `loadFile` | Same problem — it is a spec — and it renders by a private route, so FR-3609 would be a promise rather than a property. Its window is the right *technique* and the wrong *home* |
| Build `core` to JS first so the script can import it | A record that needs a build step is a record nobody runs. And `npm run shots` already runs `npm run build`, so the build exists — but importing compiled output couples the script to the bundler's layout, which `013` T013's own comment warns about |

**Consequence for the tasks.** The sample's *adapted* document is what gets rendered, not
its source: `sample/ensayo/material/ensayo-1/E00/adapted.md`. It is hand-written,
reviewed as corpus, and `035` already pins it. No model is called, so FR-3612 holds.

---

## R2 · How is the presentation set enumerated without stating it twice?

**Decision: enumerate axis level combinations, and derive the presentation by calling
`presentationFor` on each. Never list presentation values.**

**Rationale.** `presentationFor(levels)` in `app/packages/core/src/render/html.ts:491`
is the single place that turns barriers into typography:

```ts
if (at('PER-V', 1)) { p.fontSize = '18pt'; p.measure = '52ch'; }
if (at('PER-V', 2)) { p.fontSize = '24pt'; p.ink = '#000'; p.paper = '#fff'; p.measure = '44ch'; }
if (at('DEC', 1))   { p.lineHeight = '2'; p.letterSpacing = '0.05em'; p.wordSpacing = '0.16em'; }
if (at('COG', 2) || at('ATE', 2)) p.oneTaskPerPage = true;
if (at('REG', 2))   p.accent = '#4a5a5d';
```

Five rules over four axes. A literal list of the presentations they produce would be a
second copy of that function, and the drift is not hypothetical — it has already
happened, and measuring it sharpened this decision.

`app/e2e/sheet-a11y.spec.ts:58-65` hardcodes three presentations with a comment arguing
for «three and not thirty». Its largest one is
`{ fontSize: '24pt', lineHeight: '2', measure: '44ch' }`. Those three values do come
from real rules — 24pt and 44ch from `PER-V:2`, `lineHeight: 2` from `DEC:1` — so the
combination *is* reachable, by a learner who has both axes. What that learner actually
receives, computed from the function, is:

```json
{ "fontSize": "24pt", "measure": "44ch", "ink": "#000", "paper": "#fff",
  "lineHeight": "2", "letterSpacing": "0.05em", "wordSpacing": "0.16em" }
```

Four properties more than the literal: the maximum-contrast ink and paper, and the
letter and word spacing that are the entire point of `DEC`. So the hardcoded value is a
**subset** of a real presentation, and the axe sweep runs over a sheet **less adapted
than any learner's** — including, notably, at `#111` on white rather than the `#000` a
`PER-V:2` learner gets. The test is weaker than it looks, and nothing said so.

That is the drift a literal list produces: not a wrong value, a **stale** one, plausible
enough that nobody rereads it. Which is ADR 0009's argument about baselines, in a place
nobody thought of as a baseline.

So the new module lists **inputs**:

```ts
{ id: 'sin-barreras',        levels: {} }
{ id: 've-poco',             levels: { 'PER-V': 1 } }
{ id: 've-muy-poco',         levels: { 'PER-V': 2 } }
{ id: 'descifra-con-esfuerzo', levels: { DEC: 1 } }
{ id: 'una-tarea-por-pagina',  levels: { COG: 2 } }
{ id: 'satura',              levels: { REG: 2 } }
```

and the presentation comes out of the renderer. A rule added to `presentationFor`
without an input here shows up as a presentation with no picture, which
`presentations.test.ts` asserts by comparing the distinct presentations the enumeration
produces against the axes the function actually reads.

**Alternatives considered.** Enumerating the full cross product of ten axes at four
levels each is 4¹⁰ — meaningless, and most combinations produce identical output because
only four axes touch presentation. One representative per rule, plus the empty baseline,
is the set that covers what the function can do.

**Note for `040`.** This module is the seam that feature extends: an appearance band is
another input, and the same enumeration then produces band × axis presentations without
either being written twice. FR-3615 is satisfied by this shape existing, not by bands
existing.

---

## R3 · In what form is a page captured?

**Decision: `printToPDF` for the page of record, `capturePage` for the first-page image,
both from Electron's main process against a window the record owns.**

**Rationale.** `printToPDF` is already the production path —
`app/packages/shell/src/jobs/print.ts:157` uses it, and ADR 0008 chose Electron over
Tauri on that single argument — so the captured page is the artefact, not a likeness of
it. A4, `printBackground: true`, and the same 0.6in margins a teacher gets.

The image is not redundant. All three defects that motivated this feature — the doubled
number, the code block, the wrong typeface — were visible on **page one**, so an image
catches that entire class in a directory listing, without opening a document viewer. The
page is what settles pagination, which the image cannot show and which is what fooled
everybody.

`app/e2e/sheet-a11y.spec.ts:78-105` already demonstrates the technique: `app.evaluate`
runs in the main process, opens `new BrowserWindow({ show: false, webPreferences: {
sandbox: false } })`, and `loadFile`s the sheet. Its own comment records why that window
is not a violation of `037` FR-3511 — «no es el visor de la aplicación y no le toca nada
— ése sigue con su `sandbox=""` intacto». The same reasoning covers this use, and this
feature does not need scripts in the window at all, so it can be stricter than the axe
harness and leave `sandbox` alone.

**Alternative considered.** Capturing the application's own preview window instead of a
document window. Rejected: the preview is a screen, so it scrolls, and the pagination
would be invisible again.

---

## R4 · Does a captured sheet change between two runs?

**Decision: no, and it was measured rather than assumed. No mitigation is needed beyond
keeping it that way, which FR-3614 does.**

**What was checked.**

`renderHTML` and `draft.ts` interpolate no clock, no randomness and no filesystem path:

```
grep -n "new Date|Date.now|Math.random|tmpdir|process.cwd" render/html.ts render/draft.ts
→ no matches
```

The one value that looked dangerous is the sign-off date. `job:signOff` returns
`{ signedOff: true, date: '2026-09-09' }` and writes it into the document's front
matter, so a signed sheet captured today and tomorrow could have differed. It does not:
`draftMark` returns `null` for a signed document (`render/draft.ts:38`), so the signed
sheet has **no banner and no watermark at all**, and nothing else in the renderer prints
a date. Verified against the real artefact — a signed sheet rendered from a real
adaptation on 2026-09-09 contains zero occurrences of that date.

The sample's own `adapted_on: "2026-09-02"` is a fixed value in reviewed corpus, so it
is stable by construction.

**Alternatives considered.** Normalising dates out of the captured page after the fact.
Rejected as unnecessary and as the wrong shape: post-processing a record makes the record
differ from the artefact, which is the property FR-3609 exists to protect.
