# Tasks: El acabado visual — el sistema gobierna toda la pantalla

**Input**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) ·
[contracts/shell-additions.md](./contracts/shell-additions.md) ·
[contracts/icon-set.md](./contracts/icon-set.md) · [contracts/states.md](./contracts/states.md) ·
[quickstart.md](./quickstart.md)

**Prefijo**: FR-39xx · SC-39xx

**Baseline** (2026-09-11): `npm test` 176 ficheros / 2576 tests en verde; `npm run test:e2e`
278 en verde en 4,0 min. Cada checkpoint se compara contra eso.

> Regla de cada tanda: `npm test` en verde, `npm run shots`, **mirar** las capturas a 560,
> 880, 1024 y 1366, en claro y oscuro y con `xlarge`. Lo que no se ha mirado no está hecho
> (`013` FR-1113).

---

## Phase 1: El antes, y el registro que ve (US4 en lo que es guion)

**Purpose**: sin un antes completo no hay SC-3901, y sin fotografiar la revisión antes de
tocar `.draftbar` no se puede afirmar el Principio VII.

- [ ] T001 Copiar `docs/screenshots/latest/` a `docs/screenshots/041-antes/`. (SC-3901)
- [ ] T002 [US4] En `app/scripts/screenshot.mjs`, fotografiar la **pantalla de revisión**
      con la marca de borrador y firmada: escribir un `adapted.md` con `vault.write` (como
      ya hace la parte de hojas), navegar a la revisión y capturar `7-revision-borrador.png`
      y `7-revision-firmada.png`. (FR-3919)
- [ ] T003 [US4] En `screenshot.mjs`, capturar estados: foco visible (`Tab` ×3 en el
      alumnado → `e-foco.png`), puntero sobre la tarjeta de alumno (`e-hover-tarjeta.png`)
      y sobre el primario (`e-hover-primario.png`), un error (provocar `Loaded` en error
      apuntando el vault a una ruta inexistente → `e-error.png`), la carga (`e-carga.png`,
      capturada en el frame de `role="status"` tras un `reload`), «Cómo se ve» abierto
      (`e-como-se-ve.png`), y una pantalla vacía (`6b` ya lo es). (FR-3919)
- [ ] T004 [US4] En `screenshot.mjs`, la pantalla de referencia («Quién es») en los **ocho**
      cruces `data-theme` × `data-contrast` × `data-text` (normal/xlarge) →
      `m-<tema>-<contraste>-<texto>.png`. Sustituye a los dos `m-*.png` actuales. (FR-3919)
- [ ] T005 [US4] `app/e2e/a11y.spec.ts`: el barrido pasa de 4 a 8 cruces (añade
      `data-contrast="high"` al producto). (FR-3920, SC-3904)
- [ ] T006 Correr `npm run shots` sobre la interfaz **actual** y copiar también esas capturas
      nuevas a `041-antes/`. (SC-3901)

**Checkpoint**: el antes está entero y la revisión con su marca está fotografiada.

---

## Phase 2: Los tokens y la base (US1 + US2, cimientos) 🎯

**Purpose**: lo que toda pantalla hereda. Ninguna pantalla se toca aún.

- [ ] T007 [US2] `tokens.css`: `--control-h`, `--control-h-sm`, `--weight-title`,
      `--weight-heading`, `--weight-label`; `--select-chevron` en las cuatro paletas;
      `:root[data-theme="light"] --paper: var(--n-0)`; `:root[data-contrast="high"]`
      redefine `--accent-bright`, `--decide-bright`, `--draft-bright`, `--ok-bright`,
      `--work-bright` a sus profundos. Cada uno con su razón escrita en el estilo del
      fichero. (FR-3905, FR-3907, FR-3910, FR-3914, FR-3915)
- [ ] T008 [US1] `tokens.css` base: **un solo `h2`** (`text-lg`, `--weight-heading`), `h3`
      (`text-base`, `--weight-heading`), `h1` con `--weight-title`; `summary { cursor:
      pointer }`; `text-wrap: pretty` en `p`. `composition.css`: quitar `.section > h2` y
      `.fieldset-bare > legend h2` en lo que duplican a la base. (FR-3902, FR-3905)
- [ ] T009 [US2] `components.css` · botones: `.btn` sin sombra y con `--control-h`;
      `.btn-sm` con `--control-h-sm`; `.btn-lg` retirado si nadie lo necesita tras la
      Phase 3 (dos usos en `ConnectStep`, que pasan a `.btn`); `:disabled` con colores
      explícitos; `[aria-busy]` deja el `::after` dibujado a la espera del icono (T023).
      Reescribir el comentario «Minimum 44px (FR-804)» con la razón nueva. (FR-3907,
      FR-3911, FR-3914)
- [ ] T010 [US2] `components.css` · superficies: `.card` plana; `.card-object`;
      `.card-action` = objeto pulsable; retirar `.card-plain`, `.card-head`, `.eyebrow`.
      (FR-3909, FR-3914)
- [ ] T011 [US2] `components.css` · avisos y marcas: `.callout` sin sombra, franja 4 px,
      `.callout-body` a `text-sm`; `.badge` en sans con `--weight-label` y hueco para
      icono; `.draftbar`/`.signedbar` pierden solo la sombra; `.progress > i` sólido.
      (FR-3910, FR-3912, FR-3914)
- [ ] T012 [US2] `components.css` · monoespaciada: `.meta`, `.tag`, `.steps::before`,
      `.field .msg .ic` a `--font-sans` con `tabular-nums`; `.quote` a `--font-legible`;
      `composition.css` `.rail-who span` igual. `.input-key`, `code`, `kbd`, `.licence`,
      `.logtail` se quedan. (FR-3906, FR-3914)
- [ ] T013 [US2] `components.css` · carril: `[aria-current]` con `--accent-soft`,
      `--accent-ink`, `--weight-label` y barra de 3 px; `.rail button` y `.rail-back` con
      `--control-h`; `.rail-foot .select` con `--control-h-sm`. (FR-3908, FR-3914)
- [ ] T014 [US1] `composition.css` · las clases del shell: `.row-split`, `.row-baseline`,
      `.row-top`, `.row-bottom`, `.flush`, `.btn-back`, `.input-xs/-sm/-md`, `.axis-level`,
      `.textarea-canvas`, `.divided-top`, `.list-bare`, `.list-roomy`, `.pre-soft`,
      `.details-body`, `.prose p + p`, `.progress-label`, `.is-out`; `.page-narrow`;
      `.page` centrado y `min-height: 100%`; `.page-lede` con `52ch` y `text-wrap: pretty`.
      (FR-3903, FR-3922, FR-3914)
- [ ] T015 [US1] `shell/Page.tsx`: `variant: 'wide' | 'narrow'`. (FR-3901)
- [ ] T016 [US2] `packages/core/test/contrast.test.ts`: las nueve parejas ★ del sistema §9
      entran en `PAIRINGS` con su `why`. Debe pasar sobre los tokens de T007 sin retocar
      ningún hex. (FR-3913, SC-3903)
- [ ] T017 [US1] `ui/test/styles.test.tsx`: (a) los segmentos literales de una plantilla
      `` className={`a ${x}`} `` se registran como clases usadas; (b) toda `var(--x)` usada
      en `ui/src` (TSX o CSS) está definida en `tokens.css` o `composition.css`; (c) ningún
      `style={{` en `ui/src` salvo la lista de excepciones (`Progress.tsx` ×2, `Logo.tsx`
      ×2), escrita en el test con la razón de cada una. (a) y (b) deben **fallar** antes de
      T018 y T028 (Notice, `--rule`); (c) falla hasta que la Phase 3 termine. (FR-3903,
      FR-3904, SC-3902)

**Checkpoint**: `npm test` en rojo **solo** por T017 (c) y (a)/(b) hasta que la Phase 3
los cierre; el resto en verde. `npm run shots` y mirar: la aplicación ya cambia de
aspecto sin que ninguna pantalla se haya tocado — y así se ve qué hace el sistema solo.

---

## Phase 3: Ninguna pantalla se escapa (US1) 🎯

**Purpose**: los cuatro componentes fuera del shell entran; los 139 estilos en línea
salen; `Notice` desaparece.

- [ ] T018 [US1] `Notice` → `Callout` en sus diez usos (`ProfileEditor`, `InjectionNotice`,
      `RepairNotice`, `NameWarning`, `ConsolidateSection` ×4, `ScopeQuestion` ×2) con el
      intento que dice research R2; borrar `components/Notice.tsx`. T017 (a) pasa a verde.
      (FR-3903, FR-3904)
- [ ] T019 [US1] `learners/ProfileEditor.tsx` + `learners/LearnerSections.tsx` (case `who`):
      un `Page` con el nombre como título y `codeExplain` como lede; secciones *código y
      nombre*, *qué le cuesta* (YearPicker, VehicularMark, AxisEditor), *lo que sabes de él*
      (los cuatro campos, cada uno en `Field` con el placeholder movido a `help`),
      *dibujos*; `Actions` con el primario y `note` para «Guardado»/error. En `App.tsx`
      «Un alumno nuevo» sigue siendo el `Page` padre y `ProfileEditor` ya no dibuja el
      suyo (prop `standalone` o composición desde fuera: decidir al implementar y
      escribir por qué). El botón «← Mis alumnos» del panel desaparece: el carril ya lo
      tiene. (FR-3901, FR-3902)
- [ ] T020 [US1] `learners/AxisEditor.tsx`, `VehicularMark.tsx`, `YearPicker.tsx`: `strong`
      estructural → `h3`; `.axis-level`; el input de área nueva en `Field` con label
      visible; `.input-xs/-sm/-md` en vez de `maxWidth`; el aviso de duplicado como
      `Callout decide`. Principio V vigilado: la rejilla sigue mostrando barras + número +
      palabra y nada la ordena. (FR-3901, FR-3903)
- [ ] T021 [US1] `App.tsx` onboarding: `<main className="main">` + `Page variant="narrow"`
      con `banner` (wordmark + pasos + «Vamos a dejarlo listo» como texto, no como
      heading) y el título de cada paso como `h1`; `--rule` → `.divided-top`; el estado
      «Abriendo…» sin estilos en línea. `onboarding/VaultStep.tsx`: `Page` + `Section` +
      `Field` de solo lectura para la ruta + `Actions`; sección «El criterio pedagógico».
      (FR-3901, FR-3903, FR-3904)
- [ ] T022 [US1] `onboarding/ConnectStep.tsx`: un `Page` por etapa; el `fieldset.fieldset`
      pasa a `fieldset-bare` dentro de `Section`; la tarjeta recomendada es `.card-object`;
      el campo de la clave en `Field` con `input input-key`; `.btn-lg` → `.btn`; `.details-body`.
      `e2e/connect.spec.ts:192-193` (Sí/No sin primario) sigue verde. (FR-3901, FR-3903)
- [ ] T023 [US1] Barrido de los estilos en línea restantes, fichero a fichero, con la
      tabla de research R3: `about/AboutScreen`, `adapt/*`, `compose/ComposeScreen`,
      `coordination/*`, `ensayo/EnsayoScreen`, `guide/GuideScreen`, `ingest/*`,
      `learners/*`, `notes/*`, `pictograms/LearnerPictograms`, `prepare/*`, `review/*`,
      `settings/*`, `structure/StructureScreen`, `components/{Progress,DraftMark,Logo}`,
      `App.tsx`. Los `<details className="card card-plain">` pasan a `.details`. T017 (c)
      pasa a verde con exactamente cuatro excepciones. (FR-3903, SC-3902)
- [ ] T024 [US1] Las 26 tarjetas: las nueve objeto de research R4 ganan `.card-object`
      (la de alumno conserva `.card-action`); las agrupadoras se quedan en `.card`.
      (FR-3909)

**Checkpoint**: `npm test` en verde entero. `npm run shots`, mirar «Quién es», «Un alumno
nuevo» y los tres pasos del onboarding a 560/880/1024/1366, claro y oscuro, `xlarge`.
`npm run test:e2e` en verde (layout: `h1` sobre el pliegue en cada pantalla; a11y:
`heading-order` con los `h1` nuevos).

---

## Phase 4: El sistema aplicado a los componentes (US2)

- [ ] T025 [US2] `components/Callout.tsx`: el cuerpo en `<div className="callout-body">`;
      `callout.test.tsx` sigue verde. `components/Badge.tsx`: sin glifos hasta T027; sans.
      (FR-3910)
- [ ] T026 [US2] `settings/DisplayPreferences.tsx`: el bloque desplegado sale del ancho del
      carril como popover (`position: absolute` sobre `.rail-foot`, nivel 2 de elevación,
      `role="group"` intacto); el `segmented` de tres opciones cabe entero. (FR-3908, FR-3911)

**Checkpoint**: capturas de `2-mis-alumnos`, `4-servicio`, `3-configuracion` en los cuatro
modos de color; el carril activo ya no compite con el primario; ningún texto de interfaz
en mono salvo clave, rutas y log.

---

## Phase 5: Iconos (US3)

- [ ] T027 [US3] `components/Icon.tsx` + `components/LICENSE-lucide.txt`: los 30 trazos del
      contrato como datos, `Icon({ name, size })` con `aria-hidden`, `1em` por defecto.
      Test unitario: cada nombre del contrato existe, ninguno más, y el SVG lleva
      `aria-hidden="true"`. (FR-3916, FR-3917)
- [ ] T028 [US3] Glifos fuera: `Badge.tsx`, `Field.tsx`, `DraftMark.tsx` (solo el `✓`),
      `Rail.tsx` y `App.tsx` («←»), `ConnectStep.tsx` («⚠»), `LearnerPictograms.tsx` («→»
      del botón); `components.css` `.door-on::after`, `.pick-on::after`,
      `.picto-choice-on::after` → un `<Icon name="check">` en el TSX de `PrepareSteps`,
      `StructureScreen` y `ChooseWord`; `.select` con `--select-chevron`; `[aria-busy]` con
      `loader-circle`. `draftmark.test.tsx` sigue verde. (FR-3918)
- [ ] T029 [US3] Iconos con palabra: los siete apartados del alumno y los seis de
      Configuración en `Rail.tsx` (por clave, 20 px), «Mis alumnos» y «Configuración»;
      `.btn-back`; los botones repetidos de research §6.4 (añadir, elegir, imprimir,
      PDF, firmar, volver a intentarlo); `Callout` con el icono de su intento junto al
      título; `.card-action` con `chevron-right`. (FR-3917)

**Checkpoint**: capturas; ningún icono sin texto al lado; alto contraste con iconos a
`currentColor`.

---

## Phase 6: El panel y la ventana (US5)

- [ ] T030 [US5] `composition.css`: el carril en `@container window (max-width: 52em)` pasa
      a **una fila** con `overflow-x: auto`, sin `flex-wrap`, y el `[aria-current]` se
      lleva a la vista (`scrollIntoView` en `Rail.tsx` al cambiar de ruta, `inline:
      'nearest'`); el `.rail-foot` sigue al final de la fila. `013` FR-1115 intacto: la
      página no se desplaza de lado. (FR-3923)
- [ ] T031 [US5] `e2e/layout.spec.ts`: a 560 y 880 el `.rail` mide **una fila** (su altura
      ≤ 2 × `--control-h`), y el ítem `[aria-current]` está dentro del viewport. (FR-3923)

**Checkpoint**: `alumno-w-560/880/892/1024.png` y `w-1920.png`: una fila, panel centrado,
panel a toda altura en `6b`.

---

## Phase 7: Verificación (Fase 5 del encargo)

- [ ] T032 `npm test` y `npm run test:e2e` completos; anotar los números en
      `specs/006-desktop-app/validation.md` junto a los del baseline. (SC-3906)
- [ ] T033 Agente de contexto fresco contra `contracts/states.md`: para cada celda rellena,
      señalar la captura donde se ve o declararla no fotografiada. Lo no fotografiado se
      fotografía o se explica en `validation.md`. (SC-3905)
- [ ] T034 Comparar `docs/screenshots/041-antes/` con `latest/` pantalla a pantalla y
      escribir en `validation.md` qué cambió y qué no, en frases completas. (SC-3901)
- [ ] T035 BACKLOG: las dos observaciones de contenido del diagnóstico (recetas con acentos
      graves en el informe del ensayo; salto de línea duro en el aviso de la hoja de
      ejemplo) y el seguimiento de `013`: unificar los dos `Field`. (SC-3907 · su límite)

---

## Cobertura

Una fila por requisito, y no un rango.

| Requisito | Dónde |
|---|---|
| FR-3901 | T015, T019, T021, T022 |
| FR-3902 | T008, T019 |
| FR-3903 | T014, T017, T018, T020, T021, T022, T023 |
| FR-3904 | T017, T018, T021 |
| FR-3905 | T007, T008 |
| FR-3906 | T012 |
| FR-3907 | T007, T009 |
| FR-3908 | T013, T026 |
| FR-3909 | T010, T024 |
| FR-3910 | T007, T011, T025 |
| FR-3911 | T009, T026 |
| FR-3912 | T011 |
| FR-3913 | T016 |
| FR-3914 | T007, T009, T010, T011, T012, T013, T014 |
| FR-3915 | T007 |
| FR-3916 | T027 |
| FR-3917 | T027, T029 |
| FR-3918 | T028 |
| FR-3919 | T002, T003, T004 |
| FR-3920 | T005 |
| FR-3921 | se cumple en cada tarea que toca un test: T005, T016, T017, T031 no debilitan ninguna aserción existente; la regla se comprueba en T032 leyendo el diff de `app/e2e` y `app/ui/test` |
| FR-3922 | T014 |
| FR-3923 | T030, T031 |
| SC-3901 | T001, T006, T034 |
| SC-3902 | T017, T023 |
| SC-3903 | T016 |
| SC-3904 | T005 |
| SC-3905 | T033 |
| SC-3906 | T032 |
| SC-3907 | T035 y el propio alcance: ninguna tarea toca `i18n/`, `recipes/`, `instructions/` ni el renderizador |
