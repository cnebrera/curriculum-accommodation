# Contract · what `npm run shots` promises

The interface this feature exposes is a command and a directory. There is no API, no
schema and no protocol — so the contract is what a person can rely on after running it,
and what they must never rely on.

---

## The command

```bash
cd app && npm run shots            # → docs/screenshots/latest
cd app && npm run shots -- <dir>   # → <dir>, resolved relative to app/
```

Unchanged from today: `screenshot.mjs` already takes an optional output directory and
already defaults to `../docs/screenshots/latest`. This feature adds output to it, not
arguments.

### Preconditions

| | |
|---|---|
| Provider key | **None.** The command must work with no key configured and none in the environment (FR-3612) |
| Network | **None.** Nothing may leave the machine |
| Vault | **None of hers.** The run creates a temporary vault and a temporary userData; it never reads or writes a real one (FR-3607) |
| Build | `npm run shots` already runs `npm run build` first, so a stale `out/` is not a failure mode |
| LibreOffice | **Not required.** The editable document is out of scope (FR-3617) |

### Postconditions

1. The twenty-odd application screens are written, exactly as they are today.
2. Fifteen sheet pages and fifteen first-page images are written beside them, named as
   `data-model.md` describes.
3. The command prints how many sheets it wrote and where (FR-3613).
4. The process exits `0`.

### What it never does

- **It never fails on the content of a sheet.** A sheet that is ugly, unreadable or
  wrong is captured as it is. The command fails only on a broken machine — no build, no
  Electron, an unwritable directory.
- **It never compares.** No baseline is read, no previous run is consulted, nothing is
  hashed (FR-3604 · `013` FR-1114).
- **It never gates.** Not in CI, not in the pre-commit hook, not in `npm test`.
- **It never produces an unmarked draft.** The signed state is obtained through the
  application's own `job:signOff`, never through an option of the record's (Principle
  VII).

---

## What a caller may rely on

**Names are stable.** A `SheetPresentation.id` is part of the record's interface: it is
in filenames that get committed and quoted in review. Renaming one is a change to this
contract and renames files in git.

**A page is the artefact.** What `printToPDF` writes here is what `job:pdf` writes for a
teacher — same renderer, same options, same margins, same A4. Not a likeness of it
(FR-3609).

**The output is deterministic.** Two runs over unchanged inputs produce sheets that
differ only where the sheet differs. Research R4 measured this: nothing in the renderer
interpolates a clock, a path or a random value, and a signed sheet has no banner and no
watermark at all, so even the sign-off date does not reach the page.

## What a caller must not rely on

- **The count.** Fifteen is what the enumeration currently produces. A rule added to
  `presentationFor` adds sheets, by design.
- **Byte-identity across machines.** Font rasterisation and Chromium's PDF writer are
  not promised to agree between platforms. The record is for a person to look at; a test
  that diffed bytes across machines would be the pixel-diff suite this feature is
  forbidden from becoming.
- **The absence of a sheet type.** `data-model.md` lists four kinds because four render
  differently today. That set grows with `041`.

---

## The enumeration, as a contract inside `core`

```ts
// app/packages/core/src/render/presentations.ts
export interface SheetPresentation {
  id: string;
  because: string;
  levels: Partial<Record<Axis, 0 | 1 | 2 | 3>>;
}
export const SHEET_PRESENTATIONS: readonly SheetPresentation[];
```

**The guarantee is what the type does not have.** There is no field holding a
`Presentation` value, so the record cannot state one and cannot drift from
`presentationFor`. Research R2 has the measurement of why that matters: the literal in
`sheet-a11y.spec.ts` is four properties short of the presentation it appears to be, and
its axe sweep therefore runs over a sheet less adapted than any real learner's.

**Two consumers, and the second one is the point of putting this in `core`:**

| Consumer | What it does with it |
|---|---|
| `app/scripts/screenshot.mjs` | One sheet per member, over IPC |
| `app/e2e/sheet-a11y.spec.ts` | Should derive its three hardcoded presentations from this, closing the drift rather than documenting it |

The second is a task in this feature, not a follow-up. Leaving the literal in place while
shipping the enumeration beside it would create two authorities on one thing, which is
this repository's recurring defect generator.

**And a seam for `040`:** an appearance band is another kind of input. When bands exist,
they compose with these levels through the same call rather than being written out — which
is what FR-3615 asks for, satisfied by the shape rather than by the bands.
