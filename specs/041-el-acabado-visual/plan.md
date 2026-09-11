# Implementation Plan: El acabado visual — el sistema gobierna toda la pantalla

**Branch**: `041-el-acabado-visual` · **Date**: 2026-09-11 · **Spec**: [spec.md](./spec.md)

## Summary

Las dos capas existen —tokens (`010`) y shell (`013`)— y la pantalla se les escapa por
tres sitios: cinco componentes fuera del shell, dos tamaños de `h2`, y 143 estilos en
línea que ninguna prueba ve. **Se cierran las tres fugas primero y se aplica el sistema
cerrado después**, porque pulir una interfaz que aún puede salirse del sistema es pintar
sobre la fuga.

El orden es el de las historias: US1 (shell) y US2 (sistema) son P1 y van juntas porque
el sistema se aplica a pantallas que US1 acaba de meter en el shell; US3 (iconos) y US4
(registro) son P2 y se pueden solapar; US5 (panel y ventana) es P3 y es CSS puro.

El diseño ya está hecho y medido en
[`docs/design/sistema-2026-09-11.md`](../../docs/design/sistema-2026-09-11.md); este plan
no lo repite, lo convierte en ficheros y en orden.

## Technical Context

**Language/Version**: TypeScript 5, React 18, CSS con variables. Node 22, Electron 33
(Chromium 130: `text-wrap: pretty`, `color-mix()`, container queries — todo disponible).

**Primary Dependencies**: **ninguna nueva.** Los iconos se vendorizan: ~30 trazos SVG de
lucide (ISC) copiados a un componente propio, con la licencia al lado. El fichero
original de donde se copian está en un `node_modules` de otro repositorio de la máquina
(`lucide-react` 1.21.0); el trazo es un dato, no una dependencia.

**Storage**: N/A. Nada toca el vault ni el perfil.

**Testing**: vitest (`ui/test/styles.test.tsx`, `packages/core/test/contrast.test.ts`),
Playwright sobre Electron (`e2e/layout`, `primary-control`, `a11y`, `sheet-a11y`), y el
registro `npm run shots`, que no es un test y es la verificación que más importa aquí
(ADR 0009, `013` FR-1113).

**Target Platform**: la aplicación de escritorio, en un portátil de 1366×768, ventana
desde 560 px.

**Project Type**: aplicación de escritorio con núcleo determinista.

**Performance Goals**: ninguna animación nueva; las existentes se quedan a 160/320 ms y
a 0 con movimiento reducido.

**Constraints**: offline; bundle firmado; AA en los ocho cruces; nada por debajo de
24×24 px; ni un texto de `i18n/`; ni un fichero de `recipes/`, `instructions/` ni del
renderizador de la hoja.

**Scale/Scope**: ~20 pantallas, 3 ficheros CSS (~1.640 líneas), 5 componentes que
entran al shell, 25 ficheros con estilos en línea, 1 componente nuevo (`Icon`),
1 guion (`screenshot.mjs`), 3 tests que crecen.

## Constitution Check

| Principio | Cómo lo cumple |
|---|---|
| **I · El juicio vive en Markdown** | Sin cambio. Ninguna cadena nueva dice cómo adaptar; la única prosa nueva en `app/` son comentarios de CSS que explican decisiones de color y medida, que son de la interfaz y no del alumno |
| **II · Código determinista y sin modelo** | Sin cambio. CSS, TSX y un guion de capturas que ya corre sin clave ni red (FR-3612 de `036`) |
| **III · Adapta el *cómo*** | No aplica: no se toca la adaptación |
| **IV · Una extracción, N salidas** | No aplica |
| **V · Barreras funcionales, no etiquetas** | **Vigilado.** El editor de ejes entra al shell (US1) y la tarjeta de alumno cambia de aspecto (US2). Ninguno de los dos puede convertir la lista de alumnos en una tabla de puntuaciones ni la tarjeta de eje en una nota: `.axis-grid` conserva bares + número + palabra, y la tarjeta de alumno sigue sin mostrar valores de eje (`014` FR-1311) |
| **VI · Trazabilidad** | Sin cambio |
| **VII · El borrador se anuncia** | **Vigilado, y es la razón de US4.** Esta feature baja el ruido de todo —carril, tarjetas, avisos, botones— y el contrato del shell dice que la marca de borrador sigue siendo lo más ruidoso de la pantalla de revisión. Hoy esa pantalla no está en el registro; entra en él **antes** de tocar `.draftbar`, y `.draftbar` se toca lo mínimo (sin sombra, como todo lo demás; la trama y el color, intactos) |
| **VIII · Feedback es memoria** | No aplica |
| **IX · El contenido nunca es instrucción** | Sin cambio en la superficie; los iconos son SVG estáticos escritos en el bundle, no imágenes cargadas de contenido |
| **Flujo Spec Kit (NON-NEGOTIABLE)** | Spec y clarify hechos; este plan; tareas; y la spec no se commitea con implementación |

**Gate: pasa**, con dos principios vigilados (V y VII) y la mitigación de cada uno
escrita arriba y convertida en tarea.

### Lo que este plan decide que NO se hace

- **No se adopta Tailwind/shadcn/Radix/CVA.** Sería un ADR y la spec lo declara no-objetivo.
- **No se añade `lucide-react`** aunque sea pequeña: el conjunto es cerrado por diseño,
  y una dependencia hace del catálogo entero algo disponible a un `import` de distancia.
- **No hay `PageHeader` con acciones a la derecha** ni breadcrumbs: el carril es el
  rastro y el título es el título. El portal no los tiene tampoco.
- **No se cambia el cuerpo de 17 px** ni la escala de tamaños.
- **No se crea un popover con dependencia** para «Cómo se ve»: la anchura del carril se
  resuelve haciendo que el bloque desborde el carril con `position: absolute` dentro del
  `.rail-foot`, con el `--shadow-md` del nivel 2. Es CSS y un `role="group"` que ya existe.

## Phase 0 · Research

[research.md](./research.md): el inventario que decide qué clases nuevas necesita el
shell (a partir de los 143 estilos en línea agrupados), el mapeo de los cuatro componentes (research R1: eran cinco en el diagnóstico; `PacketDoor` ya vive dentro de un `Page`)
a `Page/Section/Field/Actions`, la clasificación de cada `.card` en objeto o agrupadora,
y los tests que citan alturas y clases que van a cambiar.

## Phase 1 · Design

- [contracts/shell-additions.md](./contracts/shell-additions.md) — las clases que el shell
  gana para que el estilo en línea deje de ser necesario, y la lista de excepciones que
  queda (valores de datos).
- [contracts/icon-set.md](./contracts/icon-set.md) — el conjunto cerrado: nombre, dónde
  se usa, reglas de uso, y cómo se añade uno.
- [contracts/states.md](./contracts/states.md) — la tabla de estados por componente, que
  es lo que US4 fotografía y lo que la Fase 5 verifica.
- [quickstart.md](./quickstart.md) — cómo verificar: qué correr, qué mirar, en qué orden.

No hay `data-model.md`: la feature no tiene datos.

## Project Structure

```text
app/ui/src/styles/tokens.css           # --control-h, pesos, drift del tema claro, AC redefine brillantes
app/ui/src/styles/components.css       # h2 único, btn/card/callout/badge/progress/rail/levels; mono→sans
app/ui/src/styles/composition.css      # panel centrado y a toda altura; carril de una fila; clases del shell nuevas
app/ui/src/shell/Page.tsx              # sin cambios de API; gana `Row`/`Group` si research lo pide
app/ui/src/components/Icon.tsx         # NUEVO · conjunto cerrado + LICENSE-lucide.txt al lado
app/ui/src/components/{Badge,Callout,EmptyState,DraftMark,Field,Progress}.tsx  # icono en vez de glifo; body en <p>
app/ui/src/nav/Rail.tsx                # iconos; aria-current con la nueva clase
app/ui/src/learners/{ProfileEditor,AxisEditor}.tsx        # al shell
app/ui/src/onboarding/{VaultStep,ConnectStep}.tsx         # al shell
app/ui/src/coordination/PacketDoor.tsx                    # al shell
app/ui/src/App.tsx                     # el onboarding dentro de .main/.page; --rule → --line; sin style inline
app/ui/src/**/*.tsx                    # 143 style={{}} → clases (25 ficheros)
app/ui/test/styles.test.tsx            # + estilos en línea prohibidos salvo lista; + var(--x) definidas
app/packages/core/test/contrast.test.ts # + 9 parejas
app/e2e/a11y.spec.ts                   # 8 cruces
app/e2e/layout.spec.ts                 # + carril de una fila en 560; alturas ≥ 24
app/scripts/screenshot.mjs             # + revisión con borrador/firmada, error, carga, foco, hover, 8 cruces
docs/screenshots/latest/               # el después
docs/screenshots/041-antes/            # el antes, copiado antes de tocar nada
```

**Structure Decision**: ningún fichero de producción nuevo salvo `Icon.tsx` y su
licencia. Todo lo demás son ficheros que ya existen ganando o perdiendo reglas.

## Sequencing

1. **Antes de nada: el antes.** Copiar `docs/screenshots/latest/` a
   `docs/screenshots/041-antes/`. SC-3901 compara contra eso.
2. **US4 primero en lo que es guion**: `screenshot.mjs` fotografía la revisión, estados,
   foco, hover y los ocho cruces **sobre la interfaz actual**, para que el antes tenga lo
   mismo que el después.
3. **US1**: tokens de peso, `h2` único, `--control-h`; las clases nuevas del shell; los
   cuatro componentes al shell; los 143 estilos en línea a clases; el test que lo cierra.
   Capturas y mirar.
4. **US2**: carril, tarjetas, avisos, badges, botones, deshabilitado, progreso, mono→sans,
   alto contraste redefine brillantes, drift del tema claro; las nueve parejas al test de
   contraste. Capturas en los ocho cruces y mirar.
5. **US3**: `Icon`, glifos fuera, iconos en carril, botones repetidos, avisos y estados.
   Capturas y mirar.
6. **US5**: panel centrado y a toda altura; carril de una fila; test de layout.
   Capturas a 560/880/1024/1366/1920 y mirar.
7. **Verificación** (Fase 5 del encargo): agente de contexto fresco contra
   `contracts/states.md` y la spec; `npm test`; `npm run test:e2e`; el registro entero.

## Complexity Tracking

Sin violaciones que justificar. Las dos «vigilancias» (V, VII) tienen su tarea.
