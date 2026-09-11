# Contract — the icon set

For whoever needs an icon. **The set is closed. Adding one is a decision, and this file
is where it is written.**

## What an icon is here

- A drawing from lucide (ISC), copied as its SVG nodes into `ui/src/components/Icon.tsx`,
  with `LICENSE-lucide.txt` beside it. No runtime dependency: the stroke is data.
- `viewBox 0 0 24 24`, `fill: none`, `stroke: currentColor`, `stroke-width: 2`,
  `stroke-linecap: round`, `stroke-linejoin: round` — lucide's own defaults, so the set
  looks like one hand drew it.
- Two sizes, and only two: `1em` inline with text (buttons, badges, callout titles,
  list markers) and `20px` in the rail. Anything else is a new case.
- **Always `aria-hidden="true"` and always beside visible text.** There are no icon-only
  controls in this application. If one is ever needed, it is its own specification.
- The logo is not an icon and stays the only drawing in the empty state and the brand.

## The set (30)

| Name | Where it appears |
|---|---|
| `arrow-left` | «← Mis alumnos», every «volver» |
| `users` | rail: «Mis alumnos» |
| `settings` | rail: «Configuración» |
| `user-round` | learner rail: «Quién es» |
| `file-pen-line` | learner rail: «Preparar» |
| `calendar-days` | learner rail: «Su día y sus rutinas» |
| `folder-open` | learner rail: «Lo que le he preparado»; open in vault |
| `book-open` | learner rail: «Su adaptación curricular» |
| `package` | learner rail: «Preparar el traspaso»; the coordination packet |
| `trash-2` | learner rail: «Borrar todo lo suyo»; erase |
| `image` | settings rail: «Pictogramas» |
| `scale` | settings rail: «Normativa» |
| `pen-line` | settings rail: «Cómo trabajo yo» |
| `graduation-cap` | settings rail: «El criterio pedagógico» |
| `plug` | settings rail: «Mi servicio de IA»; connect |
| `info` | settings rail: «Acerca de y licencias»; callout `info` |
| `plus` | «Añadir un alumno», add an area |
| `folder` | «Elegir la carpeta», «Elegir la ficha», «Elegir el fichero» |
| `printer` | «Imprimir» |
| `file-down` | «Guardar como PDF», exports |
| `check` | signed, selected (`door-on`, `pick-on`, `picto-choice-on`, checkbox), field ok, badge ok |
| `x` | field error, remove, close |
| `circle-alert` | callout `danger` («Atención») |
| `triangle-alert` | the draft mark's dot is **not** replaced — it stays a dot; this is for warnings inside content lists |
| `circle-check` | callout `ok` («Hecho»), signed bar |
| `circle-help` | callout `decide` («Necesita tu decisión») |
| `refresh-cw` | «Volver a intentarlo» |
| `chevron-down` | `.select`, as the `--select-chevron` background token (a `<select>` has no children) — the same lucide path, one per palette |
| `chevron-right` | object card affordance (the learner card, the service card) |
| `loader-circle` | the loading line of `Loaded`, the «work» badge. The busy **button** keeps its drawn ring (`.btn[aria-busy]::after`): it is a stroke, not a glyph, and it works where a child element cannot |

## Adding one

1. Say which text it will sit beside. If there is none, stop.
2. Copy the nodes from lucide's source for that name; keep the name.
3. Add the row above. The row is the reason the set is closed: a set nobody can list is
   a set nobody reviews.

## What this replaces

Every font glyph doing an icon's job: `✓`, `✕`, `▲`, `●`, `◐`, `←` in `Badge.tsx`,
`Field.tsx`, `DraftMark.tsx` (the `✓` only; the dot stays), `components.css`
(`.door-on::after`, `.pick-on::after`, `.picto-choice-on::after`), `Rail.tsx` and
`App.tsx`. Glyphs change shape with the system font; these do not.
