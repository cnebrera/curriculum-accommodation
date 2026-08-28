# Phase 1 — Data model

There is almost no data here, and that is worth stating: a design system is
mostly a set of constraints, not a set of records. Two things persist.

## Display preferences

Hers, adjustable, and never a gate. Stored in the settings file in the OS
application-data directory — the one `006` T083 established for the vault root —
because they are hers but they are not her professional record (FR-820).

| Field | Values | Default | Applied as |
|---|---|---|---|
| `theme` | `light` \| `dark` \| `system` | `system` | `data-theme` on `<html>` |
| `text` | `normal` \| `large` \| `xlarge` | `normal` | `data-text` |
| `contrast` | `normal` \| `high` | from the OS | `data-contrast` |
| `motion` | `normal` \| `reduced` | from the OS | `data-motion` |

```json
{
  "vaultRoot": "/Users/…/Documentos/Rampa",
  "display": { "theme": "system", "text": "large", "contrast": "normal", "motion": "reduced" }
}
```

Rules that follow:

- **`system` is a real value, not an absence.** It means "keep following the OS",
  which is different from "she once chose light and the OS later changed".
- **Contrast and motion default to the OS** and are not asked about (FR-817). If
  she has already told her operating system, she has already told us.
- **A preference change is one attribute write.** No component subscribes to
  anything; the tokens redefine themselves and the interface follows (FR-818).
- **Excluded from every export.** Handover, share and vault backup carry none of
  this. A packet that arrived with someone else's font size would be a small
  thing that reads as carelessness about a bigger one.
- **Every combination must still satisfy the layout and contrast floors**
  (FR-819). `xlarge` + `high` + `dark` is a valid state and is in the test matrix.

## The token contract

Not runtime data — a compile-time set with a guarantee, specified in
[contracts/design-tokens.md](./contracts/design-tokens.md) and enforced by
`packages/core/test/contrast.test.ts`.

What the test needs from the token file is a machine-readable declaration of which
pairings exist. Two options were considered and the second is chosen:

1. Parse `tokens.css` and infer pairings. Fragile, and it would need to model the
   cascade to know what actually pairs with what.
2. **Declare the pairings in TypeScript beside the arithmetic**, as data:

```ts
export const PAIRINGS = [
  { fg: '--ink',        bg: '--paper',   min: 4.5, why: 'body text' },
  { fg: '--ink-faint',  bg: '--paper',   min: 4.5, why: 'metadata — the floor of the system' },
  { fg: '--on-accent',  bg: '--accent',  min: 4.5, why: 'white on a filled button' },
  { fg: '--accent',     bg: '--paper',   min: 3.0, why: 'focus ring, non-text' },
  // …one row per declared role, in each theme
] as const;
```

The declaration is the contract, the arithmetic checks it, and adding a role
without adding its row is caught by a count assertion — so the list cannot
silently fall behind the palette.

## What is deliberately not modelled

- **No theme editor and no custom palette.** She adjusts size, contrast, motion
  and theme; she does not pick colours. A configurable palette would put the
  contrast guarantee in her hands, which is exactly where it must not be.
- **No per-screen settings.** A preference is about her eyes, not about a screen.
