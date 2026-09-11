# Contract — every state has a face

For whoever verifies this feature (Fase 5) and for whoever adds a component later. A
state that exists in the accessibility tree and not on the screen is the defect of
2026-09-01 (`.primary`), and this table is what stops it: **if a cell is filled, the
screenshot must show it.**

Colours are roles from `tokens.css`; ratios are in
[`docs/design/sistema-2026-09-11.md`](../../../docs/design/sistema-2026-09-11.md) §9.

| Component | Rest | Hover | Focus-visible | Active / pressed | Disabled | Busy | Selected / current |
|---|---|---|---|---|---|---|---|
| `.btn` | `--paper`, border `--line-strong`, **no shadow** | `--surface`, border `--n-400` | ring 3px `--accent` + glow | `--surface-2` | `--surface`, `--ink-faint`, border `--line-strong` | label transparent, `loader-circle` spinning | — |
| `.btn-primary` | `--accent`, `--on-accent`, `--shadow-accent` | `--accent-hover`, −1px, `--shadow-accent-hi` | ring in `--ink` | `--inset-press` | as `.btn` disabled | as `.btn` busy | — |
| `.btn-ghost` | `--accent-ink`, no border | `--accent-soft`, underline | ring | `--accent-soft` | `--ink-faint` | as `.btn` busy | — |
| `.btn-danger` | `--paper`, border `--draft-line`, `--draft` | `--draft-soft`, border `--draft` | ring | `--draft-soft` | as `.btn` disabled | as `.btn` busy | — |
| Rail item | `--ink-soft`, no fill, icon 20px | `--surface-2`, `--ink` | ring | — | — | — | `--accent-soft`, `--accent-ink` 600, 3px bar `--accent` at left |
| `.input` `.select` `.textarea` | `--paper`, border `--line-strong`, `--inset-well` | border `--n-400` | border `--accent` + ring | — | `--surface`, `--ink-faint` | — | — |
| `.field[data-state=error]` | border 2px `--draft`, message with `x` icon | | | | | | |
| `.field[data-state=ok]` | border 2px `--ok`, message with `check` icon | | | | | | |
| `.card-object` | `--paper`, border `--line`, `--shadow-sm`, `chevron-right` when clickable | border `--accent-line`, `--shadow-md`, −1px | ring | — | — | — | — |
| `.card` (grouping, the base) | `--surface`, border `--line`, flat | — | — | — | — | — | — |
| `.door` `.pick` `.picto-choice` | `--paper`, border 2px `--line` | border `--accent` | ring | — | — | — | `--accent-soft`, border `--accent`, `check` icon |
| `.levels button` | transparent | `--paper` | ring | — | — | — | `--accent`, `--on-accent` 700, inner ring |
| `.segmented button` | `--paper`, `--ink-soft` | `--surface` | ring | — | — | — | `--accent-soft`, `--accent-ink` |
| `.check input` | `--paper`, border 2px `--line-strong` | border `--accent` | ring | — | `--surface` | — | `--accent`, white `check` |
| `.badge` | sans xs 600, `*-soft`, border `*-line`, `*` text, icon 1em | — | — | — | — | — | — |
| `.callout` | `*-soft`, border `*-line`, 4px stripe `*-bright` (`*` in high contrast), **no shadow**, title `*` with icon, body sm `--ink-soft` | — | — | — | — | — | — |
| `.progress` | `--surface-2` well, solid `--work` fill, sheen in default | — | — | — | — | — | — |
| `.draftbar` | unchanged colour and hatch; shadow removed like everything else | — | — | — | — | — | — |
| `.empty` | dashed `--line-strong`, faint logo, title lg 600, body sm, **action present** | — | — | — | — | — | — |
| `Loaded` loading | sm `--ink-soft` with `loader-circle`, `role=status` | — | — | — | — | — | — |
| `Loaded` error | callout danger + `refresh-cw` button | — | — | — | — | — | — |

## What the record must show (US4)

One screenshot per filled cell that the walk can reach: rest, hover (pointer moved
over), focus-visible (Tab), disabled, busy where a test can hold it, selected, empty,
error, loading — and the review screen with the draft mark and signed.
