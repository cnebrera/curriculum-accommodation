# References

Pointers only. Per [ADR 0002](decisions/0002-no-clinical-material.md) this
repository copies no external content, and holds no clinical material of any
kind.

Cite the relevant entry in a recipe's `evidence` field.

## Accessibility standards

These are operational, not clinical, and are what recipes should lean on.

- **WCAG 2.2** — <https://www.w3.org/TR/WCAG22/> — text alternatives, contrast,
  meaningful sequence. Written for the web, but the rules about non-text content
  transfer directly to worksheets.
- **UNE 153101:2018 EX** — Lectura Fácil, Spanish standard. Referenced by
  `recipes/lang/es/lectura-facil.md`.
- **UNE 153020** — audio description.
- **Marrakesh Treaty** — <https://www.wipo.int/treaties/en/ip/marrakesh/> — the
  international basis for accessible-format copies. The reason adaptation is
  lawful and redistribution is not.

## Universal design for learning

- **CAST UDL Guidelines** — <https://udlguidelines.cast.org/> — multiple means of
  representation, action and expression. The closest thing to a theoretical frame
  for what the recipes do.

## Augmentative communication

- **ARASAAC** — <https://arasaac.org/> — pictogram set, CC BY-NC-SA. Widely used
  in Spanish schools. Note the licence before shipping anything derived from it.

## Curriculum

- Regional education authorities publish the assessment criteria that
  `data-criterion` refers to. They differ by community and change; the project
  links rather than copies, and anchoring to them is Phase 1 or later.

## What is deliberately absent

No clinical guidance, no diagnostic criteria, no condition-by-condition
adaptation tables. If you find yourself wanting one, the design answer is a
profile axis and a recipe, not a lookup table — see
[ADR 0002](decisions/0002-no-clinical-material.md).
