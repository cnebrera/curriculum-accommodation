# Contract — design tokens

What a token guarantees, and what a component may not do. Written for whoever
adds the next screen, because a design system survives exactly as long as its
last exception.

## What the tokens guarantee

1. **Every declared text pairing meets 4.5:1**, and every non-text indicator
   3:1 — in both themes, at every contrast preference. Asserted by
   `packages/core/test/contrast.test.ts`, not promised.
2. **The type scale is finite**: six steps, and `--text-base` is at least 17px
   at the default preference.
3. **A preference change is one attribute** on the root element, and the whole
   interface follows.
4. **Colour is never the only carrier of state.** Every semantic role has a
   companion form — a rail, a dot, an icon, a border style — and words.
5. **Depth is tinted with the brand hue**, and disappears entirely under
   `[data-contrast="high"]`.

## What a component must not do

- **No literal colour.** No hex, no `rgb()`, no named colour. If a role is
  missing, add the role.
- **No off-scale space.** Padding, gap and margin come from `--s1`…`--s8`.
- **No off-scale type.** Every `font-size` is a `--text-*`.
- **No new radius.** Controls are `--radius-control`, containers `--radius-box`,
  pills `--radius-pill`. A fourth value needs a rule, not a preference.
- **No shadow that is not a `--shadow-*`.** A hand-rolled shadow is how a system
  starts looking assembled from parts.
- **No interactive target under 44×44px** at the default preference.
- **No animation that carries meaning**, so that honouring reduced motion costs
  nothing.
- **No `outline: none`.** Ever. If the focus state looks wrong, the ring is
  wrong, not the requirement.

## The rule that resolves arguments

> If a component needs a value that is not in the scale, **the scale is wrong** —
> not the component.

Adding a token is a small, reviewable change that helps every future screen.
Inlining a value is invisible, spreads, and is how the system dies.

## Text on a fill

The one pairing worth stating explicitly, because it is where vivid palettes
usually fail:

| Ground | Text | Rule |
|---|---|---|
| `--accent` (deep) | `--on-accent` | Guaranteed ≥4.5:1. This is what the deep end is for |
| `--*-bright` | never small text | The bright end is fills, borders, icons, glows, progress, dark grounds |
| `--*-soft` | `--*` (the deep one) | Soft ground, deep text. Also guaranteed |

A bright colour carrying 15px text is the single most likely way to break this
system, and the token names are chosen so that reading the code makes it obvious.
