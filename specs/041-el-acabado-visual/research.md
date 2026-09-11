# Research — lo que había que mirar antes de planificar

Cada punto es un hecho comprobado en esta sesión (lectura del fuente, captura o test
ejecutado), no una estimación. Lo que no se comprobó, lo dice.

## R1 · Los cinco componentes fuera del shell, y qué son en realidad

| Componente | Quién lo dibuja | Qué hay dentro | Mapeo |
|---|---|---|---|
| `learners/ProfileEditor.tsx` | `RecordScreen`/`LearnerSections` (tab `who`, sin `Page`) y `App.tsx` (nuevo alumno, dentro de un `Page`; y el paso 3 del onboarding, dentro de un `<div className="stack">` con `h2`) | un `.card` con `Notice`, badge del código y el campo del nombre; `h3` «Qué le cuesta»; `YearPicker` (3 preguntas con `<label><strong>`); `VehicularMark`; `AxisEditor`; cuatro `<div><label/><textarea|input/></div>` sin `Field`; `LearnerPictograms`; una `.row` con el primario y «Guardado» | **Un `Page`** («Quién es» con el nombre como título; «Un alumno nuevo» ya lo tiene) con secciones: *Quién es* (código + nombre), *Su curso y su edad* (YearPicker), *Qué le cuesta* (ejes + vehicular + áreas), *Lo que le funciona y lo que no* (works/avoid/interests/response), *Pictogramas*; `Actions` con el primario. Cada `<label>`+control pasa a `Field`. El `.card` gris del código deja de existir: era un `Notice` sin estilo dentro de una tarjeta |
| `learners/AxisEditor.tsx` | `ProfileEditor` | `p.muted.small` + `.axis-grid`; `CurByArea` con `strong` como título, `.axis-grid`, fila de sugerencias y `.row` input+botón | Se queda como bloque dentro de la sección *Qué le cuesta*; el `strong` de «Nivel curricular por área» pasa a `h3`; el input de área nueva entra en un `Field` (hoy `maxWidth: 22em` en línea) |
| `onboarding/VaultStep.tsx` | `App.tsx` paso 1, dentro de un `<main>` propio | `h2` + dos `p` + `.card` con `<code>` de la ruta + `Notice warn` opcional + `.row` con primario y secundario + bloque «Traer el criterio» | **`Page`** con título del paso, lede, `Section` sin título con la ruta (un `Field` de solo lectura, no un `.card`) y `Actions` (primario + «Elegir otra carpeta»); `Section` «El criterio pedagógico» con su botón y ayuda |
| `onboarding/ConnectStep.tsx` | `App.tsx` paso 2 | tres etapas: pregunta (`h2`, `p.lede`, `fieldset.fieldset` con `legend h3` y dos `.btn-lg`, `details`), comparación (`ServiceComparison`), recomendación (`h2`, `.card.card-plain` con `.svc-name`, `.meta`, `dl.facts`, `.row` con primario `btn-lg` y ghost) y la etapa de pegar la clave (no capturada) | **`Page`** por etapa (título cambia con la etapa); el `fieldset.fieldset` enmarcado pasa a `fieldset-bare` dentro de una `Section` —el propio `composition.css` ya dice que el marco con la leyenda sobre el borde «reads as broken»—; la tarjeta recomendada sigue siendo tarjeta objeto (es la que hoy ya se ve bien) |
| `coordination/PacketDoor.tsx` | `LearnersScreen`, **dentro** del `Page` de «Mis alumnos», como `PacketDoorSections` que devuelve `Section`s | ya usa `Section`, `Field`, `Callout` | **No es una fuga.** El grep de `<Page` lo marcó por no ser una pantalla; es una sección de otra. Se queda; se le quitan los tres `style` en línea |

Corrección al diagnóstico: son **cuatro** componentes fuera del shell, no cinco. La spec
habla de cinco en la narrativa y la tarea los enumera por nombre, así que la cuenta no
cambia ningún requisito.

Y el bloque del onboarding en `App.tsx:167-215` es el que rodea al shell de verdad: un
`<main className="main stack gap5" style={{ maxWidth: 680, margin: '0 auto', paddingTop }}>`
con el `Wordmark`, el `h1`, los pasos y el hijo. Pasa a `.main` + `.page` como el resto,
con el `Wordmark` y el indicador de pasos como cabecera del panel.

## R2 · `Notice` pinta clases que no existen

`components/Notice.tsx` renderiza `<div className={`notice ${kind}`}>`. **Ni `.notice`, ni
`.info`, ni `.warn` están definidos en ningún CSS** (`grep` sobre `ui/src/styles/`: cero
resultados). Diez usos: `ProfileEditor`, `InjectionNotice`, `RepairNotice`, `NameWarning`,
`ConsolidateSection` ×4, `ScopeQuestion` ×2. Es lo que se ve en `6-alumno-quien-es.png`:
«Le pongo un código en vez del nombre…» como texto plano dentro de una tarjeta gris.

`styles.test.tsx` no lo detecta porque su segundo recorrido solo lee literales tras `?` o
`:` dentro de `className={…}`, y una plantilla `` `notice ${kind}` `` tiene una llave
dentro que corta el `[^}]*`. Hay exactamente dos `className={`…`}` en la interfaz:
`Callout.tsx` (cuyas clases existen) y `Notice.tsx`.

Decisión: `Notice` **desaparece** y sus diez usos pasan a `Callout` (`info`→`info`,
`warn`→`decide` o `danger` según el caso: `NameWarning` e `InjectionNotice` son
`danger`; los de consolidación son `decide`). `Callout.tsx` ya dice «Replaces `Notice`»
desde `010`. Y el test gana el recorrido de plantillas: los segmentos literales de una
plantilla se registran igual que los de un ternario.

## R3 · Estilos en línea: 143 en 25 ficheros, y qué clase absorbe cada grupo

Inventario literal tomado el 2026-09-11 (subagente, `grep` sobre `ui/src/**/*.tsx`).
Agrupados por intención; el número es de ocurrencias.

| Grupo | N | Qué hace | Cómo se resuelve |
|---|---|---|---|
| `flexWrap: 'wrap'` y `alignItems: 'center'` sobre `.row` | 25 | repite lo que `.row` **ya declara** (`components.css:11`: `align-items: center; flex-wrap: wrap`) | se borran |
| `justifyContent: 'space-between'` en una fila | 15 | los dos extremos de una fila (título + badge, etiqueta + contador) | `.row-split` |
| `alignItems: 'baseline' \| 'flex-start' \| 'flex-end'` | 6 | una fila cuyos hijos no se centran | `.row-baseline`, `.row-top`, `.row-bottom` |
| `margin: 0` en `<p>` | ~30 | `tokens.css` **ya** pone `p { margin: 0 }`; todos redundantes | se borran |
| `margin: 0` + `paddingLeft` en `<ul>`/`<dl>` | 15 | lista dentro de un stack | `.bullets` (ya existe: `margin: 0; padding-left`) y `.facts`/`.flush` para `<dl>`/`<dd>` |
| `marginTop: 0` | 4 | primer párrafo de un bloque | `.flush` (`margin: 0`) |
| `marginTop: var(--sN)` | 4 | separación entre bloques | el `.stack gapN` del padre |
| márgenes en px crudos | 6 | dentro de `RepairNotice`, `InjectionNotice`, `ConsolidateSection` | desaparecen con `Notice → Callout` (R2) |
| `margin: '0 0 .6em'` en párrafos de prosa | 2 | `EnsayoScreen` | `.prose p` |
| `alignSelf: 'flex-start'` en un botón «← Volver» | 4 | el botón de salida suelto en un stack | `.btn-back` (alineación + icono `arrow-left`) |
| `maxWidth` de control en `em`/`rem` (7 valores distintos: 6, 7, 8, 14, 18, 22, 24) | 14 | la medida de un input corto | tres tamaños: `.input-xs` (7rem: números), `.input-sm` (14rem), `.input-md` (22rem) |
| `minHeight: '2.6em'` | 3 | reserva de altura del texto de nivel en `.axis-cell` | `.axis-level` |
| `minHeight: 240` | 1 | el editor de estilo de casa | `.textarea-canvas` |
| `borderTop: 1px solid var(--rule)` + `paddingTop` | 1 | separador (con el token inexistente) | `.divided-top` con `--line` |
| `cursor: 'pointer'` en `<summary>` | 4 | | regla base `summary { cursor: pointer }` |
| `fontSize: var(--text-sm)` + `fontWeight: 700` en `<summary>`/`<strong>` | 6 | | `.details > summary` ya lo hace: los `details.card` pasan a `.details`; los `<strong>` de `Progress` a `.progress-label` |
| `listStyle: 'none', padding: 0` | 2 | lista usada como fila de pasos | `.list-bare` |
| `whiteSpace: 'pre-wrap', overflowX: 'auto'` en `<pre>` | 3 | texto preformateado suave | `.pre-soft` (hermana de `.licence`/`.logtail`) |
| `gap` numérico pequeño | 3 | «casi cero» | `.gap1` (4 px) |
| `paddingTop`/`paddingBottom` con token | 3 | onboarding y cuerpo de `<details>` | `.page` del onboarding; `.details-body` |
| `maxWidth: 680, margin: '0 auto', textAlign: center` | 2 | el onboarding reimplementando `Page` | `Page` con `variant="narrow"` y un `banner` centrado |
| `marginBottom: '.8rem'` en `<li>` | 1 | | `.list-roomy` |
| `opacity` y `textDecoration` condicionales | 2 | estado «quitado» de una corrección (`HandoverReview`) | clase de estado `.is-out` |
| **datos en tiempo de ejecución** | **4** | `Progress.tsx:38,75` (`width: pct%`), `Logo.tsx:58,59` (tamaño del wordmark desde la prop) | **se quedan**: son la lista de excepciones del test |

Total tras la limpieza: **4 estilos en línea**, en dos ficheros, y el test los nombra.

Dos observaciones que salen del inventario y entran en las tareas:

- `.eyebrow` y `.input-key` están definidas y **sin ningún uso**. `.input-key` es exactamente
  lo que el campo de la clave (`ConnectStep.tsx:337`) debería llevar y no lleva. `.eyebrow`
  se retira. `.card-head` tampoco se usa: se retira.
- Las siete etiquetas del carril del alumno están escritas a mano en `Rail.tsx:39-47`, fuera
  de `i18n`. No se tocan (el copy no es de esta feature); los iconos se asignan por clave.

## R4 · Tarjetas: objeto o agrupadora

Hay **26** `className="card…"` en la interfaz (grep, 2026-09-11). Clasificados por lo que
contienen:

| Objeto (algo que se abre, se elige o representa una entidad) | Agrupadora (agrupa campos o texto) |
|---|---|
| tarjeta de alumno `LearnersScreen.tsx:56` (`card card-action`) | «Cómo se ve» `DisplayPreferences.tsx:54` (sale del carril como popover) |
| entrada del expediente `RecordScreen.tsx:86` | bloque código+nombre `ProfileEditor.tsx:234` (desaparece, R1) |
| servicio conectado `ConnectionScreen.tsx:100` | ruta de la carpeta `VaultStep.tsx:60` (pasa a `Field` de solo lectura) |
| servicio recomendado `ConnectStep.tsx:264` (`card-plain`) | checklist `ReviewScreen.tsx:201` (`details.card-plain`), «revisar de nuevo» `ReviewScreen.tsx:244` |
| una nota `LearnerNotes.tsx:43`, `NotesScreen.tsx:91` | licencias `AboutScreen.tsx:225` (`details.card-plain`), `AboutScreen.tsx:89` |
| un resultado por alumno `AdaptScreen.tsx:804` | formularios y resúmenes: `AdaptScreen.tsx:701`, `IngestScreen.tsx:138,173`, `VerifyScreen.tsx:274`, `ForgetLearner.tsx:142,183`, `ConsolidateSection.tsx:78,107`, `ScopeQuestion.tsx:63`, `ConnectStep.tsx:335`, `SecondLook.tsx:45`, `ConversationPanel.tsx:68` |

Diecinueve agrupadoras, siete objetos. Así que **`.card` sigue siendo la base y pasa a ser
la agrupadora** (fondo `--surface`, borde `--line`, sin sombra: hoy solo pierde la sombra),
y los siete objetos ganan `.card-object` (fondo `--paper`, borde, `--shadow-sm`, hover con
`--accent-line` y `--shadow-md`, `chevron-right` cuando son pulsables). `.card-plain` se
retira: sus cuatro usos son dos objetos y dos `<details>` agrupadores. `.axis-cell` ya es
una agrupadora plana y es el modelo.

## R5 · Monoespaciada: dónde está y qué lleva

`.meta` (fechas «comprobada el 11/09/2026», «Paso 1 de 3», «N de M», «N caracteres»,
vendor del servicio, `jobId`), `.badge` (código de alumno «Y95», «✓ En uso», «Guardado»),
`.tag`, `.eyebrow`, `.rail-who span` (código bajo el nombre), `.steps::before` (números
de paso), `.field .msg .ic` (✓/✕), `.quote` (texto de la maestra). Ninguno es máquina
salvo el `jobId` y el código de alumno —y el código es un identificador que ella lee y
copia, no que pega: va en sans con cifras tabulares, que es lo que la hace legible en
una tarjeta. Se quedan en mono: `code`, `kbd`, `.input-key`, `.licence`, `.logtail`.

## R6 · Glifos de fuente como icono

`Badge.tsx` (▲ ● ✓ ◐), `Field.tsx` (✕ ✓), `DraftMark.tsx` (✓ en la firmada; el punto de
la de borrador es un `<span class="dot">` dibujado y **se queda**), `Rail.tsx` («← Mis
alumnos» ×3), `App.tsx` («← Mis alumnos» en nuevo alumno), `components.css`
(`.door-on::after`, `.pick-on::after`, `.picto-choice-on::after` con `content: '✓'`),
`ConnectStep.tsx` («⚠» en la frescura), `components.css .select` (chevron en `data:`).
Todos pasan al conjunto de `contracts/icon-set.md`.

## R7 · Tests que citan alturas y clases que cambian

- `e2e/layout.spec.ts`: comprueba **≥ 24×24** (SC 2.5.8), no 44. Un control de 40 px pasa.
  El comentario de `components.css:50` («Minimum 44px on the default size (FR-804)») es
  de `010` y se reescribe con la razón nueva.
- `e2e/primary-control.spec.ts`: cuenta `.btn-primary` visibles dentro de `.main`. No
  cambia; la nueva marca del carril no usa `.btn-primary`.
- `e2e/a11y.spec.ts`: axe en 4 cruces (tema × texto). Pasa a 8 (× contraste).
- `ui/test/styles.test.tsx`: clases usadas ⊂ definidas. Gana plantillas (R2), `var(--x)`
  definidas (FR-3904) y la lista de estilos en línea (FR-3903).
- `packages/core/test/contrast.test.ts`: lee `tokens.css` por bloques de selector. Las
  parejas nuevas entran en `PAIRINGS`; el bloque `:root[data-contrast="high"]` ganará
  `--*-bright` y el test lo resolverá solo.
- `ui/test/draftmark.test.tsx`: exige `class="draftbar"`/`"signedbar"` exactos y un
  `aria-hidden` en ambos. El icono `check` del firmado lleva `aria-hidden`, así que pasa.
- `ui/test/callout.test.tsx`: exige el `sr-only` y una sola aparición de la palabra del
  intento. Envolver el cuerpo en `<div class="callout-body">` no lo toca.
- `ui/test/learner-page-is-clean.test.tsx`: prohíbe frases en `LearnerPictograms`. No se
  toca ese componente salvo estilos en línea.

## R8 · Iconos: la fuente

`lucide-react` 1.21.0 (ISC) está en `node_modules` de otro repositorio de la máquina
(`Global AI Framework/repos/portal`). Los 30 nombres del contrato existen; `circle-help`
es un alias de `circle-question-mark`. Cada icono es una lista de nodos SVG (`path`,
`rect`, `circle`…) con atributos; extraídos, los 30 pesan 5 KB. Se vendorizan como datos
en `Icon.tsx` con `LICENSE-lucide.txt` al lado. Sin dependencia.

## R9 · Deriva entre paletas

`:root[data-theme="light"]` fija `--paper: var(--n-25)` (#fcfcfd); el `:root` base y el
claro del sistema usan `--n-0` (#fff). Dos blancos para el mismo panel según cómo se
llegó al tema claro. Se unifica en `--n-0`. `:root[data-contrast="high"]` no redefine
`--*-bright`, así que la franja brillante de los callouts sigue a 1.8–2.9:1 en el modo
que existe para quitarla. Se redefinen a los profundos (ratios en el sistema §9).

## R10 · Baseline

`npm test`: 176 ficheros, 2576 tests, verde (2026-09-11 13:59). `npm run test:e2e`:
278 tests, verde, 4,0 min (2026-09-11 14:10). Es el estado contra el que se compara cada
tanda; una regresión aquí es una regresión, no un flake.
