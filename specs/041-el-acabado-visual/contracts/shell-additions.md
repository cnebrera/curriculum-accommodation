# Contract — what the shell gains, so a screen never needs `style={{}}`

Extends [`013`'s page-shell contract](../../013-composicion-del-front/contracts/page-shell.md).
That contract said a screen may not choose a max width, a gap, a spinner or a second
primary. It did not say a screen may not write `style={{…}}` — and 143 of them did,
each a layout decision the shell should have owned. This is the list of what was
missing. **After this feature, `ui/test/styles.test.tsx` asserts that no `style={{`
exists in `ui/src` outside the four named exceptions.**

## `Page`

| Prop | New | Why |
|---|---|---|
| `variant?: 'wide' \| 'narrow'` | `narrow` | The onboarding is one column of one question; `60rem` is a page for a table. `narrow` = `max-width: 42rem`. |
| `banner?: ReactNode` | unchanged | The onboarding's wordmark + step indicator go here, as the draft mark does on the review screen: above the title, because it outranks it. |

`Page` now centres itself in the content area and fills its height (`min-height: 100%`).
A screen does not decide either.

## `Section`, `Field`, `Actions`

Unchanged in API. Two facts become explicit:

- There are two `Field`s. `shell/Page.tsx`'s is layout (label, control, help, measure);
  `components/Field.tsx`'s is the **validated** field (state, message, `aria-describedby`).
  Both render `.field`, so both inherit the measure. A screen uses the validated one when
  it has an error to show and the shell one otherwise. They are not merged in this
  feature; merging is a `013` follow-up.
- `Actions`'s `primary` slot does not imply `.btn-primary`. The slot is the *position*;
  the class is the *weight*, and `013` FR-1105 decides who gets it.

## New composition classes (`composition.css`)

| Class | Rule | Replaces |
|---|---|---|
| `.row-split` | `justify-content: space-between` | 15 inline |
| `.row-baseline` / `.row-top` / `.row-bottom` | `align-items: baseline / flex-start / flex-end` | 6 inline |
| `.flush` | `margin: 0` | `marginTop: 0` and `<dl>`/`<ul>` resets |
| `.btn-back` | `align-self: flex-start` + ghost + small + `arrow-left` icon | 4 «← Volver» |
| `.input-xs` / `.input-sm` / `.input-md` | `max-width: 7rem / 14rem / 22rem` | 14 inline `maxWidth` with 7 different values |
| `.axis-level` | `min-height: 2.6em` | 3 inline |
| `.textarea-canvas` | `min-height: 240px` | 1 inline |
| `.divided-top` | `border-top: 1px solid var(--line); padding-top: var(--s4)` | the `var(--rule)` that did not exist |
| `.list-bare` | `list-style: none; padding: 0; margin: 0` | 2 inline |
| `.list-roomy > li + li` | `margin-top: var(--s3)` | 1 inline |
| `.pre-soft` | `white-space: pre-wrap; overflow-x: auto` + the `.licence` frame | 3 inline |
| `.details-body` | `padding-bottom: var(--s4)` | 1 inline |
| `.prose p + p` | `margin-top: .6em` | 2 inline |
| `.progress-label` | `font-size: var(--text-sm); font-weight: 600` | 2 inline |
| `.is-out` | `opacity: .5` on the row, `text-decoration: line-through` on its text | 2 conditional inline |
| `summary` (base) | `cursor: pointer` | 4 inline |

## Classes that change meaning (`components.css`)

| Class | Before | After |
|---|---|---|
| `.card` | `--surface` + border + `--shadow-sm` | **grouping**: `--surface` + border, flat |
| `.card-object` | — | **object**: `--paper` + border + `--shadow-sm`; hover lifts |
| `.card-action` | hover lift on `.card` | object **and** clickable: `.card-object` rules + `chevron-right` + pointer |
| `.card-plain` | white + `--shadow-md` | **removed** (two uses become `.card-object`, two become `.details`) |
| `.card-head`, `.eyebrow` | defined, unused | **removed** |
| `.btn` | shadow | no shadow; `--control-h` |
| `.btn:disabled` | `opacity: .45` | explicit `--surface` / `--ink-faint` / `--line-strong` |
| `.badge` | mono | sans `xs 600`, soft fill + line, icon slot |
| `.callout` | shadow, `<div>` body at base size | no shadow, `.callout-body` at `text-sm` |
| `.rail button[aria-current]` | solid `--accent` | `--accent-soft` + `--accent-ink` + 3px bar |
| `.meta`, `.tag`, `.steps::before`, `.rail-who span`, `.field .msg .ic`, `.quote` | mono | sans (`.quote`: `--font-legible`) |
| `.progress > i` | gradient | solid `--work` |
| `.notice`, `.info`, `.warn` | used by `Notice`, **never defined** | `Notice` removed; `Callout` everywhere |

## Tokens (`tokens.css`)

| Token | Value | Why |
|---|---|---|
| `--control-h` | `calc(var(--text-base) * 2.35)` → 40 / 47 / 56 px | controls grow with the text preference; `44px` fixed did not |
| `--control-h-sm` | `calc(var(--text-base) * 1.9)` → 32 / 38 / 46 px | `.btn-sm`, the rail foot select |
| `--weight-title` / `--weight-heading` / `--weight-label` | `700 / 600 / 600` | weight as the second axis of hierarchy; named so a screen cannot pick `500` by eye |
| `--select-chevron` | a `data:` SVG per palette | the only icon that cannot be an inline `<svg>`: a `<select>` has no children. Drawn from lucide's `chevron-down` path in each palette's `--ink-soft` |
| `:root[data-theme="light"] --paper` | `var(--n-0)` | was `--n-25`; drift |
| `:root[data-contrast="high"] --*-bright` | `= var(--*)` | the mode that removes decoration was keeping the 1.9:1 stripe |

## The exceptions list

Exactly these `style={{}}` remain, and `styles.test.tsx` names them:

| File | Why it is data |
|---|---|
| `components/Progress.tsx` (2) | `width: ${pct}%` — a measurement |
| `components/Logo.tsx` (2) | the wordmark's size from its `size` prop — a drawing, not a layout |

Anything else is a failing test.
